import { useEffect, useState } from "react";
import { HUD } from "./components/HUD";
import { SilentAlert } from "./components/SilentAlert";
import { TabBar } from "./components/TabBar";
import { LiveView } from "./views/LiveView";
import { HeatmapView } from "./views/HeatmapView";
import { SetupView } from "./views/SetupView";
import { useWsStore } from "./stores/wsStore";
import { useCatScanSocket, type ConnectionStatus } from "./hooks/useCatScanSocket";
import { DEMO_MODE, installDemo } from "./demo/demoController";
import { floorPlanConfig } from "./floorPlan/config";
import styles from "./styles/mission.module.css";

type Tab = "LIVE" | "HEATMAP" | "SETUP";
const TABS: Tab[] = ["LIVE", "HEATMAP", "SETUP"];

const WS_TOKEN = (import.meta.env["VITE_CATSCAN_TOKEN"] as string) ?? "";
const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws${
        WS_TOKEN ? `?token=${encodeURIComponent(WS_TOKEN)}` : ""
      }`
    : "ws://localhost:8787/ws";

export default function App() {
  const [tab, setTab] = useState<Tab>("LIVE");

  // Primitive selectors — App only re-renders when the *count* changes, not
  // on every RSSI tick that mutates `nodes`. (Previously this subscribed to
  // the whole `nodes` array and cascaded re-renders through the tree.)
  const onlineCount = useWsStore((s) => s.nodes.filter((n) => n.status === "online").length);
  const totalNodes = useWsStore((s) => s.nodes.length);

  // Live mode: single shared WS keeps the store fresh across tabs.
  // Demo mode: skip WS entirely; a synthetic event loop drives the store.
  const liveStatus = useCatScanSocket(DEMO_MODE ? null : WS_URL);
  const wsStatus: ConnectionStatus = DEMO_MODE ? "open" : liveStatus;

  useEffect(() => {
    if (!DEMO_MODE) return;
    const dispose = installDemo();
    return dispose;
  }, []);

  return (
    <div className={styles.root}>
      <HUD
        onlineNodeCount={onlineCount}
        totalNodes={totalNodes}
        uptimeSec={0}
        wsStatus={wsStatus}
        demoMode={DEMO_MODE}
      />
      <SilentAlert />
      <TabBar tabs={TABS} active={tab} onTabChange={(t) => setTab(t as Tab)} />
      {tab === "LIVE" && <LiveView />}
      {tab === "HEATMAP" && <HeatmapView />}
      {tab === "SETUP" && <SetupView />}
    </div>
  );
}
