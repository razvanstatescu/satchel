import { evolvePath } from "@remotion/paths";
import type { CSSProperties } from "react";
import { C, type Chain, CHAIN } from "../../brand/tokens";
import { clamp, DROP, Dropped, dropColor, fit, K, LINE, mono, n2, OUT, PropSvg, sans, Txt, useBrandFonts, useUid } from "./kit";

/**
 * SignedSlip: the live signature from C1 and T6. A portrait paper receipt with torn (zigzag) top and bottom edges and a
 * DANGER outline (a signature that can still move coins), the transfer line, a pen scribble on a signature line and a
 * mono "signed" caption. Fits inside PocketJeans (it is narrower than the pocket) so it can slide in and poke out.
 *
 * Props
 *   scale    number   default 2. Authored at SLIP.w × SLIP.h = 168 × 196 UI units (336 × 392 px at scale 2).
 *   title    string   default "Send 0.85 ETH" (Onest 800, auto-shrinks to fit)
 *   caption  string   default "signed" (Geist Mono, danger)
 *   chain    Chain | null  default "evm": chain dot + name on the header row ("Ethereum"); null hides the row
 *   sign     0..1     default 1: draw-on of the pen scribble (0 = empty signature line)
 *   tilt     deg      default 0: rotation about the centre; the drop stays straight down
 *   drop     number   default 1: hard-drop multiplier (0 = flat / tucked away, >1 = lifted off the page)
 *   night    boolean  default false: drop in #000 (Night scenes)
 *   style    CSSProperties on the root <svg> (position it from the scene)
 */
export const SLIP = { w: 168, h: 196 } as const;

// Pen scribble in slip units: a quick looping signature that ends in an underline swoosh. One path (draw-on).
const SCRIBBLE =
  "M22 140 C27 121 33 100 42 98 C50 96 47 116 38 128 C32 136 29 131 36 124 C44 116 52 112 57 117 " +
  "C61 121 57 130 62 129 C68 128 71 113 77 113 C83 113 79 128 85 128 C91 128 94 114 100 114 " +
  "C106 114 103 127 109 127 C116 127 121 113 128 108 C134 104 140 106 137 113 " +
  "C132 124 108 133 76 136 C58 138 44 140 36 144";

function slipPath(w: number, h: number, teeth: number, depth: number) {
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) pts.push(`${n2((i * w) / teeth)} ${i % 2 === 0 ? depth : 0}`);
  for (let i = teeth; i >= 0; i--) pts.push(`${n2((i * w) / teeth)} ${i % 2 === 0 ? h - depth : h}`);
  return `M${pts.join(" L")} Z`;
}

export interface SignedSlipProps {
  scale?: number;
  title?: string;
  caption?: string;
  chain?: Chain | null;
  sign?: number;
  tilt?: number;
  drop?: number;
  night?: boolean;
  style?: CSSProperties;
}

export function SignedSlip({ scale = K, title = "Send 0.85 ETH", caption = "signed", chain = "evm", sign = 1, tilt = 0, drop = 1, night = false, style }: SignedSlipProps) {
  useBrandFonts();
  const uid = useUid("slip");
  const { w: W, h: H } = SLIP;
  const pad = 16;
  const titleSpec = fit(title, sans(21, 800), W - pad * 2);
  const s = clamp(sign);
  const evo = s > 0 && s < 1 ? evolvePath(s, SCRIBBLE) : null;
  const headY = 31;
  const titleY = chain ? 62 : 50;
  const lineY = 146;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
          <path d={slipPath(W, H, 14, 6)} fill={C.surface} stroke={C.danger} strokeWidth={OUT} strokeLinejoin="round" />
          {chain ? (
            <g>
              <circle cx={pad + 5} cy={headY} r={5} fill={CHAIN[chain].color} stroke={C.ink} strokeWidth={1.5} />
              <Txt x={pad + 15} cy={headY} spec={sans(12, 600)} fill={C.inkMuted}>
                {CHAIN[chain].name}
              </Txt>
            </g>
          ) : null}
          <Txt x={pad} cy={titleY} spec={titleSpec} fill={C.ink}>
            {title}
          </Txt>
          {/* signature line with the little cross */}
          <path d={`M${pad} ${lineY} H${W - pad}`} stroke={C.lineStrong} strokeWidth={1.5} strokeLinecap="round" />
          <path d={`M${pad + 1} ${lineY - 13} l6 6 M${pad + 7} ${lineY - 13} l-6 6`} stroke={C.lineStrong} strokeWidth={1.5} strokeLinecap="round" />
          {s > 0 ? (
            <path
              d={SCRIBBLE}
              transform="translate(0 -4)"
              fill="none"
              stroke={C.ink}
              strokeWidth={LINE * 1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={evo?.strokeDasharray}
              strokeDashoffset={evo?.strokeDashoffset}
            />
          ) : null}
          <Txt x={pad} cy={lineY + 17} spec={mono(12, 600)} fill={C.danger}>
            {caption}
          </Txt>
        </g>
      </Dropped>
    </PropSvg>
  );
}

