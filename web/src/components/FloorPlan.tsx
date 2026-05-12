import { floorPlanConfig, type DoorConfig } from "../floorPlan/config";
import { roomCenter } from "../floorPlan/geometry";
import type { CatState, NodeState } from "../types/contracts";
import { CatMarker } from "./CatMarker";
import { NodeMarker } from "./NodeMarker";
import styles from "../styles/mission.module.css";

interface FloorPlanProps {
  cats: CatState[];
  nodes: NodeState[];
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

export function FloorPlan({ cats, nodes }: FloorPlanProps) {
  const { viewBox, rooms, hallway, nodes: nodeConfigs, doors } = floorPlanConfig;

  function catPosition(cat: CatState): [number, number] {
    if (!cat.silent && cat.room) {
      const roomCfg = rooms.find((r) => r.name === cat.room);
      if (roomCfg) return roomCenter(roomCfg.polygon);
    }
    const fallbackRoom = cat.silent && cat.lastRoom
      ? rooms.find((r) => r.name === cat.lastRoom)
      : null;
    if (fallbackRoom) return roomCenter(fallbackRoom.polygon);
    return [400, 300];
  }

  const [, , vbWStr, vbHStr] = viewBox.split(" ");
  const vbW = Number(vbWStr);
  const vbH = Number(vbHStr);

  return (
    <svg
      viewBox={viewBox}
      className={styles.floorPlanSvg}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
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
        <linearGradient id="cs-scanline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1ee0c9" stopOpacity="0" />
          <stop offset="50%" stopColor="#1ee0c9" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1ee0c9" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Canvas background */}
      <rect width="100%" height="100%" fill="#06080d" />
      <rect width="100%" height="100%" fill="url(#cs-grid)" />
      <rect width="100%" height="100%" fill="url(#cs-grid-major)" />

      {/* Subtle scan-line sweep */}
      <rect x="0" y={-vbH * 0.08} width={vbW} height={vbH * 0.08} fill="url(#cs-scanline)">
        <animate
          attributeName="y"
          from={-vbH * 0.08}
          to={vbH}
          dur="14s"
          repeatCount="indefinite"
        />
      </rect>

      {/* Hallway fill — drawn first so room fills sit on top of any overlap */}
      <polygon
        points={polygonPath(hallway.polygon)}
        className={styles.hallway}
      />

      {/* Room fills */}
      {rooms.map((room, i) => {
        const bb = roomBBox(room.polygon);
        const code = `R${String(i + 1).padStart(2, "0")}`;
        return (
          <g key={room.name}>
            <polygon
              points={polygonPath(room.polygon)}
              className={styles.roomFill}
              style={{ fill: room.color, fillOpacity: 0.32 }}
            />
            {/* Wall path with door gaps */}
            <path
              d={wallPathWithDoorGaps(room.polygon, doors)}
              className={styles.roomWall}
              filter="url(#cs-wall-glow)"
              fill="none"
            />
            {/* Architectural label in upper-left corner */}
            <g className={styles.roomLabelGroup} transform={`translate(${bb.x + 12}, ${bb.y + 18})`}>
              <text className={styles.roomCode}>{code}</text>
              <text className={styles.roomName} y={14}>
                <tspan className={styles.roomEmoji}>{room.emoji}</tspan>
                <tspan dx={6}>{room.name.toUpperCase()}</tspan>
              </text>
            </g>
          </g>
        );
      })}

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

      {/* ESP32 node markers */}
      {nodeConfigs.map((nc, idx) => {
        const liveNode = nodes.find((n) => n.id === nc.id);
        if (!liveNode) return null;
        return (
          <NodeMarker
            key={nc.id}
            node={liveNode}
            x={nc.pos[0]}
            y={nc.pos[1]}
            index={idx + 1}
          />
        );
      })}

      {/* Cat markers (top of stack) */}
      {cats.map((cat) => {
        const [x, y] = catPosition(cat);
        return <CatMarker key={cat.id} cat={cat} x={x} y={y} />;
      })}

      {/* Frame corner brackets */}
      <g className={styles.frameCorners} fill="none" stroke="#1ee0c9" strokeWidth="1.2" opacity="0.65">
        <path d={`M 4 18 L 4 4 L 18 4`} />
        <path d={`M ${vbW - 18} 4 L ${vbW - 4} 4 L ${vbW - 4} 18`} />
        <path d={`M 4 ${vbH - 18} L 4 ${vbH - 4} L 18 ${vbH - 4}`} />
        <path d={`M ${vbW - 4} ${vbH - 18} L ${vbW - 4} ${vbH - 4} L ${vbW - 18} ${vbH - 4}`} />
      </g>
    </svg>
  );
}
