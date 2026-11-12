import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { CARDS } from "../cards/data";
import { CARD_H, CARD_W, NewsCard } from "../cards/NewsCard";
import { FramePost } from "../fx/FramePost";
import { mergeLooks, motionLook, rgbLook, screenLook, slicesLook, stepSeed, warpLook, waveLook } from "../fx/looks";
import { ScreenOverlay } from "../fx/ScreenOverlay";
import { SliceGlitch } from "../fx/Slices";
import { SvgDirBlur, SvgRgbSplit, SvgWarp, SvgWave } from "../fx/SvgFx";
import { Tunnel, tunnelSpeedRamp } from "../fx/Tunnel";
import { type Cam, camMotion, punchAt, whipAt } from "../fx/camera";
import { burst, clamp, shake } from "../lib/seed";

/**
 * One composition per technique, 60 frames (2 s). intensity: 0..1 override; when omitted it ramps 0 → 1 over 50 frames
 * so frames 0/20/40/59 form a contact sheet of the curve. route: "post" (GL barrage pass over the composed frame),
 * "svg" (SVG filters), "css" (DOM/CSS only), "none" (no effect, for benchmarks).
 */
export type DemoProps = { intensity?: number; route?: "post" | "svg" | "css" | "none" | "cmb"; card?: number };

export const BG = "#0c0e13"; // the barrage world: night screen light, cold; the turn goes to Day #f6f5fb
const ramp = (f: number) => interpolate(f, [0, 50], [0, 1], clamp);

/** A card centred and large (1.35×), on the dark ground. */
const Stage: React.FC<{ card: number; scale?: number; children?: React.ReactNode }> = ({ card, scale = 1.35, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <div
        style={{
          position: "absolute",
          left: width / 2 - CARD_W / 2,
          top: height / 2 - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          scale: `${scale}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          borderRadius: 18,
        }}
      >
        <NewsCard d={CARDS[card % CARDS.length]} variant={card} />
      </div>
      {children}
    </AbsoluteFill>
  );
};

const Label: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 40, bottom: 30, color: "#8a93a6", font: '600 26px "Helvetica Neue", Arial', letterSpacing: 1 }}>{text}</div>
);

// (a) wave ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const A_Wave: React.FC<DemoProps> = ({ intensity, route = "post", card = 0 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const i = intensity ?? ramp(f);
  const label = <Label text={`(a) wave · ${route} · i=${i.toFixed(2)}`} />;
  if (route === "svg")
    return (
      <AbsoluteFill style={{ background: BG }}>
        <SvgWave intensity={i} frame={f} k={height / 1080}>
          <Stage card={card} />
        </SvgWave>
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f), waveLook(i))}>
        <Stage card={card} />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

// (b) turbulence warp burst on cuts ──────────────────────────────────────────────────────────────────────────────
export const B_WarpBurst: React.FC<DemoProps> = ({ intensity = 1, route = "post", card = 0 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cut = Math.floor(f / 15) * 15; // hard cut every beat (15 f at 120 BPM)
  const hit = intensity * burst(f, cut, 7);
  const c = card + Math.floor(f / 15);
  const label = <Label text={`(b) warp burst on cut · ${route} · hit=${hit.toFixed(2)}`} />;
  if (route === "svg")
    return (
      <AbsoluteFill style={{ background: BG }}>
        <SvgWarp intensity={hit} frame={f} k={height / 1080}>
          <Stage card={c} scale={1.35 + 0.08 * hit} />
        </SvgWarp>
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f), warpLook(hit, f))}>
        <Stage card={c} scale={1.35 + 0.08 * hit} />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

// (c) chromatic / RGB split ──────────────────────────────────────────────────────────────────────────────────────
export const C_Rgb: React.FC<DemoProps> = ({ intensity, route = "post", card = 1 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const i = intensity ?? ramp(f);
  const label = <Label text={`(c) rgb split · ${route} · i=${i.toFixed(2)}`} />;
  if (route === "svg")
    return (
      <AbsoluteFill style={{ background: BG }}>
        <SvgRgbSplit intensity={i} frame={f} k={height / 1080}>
          <Stage card={card} />
        </SvgRgbSplit>
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f), rgbLook(i, f))}>
        <Stage card={card} />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

// (d) horizontal slice glitch ────────────────────────────────────────────────────────────────────────────────────
export const D_Slices: React.FC<DemoProps> = ({ intensity, route = "post", card = 7 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // glitches are events: on for 1–3 frames, off for a few (here: 4 hits in 2 s, each ramping with the master)
  const master = intensity ?? ramp(f);
  const on = [6, 7, 18, 19, 20, 31, 32, 44, 45, 46, 52, 53].includes(f) || intensity !== undefined;
  const i = on ? master : 0;
  const label = <Label text={`(d) slices · ${route} · i=${i.toFixed(2)}`} />;
  if (route === "css")
    return (
      <AbsoluteFill style={{ background: BG }}>
        <SliceGlitch intensity={i} frame={f} width={width} height={height}>
          <Stage card={card} />
        </SliceGlitch>
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f, 1), slicesLook(i))}>
        <Stage card={card} />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

// (e) scanlines + noise ──────────────────────────────────────────────────────────────────────────────────────────
export const E_Screen: React.FC<DemoProps> = ({ intensity, route = "post", card = 5 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const i = intensity ?? ramp(f);
  const label = <Label text={`(e) scanlines + noise · ${route} · i=${i.toFixed(2)}`} />;
  if (route === "css")
    return (
      <AbsoluteFill>
        <Stage card={card} />
        <ScreenOverlay intensity={i} frame={f} width={width} height={height} />
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f, 1), screenLook(i))}>
        <Stage card={card} />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

// (f) z-tunnel of 12 cards ───────────────────────────────────────────────────────────────────────────────────────
export const F_Tunnel: React.FC<DemoProps> = ({ intensity = 0.6, route = "post" }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const speed = tunnelSpeedRamp(f);
  const tunnel = (
    <AbsoluteFill style={{ background: BG }}>
      <Tunnel
        frame={f}
        width={width}
        height={height}
        cardW={CARD_W}
        cardH={CARD_H}
        renderCard={(idx) => <NewsCard d={CARDS[idx % CARDS.length]} variant={idx} />}
      />
    </AbsoluteFill>
  );
  const look = mergeLooks(f, stepSeed(f), screenLook(0.3 + 0.3 * intensity), rgbLook(0.3 * intensity, f), {
    zoom: Math.min(0.14, (speed / 2400) * intensity),
    rgbRadial: 0.9,
  });
  return (
    <AbsoluteFill>
      {route === "none" ? tunnel : <FramePost width={width} height={height} look={look}>{tunnel}</FramePost>}
      <Label text={`(f) z-tunnel · ${route} · speed ${speed.toFixed(0)} px/f`} />
    </AbsoluteFill>
  );
};

// (g) zoom punch + whip with motion blur ─────────────────────────────────────────────────────────────────────────
const SPACING = 2300;
export const camPath = (f: number): Cam => ({
  x: whipAt(f, 30, 6, 0, SPACING),
  y: 0,
  s: 1 + punchAt(f, 12) + punchAt(f, 44, 0.7),
});

/** The strip of cards seen through the camera. Reads the frame itself so CameraMotionBlur can sub-sample it. */
const Strip: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camPath(f);
  const sh = shake(f, "punch", 16 * (burst(f, 12, 5) + burst(f, 36, 5) + 0.7 * burst(f, 44, 5)));
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "50% 50%", transform: `translate(${sh.x}px, ${sh.y}px) scale(${cam.s}) translate(${-cam.x}px, 0px)` }}>
        {[0, 1, 2].map((k) => (
          <div
            key={k}
            style={{
              position: "absolute",
              left: width / 2 - CARD_W / 2 + k * SPACING,
              top: height / 2 - CARD_H / 2,
              width: CARD_W,
              height: CARD_H,
              scale: "1.35",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              borderRadius: 18,
            }}
          >
            <NewsCard d={CARDS[(k * 4 + 1) % CARDS.length]} variant={k} />
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const G_PunchWhip: React.FC<DemoProps> = ({ route = "post" }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const m = camMotion(camPath, f);
  const label = <Label text={`(g) punch + whip · ${route} · v=${m.vx.toFixed(0)} px/f · zoom ${m.zoomRate.toFixed(3)}/f`} />;
  if (route === "cmb")
    return (
      <AbsoluteFill>
        <CameraMotionBlurBox>
          <Strip />
        </CameraMotionBlurBox>
        {label}
      </AbsoluteFill>
    );
  if (route === "svg")
    return (
      <AbsoluteFill>
        <SvgDirBlur vx={m.vx}>
          <Strip />
        </SvgDirBlur>
        {label}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <FramePost width={width} height={height} look={route === "none" ? null : mergeLooks(f, stepSeed(f), motionLook(m.vx, m.vy, m.zoomRate), screenLook(0.2))}>
        <Strip />
      </FramePost>
      {label}
    </AbsoluteFill>
  );
};

/** CameraMotionBlur from @remotion/motion-blur, isolated so the import is in one place. */
const CameraMotionBlurBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CameraMotionBlur shutterAngle={180} samples={8}>
    {children}
  </CameraMotionBlur>
);
