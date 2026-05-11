/** Compute the centroid of a polygon as the average of its vertices. */
export function roomCenter(polygon: [number, number][]): [number, number] {
  const n = polygon.length;
  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of polygon) {
    sumX += x;
    sumY += y;
  }
  return [sumX / n, sumY / n];
}

/** Ray-casting point-in-polygon test. */
export function pointInRoom(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
