import type { NodeState } from "../types/contracts";
import styles from "../styles/mission.module.css";

interface NodeStatusListProps {
  nodes: NodeState[];
}

/** Convert RSSI to 0–4 signal bar count. */
function rssiToBars(rssi: number): number {
  if (rssi >= -60) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -80) return 2;
  if (rssi >= -90) return 1;
  return 0;
}

function SignalBars({ rssi, status }: { rssi: number | undefined; status: NodeState["status"] }) {
  if (status === "offline") {
    return (
      <div className={styles.signalBars} aria-label="offline">
        {[4, 8, 11, 14].map((h, i) => (
          <div
            key={i}
            className={styles.signalBar}
            style={{ height: h, opacity: 0.3 }}
          />
        ))}
      </div>
    );
  }
  const bars = rssi !== undefined ? rssiToBars(rssi) : 0;
  return (
    <div className={styles.signalBars} aria-label={`${bars} bars`}>
      {[4, 8, 11, 14].map((h, i) => (
        <div
          key={i}
          className={`${styles.signalBar} ${i < bars ? styles.signalBarFilled : ""}`}
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export function NodeStatusList({ nodes }: NodeStatusListProps) {
  return (
    <div className={styles.nodeList}>
      <div className={styles.nodeListTitle}>Nodes</div>
      {nodes.map((node) => {
        const rssiValues = Object.values(node.rssiByCatId);
        const avgRssi = rssiValues.length > 0
          ? rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length
          : undefined;
        return (
          <div key={node.id} className={styles.nodeRow} data-testid="node-row">
            <span className={styles.nodeId}>
              {node.roomName ?? node.id}
            </span>
            <SignalBars rssi={avgRssi} status={node.status} />
          </div>
        );
      })}
    </div>
  );
}
