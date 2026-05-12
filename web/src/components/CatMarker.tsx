import { motion } from "framer-motion";
import type { CatState } from "../types/contracts";

interface CatMarkerProps {
  cat: CatState;
  x: number;
  y: number;
}

export function CatMarker({ cat, x, y }: CatMarkerProps) {
  const monogram = cat.name.slice(0, 1).toUpperCase();
  const silent = cat.silent;
  const innerOpacity = silent ? 0.35 : 1;

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      initial={{ x, y }}
      aria-label={cat.name}
      data-testid={`cat-marker-${cat.id}`}
      style={{ filter: silent ? "saturate(0.4)" : `drop-shadow(0 0 6px ${cat.color})` }}
    >
      <title>{cat.name}</title>

      {/* Two out-of-phase radar rings */}
      <circle r="20" fill="none" stroke={cat.color} strokeWidth="1.2" opacity="0.25">
        <animate attributeName="r" values="11;26" dur={silent ? "5s" : "2.2s"} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0" dur={silent ? "5s" : "2.2s"} repeatCount="indefinite" />
      </circle>
      <circle r="16" fill="none" stroke={cat.color} strokeWidth="1" opacity="0.35">
        <animate attributeName="r" values="11;22" dur={silent ? "5s" : "2.2s"} begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.45;0" dur={silent ? "5s" : "2.2s"} begin="0.7s" repeatCount="indefinite" />
      </circle>

      {/* Photo-circle placeholder: filled disk with thin border + monogram */}
      <circle r="11" fill={cat.color} opacity={innerOpacity * 0.95} />
      <circle r="11" fill="none" stroke={cat.color} strokeWidth="1.5" opacity={innerOpacity} />
      <text
        textAnchor="middle"
        dy="3.5"
        fontSize="11"
        fontWeight="700"
        fontFamily="ui-monospace, Menlo, monospace"
        fill="#06080d"
        opacity={innerOpacity}
      >
        {monogram}
      </text>

      {/* Name label below */}
      <text
        textAnchor="middle"
        dy="26"
        fontSize="8"
        fill={cat.color}
        fontFamily="ui-monospace, Menlo, monospace"
        letterSpacing="0.18em"
        opacity={silent ? 0.5 : 1}
      >
        {cat.name.toUpperCase()}
      </text>
    </motion.g>
  );
}
