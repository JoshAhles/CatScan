import { useMemo, useState } from "react";
import { useWsStore } from "../stores/wsStore";
import { useCatScanSocket } from "../hooks/useCatScanSocket";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { FloorPlan } from "../components/FloorPlan";
import { CatCard } from "../components/CatCard";
import { NodeStatusList } from "../components/NodeStatusList";
import styles from "../styles/mission.module.css";

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`
    : "ws://localhost:8787/ws";

interface TrackingPanelProps {
  drawerOpen?: boolean;
  isMobile?: boolean;
}

function TrackingPanel({ drawerOpen, isMobile }: TrackingPanelProps) {
  const cats = useWsStore((s) => s.cats);
  const nodes = useWsStore((s) => s.nodes);
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const drawerClass = isMobile
    ? `${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`
    : styles.trackingPanel;

  return (
    <div className={drawerClass} data-testid="tracking-panel">
      {cats.map((cat) => (
        <CatCard key={cat.id} cat={cat} nowSec={nowSec} />
      ))}
      <NodeStatusList nodes={nodes} />
    </div>
  );
}

interface LiveViewProps {
  wsUrl?: string;
}

export function LiveView({ wsUrl = WS_URL }: LiveViewProps) {
  const status = useCatScanSocket(wsUrl);
  const cats = useWsStore((s) => s.cats);
  const nodes = useWsStore((s) => s.nodes);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {status !== "open" && (
        <div className={styles.reconnectBanner} role="status">
          RECONNECTING…
        </div>
      )}
      <div className={styles.layout} data-testid="live-view">
        <TrackingPanel drawerOpen={drawerOpen} isMobile={isMobile} />
        <div className={styles.floorPlanArea}>
          <FloorPlan cats={cats} nodes={nodes} />
        </div>
      </div>
      {isMobile && (
        <button
          className={styles.drawerToggle}
          data-testid="drawer-toggle"
          aria-label="Toggle tracking panel"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          {drawerOpen ? "✕" : "☰"}
        </button>
      )}
    </>
  );
}
