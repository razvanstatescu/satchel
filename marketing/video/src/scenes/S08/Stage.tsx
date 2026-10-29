import { Easing, Img, AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, F } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import images from "../../data/images.json";
import { EASE, FPS, SPRING, springAt, tween } from "../../lib/time";
import { Avatar, StatusPill } from "./bits";
import { SewnStitch, needleAt } from "./SewnStitch";
import type { S08T } from "./timing";

/**
 * Act 3, the hero: Satchel #3 lifts off alice's pocket (stitch unpicks), slides to carol's (spring-handoff), lands,
 * and in an extreme close-up the stitch sews itself onto carol's card, one stitch at a time, while the camera pulls
 * back to reveal the whole card, the "Bought" pill and (overlay, in index) "Satchel #3 is yours.".
 * World coordinates are a 1920 × 1080 stage; a virtual camera (focus point + zoom) frames it.
 */
export const CW = 620;
const K = CW / 400;
const CH = 252 * K;
const ALICE = { x: 500, y: 560 };
const CAROL = { x: 1420, y: 560 };
const END_F = { x: CAROL.x, y: 610 };
const END_Z = 1.12;
const MACRO_Z = 3.2;
const CHIPS = [
  { chain: "evm" as const, amount: "0.0500" },
  { chain: "btc" as const, amount: "0.0123" },
];
const BODY3 = "#251709"; // Satchel #3's per-token leather (kb/81 test vector, +12°)

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Optional photographic plate from the image catalog (falls back to code when absent). */
function plate(name: string): string | null {
  const e = (images as Record<string, unknown>)[name];
  const f = typeof e === "string" ? e : (e as { file?: string; src?: string; path?: string } | undefined)?.file ?? (e as { src?: string } | undefined)?.src ?? (e as { path?: string } | undefined)?.path;
  return f ? f.replace(/^\/?public\//, "").replace(/^\//, "") : null;
}

/** Sewing progress: a slow macro run (one stitch at a time), then an eased run around the rest of the card. */
export function sewProgress(t: number, T: S08T) {
  if (t <= T.sewStart) return 0;
  if (t >= T.sewEnd) return 1;
  const k1 = T.sewStart + T.sewSlow;
  if (t <= k1) return interpolate(t, [T.sewStart, k1], [0, 0.18]);
  return interpolate(t, [k1, T.sewEnd], [0.18, 1], { ...clamp, easing: Easing.bezier(0.4, 0.2, 0.45, 1) });
}

function cardState(frame: number, T: S08T) {
  const L1 = springAt(frame, FPS, T.t0, SPRING.lift);
  const L2 = springAt(frame, FPS, T.settleStart, SPRING.lift);
  const lift = L1 - L2;
  const X = springAt(frame, FPS, T.slideStart, SPRING.handoff);
  return { x: lerp(ALICE.x, CAROL.x, X), y: ALICE.y - 30 * lift, rot: 6 * lift, scale: 1 + 0.05 * lift, lift };
}

export function Stage({ T, afterInsert = false }: { T: S08T; afterInsert?: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const card = cardState(frame, T);
  const vx = (cardState(frame + 1, T).x - cardState(frame - 1, T).x) / 2; // world px / frame
  const mblur = Math.min(18, Math.abs(vx) * 0.28);

  // stitch: alice's (full) → unpicks on the lift → absent in transit → sews onto carol's card
  const sewP = sewProgress(t, T);
  const stitch = t < T.t0 ? 1 : t < T.unpickEnd ? 1 - tween(frame, T.t0, T.unpickEnd, 0, 1, EASE.standard) : t < T.sewStart ? 0 : sewP;
  const sewing = t >= T.sewStart;

  // ----- camera -----
  const macro = t >= T.macroCut;
  let fx: number, fy: number, z: number;
  // after the photographic insert, the card shot opens medium-close and pulls out while the needle runs the whole
  // loop in view; without the plate, the card shot itself is the macro (follow the needle, then pull back)
  const pb = afterInsert
    ? tween(frame, T.pullStart, T.pullEnd, 0, 1, EASE.standard)
    : tween(frame, T.pullStart, T.pullEnd, 0, 1, Easing.bezier(0.65, 0, 0.35, 1));
  if (!macro) {
    const intro = tween(frame, T.stageCut, T.stageCut + 0.55, 0, 1, EASE.expoOut);
    z = 0.96 + 0.06 * intro + 0.08 * tween(frame, T.t0, T.land, 0, 1, EASE.standard);
    fx = 960 + 120 * tween(frame, T.slideStart, T.land + 0.2, 0, 1, EASE.standard);
    fy = 520;
  } else if (afterInsert) {
    fx = CAROL.x;
    fy = lerp(CAROL.y + 10, END_F.y, pb);
    z = lerp(1.85, END_Z, pb) * (1 + 0.025 * tween(frame, T.pullEnd, T.D, 0, 1, EASE.standard));
  } else {
    // follow the needle (slightly lagged) in the macro, then pull back to the end framing
    // (the follow freezes once the pull-back starts, so the reveal is one smooth move, not a swing)
    const lag = needleAt(sewProgress(Math.min(t, T.pullStart) - 0.1, T));
    const nx = CAROL.x - CW / 2 + lag.x * K;
    const ny = CAROL.y - CH / 2 + lag.y * K;
    const mfx = lerp(nx, CAROL.x, 0.12);
    const mfy = lerp(ny, CAROL.y, 0.12);
    fx = lerp(mfx, END_F.x, pb);
    fy = lerp(mfy, END_F.y, pb);
    z = lerp(MACRO_Z, END_Z, pb) * (1 + 0.025 * tween(frame, T.pullEnd, T.D, 0, 1, EASE.standard));
  }
  const dx = noise2D("s08-cam-x", frame * 0.012, 0) * 5;
  const dy = noise2D("s08-cam-y", 0, frame * 0.012) * 4;
  const world = `translate(${960 + dx}px, ${540 + dy}px) scale(${z}) translate(${-fx}px, ${-fy}px)`;

  // depth of field on everything but the card
  const dofSlide = interpolate(t, [T.t0, T.slideStart + 0.2, T.land, T.macroCut], [0, 3.5, 3.5, 2], clamp);
  const dof = macro ? lerp(3, 0, pb) : dofSlide;
  // macro tilt: the card recedes a little in the close-up, flattens as the camera pulls back
  const tilt = macro ? (1 - pb) * (afterInsert ? 0.6 : 1) : 0;

  // alice's pocket leaves the story during the macro; "Sold" under it during the slide
  const aliceOpacity = macro ? 1 - tween(frame, T.macroCut, T.pullStart + 0.2, 0, 1) : 1;
  const sold = tween(frame, T.slideStart + 0.35, T.slideStart + 0.6, 0, 1, EASE.expoOut);
  const bought = tween(frame, T.pill, T.pill + 0.3, 0, 1, EASE.expoOut);

  const leather = plate("leather-ground");
  const bz = 1 + (z - 1) * 0.35;
  const bgx = (fx - 960) * 0.45;
  const bgy = (fy - 540) * 0.45;

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="s08-mblur" x="-30%" y="-5%" width="160%" height="110%">
          <feGaussianBlur stdDeviation={`${mblur.toFixed(2)} 0`} />
        </filter>
      </svg>

      {/* far layer: ground + warm key light (parallax: moves less than the stage) */}
      <AbsoluteFill style={{ transform: `translate(${-bgx}px, ${-bgy}px) scale(${bz * 1.15})`, filter: dof > 0.3 ? `blur(${(dof * 1.2).toFixed(1)}px)` : undefined }}>
        {leather ? <Img src={staticFile(leather)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.32, mixBlendMode: "luminosity" }} /> : null}
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 26% 16%, rgba(106,71,48,0.34), rgba(23,16,12,0) 72%)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 45% 40% at 74% 55%, rgba(67,44,31,0.30), rgba(23,16,12,0) 75%)" }} />
      </AbsoluteFill>

      {/* the stage, seen through the camera */}
      <AbsoluteFill style={{ transform: world, transformOrigin: "0 0" }}>
        {/* pockets + labels (defocused while the card moves) */}
        <AbsoluteFill style={{ filter: dof > 0.3 ? `blur(${dof.toFixed(1)}px)` : undefined }}>
          <div style={{ opacity: aliceOpacity }}>
            <Slot x={ALICE.x} y={ALICE.y} role="Seller" account="alice.near" muted />
            <div style={{ position: "absolute", left: ALICE.x, top: ALICE.y, transform: `translate(-50%, -50%) translateY(${(1 - sold) * 16}px)`, opacity: sold }}>
              <StatusPill status="sold" scale={2.6} />
            </div>
          </div>
          <Slot x={CAROL.x} y={CAROL.y} role="Buyer" account="carol.near" />
        </AbsoluteFill>

        {/* the card's contact shadow: grows and softens as it lifts */}
        <div
          style={{
            position: "absolute",
            left: card.x - CW / 2,
            top: ALICE.y - CH / 2,
            width: CW,
            height: CH,
            borderRadius: 34,
            background: "rgba(0,0,0,0.75)",
            transform: `translate(${card.lift * 16}px, ${18 + card.lift * 46}px) scale(${0.96 + card.lift * 0.02})`,
            filter: `blur(${22 + card.lift * 26}px)`,
            opacity: 0.55 - card.lift * 0.15,
          }}
        />

        {/* the card (directional motion blur from its own velocity) */}
        <div style={{ position: "absolute", left: card.x - CW / 2, top: card.y - CH / 2, width: CW, height: CH, filter: mblur > 0.4 ? "url(#s08-mblur)" : undefined, perspective: 1400 }}>
          <div
            style={{
              width: CW,
              height: CH,
              position: "relative",
              transform: `rotate(${card.rot}deg) scale(${card.scale}) rotateY(${-14 * tilt}deg) rotateX(${7 * tilt}deg)`,
              transformOrigin: "50% 50%",
            }}
          >
            <SatchelCard tokenId="3" width={CW} status={null} chips={CHIPS} body={BODY3} stitch={0} />
            {/* brass edge highlight that travels with the lift (light from the upper left) */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 22 * K, boxShadow: `inset 0 ${1.5 + card.lift * 1.5}px 0 rgba(235,203,122,${0.1 + card.lift * 0.12})`, pointerEvents: "none" }} />
            <SewnStitch id="s08-stitch" progress={stitch} width={CW} needle={sewing} bright={0.88} />
          </div>
        </div>

        {/* "Bought" under carol's card */}
        <div style={{ position: "absolute", left: CAROL.x, top: CAROL.y + CH / 2 + 58, transform: `translate(-50%, -50%) translateY(${(1 - bought) * 18}px)`, opacity: bought }}>
          <StatusPill status="bought" scale={3} />
        </div>
      </AbsoluteFill>

      {/* macro lens: darker, softer edges in the close-up */}
      {macro && tilt > 0.01 ? (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: tilt, background: "radial-gradient(ellipse 62% 58% at 50% 50%, rgba(10,6,4,0) 55%, rgba(10,6,4,0.55) 100%)" }} />
      ) : null}
    </AbsoluteFill>
  );
}

function Slot({ x, y, role, account, muted = false }: { x: number; y: number; role: string; account: string; muted?: boolean }) {
  const PW = CW + 44;
  const PH = CH + 44;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - PW / 2,
          top: y - PH / 2,
          width: PW,
          height: PH,
          borderRadius: 40,
          background: "rgba(8,5,3,0.32)",
          boxShadow: `inset 0 14px 34px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${C.line}`,
        }}
      />
      <div style={{ position: "absolute", left: x - PW / 2, top: y - PH / 2 - 150, width: PW, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: F.sans, fontSize: 32, fontWeight: 500, color: C.inkMuted }}>{role}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Avatar account={account} size={68} />
          <span style={{ fontFamily: F.sans, fontSize: 50, fontWeight: 600, color: muted ? C.inkMuted : C.ink }}>{account}</span>
        </span>
      </div>
    </>
  );
}
