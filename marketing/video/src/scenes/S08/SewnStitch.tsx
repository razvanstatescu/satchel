import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { C } from "../../brand/tokens";

/**
 * The card's saddle stitch (inset 8, radius 14, dash 6 5, in the card's 400 × 252 units), sewn ONE STITCH AT A TIME:
 * the visible length is quantised to whole stitches and a needle leads it. It starts on the left edge below the band
 * (so the macro opens on dark leather, where brass thread reads) and runs down, along the bottom, up and across the top.
 * On the brass band the thread is dark (on-brand) so it stays visible; on leather it is brass.
 */
const BW = 400;
const BH = 252;
const BAND = BH * 0.28;
const I = 8;
const R = 14;
const START_Y = 150;
const x0 = I, y0 = I, x1 = BW - I, y1 = BH - I;

export const STITCH_PATH = [
  `M ${x0} ${START_Y}`,
  `L ${x0} ${y1 - R}`,
  `A ${R} ${R} 0 0 0 ${x0 + R} ${y1}`,
  `L ${x1 - R} ${y1}`,
  `A ${R} ${R} 0 0 0 ${x1} ${y1 - R}`,
  `L ${x1} ${y0 + R}`,
  `A ${R} ${R} 0 0 0 ${x1 - R} ${y0}`,
  `L ${x0 + R} ${y0}`,
  `A ${R} ${R} 0 0 0 ${x0} ${y0 + R}`,
  `L ${x0} ${START_Y}`,
].join(" ");

export const STITCH_LEN = getLength(STITCH_PATH);
const DASH = 6;
const GAP = 5;
const PITCH = DASH + GAP;
export const STITCH_COUNT = Math.round(STITCH_LEN / PITCH);

/** Point of the needle (card units) at sewing progress p (0..1). */
export function needleAt(p: number) {
  const l = Math.max(0, Math.min(STITCH_LEN - 0.01, p * STITCH_LEN));
  return getPointAtLength(STITCH_PATH, l) ?? { x: x0, y: START_Y };
}

export function SewnStitch({
  id,
  progress,
  width,
  needle = false,
  strokeScale = 1,
  bright = 0.85,
}: {
  id: string;
  progress: number; // 0..1 of the loop
  width: number; // rendered card width in px
  needle?: boolean;
  strokeScale?: number;
  bright?: number; // thread opacity on leather
}) {
  if (progress <= 0) return null;
  const k = width / BW;
  const raw = Math.min(1, progress) * STITCH_LEN;
  const sewn = progress >= 1 ? STITCH_LEN + 1 : Math.min(STITCH_LEN, Math.ceil(raw / PITCH) * PITCH);
  const sw = 1.6 * strokeScale;
  const tip = needleAt(progress);
  const tan = getTangentAtLength(STITCH_PATH, Math.max(0, Math.min(STITCH_LEN - 0.01, raw))) ?? { x: 0, y: 1 };
  const showNeedle = needle && progress > 0 && progress < 1;
  return (
    <svg
      width={width}
      height={BH * k}
      viewBox={`0 0 ${BW} ${BH}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", filter: `drop-shadow(0 ${0.9 * k}px ${0.6 * k}px rgba(0,0,0,0.65))` }}
    >
      <defs>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={BW + 40} height={BH + 40}>
          <path d={STITCH_PATH} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={`${sewn} ${STITCH_LEN * 2}`} />
        </mask>
        <clipPath id={`${id}-band`}>
          <rect x={-20} y={-20} width={BW + 40} height={BAND + 20} />
        </clipPath>
        <clipPath id={`${id}-body`}>
          <rect x={-20} y={BAND} width={BW + 40} height={BH} />
        </clipPath>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <path
          d={STITCH_PATH}
          fill="none"
          stroke={C.onBrand}
          strokeOpacity={0.62}
          strokeWidth={sw}
          strokeDasharray={`${DASH} ${GAP}`}
          strokeLinecap="round"
          clipPath={`url(#${id}-band)`}
        />
        <path
          d={STITCH_PATH}
          fill="none"
          stroke={C.brandBright}
          strokeOpacity={bright}
          strokeWidth={sw}
          strokeDasharray={`${DASH} ${GAP}`}
          strokeLinecap="round"
          clipPath={`url(#${id}-body)`}
        />
      </g>
      {showNeedle ? (
        <g>
          {/* the needle: a short brass shaft along the path, eye trailing, point leading */}
          <line
            x1={tip.x - tan.x * 14}
            y1={tip.y - tan.y * 14}
            x2={tip.x + tan.x * 2.5}
            y2={tip.y + tan.y * 2.5}
            stroke={C.brandBright}
            strokeWidth={1.4 * strokeScale}
            strokeLinecap="round"
          />
          <circle cx={tip.x + tan.x * 2.5} cy={tip.y + tan.y * 2.5} r={1.15 * strokeScale} fill="#fff6dc" />
        </g>
      ) : null}
    </svg>
  );
}
