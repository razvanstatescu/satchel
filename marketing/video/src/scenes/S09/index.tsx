import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Lockup } from "../../brand/Logo";
import { C, F } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, s, tween } from "../../lib/time";
import { bric, CLAMP, KeyLitGround, lerp, MaskLine } from "../S01/kit";

/**
 * S09 End card (L19: "Satchel. One NFT. A wallet on every chain, safe to hand over."). The film breathes out: the
 * lockup settles in on "Satchel.", the tagline rises out of its mask on "One NFT. A wallet on every chain", the credit
 * line follows on "safe to hand over", and everything holds still over a slow parallax drift of the leather ground.
 */

const sc = getScene("S09");
const D = sc.duration;
const L = sc.line("L19");
const tSatchel = L.start + (L.words[0]?.start ?? 0);
const tOne = sc.wordAt("L19", "one");
const tSafe = sc.wordAt("L19", "safe");

const T_LOCK = Math.max(0, tSatchel - 0.45);
const T_TAG = Math.max(T_LOCK + 0.8, tOne - 0.1);
const T_SMALL = Math.min(Math.max(T_TAG + 0.9, tSafe - 0.1), D - 6.5); // credits land with ≥ 6 s of hold after them

const H_LOCK = 196; // tile height; clear space = 49 px on every side

export default function S09() {
  const f = useCurrentFrame();

  const lockIn = tween(f, T_LOCK, T_LOCK + 0.9, 0, 1, EASE.quintOut);
  const word = tween(f, T_LOCK + 0.15, T_LOCK + 0.95, 0, 1, EASE.expoOut);
  const tag = interpolate(f, [s(T_TAG), s(T_TAG) + 20], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const small = (i: number) => interpolate(f, [s(T_SMALL) + i * 4, s(T_SMALL) + i * 4 + 18], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const rule = tween(f, T_SMALL - 0.1, T_SMALL + 0.5, 0, 1, EASE.expoInOut);

  // slow parallax: ground drifts more than the type, the type barely breathes
  const drift = tween(f, 0, D, 0, 1, EASE.standard);
  const lw = (H_LOCK * 1892) / 512;

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <KeyLitGround plateName="leather-ground" plateOpacity={0.4} light={0.26} dx={-56 * drift} dy={-14 * drift} scale={1.1} />
      <AbsoluteFill style={{ transform: `translateY(${-10 * drift}px) scale(${1 + 0.018 * drift})` }}>
        {/* lockup */}
        <div style={{ position: "absolute", left: 960 - lw / 2, top: 254 + (1 - lockIn) * 26, opacity: lockIn }}>
          <Lockup height={H_LOCK} word={word} />
        </div>

        {/* tagline */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 534, display: "flex", justifyContent: "center" }}>
          <MaskLine p={tag}>
            <div style={{ ...bric(lerp(520, 640, tag), 100, 72), fontSize: 76, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.ink, whiteSpace: "nowrap" }}>
              An NFT that is a wallet on every chain.
            </div>
          </MaskLine>
        </div>

        {/* hairline */}
        <div style={{ position: "absolute", left: 960 - 70 * rule, top: 718, width: 140 * rule, height: 2, background: C.line }} />

        {/* credits */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 770, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <MaskLine p={small(0)}>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 40, lineHeight: 1.2, color: C.inkMuted, display: "flex", alignItems: "center", gap: 26, whiteSpace: "nowrap" }}>
              <span>Built on NEAR Chain Signatures</span>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: C.lineStrong }} />
              <span>NEAR HACKATHON 2026</span>
            </div>
          </MaskLine>
        </div>
      </AbsoluteFill>

      <Sfx name="downlifter" at={0} gainDb={-4} />
      <Sfx name="lock-clunk" at={T_LOCK + 0.55} gainDb={-6} />
    </AbsoluteFill>
  );
}
