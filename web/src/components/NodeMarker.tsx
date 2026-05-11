import type { NodeState } from "../types/contracts";

interface NodeMarkerProps {
  node: NodeState;
  x: number;
  y: number;
}

const STATUS_COLOR: Record<NodeState["status"], string> = {
  online: "#1ee0c9",
  offline: "#ff4d6a",
  discovered: "#ffcc4d",
};

export function NodeMarker({ node, x, y }: NodeMarkerProps) {
  const color = STATUS_COLOR[node.status];
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{node.roomName ?? node.id}</title>
      <rect
        x={-6}
        y={-6}
        width={12}
        height={12}
        fill="#0d1520"
        stroke={color}
        strokeWidth={1.5}
        rx={2}
      />
      <circle cx={0} cy={0} r={3} fill={color} />
    </g>
  );
}
