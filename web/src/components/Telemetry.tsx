import { useWsStore } from "../stores/wsStore";
import { rssiBars } from "./rssi";
import styles from "../styles/mission.module.css";

export function Telemetry() {
  const nodes = useWsStore((s) => s.nodes);
  const cats = useWsStore((s) => s.cats);

  const online = nodes.filter((n) => n.status === "online").length;

  return (
    <aside className={styles.telemetryPanel} aria-label="Node telemetry">
      <div className={styles.panelHeader}>
        <span className={styles.panelMeta}>
          {online}/{nodes.length} <span className={styles.panelMetaDim}>ONLINE</span>
        </span>
      </div>

      <div className={styles.telemetryBody}>
        {nodes.length === 0 ? (
          <div className={styles.telemetryEmpty}>NO NODES REGISTERED</div>
        ) : (
          nodes.map((node, i) => {
            const idx = String(i + 1).padStart(2, "0");
            return (
              <div key={node.id} className={styles.telemetryNode} data-status={node.status}>
                <div className={styles.telemetryNodeHeader}>
                  <span className={styles.telemetryNodeId}>N{idx}</span>
                  <span className={styles.telemetryNodeRoom}>
                    {node.roomName?.toUpperCase() ?? "UNNAMED"}
                  </span>
                  <span className={`${styles.statusDot} ${styles[`statusDot_${node.status}`]}`} />
                </div>
                <div className={styles.telemetryCatList}>
                  {cats.length === 0 ? (
                    <div className={styles.telemetryEmpty}>— NO CATS BOUND —</div>
                  ) : (
                    cats.map((cat) => {
                      const rssi = node.rssiByCatId[String(cat.id)];
                      const bars = rssiBars(rssi);
                      return (
                        <div key={cat.id} className={styles.telemetryCatRow}>
                          <span
                            className={styles.telemetryCatTag}
                            style={{ color: cat.color }}
                          >
                            {cat.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className={styles.telemetryBars}>
                            {[0, 1, 2, 3, 4].map((b) => (
                              <span
                                key={b}
                                className={`${styles.telemetryBar} ${b < bars ? styles.telemetryBarOn : ""}`}
                              />
                            ))}
                          </span>
                          <span className={styles.telemetryRssi}>
                            {rssi !== undefined ? `${rssi} dBm` : "— dBm"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
