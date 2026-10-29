import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, K, mix, mono, n2, OUT, PropSvg, type Pt, roundedPoly, Txt, useBrandFonts, useUid } from "./kit";

/**
 * StickyNote: the seed phrase on a lemon sticky note (P4: it tries to stick to the card and slides off). Twelve
 * BIP39-looking words in Geist Mono, numbered, in two columns. Deliberately NOT a real phrase ("satchel" is not a BIP39
 * word, so no checksum can pass). The bottom-right corner curls up.
 *
 * Props
 *   curl    0..1    default 0.18: corner curl (0 = flat, 1 = big curl). Animate it up as the note peels and slides off.
 *   words   string[12]  default SEED_WORDS
 *   tilt    deg     default 0 (drop stays vertical)
 *   scale   number  default 2. Note NOTE.size = 176 UI square (352 px at scale 2)
 *   drop    number  default 1 (lift it while it flutters: 1 → 2.5); night boolean; style on the root <svg>
 */
export const SEED_WORDS = ["maple", "orbit", "velvet", "satchel", "harbor", "pixel", "tundra", "copper", "saddle", "comet", "ripple", "lantern"];
export const NOTE = { size: 176 } as const;

export interface StickyNoteProps {
  curl?: number;
  words?: string[];
  tilt?: number;
  scale?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function StickyNote({ curl = 0.18, words = SEED_WORDS, tilt = 0, scale = K, drop = 1, night = false, style }: StickyNoteProps) {
  useBrandFonts();
  const uid = useUid("note");
  const S = NOTE.size;
  const c = clamp(curl);
  const f = c * S * 0.5; // fold size along each edge
  const body: Pt[] = f > 1 ? [[0, 0], [S, 0], [S, S - f], [S - f, S], [0, S]] : [[0, 0], [S, 0], [S, S], [0, S]];
  const bodyD = roundedPoly(body, f > 1 ? [6, 6, 3, 3, 6] : 6);
  // flap: reflection of the corner across the fold line, edges bowed a little so it reads as a curl
  const A: Pt = [S - f, S];
  const B: Pt = [S, S - f];
  const T: Pt = [S - f * 0.92, S - f * 0.92];
  const flapD = `M${n2(A[0])} ${n2(A[1])} Q${n2(S - f * 1.08)} ${n2(S - f * 0.42)} ${n2(T[0])} ${n2(T[1])} Q${n2(S - f * 0.42)} ${n2(S - f * 1.08)} ${n2(B[0])} ${n2(B[1])} Z`;
  const spec = mono(12.5, 500);
  const num = mono(10, 500);
  const back = mix(C.lemon, C.ink, 0.1);
  return (
    <PropSvg w={S} h={S} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`rotate(${tilt} ${S / 2} ${S / 2})`}>
          <defs>
            <clipPath id={`${uid}-body`}>
              <path d={bodyD} />
            </clipPath>
          </defs>
          <path d={bodyD} fill={C.lemon} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          <g clipPath={`url(#${uid}-body)`}>
          {/* glue strip hint */}
          <path d={`M${OUT} 24 H${S - OUT}`} stroke={mix(C.lemon, C.ink, 0.08)} strokeWidth={1.5} />
          {words.slice(0, 12).map((wd, i) => {
            const col = i < 6 ? 0 : 1;
            const row = i % 6;
            const x = 16 + col * 82;
            const y = 44 + row * 22;
            return (
              <g key={i}>
                <Txt x={x + 12} cy={y} spec={num} fill={mix(C.inkMuted, C.lemon, 0.15)} anchor="end">
                  {String(i + 1)}
                </Txt>
                <Txt x={x + 17} cy={y} spec={spec} fill={C.ink}>
                  {wd}
                </Txt>
              </g>
            );
          })}
          </g>
        </g>
      </Dropped>
      {f > 1 ? (
        <g transform={`rotate(${tilt} ${S / 2} ${S / 2})`}>
          <Dropped id={`${uid}-f`} dy={2.5 * c + 1} color={dropColor(night)}>
            <path d={flapD} fill={back} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
          </Dropped>
        </g>
      ) : null}
    </PropSvg>
  );
}
