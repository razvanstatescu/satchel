import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { type CharmFace, CharmBar, charmKick } from "../../brand/Charm";
import { C, F } from "../../brand/tokens";
import { getScene, marker } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { blinkAt, clamp, EASE2, SparkBurst, SPRING2 } from "../../motion";
import { SlapLockup } from "../H1/lockup";
import { StickerCaption, stickerBox } from "../H1/stickers";

/**
 * E1 (126.5–134 s), the end card (concepts-v2 §4.5 + amendment A5), revealed under the central peel from T7 during its
 * first 20 frames (only the ground and the charm bar are there; everything else slaps in on the VO from f13).
 *   "Satchel."      the lockup slaps in, centred with a quarter-tile of clear space (scale + the S's drop only)
 *   "Stick it on."  "Hand it over."  two white sticker captions slap in on their words (the hook's line, bookended)
 *   then the two lines rise (+0.3 s apart) and the footer.
 *   endPress (132 s) the mark does the brand's button press: the S sinks into its shadow and springs back, soft slap.
 * The charm bar hangs at top right as in the OG image: a gentle sway, blinks in turn, SOL's last bounce.
 * Silence in the last 0.5 s (no SFX after 133.5 s; the music rings out).
 */

const FPS = 30;
const sc = getScene("E1");
const fr = (sec: number) => Math.round(sec * FPS);
const T = {
  satchel: fr(sc.wordAt("V27", "Satchel")), // 19
  stick: fr(sc.wordAt("V27", "Stick")), // 52
  hand: fr(sc.wordAt("V27", "Hand")), // 85
  overEnd: fr(sc.wordAt("V27", "over", "end")), // 106
  press: fr(marker("endPress") - sc.start), // 165
  silence: fr(sc.duration - 0.5), // 210
};
const LINE1 = T.overEnd + 3; // the two lines rise once the VO has finished, 0.3 s apart, then the footer
const LINE2 = LINE1 + 9;
const FOOT = LINE2 + 9;
const SOL_BOUNCE = T.press + 22; // SOL's last bounce, well before the silent tail

// ── layout (1920 × 1080; key text inside the safe area, nothing must-read in the bottom 150 px) ────────────────────
const LOCKUP_H = 220; // tile 220 px → clear space 55 px on every side
const LOCKUP_W = (LOCKUP_H * 2220) / 512;
const LOCKUP = { x: (1920 - LOCKUP_W) / 2, y: 250 }; // centre y ≈ 34%
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
    const look = { x: -7 * atLogo - 6 * atHead, y: 3 * atLogo + 5 * atHead };
    // blinks in turn (left to right) once the lines have landed, a second cascade before the press; idle otherwise
    const cascade = [FOOT + 14, T.press - 22].map((b) => b + 5 * i);
    const idle = [62 + 23 * i, 196 - 11 * i];
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
      <RiseLine frame={frame} at={LINE1} y={HEAD_Y + 112} size={56} weight={600} color={C.inkMuted}>
        Bitcoin, Ethereum and Solana in one NFT.
      </RiseLine>
      <RiseLine frame={frame} at={LINE2} y={HEAD_Y + 178} size={56} weight={600} color={C.inkMuted}>
        Every signature on the record.
      </RiseLine>
      <RiseLine frame={frame} at={FOOT} y={HEAD_Y + 270} size={32} weight={500} color={C.inkMuted}>
        Built on NEAR Chain Signatures · NEAR HACKATHON 2026
      </RiseLine>

      {/* sound: the central T7→E1 frame peel (owned here; it peaks mid-curl), the slaps a frame before their words,
          the press on endPress, SOL's last bounce; nothing in the last 0.5 s */}
      <Sfx name="sticker-peel" at={sec(10)} align="peak" gainDb={2} />
      <Sfx name="sticker-slap" at={sec(T.satchel - 2)} gainDb={-4} />
      <Sfx name="sticker-slap" at={sec(T.stick - 1)} gainDb={-6} />
      <Sfx name="sticker-slap" at={sec(T.hand - 1)} gainDb={-6} />
      <Sfx name="button-thock" at={sec(T.press)} gainDb={-5} />
      <Sfx name="sticker-slap" at={sec(T.press)} gainDb={-10} />
      <Sfx name="pop-high" at={sec(SOL_BOUNCE)} gainDb={-9} />
    </AbsoluteFill>
  );
}

