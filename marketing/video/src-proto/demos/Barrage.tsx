import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CardWithCharms } from "../../src2/illustration/characters/CardWithCharms";
import { C } from "../../src2/brand/tokens";
import { loadBrandFonts } from "../../src2/brand/fonts";
import { SLAP_CONTACT, slapAt } from "../../src2/motion/motion";
import { peelGeometry, polygon } from "../../src2/motion/Sticker";
import { HookShot } from "../../src2/scenes/H1/hook";
import { CARD_H, CARD_W } from "../cards/NewsCard";
import { CARD_PNGS, PLATE_PNG } from "../cards/pngs";
import type { BarrageLook } from "../fx/barrageShader";
import { type Cam, camMotion, punchAt, whipAt } from "../fx/camera";
import { FramePost } from "../fx/FramePost";
import { mergeLooks, motionLook, rgbLook, screenLook, slicesLook, stepSeed, warpLook, waveLook } from "../fx/looks";
import { Tunnel } from "../fx/Tunnel";
import { burst, bursts, clamp, shake } from "../lib/seed";

loadBrandFonts();

/**
 * Proof of the whole idea in 6.2 s: barrage (4 s) → turn idea 1 "slap, freeze, peel" → the film's real first frame
 * (src2 H1 HookShot), so the hand-off to "Stick it on." is exact. Everything the chaos shows is FICTIONAL placeholder
 * screenshots. One GL context for the whole chaos (FramePost), no per-card effects.
 *
 *   0–29    cold open: a wall of screenshots, slow push; f0 warp burst; f15 punch-in on the headline (beat 2)
 *   30–36   whip to the hero post (GL motion blur from the camera velocity)
 *   36–59   hero hold (readable 0.8 s), a slice hit on f45
 *   60–63   zoom-through dive (×5, radial blur) and cut into the tunnel
 *   64–123  tunnel, accelerating; hits on the 8th-note grid; two headline slams (f92, f104)
 *   120     a coral Satchel card slaps onto the glass; contact f124 = the chaos FREEZES and goes clean (hit-stop)
 *   124–131 the breath: silence, nothing moves but the card's rebound
 *   132–153 the frozen chaos peels off like a sticker sheet (film's peel geometry) over H1 frozen at g = 0
 *   154–    H1 runs from g = 0: the overlay card is swapped for HookShot's own card (identical pixels)
 */
export const T_WHIP = 30;
export const T_DIVE = 60;
export const T_TUNNEL = 64;
export const T_TURN = 120;
export const T_CONTACT = T_TURN + SLAP_CONTACT; // 124
export const T_PEEL = 132;
export const PEEL_DUR = 22;
export const T_H1 = T_PEEL + PEEL_DUR; // 154
export const BARRAGE_FRAMES = T_H1 + 32;

const HITS = [0, 15, 33, 45, 60, 64, 72, 79, 86, 92, 98, 104, 110, 114, 117, 119];
const SLAMS = [
  { at: 92, card: 3 },
  { at: 104, card: 5 },
];

const HERO_X = 2300; // the hero card's position on the strip (world px)
const WALL_FOCUS = { x: 470, y: 300 }; // the "Seed phrase leak" headline on the plate (zoom origin of the punch)

/** The strip camera (wall → whip → hero → dive). Scale is blended across the whip so it never jumps. */
const stripCam = (f: number): Cam & { ox: number; oy: number } => {
  const w = interpolate(f, [T_WHIP, T_WHIP + 6], [0, 1], { ...clamp, easing: Easing.bezier(0.75, 0, 0.25, 1) });
  const sWall = 1.03 + 0.0025 * Math.min(f, T_WHIP) + punchAt(f, 15, 1.3);
  const sHero = 1 + 0.0012 * Math.max(0, f - 36) + punchAt(f, 45, 0.6);
  const dive = interpolate(f, [T_DIVE, T_DIVE + 4], [0, 1], { ...clamp, easing: Easing.in(Easing.exp) });
  const s = (sWall + (sHero - sWall) * w) * Math.pow(5, dive);
  return {
    x: whipAt(f, T_WHIP, 6, 0, HERO_X),
    y: 0,
    s,
    ox: WALL_FOCUS.x + (960 - WALL_FOCUS.x) * w,
    oy: WALL_FOCUS.y + (540 - WALL_FOCUS.y) * w,
  };
};

const tunnelSpeed = (tf: number) => 90 + 260 * Math.pow(Math.min(1, tf / 60), 1.5);

const Strip: React.FC<{ f: number }> = ({ f }) => {
  const cam = stripCam(f);
  const hitShake = shake(f, "strip", 14 * (burst(f, 0, 5) + burst(f, 15, 5) + 0.6 * burst(f, 45, 4)));
  return (
    <AbsoluteFill style={{ background: "#0c0e13", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${hitShake.x}px, ${hitShake.y}px) translate(${cam.ox}px, ${cam.oy}px) scale(${cam.s}) translate(${-cam.ox}px, ${-cam.oy}px) translate(${-cam.x}px, 0px)`,
        }}
      >
        <Img src={PLATE_PNG} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} />
        <Img
          src={CARD_PNGS[1]}
          style={{ position: "absolute", left: HERO_X + 960 - (CARD_W * 1.45) / 2, top: 540 - (CARD_H * 1.45) / 2, width: CARD_W * 1.45, height: CARD_H * 1.45 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Slam: React.FC<{ f: number }> = ({ f }) => {
  const s = SLAMS.find((x) => f >= x.at && f < x.at + 5);
  if (!s) return null;
  const t = f - s.at;
  const k = interpolate(t, [0, 2], [1.75, 1.42], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img src={CARD_PNGS[s.card]} style={{ width: CARD_W * k, height: CARD_H * k, rotate: `${t === 0 ? -2 : -1}deg` }} />
    </AbsoluteFill>
  );
};

/** The chaos at frame f (pure function of f, so it can be frozen). */
const Chaos: React.FC<{ f: number }> = ({ f }) => {
  if (f < T_TUNNEL) return <Strip f={f} />;
  const tf = f - T_TUNNEL + 30;
  return (
    <AbsoluteFill style={{ background: "#0c0e13" }}>
      <Tunnel
        frame={tf}
        width={1920}
        height={1080}
        cardW={CARD_W}
        cardH={CARD_H}
        speed={tunnelSpeed}
        renderCard={(idx) => <Img src={CARD_PNGS[(idx * 5 + 2) % CARD_PNGS.length]} style={{ width: CARD_W, height: CARD_H }} />}
      />
      <Slam f={f} />
    </AbsoluteFill>
  );
};

const chaosLook = (f: number): BarrageLook => {
  const hit = bursts(f, HITS, 5);
  const master = interpolate(f, [0, 30, 64, 100, 123], [0.3, 0.35, 0.5, 0.75, 1], clamp);
  const parts = [
    screenLook(0.3 + 0.45 * master),
    waveLook(0.15 * master + 0.45 * hit),
    rgbLook(0.2 + 0.3 * master + 0.35 * hit, f),
    slicesLook(Math.max(0, hit - 0.25) * (f < T_TUNNEL ? 0.8 : 1)),
    warpLook(Math.min(1, 0.9 * burst(f, 0, 7) + 0.7 * burst(f, T_TUNNEL, 6) + 0.45 * burst(f, 98, 5)), f),
  ];
  if (f < T_TUNNEL) {
    const m = camMotion(stripCam, f);
    const cam = stripCam(f);
    parts.push(motionLook(m.vx, m.vy, m.zoomRate), { centerX: cam.ox / 1920, centerY: cam.oy / 1080 });
  } else {
    // a slam must READ: no radial blur while a headline sits on the glass (the tunnel behind it keeps moving)
    const slam = SLAMS.some((s) => f >= s.at && f < s.at + 5);
    parts.push({ zoom: slam ? 0.006 : Math.min(0.13, tunnelSpeed(f - T_TUNNEL + 30) / 2600), rgbRadial: 0.9 });
  }
  return mergeLooks(f, stepSeed(f, 2), ...parts);
};

/** After contact: the same frozen frame, clean (no glitch, no blur), desaturated and pushed toward ink. */
const frozenLook = (f: number): BarrageLook => ({
  time: f,
  seed: 1,
  desat: 0.8,
  contrast: 0.08,
  vignette: 0.45,
  flash: 0.38,
  flashColor: [0x1d / 255, 0x13 / 255, 0x40 / 255],
  clampEdges: true,
});

// ── the turn: HookShot's card at g = 0, in HookShot's own camera, so the swap at T_H1 is invisible ─────────────
const CW = 720;
const K = CW / 400;
const H1_CAM = "translate(960px, 540px) scale(1.12) translate(-900px, -600px)"; // camAt(0) in src2/scenes/H1/hook.tsx
const H1_CARD = { left: 900 - CW / 2, top: 350 + 0.15 * 640, lift: 0.15 * 40 }; // cardAt(0): 85% home, 6 px lift

const SlapCard: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const s = slapAt(f - T_TURN, fps, 4 * K);
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: H1_CAM, opacity: s.opacity }}>
      <div
        style={{
          position: "absolute",
          left: H1_CARD.left,
          top: H1_CARD.top,
          width: CW,
          height: (CW * 252) / 400,
          transformOrigin: "50% 50%",
          scale: `${s.sx} ${s.sy}`,
        }}
      >
        <CardWithCharms width={CW} lift={(H1_CARD.lift + s.lift) / (8 * K)} charms={[{ hidden: true }, { hidden: true }, { hidden: true }]} />
      </div>
    </AbsoluteFill>
  );
};

const PeelSheet: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => {
  const { width, height } = useVideoConfig();
  if (p <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  const g = peelGeometry(width, height, p, "br");
  const outline = 8;
  const [a, b] = g.fold;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: polygon(g.stuckClip) }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ filter: `drop-shadow(0 ${interpolate(p, [0, 0.3], [8, 40], clamp)}px 0 ${C.ink})` }}>
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            transform: g.matrix,
            clipPath: polygon(g.peeled),
            background: C.surface,
            border: `${outline}px solid ${C.ink}`,
            boxSizing: "border-box",
          }}
        />
        {a && b ? (
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={outline} strokeLinecap="round" />
          </svg>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Barrage: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (f >= T_H1) return <HookShot g={f - T_H1} />;

  const frozen = f >= T_CONTACT;
  const cf = frozen ? T_CONTACT - 1 : f;
  const thump = frozen ? interpolate(f - T_CONTACT, [0, 1, 5], [0, 6, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }) : 0;
  const peel = Easing.inOut(Easing.cubic)(interpolate(f, [T_PEEL, T_H1 - 1], [0, 1], clamp)); // fully off on the last frame before the swap
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {f >= T_TURN ? <HookShot g={0} /> : null}
      <PeelSheet p={peel}>
        <AbsoluteFill style={{ translate: `0px ${thump}px` }}>
          <FramePost width={width} height={height} look={frozen ? frozenLook(cf) : chaosLook(cf)}>
            <Chaos f={cf} />
          </FramePost>
        </AbsoluteFill>
      </PeelSheet>
      {f >= T_TURN ? <SlapCard f={f} /> : null}
    </AbsoluteFill>
  );
};
