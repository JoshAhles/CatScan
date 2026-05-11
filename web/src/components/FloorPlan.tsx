import { floorPlanConfig } from "../floorPlan/config";
import { roomCenter } from "../floorPlan/geometry";
import type { CatState, NodeState } from "../types/contracts";
import { CatMarker } from "./CatMarker";
import { NodeMarker } from "./NodeMarker";
import styles from "../styles/mission.module.css";

interface FloorPlanProps {
  cats: CatState[];
  nodes: NodeState[];
}

export function FloorPlan({ cats, nodes }: FloorPlanProps) {
  const { viewBox, rooms, hallway, nodes: nodeConfigs } = floorPlanConfig;

  function catPosition(cat: CatState): [number, number] {
    if (!cat.silent && cat.room) {
      const roomCfg = rooms.find((r) => r.name === cat.room);
      if (roomCfg) return roomCenter(roomCfg.polygon);
    }
    // Silent or unknown — use last known room or default center
    const fallbackRoom = cat.silent && cat.lastRoom
      ? rooms.find((r) => r.name === cat.lastRoom)
      : null;
    if (fallbackRoom) return roomCenter(fallbackRoom.polygon);
    return [400, 300]; // SVG center fallback
  }

  return (
    <svg
      viewBox={viewBox}
      className={styles.floorPlanSvg}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Room polygons */}
      {rooms.map((room) => (
        <g key={room.name}>
          <polygon
            points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
            className={styles.room}
            style={{ fill: room.color }}
          />
          <text
            x={roomCenter(room.polygon)[0]}
            y={roomCenter(room.polygon)[1]}
            className={styles.roomLabel}
          >
            {room.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Hallway */}
      <polygon
        points={hallway.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
        className={styles.room}
      />
      <text
        x={roomCenter(hallway.polygon)[0]}
        y={roomCenter(hallway.polygon)[1]}
        className={styles.roomLabel}
        fontSize={9}
      >
        HALL
      </text>

      {/* Node markers */}
      {nodeConfigs.map((nc) => {
        const liveNode = nodes.find((n) => n.id === nc.id);
        if (!liveNode) return null;
        return (
          <NodeMarker
            key={nc.id}
            node={liveNode}
            x={nc.pos[0]}
            y={nc.pos[1]}
          />
        );
      })}

      {/* Cat markers */}
      {cats.map((cat) => {
        const [x, y] = catPosition(cat);
        return <CatMarker key={cat.id} cat={cat} x={x} y={y} />;
      })}
    </svg>
  );
}
