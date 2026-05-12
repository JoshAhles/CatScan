/**
 * Per-cat heat signatures. Each `HotSpot` is a sub-room favourite (food bowl,
 * sofa corner, cat tree top, bed pillow, etc.) tagged with a 24-element
 * `hourly` weight vector. The aggregate "heat" at any time band is the sum,
 * over the selected cats' hot-spots, of their hourly weights × days in the
 * window. Coordinates are in the floor-plan SVG space (see floorPlan/config).
 *
 * When real hardware lands, the server will expose a `/api/heat` endpoint
 * returning points of the same shape (x, y, weight, catId) derived from
 * smoothed RSSI vectors + room centroids. The HeatmapView UI is agnostic to
 * the source — it just needs the {x, y, intensity} list.
 */
import { DEMO_CATS } from "./demoData";

export interface HotSpot {
  catId: number;
  x: number;
  y: number;
  /** 24-element activity vector. Each element is a relative weight for that
   *  hour-of-day; the sum across hours represents that spot's daily share. */
  hourly: number[];
}

export interface HeatPoint {
  x: number;
  y: number;
  catId: number;
  intensity: number;
}

const OLLIE = DEMO_CATS.ollie.id;
const HOPE = DEMO_CATS.hope.id;

/** Build a 24-element vector with a smooth bump centered at `peakHour`. */
function bump(peakHour: number, height: number, width: number): number[] {
  const v = new Array<number>(24).fill(0);
  for (let h = 0; h < 24; h++) {
    // Wrap-aware circular distance between hours
    const d = Math.min(
      Math.abs(h - peakHour),
      24 - Math.abs(h - peakHour)
    );
    v[h] = height * Math.exp(-(d * d) / (2 * width * width));
  }
  return v;
}

/** Element-wise sum of multiple 24-element vectors. */
function sumHourly(...vecs: number[][]): number[] {
  const out = new Array<number>(24).fill(0);
  for (const v of vecs) for (let h = 0; h < 24; h++) out[h]! += v[h]!;
  return out;
}

/**
 * Hot-spots — coordinates derived from the floor plan polygons. Each spot's
 * hourly profile is hand-tuned to express the cat's personality:
 *   Ollie: window-loving day-sleeper, sofa in evenings, bed at night.
 *   Hope:  cat-room dweller, sun-bath afternoons, cat-tree perch at night.
 */
export const HOT_SPOTS: HotSpot[] = [
  // ─── Ollie ───────────────────────────────────────────────
  // Kitchen food bowl — narrow peaks at meal times.
  { catId: OLLIE, x: 200, y: 280, hourly: sumHourly(bump(7, 1.2, 0.8), bump(18, 1.4, 0.8)) },
  // Living Room sunny window (top of LR, east side) — late morning into afternoon.
  { catId: OLLIE, x: 630, y: 95, hourly: bump(12, 2.4, 2.5) },
  // Living Room sofa corner — evening with humans.
  { catId: OLLIE, x: 530, y: 260, hourly: bump(20, 2.8, 2.2) },
  // Master Bedroom bed — overnight sleep with humans.
  { catId: OLLIE, x: 180, y: 470, hourly: sumHourly(bump(1, 2.2, 3.5), bump(23, 1.8, 2)) },
  // Office desk — middle of workday.
  { catId: OLLIE, x: 430, y: 510, hourly: bump(14, 1.6, 2.0) },

  // ─── Hope ────────────────────────────────────────────────
  // Cat Room cat-tree perch (top-right of cat room) — late evening.
  { catId: HOPE, x: 650, y: 450, hourly: bump(21, 2.6, 2.2) },
  // Cat Room bed — overnight.
  { catId: HOPE, x: 560, y: 545, hourly: bump(3, 2.8, 3.0) },
  // Cat Room sunny window — afternoon sunbath.
  { catId: HOPE, x: 670, y: 510, hourly: bump(14, 2.2, 2.0) },
  // Living Room floor — short visits, broad daytime presence.
  { catId: HOPE, x: 460, y: 280, hourly: bump(11, 1.0, 4.0) },
  // Master Bedroom pillow — quick morning greeting.
  { catId: HOPE, x: 150, y: 540, hourly: bump(6, 1.2, 1.0) },
  // Cat Room near food bowl door — small evening blip.
  { catId: HOPE, x: 540, y: 470, hourly: bump(18, 1.0, 1.0) },
];

export interface ComputeHeatArgs {
  /** Cat IDs to include. */
  catIds: number[];
  /** Number of days in the window — scales each spot's intensity. */
  days: number;
  /** Inclusive start hour (0–23). */
  hourFrom: number;
  /** Exclusive end hour (1–24). Wraps if < hourFrom. */
  hourTo: number;
}

/**
 * Aggregate heat for the requested window. Returns one point per hot-spot
 * that contributes within the time-of-day band, weighted by the days span.
 */
export function computeHeat(args: ComputeHeatArgs): HeatPoint[] {
  const { catIds, days, hourFrom, hourTo } = args;
  const inBand = (h: number): boolean => {
    if (hourTo > hourFrom) return h >= hourFrom && h < hourTo;
    // Wrap (e.g., 22 → 04)
    return h >= hourFrom || h < hourTo;
  };

  const points: HeatPoint[] = [];
  for (const spot of HOT_SPOTS) {
    if (!catIds.includes(spot.catId)) continue;
    let bandSum = 0;
    for (let h = 0; h < 24; h++) {
      if (inBand(h)) bandSum += spot.hourly[h] ?? 0;
    }
    const intensity = bandSum * days;
    if (intensity > 0.01) {
      points.push({ x: spot.x, y: spot.y, catId: spot.catId, intensity });
    }
  }
  return points;
}
