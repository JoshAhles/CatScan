import type { ReactNode } from "react";
import { floorPlanConfig, type DoorConfig } from "../floorPlan/config";
import { roomCenter } from "../floorPlan/geometry";
import type { CatState } from "../types/contracts";
import { CatMarker } from "./CatMarker";
import styles from "../styles/mission.module.css";

interface FloorPlanProps {
  cats: CatState[];
  /**
   * Optional SVG fragment rendered between room fills and walls. Used by
   * HeatmapView to paint heat blobs under the architectural geometry so the
   * room walls and labels remain crisp on top.
   */
  heatLayer?: ReactNode;
  /**
   * Strip the scan-line sweep + room codes for compact embedded use (e.g. the
   * mini heat signature inside the cat detail panel).
   */
  compact?: boolean;
  /** Click on a cat marker → open detail. */
  onCatSelect?: (catId: number) => void;
}

function roomBBox(polygon: [number, number][]) {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function polygonPath(polygon: [number, number][]) {
  return polygon.map(([x, y]) => `${x},${y}`).join(" ");
}

// --- Wall-with-door-gaps geometry helpers ---
const EPS = 0.05;

function pointOnSegment(p: [number, number], a: [number, number], b: [number, number]): boolean {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b;
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  if (Math.abs(cross) > EPS) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  const lenSq = (bx - ax) ** 2 + (by - ay) ** 2;
  return dot >= -EPS && dot <= lenSq + EPS;
}

function segmentParam(p: [number, number], a: [number, number], b: [number, number]): number {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  return Math.abs(dx) > Math.abs(dy) ? (px - ax) / dx : (py - ay) / dy;
}

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Build an SVG path string tracing the polygon's outline, but with any
 * portion that coincides with a door segment lifted (rendered as `M` only,
 * not `L`). Each edge is processed independently.
 */
function wallPathWithDoorGaps(polygon: [number, number][], doors: DoorConfig[]): string {
  const out: string[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;

    // Collect [t0, t1] gap ranges on this edge from any matching door
    const gaps: Array<[number, number]> = [];
    for (const d of doors) {
      if (!pointOnSegment(d.from, a, b) || !pointOnSegment(d.to, a, b)) continue;
      const t1 = segmentParam(d.from, a, b);
      const t2 = segmentParam(d.to, a, b);
      const lo = Math.max(0, Math.min(t1, t2));
      const hi = Math.min(1, Math.max(t1, t2));
      if (hi > lo + EPS) gaps.push([lo, hi]);
    }
    gaps.sort((x, y) => x[0] - y[0]);

    // Trace edge with gaps lifted
    let cursor = 0;
    for (const [lo, hi] of gaps) {
      if (cursor < lo - EPS) {
        const p0 = lerp(a, b, cursor);
        const p1 = lerp(a, b, lo);
        out.push(`M ${p0[0]} ${p0[1]} L ${p1[0]} ${p1[1]}`);
      }
      cursor = Math.max(cursor, hi);
    }
    if (cursor < 1 - EPS) {
      const p0 = lerp(a, b, cursor);
      out.push(`M ${p0[0]} ${p0[1]} L ${b[0]} ${b[1]}`);
    }
  }
  return out.join(" ");
}

/** Spacing (in SVG units) between cat-marker centers when multiple cats share
 *  a room. Each marker is ~44px diameter with a ~50px outer radar ring, so 64
 *  keeps the cores well separated while letting the rings overlap subtly. */
const CAT_GROUP_GAP = 64;

export function FloorPlan({ cats, heatLayer, compact = false, onCatSelect }: FloorPlanProps) {
  const { viewBox, rooms, hallway, doors } = floorPlanConfig;

  function roomForCat(cat: CatState) {
    if (!cat.silent && cat.room) return rooms.find((r) => r.name === cat.room) ?? null;
    if (cat.silent && cat.lastRoom) return rooms.find((r) => r.name === cat.lastRoom) ?? null;
    return null;
  }

  interface CoPresenceGroup {
    key: string;
    /** Cat marker positions in this room, ordered by cat id (same as render). */
    positions: Array<[number, number]>;
    /** Visible (non-silent) cats in this room. */
    cats: CatState[];
  }

  /**
   * Bucket cats by which room they're currently displayed in, then position
   * each group along its room's longer axis so markers never overlap. Also
   * surfaces "co-presence" groups (visible cats sharing a room) so the
   * renderer can draw a connector + badge between them.
   */
  function computePositions(): {
    positions: Map<number, [number, number]>;
    coPresence: CoPresenceGroup[];
  } {
    const groups = new Map<string, CatState[]>();
    for (const cat of cats) {
      const room = roomForCat(cat);
      const key = room ? room.name : "__noroom__";
      const list = groups.get(key) ?? [];
      list.push(cat);
      groups.set(key, list);
    }

    const positions = new Map<number, [number, number]>();
    const coPresence: CoPresenceGroup[] = [];
    for (const [key, group] of groups) {
      const room = key === "__noroom__" ? null : rooms.find((r) => r.name === key) ?? null;
      if (!room) {
        // Off-plan fallback — stack vertically in the SVG center.
        group.forEach((c, i) => {
          positions.set(c.id, [400, 280 + i * CAT_GROUP_GAP]);
        });
        continue;
      }

      const [cx, cy] = roomCenter(room.polygon);
      if (group.length === 1) {
        positions.set(group[0]!.id, [cx, cy]);
        continue;
      }

      // Spread along the room's longer axis so wider rooms get horizontal
      // arrangement and tall rooms get vertical — keeps markers comfortably
      // inside the room bounds.
      const bb = roomBBox(room.polygon);
      const horizontal = bb.w >= bb.h;
      // Available span minus a margin so markers don't kiss the walls.
      const axisSpan = (horizontal ? bb.w : bb.h) - 40;
      const desiredSpan = CAT_GROUP_GAP * (group.length - 1);
      const span = Math.min(axisSpan, desiredSpan);
      const step = group.length > 1 ? span / (group.length - 1) : 0;
      const start = -span / 2;

      // Deterministic order — sort by cat id so the same cats land in the
      // same relative spots across renders.
      const ordered = [...group].sort((a, b) => a.id - b.id);
      const orderedPositions: Array<[number, number]> = [];
      ordered.forEach((cat, i) => {
        const offset = start + i * step;
        const x = horizontal ? cx + offset : cx;
        const y = horizontal ? cy : cy + offset;
        positions.set(cat.id, [x, y]);
        orderedPositions.push([x, y]);
      });

      // Only treat *visible* cats as co-present; if one is silent the room
      // really has just one tag broadcasting.
      const visibleOrdered = ordered.filter((c) => !c.silent);
      if (visibleOrdered.length >= 2) {
        const visiblePositions = ordered
          .map((c, idx) => (c.silent ? null : orderedPositions[idx]!))
          .filter((p): p is [number, number] => p !== null);
        coPresence.push({ key, positions: visiblePositions, cats: visibleOrdered });
      }
    }
    return { positions, coPresence };
  }

  const { positions: catPositions, coPresence } = computePositions();

  const [vbXStr, vbYStr, vbWStr, vbHStr] = viewBox.split(" ");
  const vbX = Number(vbXStr);
  const vbY = Number(vbYStr);
  const vbW = Number(vbWStr);
  const vbH = Number(vbHStr);

  return (
    <svg
      viewBox={viewBox}
      className={styles.floorPlanSvg}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ aspectRatio: `${vbW} / ${vbH}` }}
    >
      <defs>
        <pattern id="cs-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.7" fill="#1a3a3a" opacity="0.55" />
        </pattern>
        <pattern id="cs-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 100 0 L 100 100" fill="none" stroke="#0d3b3a" strokeWidth="0.35" opacity="0.55" />
        </pattern>
        <filter id="cs-wall-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Generous Gaussian for heat blobs — referenced by HeatmapView. */}
        <filter id="cs-heat-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        {/* Indoor footprint — union of every tracked room + the hallway. The
            heat overlay clips to this so blurred bleed never escapes the
            home into the dark exterior. */}
        <clipPath id="cs-indoor-clip">
          {rooms.map((room) => (
            <polygon
              key={`clip-${room.name}`}
              points={polygonPath(room.polygon)}
            />
          ))}
          <polygon points={polygonPath(hallway.polygon)} />
        </clipPath>
        <linearGradient id="cs-scanline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1ee0c9" stopOpacity="0" />
          <stop offset="50%" stopColor="#1ee0c9" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1ee0c9" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Canvas background */}
      <rect width="100%" height="100%" fill="#0c1422" />
      <rect width="100%" height="100%" fill="url(#cs-grid)" />
      <rect width="100%" height="100%" fill="url(#cs-grid-major)" />

      {/* Subtle scan-line sweep — omitted in compact mode (too busy at small scale). */}
      {!compact && (
        <rect x={vbX} y={vbY - vbH * 0.08} width={vbW} height={vbH * 0.08} fill="url(#cs-scanline)">
          <animate
            attributeName="y"
            from={vbY - vbH * 0.08}
            to={vbY + vbH}
            dur="14s"
            repeatCount="indefinite"
          />
        </rect>
      )}

      {/* Hallway fill — drawn first so room fills sit on top of any overlap */}
      <polygon
        points={polygonPath(hallway.polygon)}
        className={styles.hallway}
      />

      {/* Pass 1: room fills (color tints only — geometry painted later so heat
          can be slotted in between without obscuring walls). */}
      {rooms.map((room) => (
        <polygon
          key={`fill-${room.name}`}
          points={polygonPath(room.polygon)}
          className={styles.roomFill}
          style={{ fill: room.color, fillOpacity: 0.42 }}
        />
      ))}

      {/* Optional heat overlay — sits between room fills and walls so the
          architectural geometry stays sharp above the diffused heat. The
          clip path constrains blurred bleed to the indoor footprint. */}
      {heatLayer && <g clipPath="url(#cs-indoor-clip)">{heatLayer}</g>}

      {/* Pass 2: room walls with door gaps. */}
      {rooms.map((room) => (
        <path
          key={`wall-${room.name}`}
          d={wallPathWithDoorGaps(room.polygon, doors)}
          className={styles.roomWall}
          filter="url(#cs-wall-glow)"
          fill="none"
        />
      ))}

      {/* Hallway outline + tag — dashed walls also receive door gaps */}
      <path
        d={wallPathWithDoorGaps(hallway.polygon, doors)}
        className={styles.hallwayWall}
        fill="none"
      />
      <text
        x={roomCenter(hallway.polygon)[0]}
        y={roomCenter(hallway.polygon)[1] + 3}
        className={styles.hallwayTag}
      >
        · HALL ·
      </text>

      {/* Pass 3: room labels (top of geometry, below cat markers).
          Compact mode skips the R## prefix and emoji to declutter mini views. */}
      {rooms.map((room, i) => {
        const bb = roomBBox(room.polygon);
        const code = `R${String(i + 1).padStart(2, "0")}`;
        return (
          <g
            key={`label-${room.name}`}
            className={styles.roomLabelGroup}
            transform={`translate(${bb.x + 12}, ${bb.y + 18})`}
          >
            {!compact && <text className={styles.roomCode}>{code}</text>}
            <text className={styles.roomName} y={compact ? 0 : 14}>
              {!compact && <tspan className={styles.roomEmoji}>{room.emoji}</tspan>}
              <tspan dx={compact ? 0 : 6}>{room.name.toUpperCase()}</tspan>
            </text>
          </g>
        );
      })}

      {/* Co-presence aura — a soft, blurred ellipse that envelops the
          visible cats sharing a room, color-blended between their hues.
          No glyph, no connector — just a "they're together" glow. */}
      {coPresence.map((g) => {
        const xs = g.positions.map((p) => p[0]);
        const ys = g.positions.map((p) => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const padding = 28;
        const rx = (maxX - minX) / 2 + padding;
        const ry = (maxY - minY) / 2 + padding;
        const gradId = `cs-cuddle-${g.key.replace(/[^a-zA-Z0-9]/g, "-")}`;
        const colors = g.cats.map((c) => c.color);
        const c1 = colors[0]!;
        const c2 = colors[colors.length - 1]!;
        return (
          <g key={`copres-${g.key}`} className={styles.coPresence}>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor={c1} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c2} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <ellipse
              cx={midX}
              cy={midY}
              rx={rx}
              ry={ry}
              fill={`url(#${gradId})`}
              className={styles.coPresenceHalo}
            />
          </g>
        );
      })}

      {/* Cat markers (top of stack) */}
      {cats.map((cat) => {
        const [x, y] = catPositions.get(cat.id) ?? [400, 300];
        return (
          <CatMarker
            key={cat.id}
            cat={cat}
            x={x}
            y={y}
            {...(onCatSelect ? { onSelect: onCatSelect } : {})}
          />
        );
      })}

    </svg>
  );
}
