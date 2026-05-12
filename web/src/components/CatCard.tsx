import type { CatState } from "../types/contracts";
import { SLEEP_THRESHOLD_SEC, formatDuration } from "../lib/duration";
import styles from "../styles/mission.module.css";

interface CatCardProps {
  cat: CatState;
  nowSec: number;
  onSelect?: (catId: number) => void;
}

export function CatCard({ cat, nowSec, onSelect }: CatCardProps) {
  const interactive = !!onSelect;
  const dwellSec = !cat.silent && cat.since != null ? nowSec - cat.since : 0;
  const isSleeping = !cat.silent && dwellSec >= SLEEP_THRESHOLD_SEC;

  return (
    <div
      className={`${styles.catCard} ${interactive ? styles.catCardClickable : ""}`}
      onClick={onSelect ? () => onSelect(cat.id) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(cat.id);
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? `Open ${cat.name} detail` : undefined}
    >
      {cat.photoPath ? (
        <img
          className={styles.catCardAvatar}
          src={cat.photoPath}
          alt={cat.name}
          style={{ borderColor: cat.color, boxShadow: `0 0 14px ${cat.color}55` }}
        />
      ) : (
        <div
          className={styles.catCardAvatarFallback}
          style={{ background: cat.color, boxShadow: `0 0 14px ${cat.color}55` }}
          aria-label={cat.name}
        >
          {cat.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      {cat.silent ? (
        <div className={styles.catCardLocation}>
          <span className={styles.catSilent}>SILENT</span>
          <span className={styles.catCardMeta}>
            last seen <span className={styles.catRoom}>{cat.lastRoom ?? "?"}</span>
            {cat.lastSeen != null && (
              <> · {formatDuration(nowSec - cat.lastSeen)} ago</>
            )}
          </span>
        </div>
      ) : isSleeping ? (
        <div className={styles.catCardLocation}>
          <span className={styles.catSleeping}>
            <span className={styles.catSleepingGlyph} aria-hidden="true">z</span>
            SLEEPING
          </span>
          <span className={styles.catCardMeta}>
            in <span className={styles.catRoom}>{cat.room}</span>
            {" · "}
            {formatDuration(dwellSec)}
          </span>
        </div>
      ) : (
        <div className={styles.catCardLocation}>
          <span className={styles.catRoom}>{cat.room}</span>
          {cat.since != null && (
            <span className={styles.catCardMeta}>{formatDuration(dwellSec)}</span>
          )}
        </div>
      )}
    </div>
  );
}
