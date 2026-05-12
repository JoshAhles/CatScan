import { useMemo, useState } from "react";
import { FloorPlan } from "../components/FloorPlan";
import { DEMO_CATS } from "../demo/demoData";
import { computeHeat, HOT_SPOTS, type HeatPoint } from "../demo/heatProfile";
import styles from "../styles/mission.module.css";

type CatScope = "BOTH" | "OLLIE" | "HOPE";
type DayRange = "1" | "7" | "30";
type HourBand = "ALL" | "MORN" | "AFT" | "EVE" | "NIGHT";

const DAY_RANGE_VALUE: Record<DayRange, number> = { "1": 1, "7": 7, "30": 30 };
const DAY_RANGE_LABEL: Record<DayRange, string> = { "1": "24H", "7": "7D", "30": "30D" };

const HOUR_BAND_RANGE: Record<HourBand, { from: number; to: number; label: string }> = {
  ALL: { from: 0, to: 24, label: "ALL DAY" },
  MORN: { from: 6, to: 12, label: "MORN 06–12" },
  AFT: { from: 12, to: 18, label: "AFT 12–18" },
  EVE: { from: 18, to: 24, label: "EVE 18–00" },
  NIGHT: { from: 0, to: 6, label: "NIGHT 00–06" },
};

const CAT_COLOR: Record<number, string> = {
  [DEMO_CATS.ollie.id]: DEMO_CATS.ollie.color,
  [DEMO_CATS.hope.id]: DEMO_CATS.hope.color,
};
const CAT_NAME: Record<number, string> = {
  [DEMO_CATS.ollie.id]: DEMO_CATS.ollie.name,
  [DEMO_CATS.hope.id]: DEMO_CATS.hope.name,
};

function catIdsForScope(scope: CatScope): number[] {
  if (scope === "OLLIE") return [DEMO_CATS.ollie.id];
  if (scope === "HOPE") return [DEMO_CATS.hope.id];
  return [DEMO_CATS.ollie.id, DEMO_CATS.hope.id];
}

interface ChipProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

function ChipRow<T extends string>({ options, value, onChange }: ChipProps<T>) {
  return (
    <div className={styles.heatChipRow}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.heatChip} ${o.value === value ? styles.heatChipActive : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Render one cat's contribution as a blurred, semi-transparent blob group. */
function HeatBlobs({ points, maxIntensity, color }: { points: HeatPoint[]; maxIntensity: number; color: string }) {
  return (
    <g>
      {points.map((p, i) => {
        const t = p.intensity / maxIntensity;
        const radius = 22 + 28 * t;
        const opacity = 0.18 + 0.55 * t;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={radius}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </g>
  );
}

export function HeatmapView() {
  const [catScope, setCatScope] = useState<CatScope>("BOTH");
  const [dayRange, setDayRange] = useState<DayRange>("7");
  const [hourBand, setHourBand] = useState<HourBand>("ALL");

  const catIds = useMemo(() => catIdsForScope(catScope), [catScope]);
  const band = HOUR_BAND_RANGE[hourBand];
  const days = DAY_RANGE_VALUE[dayRange];

  const heat = useMemo(
    () => computeHeat({ catIds, days, hourFrom: band.from, hourTo: band.to }),
    [catIds, days, band.from, band.to]
  );

  // Per-cat normalization so both cats are visually comparable even when one
  // has a much wider activity profile in the selected window.
  const maxByCat = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of heat) m.set(p.catId, Math.max(m.get(p.catId) ?? 0, p.intensity));
    return m;
  }, [heat]);

  // Top-3 most active hot-spots for the summary stat row.
  const topSpots = useMemo(() => {
    return [...heat]
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);
  }, [heat]);

  const heatLayer = (
    <g filter="url(#cs-heat-blur)">
      {catIds.map((id) => {
        const catPoints = heat.filter((p) => p.catId === id);
        const max = maxByCat.get(id) ?? 1;
        return (
          <HeatBlobs
            key={id}
            points={catPoints}
            maxIntensity={max}
            color={CAT_COLOR[id]!}
          />
        );
      })}
    </g>
  );

  const totalIntensity = heat.reduce((s, p) => s + p.intensity, 0);

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatToolbar}>
        <div className={styles.heatToolbarGroup}>
          <span className={styles.heatToolbarLabel}>CAT</span>
          <ChipRow<CatScope>
            value={catScope}
            onChange={setCatScope}
            options={[
              { value: "BOTH", label: "BOTH" },
              { value: "OLLIE", label: "OLLIE" },
              { value: "HOPE", label: "HOPE" },
            ]}
          />
        </div>
        <div className={styles.heatToolbarGroup}>
          <span className={styles.heatToolbarLabel}>WINDOW</span>
          <ChipRow<DayRange>
            value={dayRange}
            onChange={setDayRange}
            options={(["1", "7", "30"] as DayRange[]).map((v) => ({ value: v, label: DAY_RANGE_LABEL[v] }))}
          />
        </div>
        <div className={styles.heatToolbarGroup}>
          <span className={styles.heatToolbarLabel}>HOURS</span>
          <ChipRow<HourBand>
            value={hourBand}
            onChange={setHourBand}
            options={(["ALL", "MORN", "AFT", "EVE", "NIGHT"] as HourBand[]).map((v) => ({
              value: v,
              label: HOUR_BAND_RANGE[v].label,
            }))}
          />
        </div>
      </div>

      <div className={styles.heatmapStage}>
        <FloorPlan cats={[]} heatLayer={heatLayer} />
      </div>

      <div className={styles.heatFooter}>
        <div className={styles.heatLegend}>
          {catIds.map((id) => (
            <span key={id} className={styles.heatLegendItem}>
              <span className={styles.heatLegendSwatch} style={{ background: CAT_COLOR[id] }} />
              <span className={styles.heatLegendName}>{CAT_NAME[id]!.toUpperCase()}</span>
            </span>
          ))}
        </div>
        <div className={styles.heatStats}>
          <span className={styles.heatStat}>
            {topSpots.length}{" "}
            <span className={styles.heatStatDim}>HOTSPOTS · {HOT_SPOTS.length} TRACKED</span>
          </span>
          <span className={styles.heatStat}>
            {totalIntensity.toFixed(0)}{" "}
            <span className={styles.heatStatDim}>HEAT UNITS</span>
          </span>
        </div>
      </div>
    </div>
  );
}
