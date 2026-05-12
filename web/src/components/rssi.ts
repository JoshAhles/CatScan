/** Shared RSSI→bars mapping used by Telemetry + CatDetailPanel. */
export function rssiBars(rssi: number | undefined): number {
  if (rssi === undefined) return 0;
  // -50 → 5 bars, -65 → 4, -78 → 3, -88 → 2, -98 → 1, below → 0
  if (rssi >= -50) return 5;
  if (rssi >= -65) return 4;
  if (rssi >= -78) return 3;
  if (rssi >= -88) return 2;
  if (rssi >= -98) return 1;
  return 0;
}
