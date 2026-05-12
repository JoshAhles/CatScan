import type { NodeState } from "../types/contracts";

interface NodeMarkerProps {
  node: NodeState;
  x: number;
  y: number;
  index?: number;
}

const STATUS_COLOR: Record<NodeState["status"], string> = {
  online: "#1ee0c9",
  offline: "#ff4d6a",
  discovered: "#ffcc4d",
};

export function NodeMarker({ node, x, y, index }: NodeMarkerProps) {
  const color = STATUS_COLOR[node.status];
  const online = node.status === "online";
  const label = index !== undefined ? `N${String(index).padStart(2, "0")}` : "";

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{node.roomName ?? node.id}</title>

      {/* Outer animated ring — only when online */}
      {online && (
        <circle r="14" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5">
          <animate attributeName="r" values="9;18" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Middle ring */}
      <circle r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.75" />

      {/* Inner ring + crosshair */}
      <circle r="4" fill="#06080d" stroke={color} strokeWidth="1.2" />
      <line x1="-2" y1="0" x2="2" y2="0" stroke={color} strokeWidth="0.8" />
      <line x1="0" y1="-2" x2="0" y2="2" stroke={color} strokeWidth="0.8" />

      {/* Center dot */}
      <circle r="1.2" fill={color} />

      {/* N0X tag */}
      {label && (
        <text
          x="12"
          y="3"
          fontSize="7"
          fontFamily="ui-monospace, Menlo, monospace"
          letterSpacing="0.12em"
          fill={color}
          opacity="0.85"
        >
          {label}
        </text>
      )}
    </g>
  );
}
