import { useState } from "react";
import { NodeNamer } from "../components/setup/NodeNamer";
import { CatPairing } from "../components/setup/CatPairing";
import { CalibrationFlow } from "../components/setup/CalibrationFlow";
import { TabBar } from "../components/TabBar";
import styles from "../styles/mission.module.css";

type SetupTab = "NODES" | "CATS" | "CALIBRATE";
const SETUP_TABS: SetupTab[] = ["NODES", "CATS", "CALIBRATE"];

export function SetupView() {
  const [tab, setTab] = useState<SetupTab>("NODES");
  return (
    <div>
      <TabBar
        tabs={SETUP_TABS}
        active={tab}
        onTabChange={(t) => setTab(t as SetupTab)}
      />
      <div style={{ padding: "1rem" }}>
        {tab === "NODES" && <NodeNamer />}
        {tab === "CATS" && <CatPairing />}
        {tab === "CALIBRATE" && <CalibrationFlow />}
      </div>
    </div>
  );
}
