import { useEffect, useState } from "react";
import { HUD } from "./components/HUD";
import { TabBar } from "./components/TabBar";
import { LiveView } from "./views/LiveView";
import { TimelineView } from "./views/TimelineView";
import { HeatmapView } from "./views/HeatmapView";
import { SetupView } from "./views/SetupView";
import { useWsStore } from "./stores/wsStore";
import { useCatScanSocket } from "./hooks/useCatScanSocket";
import styles from "./styles/mission.module.css";

type Tab = "LIVE" | "TIMELINE" | "HEATMAP" | "SETUP";
const TABS: Tab[] = ["LIVE", "TIMELINE", "HEATMAP", "SETUP"];

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`
    : "ws://localhost:8787/ws";

const today = new Date().toISOString().slice(0, 10);
const nowSec = Math.floor(Date.now() / 1000);
const dayAgo = nowSec - 86400;

export default function App() {
  const [tab, setTab] = useState<Tab>("LIVE");
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour12: false })
  );
  const nodes = useWsStore((s) => s.nodes);
  const onlineCount = nodes.filter((n) => n.status === "online").length;

  // Single shared WS connection — keeps the store fresh across all tabs.
  const wsStatus = useCatScanSocket(WS_URL);

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.root}>
      <HUD
        onlineNodeCount={onlineCount}
        totalNodes={6}
        sessionTime={clock}
        uptimeSec={0}
        wsStatus={wsStatus}
      />
      <TabBar tabs={TABS} active={tab} onTabChange={(t) => setTab(t as Tab)} />
      {tab === "LIVE" && <LiveView />}
      {tab === "TIMELINE" && <TimelineView catId={1} date={today} />}
      {tab === "HEATMAP" && <HeatmapView catId={1} from={dayAgo} to={nowSec} />}
      {tab === "SETUP" && <SetupView />}
    </div>
  );
}
