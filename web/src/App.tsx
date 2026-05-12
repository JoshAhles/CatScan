import { useEffect, useState } from "react";
import { HUD } from "./components/HUD";
import { TabBar } from "./components/TabBar";
import { LiveView } from "./views/LiveView";
import { HeatmapView } from "./views/HeatmapView";
import { SetupView } from "./views/SetupView";
import { useWsStore } from "./stores/wsStore";
import { useCatScanSocket, type ConnectionStatus } from "./hooks/useCatScanSocket";
import { DEMO_MODE, installDemo } from "./demo/demoController";
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
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour12: false })
  );
  const nodes = useWsStore((s) => s.nodes);
  const onlineCount = nodes.filter((n) => n.status === "online").length;

  // Live mode: single shared WS keeps the store fresh across tabs.
  // Demo mode: skip WS entirely; a synthetic event loop drives the store.
  const liveStatus = useCatScanSocket(DEMO_MODE ? null : WS_URL);
  const wsStatus: ConnectionStatus = DEMO_MODE ? "open" : liveStatus;

  useEffect(() => {
    if (!DEMO_MODE) return;
    const dispose = installDemo();
    return dispose;
  }, []);

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
        totalNodes={Math.max(6, nodes.length)}
        sessionTime={clock}
        uptimeSec={0}
        wsStatus={wsStatus}
        demoMode={DEMO_MODE}
      />
      <TabBar tabs={TABS} active={tab} onTabChange={(t) => setTab(t as Tab)} />
      {tab === "LIVE" && <LiveView />}
      {tab === "HEATMAP" && <HeatmapView />}
      {tab === "SETUP" && <SetupView />}
    </div>
  );
}
