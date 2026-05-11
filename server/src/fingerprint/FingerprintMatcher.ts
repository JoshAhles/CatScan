export function euclidean(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("vector dim mismatch");
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function hungarianN2(cost: number[][]): [number, number] {
  // Only handles 2x2; for n>2 use a real Hungarian impl in v1.x.
  const a = cost[0]![0]! + cost[1]![1]!;
  const b = cost[0]![1]! + cost[1]![0]!;
  return a <= b ? [0, 1] : [1, 0];
}

export class FingerprintMatcher {
  constructor(private centroids: Record<string, number[]>) {}

  nearestCentroid(v: number[]): { room: string; distance: number } | null {
    let best: { room: string; distance: number } | null = null;
    for (const [room, c] of Object.entries(this.centroids)) {
      const d = euclidean(v, c);
      if (!best || d < best.distance) best = { room, distance: d };
    }
    return best;
  }

  nearestWithMargin(v: number[], currentRoom: string, marginDbm: number): { room: string; distance: number } | null {
    const cur = this.centroids[currentRoom];
    if (!cur) return this.nearestCentroid(v);
    const dCur = euclidean(v, cur);
    const best = this.nearestCentroid(v);
    if (!best || best.room === currentRoom) return null;
    return (dCur - best.distance) > marginDbm ? best : null;
  }

  setCentroid(room: string, centroid: number[]) {
    this.centroids[room] = centroid;
  }
}
