import { Handshake, Layers, Link, type LucideIcon, PackageOpen, UserRoundPlus } from "lucide-react";
import { AbsoluteFill, interpolate, random, Sequence, spring, useCurrentFrame } from "remotion";
import { type CharmFace, CharmBar, charmKick } from "../../brand/Charm";
import { C, F } from "../../brand/tokens";
import { getScene, marker } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { blinkAt, clamp, EASE2, slapAt, SparkBurst, SPRING2, stickerStyle } from "../../motion";
import { SlapLockup } from "../H1/lockup";
import { StickerCaption, stickerBox } from "../H1/stickers";

/**
 * E1 (126.5–133 s, v4), the end card (concepts-v2 §4.5 + A5, SCRIPT-v4), revealed under the central peel from T7
 * during its first 20 frames (only the ground and the charm bar are there; everything else slaps in on the VO from f13).
 *   "Satchel."      the lockup slaps in, centred with a quarter-tile of clear space (scale + the S's drop only)
 *   "Stick it on."  "Hand it over."  two white sticker captions slap in on their words (the hook's line, bookended)
 *   then five feature chips slap in on half-beats (the landing's "What else it does"), and the footer rises.
 *   endPress the mark does the brand's button press: the S sinks into its shadow and springs back, soft slap.
 * The charm bar hangs at top right as in the OG image: a gentle sway, blinks in turn, SOL's last bounce.
 * Silence in the last 0.5 s (no SFX there; the music rings out).
 */

const FPS = 30;
const sc = getScene("E1");
const fr = (sec: number) => Math.round(sec * FPS);
const T = {
  satchel: fr(sc.wordAt("V27", "Satchel")), // 19
  stick: fr(sc.wordAt("V27", "Stick")), // 52
  hand: fr(sc.wordAt("V27", "Hand")), // 85
  overEnd: fr(sc.wordAt("V27", "over", "end")), // 106
  press: fr(marker("endPress") - sc.start), // 150
  silence: fr(sc.duration - 0.5), // 180
};
// The five chips land on half-beats (E1 starts on a beat: 7.5 f grid) from the first one after the VO ends.
const HALF = 7.5;
const CHIP0 = Math.ceil((T.overEnd - 2) / HALF) * HALF; // 105 = 130.0 s, a downbeat
const CHIP_AT = [0, 1, 2, 3, 4].map((i) => Math.round(CHIP0 + HALF * i)); // contacts 105 · 113 · 120 · 128 · 135
const FOOT = CHIP_AT[4] + 3;
const SOL_BOUNCE = Math.min(T.press + 22, T.silence - 8); // SOL's last bounce, before the silent tail

// ── layout (1920 × 1080; key text inside the safe area, nothing must-read in the bottom 150 px) ────────────────────
const LOCKUP_H = 220; // tile 220 px → clear space 55 px on every side
const LOCKUP_W = (LOCKUP_H * 2220) / 512;
const LOCKUP = { x: (1920 - LOCKUP_W) / 2, y: 230 }; // centre y ≈ 32%
const CLEAR = LOCKUP_H / 4;
const HEAD_SIZE = 110;
const HEAD_Y = LOCKUP.y + LOCKUP_H + CLEAR + stickerBox("Stick it on.", HEAD_SIZE).h / 2 + 4; // ≈ 607
const HEAD_GAP = 44;
const boxStick = stickerBox("Stick it on.", HEAD_SIZE);
const boxHand = stickerBox("Hand it over.", HEAD_SIZE);
const headLeft = (1920 - (boxStick.w + HEAD_GAP + boxHand.w)) / 2;
const STICK_X = headLeft + boxStick.w / 2;
const HAND_X = headLeft + boxStick.w + HEAD_GAP + boxHand.w / 2;
const BAR = { x: 1496, y: 34, w: 372 }; // the charm bar, top right (OG image), outside the lockup's clear space

// ── the feature chips (the landing's "What else it does"; app Lucide icons) ──────────────────────────────────────
// Label widths: Onest 700 advance widths in em, measured offline (Pillow, public/v2/fonts/Onest-VF.ttf at wght 700).
const CHIPS: { text: string; em: number; Icon: LucideIcon }[] = [
  { text: "Make an offer", em: 6.653, Icon: Handshake },
  { text: "Give by link", em: 5.586, Icon: Link },
  { text: "Let someone spend", em: 9.425, Icon: UserRoundPlus },
  { text: "USDC and L2s", em: 6.886, Icon: Layers },
  { text: "Take it all out", em: 6.376, Icon: PackageOpen },
];
const CHIP = { size: 32, icon: 30, iconGap: 9, padX: 16, padY: 14, border: 4, rest: 6, gap: 12 };
const chipW = (em: number) => Math.round(em * CHIP.size + CHIP.icon + CHIP.iconGap + 2 * CHIP.padX + 2 * CHIP.border);
const CHIP_H = CHIP.size + 2 * CHIP.padY + 2 * CHIP.border; // 68
const chipRowW = CHIPS.reduce((sum, c) => sum + chipW(c.em), 0) + CHIP.gap * (CHIPS.length - 1); // ≈ 1560
const CHIP_Y = HEAD_Y + boxStick.h / 2 + 80 + CHIP_H / 2; // ≈ 778
const chipX = CHIPS.map((_, i) => (1920 - chipRowW) / 2 + CHIPS.slice(0, i).reduce((sum, c) => sum + chipW(c.em) + CHIP.gap, 0));

/** One feature chip: a white sticker (ink outline, hard drop) that slaps on (kit slapAt), seeded tilt and nudge. */
function FeatureChip({ i, frame }: { i: number; frame: number }) {
  const f = frame - (CHIP_AT[i] - 4); // contact on CHIP_AT[i]
  if (f < 0) return null;
  const c = CHIPS[i];
  const { sx, sy, lift, opacity } = slapAt(f, FPS, CHIP.rest, { from: 1.24, squash: 0.06, drop: 22 });
  const tilt = (random(`end-chip-tilt-${i}`) - 0.5) * 5; // ±2.5° (stickers on a sheet; never the logo)
  const dy = (random(`end-chip-dy-${i}`) - 0.5) * 12;
  return (
    <div
      style={{
        position: "absolute",
        left: chipX[i],
        top: CHIP_Y - CHIP_H / 2 + dy,
        width: chipW(c.em),
        height: CHIP_H,
        ...stickerStyle({ fill: C.surface, outline: CHIP.border, rest: CHIP.rest, radius: CHIP_H / 2, lift }),
        opacity,
        scale: `${sx} ${sy}`,
        rotate: `${tilt}deg`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: CHIP.iconGap,
        fontFamily: F.sans,
        fontWeight: 700,
        fontSize: CHIP.size,
        lineHeight: 1,
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      <c.Icon size={CHIP.icon} strokeWidth={2.4} color={C.ink} style={{ flexShrink: 0 }} />
      {c.text}
    </div>
  );
}

/** A centred line rising out of its own mask (the kit's LineRise numbers: 16 f, out, no bounce), in a given colour. */
function RiseLine({ frame, at, y, size, weight, color, children }: { frame: number; at: number; y: number; size: number; weight: number; color: string; children: string }) {
  if (frame < at) return null;
  const rise = interpolate(frame - at, [0, 16], [110, 0], { ...clamp, easing: EASE2.out });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center" }}>
      <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
        <div style={{ translate: `0 ${rise}%`, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: 1.12, color, whiteSpace: "nowrap" }}>{children}</div>
      </div>
    </div>
  );
}

/** The charm bar: a gentle sway (slow, small, out of phase), looks at what lands, blinks in turn, SOL's last bounce. */
function EndCharms({ frame }: { frame: number }) {
  const t = frame / FPS;
  const sway = [2.6 * Math.sin((2 * Math.PI * t) / 2.3 + 0.4), 3.2 * Math.sin((2 * Math.PI * t) / 1.9 + 1.7), 3.8 * Math.sin((2 * Math.PI * t) / 1.5 + 2.9)];
  const chains = ["btc", "evm", "sol"] as const;
  const lag = [4, 2, 0]; // reaction order SOL → ETH → BTC
  // they like the press: a small kick in reaction order; SOL's last bounce adds its own swing
  const angles = chains.map((ch, i) => {
    let a = sway[i] + charmKick(ch, (frame - T.press - lag[i]) / FPS, [-5, 4, -6][i]);
    if (i === 2) a += charmKick("sol", (frame - SOL_BOUNCE) / FPS, 9);
    return Math.max(-12, Math.min(12, a));
  }) as [number, number, number];
  const faces = chains.map((_, i): CharmFace => {
    // look at the lockup as it lands (down-left), then at the headline, then at us
    const atLogo = interpolate(frame, [T.satchel - 10 + lag[i], T.satchel - 6 + lag[i], T.satchel + 22, T.satchel + 28], [0, 1, 1, 0], clamp);
    const atHead = interpolate(frame, [T.stick - 8 + lag[i], T.stick - 4 + lag[i], T.hand + 20, T.hand + 26], [0, 1, 1, 0], clamp);
    const atChips = interpolate(frame, [CHIP_AT[0] - 8 + lag[i], CHIP_AT[0] - 4 + lag[i], CHIP_AT[4] + 6, CHIP_AT[4] + 12], [0, 1, 1, 0], clamp);
    const look = { x: -7 * atLogo - 6 * atHead - 5 * atChips, y: 3 * atLogo + 5 * atHead + 6 * atChips };
    // blinks in turn (left to right) as the chips finish landing; idle blinks otherwise (never in sync)
    const cascade = [CHIP_AT[4] + 4 + 5 * i];
    const idle = [62 + 23 * i];
    const blink = 1 - Math.min(1, ...[...cascade, ...idle].map((b) => blinkAt(frame, b)));
    const joy = interpolate(frame, [T.press + lag[i], T.press + 2 + lag[i], T.press + 10 + lag[i], T.press + 14 + lag[i]], [0, 1, 1, 0], clamp);
    const grin = i === 2 ? interpolate(frame, [SOL_BOUNCE - 1, SOL_BOUNCE + 2, SOL_BOUNCE + 12, SOL_BOUNCE + 18], [0, 1, 1, 0], clamp) : 0;
    return { look, blink: Math.max(blink, 0), joy, smile: 1.3, grin };
  }) as [CharmFace, CharmFace, CharmFace];
  const hop = -14 * (spring({ frame: frame - SOL_BOUNCE, fps: FPS, config: SPRING2.pop }) - spring({ frame: frame - SOL_BOUNCE - 6, fps: FPS, config: SPRING2.pop }));
  return (
    <div style={{ position: "absolute", left: BAR.x, top: BAR.y }}>
      <CharmBar width={BAR.w} angles={angles} faces={faces} extras={[{}, {}, { stemLen: 40 + hop / (BAR.w / 480) }]} />
    </div>
  );
}

export default function E1() {
  const frame = useCurrentFrame();
  const sec = (f: number) => f / FPS;
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <EndCharms frame={frame} />
      <SlapLockup x={LOCKUP.x} y={LOCKUP.y} h={LOCKUP_H} f={frame - (T.satchel - 6)} frame={frame} pressAt={T.press} />
      {/* the end card's lemon burst (one of the film's four), popped around the mark as it springs back from the press */}
      {frame >= T.press + 2 && frame < T.press + 26 ? (
        <Sequence from={T.press + 2} layout="none">
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <SparkBurst x={LOCKUP.x + LOCKUP_H / 2} y={LOCKUP.y + LOCKUP_H / 2} radius={LOCKUP_H * 0.78} count={4} seed="end-press" size={58} />
          </svg>
        </Sequence>
      ) : null}
      <StickerCaption text="Stick it on." size={HEAD_SIZE} x={STICK_X} y={HEAD_Y} f={frame - (T.stick - 5)} seed="end-stick" />
      <StickerCaption text="Hand it over." size={HEAD_SIZE} x={HAND_X} y={HEAD_Y} f={frame - (T.hand - 5)} seed="end-hand" />
      {CHIPS.map((c, i) => (
        <FeatureChip key={c.text} i={i} frame={frame} />
      ))}
      <RiseLine frame={frame} at={FOOT} y={CHIP_Y + CHIP_H / 2 + 58} size={32} weight={500} color={C.inkMuted}>
        Built on NEAR Chain Signatures · NEAR HACKATHON 2026
      </RiseLine>

      {/* sound: the central T7→E1 frame peel (owned here; it peaks mid-curl), the slaps a frame before their words,
          pops on the on-beat chips, the press on endPress, SOL's last bounce; nothing in the last 0.5 s */}
      <Sfx name="sticker-peel" at={sec(10)} align="peak" gainDb={2} />
      <Sfx name="sticker-slap" at={sec(T.satchel - 2)} gainDb={-4} />
      <Sfx name="sticker-slap" at={sec(T.stick - 1)} gainDb={-6} />
      <Sfx name="sticker-slap" at={sec(T.hand - 1)} gainDb={-6} />
      {[0, 2, 4].map((i) => (
        <Sfx key={i} name="pop" at={sec(CHIP_AT[i])} gainDb={-8} />
      ))}
      <Sfx name="button-thock" at={sec(T.press)} gainDb={-5} />
      <Sfx name="sticker-slap" at={sec(T.press)} gainDb={-10} />
      <Sfx name="pop-high" at={sec(SOL_BOUNCE)} gainDb={-9} />
    </AbsoluteFill>
  );
}

