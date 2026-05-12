import { useEffect, useState } from "react";
import { api } from "../api/client";
import { floorPlanConfig } from "../floorPlan/config";
import { roomCenter } from "../floorPlan/geometry";
import styles from "../styles/mission.module.css";

interface HeatmapEntry {
  room: string;
  durationSec: number;
}

interface HeatmapViewProps {
  catId: number;
  from: number;
  to: number;
}

export function HeatmapView({ catId, from, to }: HeatmapViewProps) {
  const [data, setData] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api<HeatmapEntry[]>(`/api/heatmap?catId=${catId}&from=${from}&to=${to}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed");
        setLoading(false);
      });
  }, [catId, from, to]);

  if (loading) return <div style={{ padding: "1rem", color: "#6a8090", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>LOADING…</div>;
  if (error) return <div style={{ padding: "1rem", color: "#ff4d6a", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>ERROR: {error}</div>;

  const maxDuration = Math.max(...data.map((d) => d.durationSec), 1);
  const { viewBox, rooms } = floorPlanConfig;

  return (
    <div style={{ padding: "1rem" }}>
      <svg viewBox={viewBox} className={styles.floorPlanSvg}>
        {rooms.map((room) => {
          const entry = data.find((d) => d.room === room.name);
          const intensity = entry ? entry.durationSec / maxDuration : 0;
          const alpha = 0.1 + intensity * 0.7;
          return (
            <g key={room.name}>
              {/* Subtle room tint (same as LiveView) */}
              <polygon
                points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                className={styles.roomFill}
                style={{ fill: room.color, fillOpacity: 0.12 }}
              />
              {/* Heatmap overlay — warm amber so it doesn't compete with cyan chrome */}
              <polygon
                points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={`rgba(255, 204, 77, ${alpha})`}
                style={{ pointerEvents: "none" }}
              />
              {/* Wall */}
              <polygon
                points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                className={styles.roomWall}
              />
              <text
                x={roomCenter(room.polygon)[0]}
                y={roomCenter(room.polygon)[1]}
                className={styles.roomName}
                style={{ textAnchor: "middle" }}
              >
                {room.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
