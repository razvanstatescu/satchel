import { useId } from "react";
import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { WORDMARK_PATH } from "./wordmark-path";

// The Strap S path on the 512 grid, verbatim from brand/logo/satchel-mark.svg.
export const STRAP_PATH =
  "M346 176 C346 134 306 112 256 112 C196 112 166 140 166 182 C166 226 206 242 256 256 C306 270 346 286 346 330 C346 372 316 400 256 400 C206 400 166 378 166 336";

/**
 * Brand rules respected: the tile and S are never recoloured, rotated or slanted, and get no glow, bevel or shadow.
 * Animation only *builds* the mark: the tile scales in, the strap draws along its own path, the stitch sews along it.
 * All progress props are 0..1; defaults give the finished mark.
 */
export function MarkSvg({
  tile = 1,
  strap = 1,
  stitch = 1,
}: {
  tile?: number;
  strap?: number;
  stitch?: number;
}) {
  const id = useId().replace(/:/g, "");
  const strapEvo = evolvePath(Math.max(0.0001, strap), STRAP_PATH);
  const stitchMask = evolvePath(Math.max(0.0001, stitch), STRAP_PATH);
  const tileScale = 0.6 + 0.4 * tile;
  return (
    <>
      <defs>
        <linearGradient id={`mb${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBCB7A" />
          <stop offset="0.55" stopColor="#D4AE55" />
          <stop offset="1" stopColor="#9A7428" />
        </linearGradient>
        <linearGradient id={`ml${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A4730" />
          <stop offset="1" stopColor="#432C1F" />
        </linearGradient>
        <mask id={`sm${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <path d={STRAP_PATH} fill="none" stroke="#fff" strokeWidth={30} strokeDasharray={stitchMask.strokeDasharray} strokeDashoffset={stitchMask.strokeDashoffset} />
        </mask>
      </defs>
      <g opacity={tile <= 0 ? 0 : 1} transform={`translate(256 256) scale(${tileScale}) translate(-256 -256)`}>
        <rect width="512" height="512" rx="112" fill={`url(#mb${id})`} opacity={Math.min(1, tile * 1.5)} />
      </g>
      {strap > 0 && (
        <path
          d={STRAP_PATH}
          fill="none"
          stroke={`url(#ml${id})`}
          strokeWidth={76}
          strokeDasharray={strapEvo.strokeDasharray}
          strokeDashoffset={strapEvo.strokeDashoffset}
        />
      )}
      {stitch > 0 && (
        <g mask={`url(#sm${id})`}>
          <path d={STRAP_PATH} fill="none" stroke="#EBCB7A" strokeOpacity={0.85} strokeWidth={5} strokeDasharray="12 10" strokeLinecap="round" />
        </g>
      )}
    </>
  );
}

export function Mark({ size, ...p }: { size: number; tile?: number; strap?: number; stitch?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} style={{ overflow: "visible", display: "block" }}>
      <MarkSvg {...p} />
    </svg>
  );
}

/**
 * Lockup (mark + wordmark) with the brand's geometry (viewBox 0 0 1892 512, from satchel-lockup-on-dark.svg).
 * `word` reveals the wordmark with a left-to-right wipe and a small rise (0..1).
 */
export function Lockup({ height, word = 1, ...p }: { height: number; word?: number; tile?: number; strap?: number; stitch?: number }) {
  const id = useId().replace(/:/g, "");
  const width = (height * 1892) / 512;
  return (
    <svg viewBox="0 0 1892 512" width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <MarkSvg {...p} />
      <defs>
        <clipPath id={`wc${id}`}>
          <rect x={600} y={0} width={1300 * word} height={512} />
        </clipPath>
      </defs>
      <g clipPath={`url(#wc${id})`}>
        <g transform={`translate(${622.39 - (1 - word) * 40} 384) scale(0.38788)`} opacity={Math.min(1, word * 2)}>
          <path d={WORDMARK_PATH} fill={C.ink} />
        </g>
      </g>
    </svg>
  );
}
