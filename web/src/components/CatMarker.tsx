import { motion } from "framer-motion";
import type { CatState } from "../types/contracts";

interface CatMarkerProps {
  cat: CatState;
  x: number;
  y: number;
}

export function CatMarker({ cat, x, y }: CatMarkerProps) {
  return (
    <motion.g
      animate={{ x, y }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      initial={{ x, y }}
      aria-label={cat.name}
      data-testid={`cat-marker-${cat.id}`}
    >
      <title>{cat.name}</title>
      {/* Pulsing outer ring — driven by SVG animate, not Framer */}
      <circle r="18" fill="none" stroke={cat.color} strokeWidth="1.5" opacity="0.3">
        <animate
          attributeName="r"
          values="12;22"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.5;0"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Inner dot */}
      <circle r="8" fill={cat.color} opacity={cat.silent ? 0.35 : 0.9} />
      {/* Name label */}
      <text
        textAnchor="middle"
        dy={-14}
        fontSize={10}
        fill={cat.color}
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.05em"
      >
        {cat.name.toUpperCase()}
      </text>
    </motion.g>
  );
}
