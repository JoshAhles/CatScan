import styles from "../styles/mission.module.css";
import type { ConnectionStatus } from "../hooks/useCatScanSocket";

interface HUDProps {
  onlineNodeCount: number;
  totalNodes: number;
  sessionTime: string;
  uptimeSec: number;
  wsStatus?: ConnectionStatus;
  demoMode?: boolean;
}

// "CatScan" — all glyphs in the same ANSI Shadow style, but the "at" and
// "can" segments are rendered at ~60% font-size so they read as lowercase.
// Bottom-aligned to the cap baseline via flex-end.
const C_LINES = [
  " ██████╗",
  "██╔════╝",
  "██║     ",
  "██║     ",
  "╚██████╗",
  " ╚═════╝",
];
const AT_LINES = [
  " █████╗ ████████╗",
  "██╔══██╗╚══██╔══╝",
  "███████║   ██║   ",
  "██╔══██║   ██║   ",
  "██║  ██║   ██║   ",
  "╚═╝  ╚═╝   ╚═╝   ",
];
const S_LINES = [
  "███████╗",
  "██╔════╝",
  "███████╗",
  "╚════██║",
  "███████║",
  "╚══════╝",
];
const CAN_LINES = [
  " ██████╗ █████╗ ███╗   ██╗",
  "██╔════╝██╔══██╗████╗  ██║",
  "██║     ███████║██╔██╗ ██║",
  "██║     ██╔══██║██║╚██╗██║",
  "╚██████╗██║  ██║██║ ╚████║",
  " ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝",
];

function StatusPill({ status }: { status: ConnectionStatus }) {
  if (status === "open") {
    return (
      <span className={`${styles.statusPill} ${styles.statusPillLive}`}>
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill="currentColor" opacity="0.9" />
          <circle cx="4" cy="4" r="4" fill="currentColor" opacity="0.4">
            <animate attributeName="r" values="2;4" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </svg>
        LIVE
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className={`${styles.statusPill} ${styles.statusPillReconnect}`}>
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill="currentColor" opacity="0.9">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </svg>
        RECONNECT
      </span>
    );
  }
  return (
    <span className={`${styles.statusPill} ${styles.statusPillOffline}`}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="currentColor" opacity="0.9" />
      </svg>
      OFFLINE
    </span>
  );
}

export function HUD({ onlineNodeCount, totalNodes, sessionTime, wsStatus = "open", demoMode = false }: HUDProps) {
  return (
    <header className={styles.headerBlock} aria-label="CatScan dashboard header">
      <div className={styles.logoWrapper} aria-label="CatScan">
        <pre className={`${styles.logoAscii} ${styles.logoBigCap}`} aria-hidden="true">
          {C_LINES.join("\n")}
        </pre>
        <pre className={`${styles.logoAscii} ${styles.logoSmallSeg}`} aria-hidden="true">
          {AT_LINES.join("\n")}
        </pre>
        <pre className={`${styles.logoAscii} ${styles.logoBigCap}`} aria-hidden="true">
          {S_LINES.join("\n")}
        </pre>
        <pre className={`${styles.logoAscii} ${styles.logoSmallSeg}`} aria-hidden="true">
          {CAN_LINES.join("\n")}
        </pre>
      </div>
      <div className={styles.headerStats}>
        <div className={styles.headerStat}>
          <span className={styles.headerStatValue}>{onlineNodeCount}/{totalNodes}</span>
          <span className={styles.headerStatLabel}>NODES</span>
        </div>
        <div className={styles.headerStat}>
          <span className={styles.headerStatValue}>{sessionTime}</span>
          <span className={styles.headerStatLabel}>LOCAL</span>
        </div>
        <div className={styles.headerStatusBlock}>
          {demoMode && <span className={styles.demoPill}>DEMO</span>}
          <StatusPill status={wsStatus} />
        </div>
      </div>
    </header>
  );
}
