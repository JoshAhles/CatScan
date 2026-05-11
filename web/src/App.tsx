import { useState } from "react";
import { HUD } from "./components/HUD";
import { TabBar } from "./components/TabBar";
import { LiveView } from "./views/LiveView";
import { TimelineView } from "./views/TimelineView";
import { HeatmapView } from "./views/HeatmapView";
import { SetupView } from "./views/SetupView";
import { useWsStore } from "./stores/wsStore";
import styles from "./styles/mission.module.css";

type Tab = "LIVE" | "TIMELINE" | "HEATMAP" | "SETUP";
const TABS: Tab[] = ["LIVE", "TIMELINE", "HEATMAP", "SETUP"];

const today = new Date().toISOString().slice(0, 10);
const nowSec = Math.floor(Date.now() / 1000);
const dayAgo = nowSec - 86400;

export default function App() {
  const [tab, setTab] = useState<Tab>("LIVE");
  const nodes = useWsStore((s) => s.nodes);
  const onlineCount = nodes.filter((n) => n.status === "online").length;

  return (
    <div className={styles.root}>
      <HUD
        onlineNodeCount={onlineCount}
        totalNodes={6}
        sessionTime={new Date().toLocaleTimeString("en-US", { hour12: false })}
        uptimeSec={0}
      />
      <TabBar tabs={TABS} active={tab} onTabChange={(t) => setTab(t as Tab)} />
      {tab === "LIVE" && <LiveView />}
      {tab === "TIMELINE" && <TimelineView catId={1} date={today} />}
      {tab === "HEATMAP" && <HeatmapView catId={1} from={dayAgo} to={nowSec} />}
      {tab === "SETUP" && <SetupView />}
    </div>
  );
}
