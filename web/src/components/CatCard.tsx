import type { CatState } from "../types/contracts";
import styles from "../styles/mission.module.css";

interface CatCardProps {
  cat: CatState;
  nowSec: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function CatCard({ cat, nowSec }: CatCardProps) {
  return (
    <div className={styles.catCard}>
      <div className={styles.catCardHeader}>
        <div className={styles.catDot} style={{ background: cat.color }} />
        <span className={styles.catName}>{cat.name}</span>
      </div>
      {cat.silent ? (
        <div className={styles.catStatus}>
          <span className={styles.catSilent}>
            last seen <span className={styles.catRoom}>{cat.lastRoom ?? "unknown"}</span>
            {" · "}
            {cat.lastSeen != null ? formatDuration(nowSec - cat.lastSeen) : "?"} ago
          </span>
        </div>
      ) : (
        <div className={styles.catStatus}>
          <span className={styles.catRoom}>{cat.room}</span>
          {cat.since != null && (
            <span> · {formatDuration(nowSec - cat.since)}</span>
          )}
        </div>
      )}
    </div>
  );
}
