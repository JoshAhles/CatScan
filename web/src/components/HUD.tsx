import styles from "../styles/mission.module.css";

interface HUDProps {
  onlineNodeCount: number;
  totalNodes: number;
  sessionTime: string;
  uptimeSec: number;
}

export function HUD({ onlineNodeCount, totalNodes, sessionTime }: HUDProps) {
  return (
    <div className={styles.hud}>
      <span className={styles.hudBrand}>◢ CATSCAN</span>
      <span className={styles.hudStat}>
        <span>{onlineNodeCount}/{totalNodes} NODES</span>
      </span>
      <span className={styles.hudSpacer} />
      <span className={styles.hudStat}>
        <span>{sessionTime}</span>
      </span>
      <span className={styles.hudLive}>
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill="#1ee0c9" opacity="0.9" />
          <circle cx="4" cy="4" r="4" fill="#1ee0c9" opacity="0.4">
            <animate
              attributeName="r"
              values="2;4"
              dur="1.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;0"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        LIVE
      </span>
    </div>
  );
}
