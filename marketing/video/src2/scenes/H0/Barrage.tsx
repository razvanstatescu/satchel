import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Freeze, Img, interpolate, Sequence, staticFile } from "remotion";
import type { BarrageLook } from "./fx/barrageShader";
import { mergeLooks, motionLook, rgbLook, screenLook, slicesLook, warpLook, waveLook } from "./fx/looks";
import { burst, bursts, type Cam, camMotion, clamp, punchAt, shake, stepSeed, WHIP_EASE } from "./fx/motion";
import { CARD_H, CARD_W, G1_H, G1_SCREEN, G1_W, G1Photo, G2SignRequest, G4Permit, G5VerifyPhrase } from "./Generic";
import { type Box, type CardRef, LIGHT_GRADE, type Plate, PLATES, SEAL_AT, type Slam, SLAMS, TUNNEL, WALL } from "./plates";
import { Tunnel, type TunnelItem } from "./Tunnel";
import { BAR2, BAR3, BLACK, DEVCON, DIVE, VOICE_AT, WHIP } from "./timing";

/**
 * The barrage: the "old world", everything third-party (real screenshots, the Devcon talk, generic unbranded cards) on
 * a black ground, drawn as a pure function of the frame and run through ONE GL pass (barrageLook). Nothing here is
 * Satchel's and nothing here is ours to keep still: the captions and the credits sit above the pass, untouched.
 *
 *   0–29    the wall: real screenshots pinned on black, the SEAL post read in close, below the caption from f0;
 *           punch-in on its key phrase (f15)
 *   30–36   whip along the strip (GL motion blur from the camera's velocity) to the photo of a seed phrase being
 *           photographed (the shutter clicks as the whip lands)
 *   45      punch-in on the phone's screen; f49 the phishing prompt slams in, and f56–59 the camera dives through it
 *           (dark all the way: no bright frame between it and the talk)
 *   60–97   the Devcon talk slams onto the glass over the tunnel (its first frame held until the clip starts on f64)
 *           and holds 1.3 s (calm pass: the speaker reads); f94–97 dive through it, aimed at the speaker
 *   98–179  the tunnel accelerates and rolls; from f105 the slams follow each other with no gap; light news pages are
 *           graded down (LIGHT_GRADE), land whole (masthead and date), then punch in on their key phrase;
 *           f173–179 the whole barrage is sucked in toward the centre, and f180 cuts to black
 * Photosensitivity (QA v5 #1): no dark frame ever sits between two light pages, slices stay off the light pages, and
 * src2/scenes/H0/qa/flashcheck.py screens the whole frame and every 341×256 window.
 */
export const DEVCON_SRC = "v2/intro/raw/video/devcon7-2024-blind-signing-blank-check.mp4";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── cards ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const X_BORDER = "#2f3336"; // X's own dark-mode card border, so a black post keeps its edge on the black ground

/**
 * A plate (or a region of it) at `width`. `underline` (0..1) wipes an amber bar under the key phrase, line by line;
 * `zoom` (≥ 1) punches in on the key phrase inside the same box (capped so the whole phrase stays in), pulling it to the
 * centre as it goes. Light pages are graded down here, so the grade follows them everywhere.
 */
const PlateImg: React.FC<{ plate: Plate; region?: Box; width: number; underline?: number; zoom?: number; focus?: Box }> = ({ plate, region, width, underline = 0, zoom = 1, focus }) => {
  const r = region ?? { x: 0, y: 0, w: plate.w, h: plate.h };
  const k = width / r.w;
  const height = r.h * k;
  const total = plate.lines.reduce((a, l) => a + l.w, 0);
  let acc = 0;
  const fb = focus ?? plate.key; // what the punch-in centres and keeps whole
  const kx = (fb.x + fb.w / 2 - r.x) * k; // focus centre in the box
  const ky = (fb.y + fb.h / 2 - r.y) * k;
  const z = Math.min(zoom, Math.max(1, Math.min((0.94 * width) / (fb.w * k), (0.8 * height) / (fb.h * k))));
  const c = z > 1 ? Math.min(1, (z - 1) / 0.25) : 0;
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: plate.x ? 48 * k : 4,
        boxShadow: plate.x ? `0 0 0 ${Math.max(2, 4 * k)}px ${X_BORDER}` : undefined,
        background: plate.light ? "#999" : "#000",
      }}
    >
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${kx}px ${ky}px`, transform: z > 1 ? `translate(${(width / 2 - kx) * c}px, ${(height / 2 - ky) * c}px) scale(${z})` : undefined }}>
        {/* the region is clipped before the zoom, so a punch-in never brings in what the region leaves out */}
        <div style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }}>
          <Img
            src={staticFile(plate.src)}
            style={{ position: "absolute", left: -r.x * k, top: -r.y * k, width: plate.w * k, height: plate.h * k, maxWidth: "none", filter: plate.light ? `brightness(${LIGHT_GRADE})` : undefined }}
          />
        </div>
        {underline > 0
          ? plate.lines.map((l, i) => {
              const share = Math.max(0, Math.min(1, (underline * total - acc) / l.w));
              acc += l.w;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: (l.x - r.x) * k,
                    top: (l.y + l.h - r.y) * k,
                    width: l.w * share * k,
                    height: Math.max(4, 10 * k),
                    background: "#f5a524",
                    borderRadius: 4,
                  }}
                />
              );
            })
          : null}
      </div>
    </div>
  );
};

const aspectOf = (c: CardRef) => {
  if ("g" in c) return CARD_W / CARD_H;
  const p = PLATES[c.plate];
  const r = c.region ?? { w: p.w, h: p.h };
  return r.w / r.h;
};
const isLight = (c: CardRef) => "plate" in c && PLATES[c.plate].light;

/** Any barrage card at `width` (generic cards are drawn at 1280 × 720 and scaled). */
const CardView: React.FC<{ card: CardRef; width: number; pressed?: boolean; underline?: number; zoom?: number; focus?: Box }> = ({ card, width, pressed, underline, zoom, focus }) => {
  if ("g" in card) {
    const k = width / CARD_W;
    return (
      <div style={{ width, height: CARD_H * k }}>
        <div style={{ width: CARD_W, height: CARD_H, transformOrigin: "0 0", transform: `scale(${k})` }}>
          {card.g === "g2" ? <G2SignRequest pressed={pressed} /> : card.g === "g4" ? <G4Permit /> : <G5VerifyPhrase />}
        </div>
      </div>
    );
  }
  return <PlateImg plate={PLATES[card.plate]} region={card.region} width={width} underline={underline} zoom={zoom} focus={focus} />;
};

// ── bar 1: the strip (the wall, the whip, the photo) ───────────────────────────────────────────────────────────────
const HERO = { x: 2560, y: 0, w: 1760 }; // G1, the photo of a seed phrase being photographed (world px)
const kG1 = HERO.w / G1_W;
const PHONE = {
  x: HERO.x + (G1_SCREEN.x + G1_SCREEN.w / 2 - G1_W / 2) * kG1,
  y: HERO.y + (G1_SCREEN.y + G1_SCREEN.h / 2 - G1_H / 2) * kG1,
};
const SEAL = PLATES.seal;
const kSeal = SEAL_AT.w / SEAL.w;
const SEAL_KEY = {
  x: SEAL_AT.x + (SEAL.key.x + SEAL.key.w / 2 - SEAL.w / 2) * kSeal,
  y: SEAL_AT.y + (SEAL.key.y + SEAL.key.h / 2 - SEAL.h / 2) * kSeal,
};
const STRIP_DIVE = { from: 56, to: BAR2 };
const G1_GRADE = 0.8; // our photo, graded with the pages so the lamp-lit paper doesn't flare on the black
/** The wall's framing before the punch: the post sits low enough that its account line clears the caption band. */
const WALL_CAM_Y = SEAL_AT.y - 60;

/** The strip camera: the world point at the screen centre and the zoom. Punches pull their focus to the centre. */
export const stripCam = (f: number): Cam => {
  const pW = punchAt(f, 15, 1.4);
  const cW = Math.min(1, pW / 0.12);
  const wall = { x: lerp(SEAL_AT.x, SEAL_KEY.x, cW), y: lerp(WALL_CAM_Y, SEAL_KEY.y, cW), s: 1 + 0.0022 * Math.min(f, WHIP.at) + pW };
  const pH = punchAt(f, 45, 0.9);
  const cH = Math.min(1, pH / 0.1);
  const hero = { x: lerp(HERO.x, PHONE.x, cH), y: lerp(HERO.y + 20, PHONE.y, cH), s: 1.05 + 0.0015 * Math.max(0, f - (WHIP.at + WHIP.dur)) + pH };
  const w = interpolate(f, [WHIP.at, WHIP.at + WHIP.dur], [0, 1], { ...clamp, easing: WHIP_EASE });
  const c = { x: lerp(wall.x, hero.x, w), y: lerp(wall.y, hero.y, w), s: wall.s * Math.pow(hero.s / wall.s, w) };
  const d = interpolate(f, [STRIP_DIVE.from, STRIP_DIVE.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { x: lerp(c.x, PHONE.x, d), y: lerp(c.y, PHONE.y, d), s: c.s * Math.pow(7, d) };
};

const Pinned: React.FC<{ x: number; y: number; w: number; rot: number; children: React.ReactNode; h: number }> = ({ x, y, w, h, rot, children }) => (
  <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, rotate: `${rot}deg` }}>{children}</div>
);

const Strip: React.FC<{ f: number }> = ({ f }) => {
  const cam = stripCam(f);
  const sh = shake(f, "h0-strip", 12 * (0.6 * burst(f, 0, 5) + burst(f, 15, 5) + 0.7 * burst(f, 36, 4) + 0.6 * burst(f, 45, 4)));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${960 + sh.x}px, ${540 + sh.y}px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {WALL.map((p) => {
          const pl = PLATES[p.plate];
          return (
            <Pinned key={p.plate} x={p.x} y={p.y} w={p.w} h={(p.w * pl.h) / pl.w} rot={p.rot}>
              <PlateImg plate={pl} width={p.w} />
            </Pinned>
          );
        })}
        <Pinned x={SEAL_AT.x} y={SEAL_AT.y} w={SEAL_AT.w} h={(SEAL_AT.w * SEAL.h) / SEAL.w} rot={SEAL_AT.rot}>
          <PlateImg plate={SEAL} width={SEAL_AT.w} underline={interpolate(f, [16, 30], [0, 1], clamp)} />
        </Pinned>
        <Pinned x={HERO.x} y={HERO.y} w={HERO.w} h={G1_H * kG1} rot={0}>
          <G1Photo width={HERO.w} grade={G1_GRADE} />
        </Pinned>
      </div>
    </AbsoluteFill>
  );
};

// ── bar 2: the Devcon talk on the glass ───────────────────────────────────────────────────────────────────────────
export const DEVCON_BOX = { w: 1344, h: 756, cx: 960, cy: 604 };
const DEVCON_DIVE_AT = { x: 0.78, y: 0.47 }; // the dive aims at the speaker (dark), never into the white slide
const devconPose = (f: number) => {
  const t = f - DEVCON.from;
  const slam = interpolate(t, [0, 2], [1.05, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const push = 1 + 0.035 * interpolate(f, [DEVCON.from + 2, DIVE.from], [0, 1], clamp);
  const dive = interpolate(f, [DIVE.from, DIVE.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { s: slam * push * Math.pow(7, dive), rot: interpolate(t, [0, 2], [-2.4, -1], clamp) * (1 - dive) };
};

const DevconCard: React.FC<{ f: number }> = ({ f }) => {
  const p = devconPose(f);
  const B = DEVCON_BOX;
  const video = <Video src={staticFile(DEVCON_SRC)} muted objectFit="cover" style={{ width: B.w, height: B.h, display: "block" }} />;
  return (
    <div
      style={{
        position: "absolute",
        left: B.cx - B.w / 2,
        top: B.cy - B.h / 2,
        width: B.w,
        height: B.h,
        transform: `scale(${p.s}) rotate(${p.rot}deg)`,
        transformOrigin: `${DEVCON_DIVE_AT.x * 100}% ${DEVCON_DIVE_AT.y * 100}%`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.9)",
        background: "#000",
      }}
    >
      {f < VOICE_AT ? (
        <Freeze frame={0}>{video}</Freeze>
      ) : (
        <Sequence from={VOICE_AT} durationInFrames={DIVE.to - VOICE_AT} layout="none">
          {video}
        </Sequence>
      )}
    </div>
  );
};

/** Black over the tunnel while the talk is on the glass (it lifts through the dive). */
const devconDim = (f: number) => interpolate(f, [DIVE.from, DIVE.to], [0.6, 0], clamp);

// ── bars 2–3: the tunnel and the slams ────────────────────────────────────────────────────────────────────────────
const TUNNEL_AREA = 1150 * 650;
const tunnelItem = (idx: number): TunnelItem => {
  const card = TUNNEL[(((idx * 5 + 3) % TUNNEL.length) + TUNNEL.length) % TUNNEL.length];
  const a = aspectOf(card);
  const w = Math.min(1720, Math.sqrt(TUNNEL_AREA * a));
  return { node: <CardView card={card} width={w} />, w, h: w / a };
};

/** px per frame along z: cruising behind the talk, then a 2.5 s acceleration into the black. */
export const tunnelSpeed = (f: number) => (f < DIVE.from ? 60 : 60 + 240 * Math.pow(Math.min(1, (f - DIVE.from) / 80), 1.4));
const rollAt = (f: number) => (f < BAR3 ? 0 : 16 * Math.pow((f - BAR3) / (BLACK - BAR3), 2));

const SLAM_BOX = { w: 1560, h: 800, cy: 612 };
/** Every light page slams onto the same graded panel (its own white, graded), so its footprint never changes. */
const LIGHT_PANEL = { w: 1500, h: 800 };
const LIGHT_PANEL_BG = "#999"; // white at LIGHT_GRADE
const slamOn = (f: number): Slam | undefined => SLAMS.find((s) => f >= s.at && f < s.at + s.len);
const slamHits = SLAMS.map((s) => s.at);
/** A light page lands whole for 3 frames (masthead and date), then punches in on its key phrase. */
const PUNCH = { hold: 4, dur: 3, zoom: 1.9 };
/** A slam's own dive (the camera goes through it into the next shot): ×6, ease-in. */
const diveAt = (s: Slam, f: number) => (s.dive ? Math.pow(6, interpolate(f, [s.dive.from, s.dive.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })) : 1);

export const slamBox = (s: Slam) => {
  const a = aspectOf(s.card);
  const w = Math.min(SLAM_BOX.w, SLAM_BOX.h * a);
  return { w, h: w / a, cx: 960, cy: SLAM_BOX.cy };
};
/** The footprint a slam fills: the light panel for light pages, else the card itself. */
const slamFrame = (s: Slam) => (isLight(s.card) ? { ...LIGHT_PANEL, cx: 960, cy: SLAM_BOX.cy } : slamBox(s));

const SlamView: React.FC<{ f: number }> = ({ f }) => {
  const s = slamOn(f);
  if (!s) return null;
  const t = f - s.at;
  const card = slamBox(s);
  const box = slamFrame(s);
  // a short slam-in (1.1 → 1): a bigger one sweeps its edges across too much of the frame (local flashes)
  const k = interpolate(t, [0, 2], [1.1, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) * (1 + 0.004 * Math.max(0, t - 2)) * diveAt(s, f);
  const sign = SLAMS.indexOf(s) % 2 ? 1 : -1;
  const zoom = s.punch ? interpolate(t, [PUNCH.hold, PUNCH.hold + PUNCH.dur], [1, PUNCH.zoom], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }) : 1;
  const under = "plate" in s.card ? interpolate(t, s.punch ? [PUNCH.hold + 1, PUNCH.hold + PUNCH.dur] : [1, 4], [0.3, 1], clamp) : 0;
  const cw = Math.min(card.w, box.w, box.h * aspectOf(s.card)); // the card fitted inside the panel
  const ch = cw / aspectOf(s.card);
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - box.w / 2,
        top: SLAM_BOX.cy - box.h / 2,
        width: box.w,
        height: box.h,
        transform: `scale(${k}) rotate(${sign * (t === 0 ? 2.2 : 1)}deg)`,
        background: isLight(s.card) ? LIGHT_PANEL_BG : undefined,
        borderRadius: isLight(s.card) ? 6 : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: cw, height: ch }}>
        <CardView card={s.card} width={cw} pressed={t >= 2} underline={under} zoom={zoom} focus={s.focus} />
      </div>
    </div>
  );
};

/** The credit chip a slam needs (drawn outside the pass by index.tsx), with its box, or null. */
export const slamChipAt = (f: number) => {
  const s = slamOn(f);
  if (!s?.chip || f < s.at + 2) return null;
  return { text: s.chip, box: slamFrame(s) };
};

/** f173–179: everything is sucked in toward the centre (the suck-in's inhale), then the hard cut to black. */
const IMPLODE = { from: 173, to: BLACK };
const implodeAt = (f: number) => 1 - 0.4 * interpolate(f, [IMPLODE.from, IMPLODE.to - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

export const Barrage: React.FC<{ f: number }> = ({ f }) => {
  if (f >= BLACK) return null;
  const imp = implodeAt(f);
  const slamShake = shake(f, "h0-slam", 10 * bursts(f, slamHits, 3));
  return (
    <AbsoluteFill style={{ background: "#000", transform: imp < 1 ? `scale(${imp})` : undefined }}>
      {f < BAR2 ? (
        <Strip f={f} />
      ) : (
        <AbsoluteFill style={{ translate: `${slamShake.x}px ${slamShake.y}px` }}>
          <Tunnel frame={f - BAR2} speed={(tf) => tunnelSpeed(tf + BAR2)} item={tunnelItem} roll={rollAt(f)} />
        </AbsoluteFill>
      )}
      {f >= BAR2 && f < DIVE.to ? <AbsoluteFill style={{ background: "#000", opacity: devconDim(f) }} /> : null}
      {f >= DEVCON.from && f < DEVCON.to ? <DevconCard f={f} /> : null}
      <SlamView f={f} />
    </AbsoluteFill>
  );
};

// ── the pass ──────────────────────────────────────────────────────────────────────────────────────────────────────
const HITS = [1, 15, 30, 36, 45, BAR2, DIVE.to, ...slamHits.filter((x) => x !== BAR2)]; // the cold hit peaks on f1: f0 is the film's first frame and must read

/** The barrage's look at frame f (null from the black on: nothing to process). */
export const barrageLook = (f: number): BarrageLook | null => {
  if (f >= BLACK) return null;
  const m = interpolate(f, [0, BAR2 - 1, BAR2, DIVE.to, 150, BLACK - 1], [0.3, 0.42, 0.3, 0.5, 0.8, 1], clamp);
  const hit = bursts(f, HITS, 5);
  // while the speaker is on the glass the pass stays calm so his face and the slide read
  const calm = f >= DEVCON.from + 3 && f < DIVE.from ? 0.35 : 1;
  // slice glitches move bright bands into dark ones: never on a light page, and only lightly in bar 3
  const slam = slamOn(f);
  const sliceK = slam && isLight(slam.card) ? 0 : f >= BAR3 ? 0.4 : 1;
  const parts = [
    screenLook(0.25 + 0.45 * m),
    waveLook(calm * (0.12 * m + 0.4 * hit)),
    rgbLook(calm * (0.15 + 0.3 * m + 0.35 * hit), f),
    slicesLook(calm * sliceK * Math.max(0, hit - 0.3)),
    warpLook(Math.min(1, 0.6 * burst(f, 1, 7) + 0.7 * burst(f, BAR2, 5) + 0.6 * burst(f, DIVE.to, 6) + 0.4 * burst(f, 168, 6)), f),
  ];
  if (f < BAR2) {
    const mo = camMotion(stripCam, f);
    parts.push(motionLook(mo.vx, mo.vy, mo.zoomRate));
    if (slam?.dive && f >= slam.dive.from) parts.push({ zoom: Math.min(0.35, (0.5 * Math.abs(diveAt(slam, f + 0.5) - diveAt(slam, f - 0.5))) / diveAt(slam, f)) });
  } else if (f < DIVE.to) {
    const s0 = devconPose(f - 0.5).s;
    const s1 = devconPose(f + 0.5).s;
    parts.push({
      zoom: Math.min(0.35, (0.5 * Math.abs(s1 - s0)) / devconPose(f).s),
      centerX: (DEVCON_BOX.cx + (DEVCON_DIVE_AT.x - 0.5) * DEVCON_BOX.w) / 1920,
      centerY: (DEVCON_BOX.cy + (DEVCON_DIVE_AT.y - 0.5) * DEVCON_BOX.h) / 1080,
    });
  } else {
    parts.push({ zoom: slam ? 0.006 : Math.min(0.13, tunnelSpeed(f) / 2600), rgbRadial: 0.9 });
  }
  if (f >= IMPLODE.from) parts.push({ zoom: 0.12 * interpolate(f, [IMPLODE.from, BLACK - 1], [0, 1], clamp) });
  return mergeLooks(f, stepSeed(f, 2), ...parts);
};
