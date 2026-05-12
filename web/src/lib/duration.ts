/** A dwell of at least this many seconds counts as "sleep" for the UI's
 *  long-dwell annotations. Tuned to ignore short naps but catch real rest
 *  periods — most cats nap for tens of minutes, but a deep sleep on the
 *  bed or cat tree easily clears two hours. */
export const SLEEP_THRESHOLD_SEC = 2 * 60 * 60;

/** Compact human-friendly duration: "12s", "9m", "7h 48m". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
