import { useWsStore } from "../stores/wsStore";
import styles from "../styles/mission.module.css";

function formatHMS(ts: number): string {
  const d = new Date(ts * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function ActivityLog() {
  const events = useWsStore((s) => s.events);

  return (
    <section className={styles.activityLog} aria-label="Activity feed">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>◢ EVENT FEED</span>
        <span className={styles.panelMeta}>
          {events.length} <span className={styles.panelMetaDim}>EVENTS</span>
        </span>
      </div>
      <ol className={styles.activityList}>
        {events.length === 0 ? (
          <li className={`${styles.activityItem} ${styles.activityToneDim}`}>
            <span className={styles.activityTime}>--:--:--</span>
            <span className={styles.activityIcon}>·</span>
            <span className={styles.activityMsg}>waiting for activity…</span>
          </li>
        ) : (
          events.slice(0, 14).map((e) => (
            <li
              key={e.id}
              className={`${styles.activityItem} ${styles[`activityTone${capitalize(e.tone)}`]}`}
            >
              <span className={styles.activityTime}>{formatHMS(e.ts)}</span>
              <span className={styles.activityIcon}>{e.icon}</span>
              <span className={styles.activityMsg}>{e.message}</span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
