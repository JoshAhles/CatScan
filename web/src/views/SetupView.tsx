import { useState } from "react";
import { CatPairing } from "../components/setup/CatPairing";
import { CalibrationFlow } from "../components/setup/CalibrationFlow";
import { TabBar } from "../components/TabBar";
import { DEMO_MODE } from "../demo/demoController";
import styles from "../styles/mission.module.css";

type SetupTab = "CATS" | "CALIBRATE";
const SETUP_TABS: SetupTab[] = ["CATS", "CALIBRATE"];

export function SetupView() {
  const [tab, setTab] = useState<SetupTab>("CATS");
  return (
    <div>
      <TabBar
        tabs={SETUP_TABS}
        active={tab}
        onTabChange={(t) => setTab(t as SetupTab)}
      />
      <div style={{ padding: "1rem" }}>
        {DEMO_MODE && (
          <div className={styles.demoBanner} role="status">
            <span className={styles.demoBannerTag}>DEMO MODE</span>
            <span className={styles.demoBannerText}>
              Setup actions (pairing, calibration) require the Pi + ESP32
              nodes to be online. They will fail silently until hardware is
              provisioned.
            </span>
          </div>
        )}
        {tab === "CATS" && <CatPairing />}
        {tab === "CALIBRATE" && <CalibrationFlow />}
      </div>
    </div>
  );
}
