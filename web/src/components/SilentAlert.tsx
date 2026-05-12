import { useEffect, useState } from "react";
import { useWsStore } from "../stores/wsStore";
import styles from "../styles/mission.module.css";

/** Minutes of silence before a cat warrants a visible banner. */
const SILENT_BANNER_THRESHOLD_SEC = 5 * 60;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Surfaces a row of pills (one per silent cat) under the HUD when a cat has
 * been silent for more than SILENT_BANNER_THRESHOLD_SEC seconds. Clicking a
 * pill opens that cat's detail panel.
 *
 * Rationale: a cat going silent for a few minutes is normal RSSI noise — but
 * extended silence usually means a dead AirTag battery, a hardware blind
 * spot, or the cat is hiding somewhere RSSI-dead. The owner wants to know.
 */
export function SilentAlert() {
  const cats = useWsStore((s) => s.cats);
  const setSelectedCatId = useWsStore((s) => s.setSelectedCatId);

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const silentCats = cats
    .filter((c) => c.silent && c.lastSeen != null && nowSec - c.lastSeen >= SILENT_BANNER_THRESHOLD_SEC)
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      lastRoom: c.lastRoom,
      duration: nowSec - (c.lastSeen ?? nowSec),
    }));

  if (silentCats.length === 0) return null;

  return (
    <div className={styles.silentAlertRow} role="status" aria-live="polite">
      {silentCats.map((sc) => (
        <button
          key={sc.id}
          type="button"
          className={styles.silentAlertPill}
          style={{
            borderColor: sc.color,
            color: sc.color,
            boxShadow: `0 0 10px ${sc.color}33`,
          }}
          onClick={() => setSelectedCatId(sc.id)}
        >
          <span className={styles.silentAlertDot} style={{ background: sc.color }} />
          <span className={styles.silentAlertText}>
            {sc.name.toUpperCase()} SILENT · {formatDuration(sc.duration)}
            {sc.lastRoom && (
              <span className={styles.silentAlertMeta}> · last seen {sc.lastRoom.toUpperCase()}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
