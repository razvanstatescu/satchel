import { evolvePath } from "@remotion/paths";
import { C } from "./tokens";
import { LOCKUP_VIEWBOX, WORDMARK_PATH, WORDMARK_TRANSFORM } from "./wordmark-path";

/**
 * The Satchel 2.0 sticker S, verbatim geometry from marketing/brand-v2/logo/satchel-mark.svg (512 grid):
 * three strokes of one path: the ink shadow (92 wide, 10 units down), the ink outline (92) and the white S (56).
 * Brand do-nots: never recolour the tile, never rotate the S, never put the mark on coral, never add a ring or hook,
 * never drop the outline or shadow (in the finished state), never give the S a face, never capitalise the wordmark.
 * Animation only BUILDS the mark: `draw` writes the strokes along the path, `drop` (0..1) lets the hard shadow
 * catch up (the sticker "lands"), `tile` (0..1) grows the coral tile. Defaults give the finished mark.
 */
export const S_PATH =
  "M330 184 C330 154 300 138 256 138 C206 138 182 162 182 194 C182 230 214 242 256 252 C298 262 330 274 330 310 C330 344 302 364 256 364 C210 364 182 348 180 316";

export function StickerSGroup({ draw = 1, drop = 1, small = false }: { draw?: number; drop?: number; small?: boolean }) {
  const evo = draw >= 1 ? null : evolvePath(Math.max(0.0001, draw), S_PATH);
  const dash = evo ? { strokeDasharray: evo.strokeDasharray, strokeDashoffset: evo.strokeDashoffset } : {};
  const outer = small ? 108 : 92;
  const body = (
    <>
      <path d={S_PATH} transform={`translate(0 ${10 * drop})`} fill="none" stroke={C.ink} strokeWidth={outer} strokeLinecap="round" {...dash} />
      <path d={S_PATH} fill="none" stroke={C.ink} strokeWidth={outer} strokeLinecap="round" {...dash} />
      <path d={S_PATH} fill="none" stroke={C.white} strokeWidth={56} strokeLinecap="round" {...dash} />
    </>
  );
  return small ? <g transform="translate(256 256) scale(1.1) translate(-256 -256)">{body}</g> : body;
}

/** The mark: coral tile + sticker S. `size` in px. */
export function Mark({ size, tile = 1, draw = 1, drop = 1 }: { size: number; tile?: number; draw?: number; drop?: number }) {
  const t = Math.max(0, Math.min(1.2, tile));
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      {t > 0 ? <rect x={256 - 256 * t} y={256 - 256 * t} width={512 * t} height={512 * t} rx={112 * t} fill={C.brand} /> : null}
      {draw > 0 ? <StickerSGroup draw={draw} drop={drop} small={size <= 32} /> : null}
    </svg>
  );
}

/** The sticker S alone (no tile), viewBox from satchel-charm.svg. `height` in px. */
export function StickerS({ height, draw = 1, drop = 1 }: { height: number; draw?: number; drop?: number }) {
  const w = (height * 272) / 356;
  return (
    <svg viewBox="120 80 272 356" width={w} height={height} style={{ display: "block", overflow: "visible" }}>
      <StickerSGroup draw={draw} drop={drop} />
    </svg>
  );
}

/** Lockup: mark + lowercase wordmark (viewBox 0 0 2220 512). `word` (0..1) wipes the wordmark in from the left. */
export function Lockup({ height, word = 1, tile = 1, draw = 1, drop = 1 }: { height: number; word?: number; tile?: number; draw?: number; drop?: number }) {
  const [, , vw, vh] = LOCKUP_VIEWBOX.split(" ").map(Number);
  const width = (height * vw) / vh;
  const clipId = `wm-${Math.round(word * 1000)}`;
  const t = Math.max(0, Math.min(1.2, tile));
  return (
    <svg viewBox={LOCKUP_VIEWBOX} width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {t > 0 ? <rect x={256 - 256 * t} y={256 - 256 * t} width={512 * t} height={512 * t} rx={112 * t} fill={C.brand} /> : null}
      {draw > 0 ? <StickerSGroup draw={draw} drop={drop} /> : null}
      <defs>
        <clipPath id={clipId}>
          <rect x={560} y={-40} width={(vw - 540) * Math.max(0, Math.min(1, word))} height={vh + 80} />
        </clipPath>
      </defs>
      {word > 0 ? (
        <g clipPath={`url(#${clipId})`}>
          <g transform={WORDMARK_TRANSFORM}>
            <path d={WORDMARK_PATH} fill={C.ink} />
          </g>
        </g>
      ) : null}
    </svg>
  );
}
