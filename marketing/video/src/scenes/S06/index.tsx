import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { getLength } from "@remotion/paths";
import { Lockup, STRAP_PATH } from "../../brand/Logo";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, FPS, SPRING, W, s, tween } from "../../lib/time";
import { CLAMP, KeyLitGround, landingFrame, lerp } from "../S01/kit";

/**
 * S06 Turn (no VO). Black, then the Strap S builds itself: the brass tile lands, the leather strap draws its S, the
 * saddle stitch sews along it one stitch at a time, and the wordmark wipes in as the mark slides into the lockup.
 * Everything is anchored to the scene END so the wordmark lands on the music drop into S07 (timeline marker logoDrop).
 * Logo rules: the mark only scales and translates (no rotation, glow, shadow), on the Night ground, never on brass.
 */

const sc = getScene("S06");
const D = sc.duration;
const LAND = D - 2 / FPS; // wordmark fully landed 2 frames before the cut = on the drop
const T_WORD = LAND - 0.62; // wordmark wipe
const T_SLIDE = LAND - 0.78; // mark slides into lockup position
const T_STITCH_END = T_SLIDE - 0.3; // a short still beat on the finished mark
const T_STITCH = Math.max(1.3, T_STITCH_END - 1.15);
const T_STRAP_END = T_STITCH + 0.05;
const T_STRAP = Math.max(0.65, T_STRAP_END - 0.8);
const T_TILE = Math.max(0.25, T_STRAP - 0.42);

const STRAP_LEN = getLength(STRAP_PATH);
const PITCH = 22; // logo stitch "12 10"
const TICK = 0.25; // a needle tick on every eighth note while sewing
const TICKS: number[] = [];
for (let t = T_STITCH + 0.06; t < T_STITCH_END - 0.05; t += TICK) TICKS.push(t);

const H_MARK = 330; // height while the mark is alone
const H_LOCK = 236; // final lockup height (tile = 236 px, clear space 59 px)

export default function S06() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tile = spring({ frame: f - s(T_TILE), fps, config: SPRING.slam });
  const strap = tween(f, T_STRAP, T_STRAP_END, 0, 1, EASE.expoInOut);
  const rawStitch = tween(f, T_STITCH, T_STITCH_END, 0, 1, EASE.standard);
  const stitch = rawStitch <= 0 ? 0 : Math.min(1, (Math.ceil((rawStitch * STRAP_LEN) / PITCH) * PITCH) / STRAP_LEN);
  const mv = tween(f, T_SLIDE, LAND, 0, 1, EASE.expoInOut);
  const word = tween(f, T_WORD, LAND, 0, 1, EASE.expoOut);

  const h = lerp(H_MARK, H_LOCK, mv);
  const lw = (h * 1892) / 512;
  const leftMarkCentred = W / 2 - (256 / 1892) * lw;
  const leftLockCentred = W / 2 - lw / 2;
  const left = lerp(leftMarkCentred, leftLockCentred, mv);
  const top = 540 - h / 2;

  // black → Night ground with the key light, rising with the build
  const ground = interpolate(f, [s(T_TILE - 0.2), s(LAND)], [0, 1], { ...CLAMP, easing: EASE.standard });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: ground }}>
        <KeyLitGround plateName="leather-ground" plateOpacity={0.24} light={0.2} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left, top }}>
        <Lockup height={h} tile={tile} strap={strap} stitch={stitch} word={word} />
      </div>

      <Sfx name="riser-4s" at={LAND} align="peak" gainDb={-1} />
      <Sfx name="impact-soft" at={T_TILE + landingFrame(SPRING.slam) / FPS} gainDb={-4} />
      <Sfx name="leather-creak" at={T_STRAP} gainDb={-4} />
      {TICKS.map((t, i) => (
        <Sfx key={i} name="stitch-single" at={t} gainDb={-3} />
      ))}
      {/* impact-brass on the drop is mounted film-level in Main.tsx so its ring-out isn't cut at the scene end */}
      {/* the brass ring is cut by the scene end; the music drop carries the hit into S07 */}
    </AbsoluteFill>
  );
}
