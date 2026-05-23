import { useEffect, useMemo, useState } from "react";
import { FloorPlan } from "../components/FloorPlan";
import { floorPlanConfig } from "../floorPlan/config";
import { api } from "../api/client";
import styles from "../styles/mission.module.css";

type CatScope = "BOTH" | "ALL" | number; // number = specific catId; ALL alias for BOTH if many cats
type DayRange = "1" | "7" | "30";

const DAY_RANGE_VALUE: Record<DayRange, number> = { "1": 1, "7": 7, "30": 30 };
const DAY_RANGE_LABEL: Record<DayRange, string> = { "1": "24H", "7": "7D", "30": "30D" };

interface Cat {
  id: number;
  name: string;
  color_hex: string;
  photo_path: string | null;
}

interface HeatRow {
  room: string;
  durationSec: number;
}

interface ChipProps<T extends string | number> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}

function ChipRow<T extends string | number>({ options, value, onChange, ariaLabel }: ChipProps<T>) {
  return (
    <div className={styles.heatChipRow} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.heatChip} ${isActive ? styles.heatChipActive : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function polygonPath(polygon: [number, number][]) {
  return polygon.map(([x, y]) => `${x},${y}`).join(" ");
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = sec / 3600;
  return h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`;
}

export function HeatmapView() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [scope, setScope] = useState<CatScope>("BOTH");
  const [dayRange, setDayRange] = useState<DayRange>("7");
  // Map<catId, Map<room, seconds>>
  const [heatByCat, setHeatByCat] = useState<Map<number, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cats once
  useEffect(() => {
    let cancelled = false;
    api<Cat[]>("/api/cats")
      .then((data) => { if (!cancelled) setCats(data); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  // Fetch heatmaps when scope / range / cats change
  useEffect(() => {
    if (cats.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const to = Math.floor(Date.now() / 1000);
    const from = to - DAY_RANGE_VALUE[dayRange] * 24 * 3600;
    const targets = scope === "BOTH" || scope === "ALL"
      ? cats
      : cats.filter((c) => c.id === scope);

    Promise.all(
      targets.map((c) =>
        api<HeatRow[]>(`/api/heatmap?catId=${c.id}&from=${from}&to=${to}`)
          .then((rows) => [c.id, new Map(rows.map((r) => [r.room, r.durationSec]))] as const)
      )
    )
      .then((entries) => {
        if (cancelled) return;
        setHeatByCat(new Map(entries));
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [cats, scope, dayRange]);

  const catsInScope = useMemo(() => {
    if (scope === "BOTH" || scope === "ALL") return cats;
    return cats.filter((c) => c.id === scope);
  }, [cats, scope]);

  // Per-cat per-room intensity normalized 0..1 by that cat's max room dwell time.
  // This way both cats are comparable even if one has much more total motion.
  const layers = useMemo(() => {
    return catsInScope.map((cat) => {
      const rooms = heatByCat.get(cat.id) ?? new Map<string, number>();
      let max = 0;
      for (const sec of rooms.values()) if (sec > max) max = sec;
      return { cat, rooms, max };
    });
  }, [catsInScope, heatByCat]);

  const totalSeconds = useMemo(() => {
    let s = 0;
    for (const { rooms } of layers) for (const sec of rooms.values()) s += sec;
    return s;
  }, [layers]);

  // Top rooms across all cats in scope
  const topRooms = useMemo(() => {
    const agg = new Map<string, number>();
    for (const { rooms } of layers) {
      for (const [room, sec] of rooms) agg.set(room, (agg.get(room) ?? 0) + sec);
    }
    return [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [layers]);

  // Build the heat layer SVG: per-room polygon fills, additively blended.
  const heatLayer = (
    <g>
      {layers.map(({ cat, rooms, max }) => {
        if (max === 0) return null;
        return floorPlanConfig.rooms.map((room) => {
          const sec = rooms.get(room.name) ?? 0;
          if (sec === 0) return null;
          const t = sec / max;
          const opacity = 0.12 + 0.55 * t;
          return (
            <polygon
              key={`${cat.id}-${room.name}`}
              points={polygonPath(room.polygon)}
              fill={cat.color_hex}
              opacity={opacity}
              style={{ mixBlendMode: "screen" }}
            />
          );
        });
      })}
    </g>
  );

  const isEmpty = totalSeconds === 0;

  // Build cat-scope options dynamically
  const scopeOptions: ReadonlyArray<{ value: CatScope; label: string }> = [
    { value: "BOTH" as const, label: cats.length === 2 ? "BOTH" : "ALL" },
    ...cats.map((c) => ({ value: c.id as CatScope, label: c.name.toUpperCase() })),
  ];

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatToolbar}>
        <div className={styles.heatToolbarGroup}>
          <span className={styles.heatToolbarLabel}>CAT</span>
          <ChipRow<CatScope>
            value={scope}
            onChange={setScope}
            ariaLabel="Cat selection"
            options={scopeOptions}
          />
        </div>
        <div className={styles.heatToolbarGroup}>
          <span className={styles.heatToolbarLabel}>WINDOW</span>
          <ChipRow<DayRange>
            value={dayRange}
            onChange={setDayRange}
            ariaLabel="Time window"
            options={(["1", "7", "30"] as DayRange[]).map((v) => ({ value: v, label: DAY_RANGE_LABEL[v] }))}
          />
        </div>
      </div>

      <div className={styles.heatmapStage}>
        <FloorPlan cats={[]} heatLayer={heatLayer} />
        {isEmpty && !loading && (
          <div className={styles.heatEmpty}>
            <div className={styles.heatEmptyTitle}>NO DATA YET</div>
            <div className={styles.heatEmptySub}>
              {cats.length === 0
                ? "Add cats in SETUP and pair Tiles to start tracking."
                : "Heat will accumulate as your cats move between rooms."}
            </div>
          </div>
        )}
      </div>

      <div className={styles.heatFooter}>
        <div className={styles.heatLegend}>
          {catsInScope.map((c) => (
            <span key={c.id} className={styles.heatLegendItem}>
              <span className={styles.heatLegendSwatch} style={{ background: c.color_hex }} />
              <span className={styles.heatLegendName}>{c.name.toUpperCase()}</span>
            </span>
          ))}
        </div>
        <div className={styles.heatStats}>
          <span className={styles.heatStat}>
            {topRooms.length}{" "}
            <span className={styles.heatStatDim}>
              ROOMS · {topRooms[0] ? `${topRooms[0][0].toUpperCase()} ${formatDuration(topRooms[0][1])}` : "—"}
            </span>
          </span>
          <span className={styles.heatStat}>
            {formatDuration(totalSeconds)}{" "}
            <span className={styles.heatStatDim}>TOTAL DWELL</span>
          </span>
          {error && <span className={styles.heatStat} style={{ color: "#f87171" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
