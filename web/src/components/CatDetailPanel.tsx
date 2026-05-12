import { useEffect, useMemo, useState } from "react";
import { useWsStore } from "../stores/wsStore";
import { FloorPlan } from "./FloorPlan";
import { rssiBars } from "./rssi";
import { floorPlanConfig } from "../floorPlan/config";
import { computeHeat } from "../demo/heatProfile";
import { SLEEP_THRESHOLD_SEC, formatDuration } from "../lib/duration";
import type { CatState } from "../types/contracts";
import type { TransitionRecord } from "../stores/wsStore";
import styles from "../styles/mission.module.css";

/** Stable empty array so the mini FloorPlan's `cats` prop doesn't get a new
 *  reference each render, defeating future React.memo wrapping. */
const NO_CATS: CatState[] = [];

function formatHMS(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const ROOM_COLOR: Record<string, string> = Object.fromEntries(
  floorPlanConfig.rooms.map((r) => [r.name, r.color]),
);

interface DaySegment {
  room: string;
  from: number;
  to: number;
}

/**
 * Build the day-pattern segments from the most recent transitions.
 * - Window is [today's local midnight, now].
 * - Earliest transition's `from` covers the gap from midnight to that transition.
 * - Trailing segment uses the cat's current room from the last transition to now.
 * - If no transitions today, single segment from midnight to now in cat.room.
 */
function buildDaySegments(
  cat: CatState,
  transitions: TransitionRecord[],
  nowSec: number,
): DaySegment[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const dayStart = Math.floor(midnight.getTime() / 1000);

  const todays = transitions
    .filter((t) => t.catId === cat.id && t.at >= dayStart)
    .sort((a, b) => a.at - b.at);

  if (todays.length === 0) {
    const room = cat.silent ? (cat.lastRoom ?? "?") : (cat.room ?? "?");
    return [{ room, from: dayStart, to: nowSec }];
  }

  const segs: DaySegment[] = [];
  // Gap before first transition — assume cat was in the first transition's `from` room.
  if (todays[0]!.at > dayStart) {
    segs.push({ room: todays[0]!.from, from: dayStart, to: todays[0]!.at });
  }
  for (let i = 0; i < todays.length - 1; i++) {
    segs.push({ room: todays[i]!.to, from: todays[i]!.at, to: todays[i + 1]!.at });
  }
  const last = todays[todays.length - 1]!;
  segs.push({ room: last.to, from: last.at, to: nowSec });
  return segs;
}

interface CatDetailPanelProps {
  cat: CatState;
  onClose: () => void;
}

export function CatDetailPanel({ cat, onClose }: CatDetailPanelProps) {
  const nodes = useWsStore((s) => s.nodes);
  const transitions = useWsStore((s) => s.transitions);

  // Live-ticking clock for "in room for X" + recent timestamps.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Dismiss on Escape.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Per-node RSSI for this cat, sorted by signal strength descending.
  const signalRows = useMemo(() => {
    return nodes
      .map((n) => ({
        node: n,
        rssi: n.rssiByCatId[String(cat.id)],
      }))
      .sort((a, b) => {
        if (a.rssi === undefined && b.rssi === undefined) return 0;
        if (a.rssi === undefined) return 1;
        if (b.rssi === undefined) return -1;
        return b.rssi - a.rssi;
      });
  }, [nodes, cat.id]);

  const daySegs = useMemo(
    () => buildDaySegments(cat, transitions, nowSec),
    [cat, transitions, nowSec],
  );
  const dayStart = daySegs[0]?.from ?? nowSec;
  const daySpan = Math.max(1, nowSec - dayStart);

  /** Recent transitions enriched with the dwell that *ended* at each one
   *  (computed from the next-older transition's timestamp). Transitions that
   *  end a long-dwell are marked `slept` so the row can render a sleep
   *  annotation instead of the plain arrow. */
  const recentForCat = useMemo(() => {
    const all = transitions.filter((t) => t.catId === cat.id);
    return all
      .slice(0, 7) // grab one extra so the 6th still has a prev dwell available
      .map((t, i, arr) => {
        const next = arr[i + 1];
        const prevDwell = next ? t.at - next.at : null;
        const slept = prevDwell != null && prevDwell >= SLEEP_THRESHOLD_SEC;
        return { ...t, prevDwell, slept };
      })
      .slice(0, 6);
  }, [transitions, cat.id]);

  // Per-cat heat signature (last 7 days, all hours). Memoized JSX so the
  // mini FloorPlan doesn't reconcile a fresh heat layer every 1s tick.
  const heatLayer = useMemo(() => {
    const points = computeHeat({ catIds: [cat.id], days: 7, hourFrom: 0, hourTo: 24 });
    const maxIntensity = Math.max(1, ...points.map((p) => p.intensity));
    return (
      <g filter="url(#cs-heat-blur)">
        {points.map((p, i) => {
          const t = p.intensity / maxIntensity;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={22 + 28 * t}
              fill={cat.color}
              opacity={0.18 + 0.55 * t}
            />
          );
        })}
      </g>
    );
  }, [cat.id, cat.color]);

  const locationLine = cat.silent ? (
    <>
      <span className={styles.catSilent}>SILENT</span>
      <span className={styles.catDetailLocMeta}>
        last seen <span className={styles.catRoom}>{cat.lastRoom ?? "?"}</span>
        {cat.lastSeen != null && <> · {formatDuration(nowSec - cat.lastSeen)} ago</>}
      </span>
    </>
  ) : (
    <>
      <span className={styles.catRoom}>{cat.room}</span>
      {cat.since != null && (
        <span className={styles.catDetailLocMeta}>{formatDuration(nowSec - cat.since)}</span>
      )}
    </>
  );

  return (
    <>
      <div className={styles.catDetailBackdrop} onClick={onClose} />
      <aside
        className={styles.catDetailPanel}
        role="dialog"
        aria-label={`${cat.name} detail`}
      >
        <header className={styles.catDetailHeader}>
          {cat.photoPath ? (
            <img
              className={styles.catDetailAvatar}
              src={cat.photoPath}
              alt={cat.name}
              style={{ borderColor: cat.color, boxShadow: `0 0 16px ${cat.color}66` }}
            />
          ) : (
            <div
              className={styles.catDetailAvatarFallback}
              style={{ background: cat.color, boxShadow: `0 0 16px ${cat.color}66` }}
              aria-label={cat.name}
            >
              {cat.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className={styles.catDetailHeaderText}>
            <div className={styles.catDetailName}>{cat.name.toUpperCase()}</div>
            <div className={styles.catDetailLocation}>{locationLine}</div>
          </div>
          <button
            type="button"
            className={styles.catDetailClose}
            onClick={onClose}
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </header>

        <section className={styles.catDetailSection}>
          <div className={styles.catDetailSectionTitle}>◢ SIGNAL · live RSSI per node</div>
          {signalRows.length === 0 ? (
            <div className={styles.catDetailEmpty}>no nodes registered</div>
          ) : (
            <ul className={styles.signalList}>
              {signalRows.map(({ node, rssi }) => {
                const bars = rssiBars(rssi);
                return (
                  <li key={node.id} className={styles.signalRow}>
                    <span className={styles.signalRoom}>
                      {(node.roomName ?? node.id).toUpperCase()}
                    </span>
                    <span className={styles.signalBarsBox}>
                      {[0, 1, 2, 3, 4].map((b) => (
                        <span
                          key={b}
                          className={`${styles.signalBarPip} ${b < bars ? styles.signalBarPipOn : ""}`}
                        />
                      ))}
                    </span>
                    <span className={styles.signalDbm}>
                      {rssi !== undefined ? `${rssi} dBm` : "— dBm"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.catDetailSection}>
          <div className={styles.catDetailSectionTitle}>◢ TODAY · room over time</div>
          <div className={styles.dayStrip}>
            {daySegs.map((seg, i) => {
              const dur = seg.to - seg.from;
              const width = (dur / daySpan) * 100;
              const color = ROOM_COLOR[seg.room] ?? "#1a2030";
              const slept = dur >= SLEEP_THRESHOLD_SEC;
              return (
                <span
                  key={i}
                  className={styles.daySegment}
                  style={{ width: `${width}%`, background: color }}
                  title={`${seg.room}: ${formatHMS(seg.from)} – ${formatHMS(seg.to)}${slept ? ` (slept ${formatDuration(dur)})` : ""}`}
                >
                  {slept && (
                    <span className={styles.daySegmentSleep} aria-hidden="true">
                      z
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          <div className={styles.dayAxis}>
            <span>{new Date(dayStart * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
            <span>{new Date(nowSec * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
          </div>
          <div className={styles.dayLegend}>
            {Array.from(new Set(daySegs.map((s) => s.room))).map((room) => (
              <span key={room} className={styles.dayLegendItem}>
                <span
                  className={styles.dayLegendSwatch}
                  style={{ background: ROOM_COLOR[room] ?? "#1a2030" }}
                />
                <span className={styles.dayLegendName}>{room.toUpperCase()}</span>
              </span>
            ))}
          </div>
        </section>

        <section className={styles.catDetailSection}>
          <div className={styles.catDetailSectionTitle}>◢ HEAT SIGNATURE · last 7 days</div>
          <div className={styles.heatMini}>
            <FloorPlan cats={NO_CATS} heatLayer={heatLayer} compact />
          </div>
        </section>

        <section className={styles.catDetailSection}>
          <div className={styles.catDetailSectionTitle}>◢ RECENT TRANSITIONS</div>
          {recentForCat.length === 0 ? (
            <div className={styles.catDetailEmpty}>no transitions yet</div>
          ) : (
            <ul className={styles.recentList}>
              {recentForCat.map((t, i) => (
                <li key={i} className={`${styles.recentRow} ${t.slept ? styles.recentRowSleep : ""}`}>
                  <span className={styles.recentTime}>{formatHMS(t.at)}</span>
                  <span className={`${styles.recentArrow} ${t.slept ? styles.recentArrowSleep : ""}`}>
                    {t.slept ? "z" : "→"}
                  </span>
                  <span className={styles.recentRoom}>
                    {t.to.toUpperCase()}
                    {t.slept && t.prevDwell != null && (
                      <span className={styles.recentSleepNote}>
                        {" · slept "}
                        {formatDuration(t.prevDwell)}
                        {" in "}
                        {t.from.toUpperCase()}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  );
}
