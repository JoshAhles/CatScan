import { useMemo, useState } from "react";
import { useWsStore } from "../stores/wsStore";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { FloorPlan } from "../components/FloorPlan";
import { CatCard } from "../components/CatCard";
import { Telemetry } from "../components/Telemetry";
import { ActivityLog } from "../components/ActivityLog";
import styles from "../styles/mission.module.css";

interface TrackingPanelProps {
  drawerOpen?: boolean;
  isMobile?: boolean;
}

function TrackingPanel({ drawerOpen, isMobile }: TrackingPanelProps) {
  const cats = useWsStore((s) => s.cats);
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const drawerClass = isMobile
    ? `${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`
    : styles.trackingPanel;

  return (
    <aside className={drawerClass} data-testid="tracking-panel" aria-label="Tracked cats">
      <div className={styles.panelHeader}>
        <span className={styles.panelMeta}>
          {cats.length} <span className={styles.panelMetaDim}>CATS</span>
        </span>
      </div>
      <div className={styles.trackingBody}>
        {cats.length === 0 ? (
          <div className={styles.telemetryEmpty}>NO CATS PAIRED</div>
        ) : (
          cats.map((cat) => <CatCard key={cat.id} cat={cat} nowSec={nowSec} />)
        )}
      </div>
    </aside>
  );
}

export function LiveView() {
  const cats = useWsStore((s) => s.cats);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMidWidth = useMediaQuery("(max-width: 1180px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className={styles.layout} data-testid="live-view">
        <TrackingPanel drawerOpen={drawerOpen} isMobile={isMobile} />
        <main className={styles.floorPlanArea}>
          <FloorPlan cats={cats} />
        </main>
        {!isMidWidth && <Telemetry />}
        <ActivityLog />
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
