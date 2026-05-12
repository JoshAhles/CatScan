import { motion } from "framer-motion";
import type { CatState } from "../types/contracts";

interface CatMarkerProps {
  cat: CatState;
  x: number;
  y: number;
  onSelect?: (catId: number) => void;
}

export function CatMarker({ cat, x, y, onSelect }: CatMarkerProps) {
  const monogram = cat.name.slice(0, 1).toUpperCase();
  const silent = cat.silent;
  const innerOpacity = silent ? 0.35 : 1;
  const clipId = `cs-cat-clip-${cat.id}`;

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      initial={{ x, y }}
      aria-label={cat.name}
      data-testid={`cat-marker-${cat.id}`}
      style={{
        filter: silent ? "saturate(0.4)" : `drop-shadow(0 0 6px ${cat.color})`,
        cursor: onSelect ? "pointer" : "default",
      }}
      onClick={onSelect ? () => onSelect(cat.id) : undefined}
      tabIndex={onSelect ? 0 : -1}
      role={onSelect ? "button" : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(cat.id);
              }
            }
          : undefined
      }
    >
      <title>{cat.name}</title>

      {/* Two out-of-phase radar rings */}
      <circle r="36" fill="none" stroke={cat.color} strokeWidth="1.2" opacity="0.25">
        <animate attributeName="r" values="22;50" dur={silent ? "5s" : "2.2s"} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0" dur={silent ? "5s" : "2.2s"} repeatCount="indefinite" />
      </circle>
      <circle r="30" fill="none" stroke={cat.color} strokeWidth="1" opacity="0.35">
        <animate attributeName="r" values="22;42" dur={silent ? "5s" : "2.2s"} begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.45;0" dur={silent ? "5s" : "2.2s"} begin="0.7s" repeatCount="indefinite" />
      </circle>

      {cat.photoPath ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle r="22" />
            </clipPath>
          </defs>
          {/* Tinted base so the colored aura still reads while the photo loads */}
          <circle r="22" fill={cat.color} opacity={innerOpacity * 0.95} />
          <image
            href={cat.photoPath}
            x={-22}
            y={-22}
            width={44}
            height={44}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
            opacity={innerOpacity}
          />
        </>
      ) : (
        <>
          <circle r="22" fill={cat.color} opacity={innerOpacity * 0.95} />
          <text
            textAnchor="middle"
            dy="6.5"
            fontSize="20"
            fontWeight="700"
            fontFamily="ui-monospace, Menlo, monospace"
            fill="#0c1422"
            opacity={innerOpacity}
          >
            {monogram}
          </text>
        </>
      )}

      {/* Name label below */}
      <text
        textAnchor="middle"
        dy="40"
        fontSize="9"
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
