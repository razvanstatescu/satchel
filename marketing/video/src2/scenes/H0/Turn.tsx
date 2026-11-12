import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { C } from "../../brand/tokens";
import { CardWithCharms } from "../../illustration/characters/CardWithCharms";
import { slapAt, TILE_RADIUS } from "../../motion";
import { H1_WORLD, h1PoseAt, HookShot } from "../H1/hook";
import { CONTACT, CONTACT_G, H0_FRAMES, SLAP_START } from "./timing";

/**
 * The reveal, out of the black, on H1's own world (h1PoseAt / HookShot at negative g; H1's card is at rest from f0).
 * Frames as offsets from CONTACT (c; f255 since film v6, f205 before the bridge):
 *   c−4…c−1  the coral card falls in out of the black (motion kit slapAt from 1.3, ease-in): it appears big at the
 *            frame's centre and drops onto its rest pose
 *   c        CONTACT, the biggest hit of the intro, uncropped at the rest pose (H1 at g −7): the card squashes flat;
 *            the Day world bursts open around it (a hole hugging the card that grows into the logo's tile shape, ink
 *            outline, the black's hard ink shadow on its top edge), a pale shockwave ring runs out ahead of it, and the
 *            frame takes an impact punch (5 % zoom) with a 3-frame shake
 *   c…c+4    the hole opens with an ease-out (its last black, in the corners, leaves the frame on c+5) while H1's
 *            camera eases into its settle; from c+2 the card is H1's own (the squash has recovered); c+5 and c+6 are
 *            H1's world alone
 *   c+6      H1's own world (HookShot at g −1), untouched: BTC enters the top edge, the camera keeps easing out
 * The card is drawn exactly as HookShot draws it (same camera transform, card box and CardWithCharms), never distorted.
 */
const { CW, CH, K, REST, PIVOT_Y } = H1_WORLD;
const HIDDEN = [{ hidden: true }, { hidden: true }, { hidden: true }];
const OURS_UNTIL = CONTACT + 2; // our card (the slap's squash and pressed lift) until c+1; H1's own card from c+2
export const HOOK_FROM = OURS_UNTIL; // HookShot draws the world (and its card) from c+2
const FALL_FROM = 1.3;
const FALL_START = { x: 960, y: 540 }; // where the falling card first appears (screen centre)
const SQUASH = [0.07, 0.03];
const LIFT = [-REST, -0.4 * REST]; // px above rest (world): pressed flat on contact, the shadow catching up
const IRIS_FRAMES = H0_FRAMES - CONTACT; // 7 frames from contact to the join (the hole is fully open from c+5)
const PUNCH = [1.05, 1.025, 1.01];
const SHAKE: [number, number][] = [
  [14, -9],
  [-9, 6],
  [4, -2],
];
const INK_EDGE = 16; // outline width inside the hole (screen px)
const INK_DROP = 18; // the black's hard shadow on the Day world (screen px, straight down)
const HALO = 44; // the hole's margin around the card on contact (screen px)

type Pose = ReturnType<typeof h1PoseAt>;
const camera = (pose: Pose) => `translate(960px, ${540 + pose.thump}px) scale(${pose.camera.z}) translate(${-pose.camera.x}px, ${-pose.camera.y}px)`;
const poseAt = (f: number) => h1PoseAt(f < CONTACT ? CONTACT_G : f - H0_FRAMES);
const impactAt = (f: number) => {
  const k = f - CONTACT;
  return { s: PUNCH[k] ?? 1, dx: SHAKE[k]?.[0] ?? 0, dy: SHAKE[k]?.[1] ?? 0 };
};

/** World → screen through a pose's camera. */
const toScreen = (pose: Pose, x: number, y: number) => ({
  x: 960 + (x - pose.camera.x) * pose.camera.z,
  y: 540 + pose.thump + (y - pose.camera.y) * pose.camera.z,
});

/** The card on screen at a pose: its face's centre and half-size, and its charm bar's bottom (for the hole's halo). */
const cardOnScreen = (pose: Pose) => {
  const z = pose.camera.z;
  const c = toScreen(pose, pose.card.left + CW / 2, pose.card.top + CH / 2);
  return { cx: c.x, cy: c.y, hw: (CW / 2) * z, hh: (CH / 2) * z, below: (PIVOT_Y - CH) * z };
};

/** The impact (punch and shake) wraps everything the reveal draws; the Day ground under it is uniform. */
export const Impact: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const { s, dx, dy } = impactAt(f);
  return <AbsoluteFill style={s !== 1 || dx || dy ? { transform: `translate(${dx}px, ${dy}px) scale(${s})` } : undefined}>{children}</AbsoluteFill>;
};

export const RevealCard: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  if (f < SLAP_START || f >= OURS_UNTIL) return null;
  const pose = poseAt(f);
  let sx = 1;
  let sy = 1;
  let lift: number;
  let origin = "50% 50%";
  if (f < CONTACT) {
    // falling, fully opaque from its first frame (it is simply there out of the black): scale and lift from the motion
    // kit's slap, about the point that puts its first frame at the screen centre
    const s = slapAt(f - SLAP_START, fps, REST, { from: FALL_FROM, drop: 28 });
    sx = s.sx;
    sy = s.sy;
    lift = s.lift;
    const land = cardOnScreen(pose);
    const px = (FALL_START.x - FALL_FROM * land.cx) / (1 - FALL_FROM); // screen point that stays put while it scales
    const py = (FALL_START.y - FALL_FROM * land.cy) / (1 - FALL_FROM);
    const wx = pose.camera.x + (px - 960) / pose.camera.z - pose.card.left; // in card px
    const wy = pose.camera.y + (py - 540 - pose.thump) / pose.camera.z - pose.card.top;
    origin = `${wx}px ${wy}px`;
  } else {
    const k = f - CONTACT;
    sx = 1 + SQUASH[k];
    sy = 1 - SQUASH[k];
    lift = LIFT[k];
  }
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: camera(pose) }}>
      <div style={{ position: "absolute", left: pose.card.left, top: pose.card.top, width: CW, height: CH, transformOrigin: origin, scale: `${sx} ${sy}` }}>
        <CardWithCharms width={CW} lift={lift / (8 * K)} charms={HIDDEN} />
      </div>
    </AbsoluteFill>
  );
};

/** A rounded rect as an SVG path (clockwise). */
const rrect = (cx: number, cy: number, hw: number, hh: number, r: number) => {
  const x = cx - hw;
  const y = cy - hh;
  const w = 2 * hw;
  const h = 2 * hh;
  const rr = Math.max(0, Math.min(r, hw, hh));
  return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x},${y + h - rr} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`;
};

/**
 * The hole's size and centre per frame from contact. It starts hugging the card (a halo just outside its edge and its
 * charm bar), grows with an ease-out to END (a rounded rect in the frame's proportions with the logo tile's corner
 * ratio, just big enough to cover the frame from its centre) while its centre slides from the card to the frame's
 * centre, so it reaches every edge at about the same time: the black is visible f205–f209 (ever smaller, the last of it
 * in the corners), and f210–f211 are H1's world alone (BTC enters on f211).
 */
const END = { hw: 1080, hh: 608 };
const OPEN_FRAMES = 5; // contact + 5: the frame is fully open
const holeAt = (f: number) => {
  const k = f - CONTACT;
  const x = Math.min(1, k / OPEN_FRAMES);
  const p = 1 - (1 - x) * (1 - x);
  const c = cardOnScreen(poseAt(f));
  const hw0 = c.hw + HALO;
  const hh0 = c.hh + HALO + c.below / 2;
  const cy0 = c.cy + c.below / 2;
  const hw = hw0 + (END.hw - hw0) * p;
  const hh = hh0 + (END.hh - hh0) * p;
  return { k, p, cx: c.cx + (960 - c.cx) * p, cy: cy0 + (540 - cy0) * p, hw, hh, r: 2 * TILE_RADIUS * Math.min(hw, hh) };
};

/** True when a rounded rect covers all four frame corners. */
const covers = (h: ReturnType<typeof holeAt>) =>
  [
    [0, 0],
    [1920, 0],
    [0, 1080],
    [1920, 1080],
  ].every(([x, y]) => {
    const dx = Math.abs(x - h.cx);
    const dy = Math.abs(y - h.cy);
    if (dx > h.hw - INK_EDGE || dy > h.hh - INK_EDGE) return false;
    const ix = Math.max(0, dx - (h.hw - h.r));
    const iy = Math.max(0, dy - (h.hh - h.r));
    return ix * ix + iy * iy <= (h.r - INK_EDGE) * (h.r - INK_EDGE);
  });

/**
 * The black, burst open from behind the card: the hole (above), edged like a sticker (ink outline, and the black's hard
 * ink shadow falling on the Day world along the top of the hole), with a pale shockwave ring running out ahead of it for
 * its first three frames. Oversized so the impact never opens a gap.
 */
export const Iris: React.FC<{ f: number }> = ({ f }) => {
  const k = f - CONTACT;
  if (k < 0 || k >= IRIS_FRAMES) return null;
  const h = holeAt(f);
  if (covers(h)) return null; // fully open: the frame is H1's world, untouched
  const hole = rrect(h.cx, h.cy, h.hw, h.hh, h.r);
  const shifted = rrect(h.cx, h.cy + INK_DROP, h.hw, h.hh, h.r);
  const outer = "M-400,-400 H2320 V1480 H-400 Z";
  const ring = k < 3 ? { grow: [70, 240, 460][k], width: [12, 8, 4][k] } : null;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={`${hole} ${shifted}`} fill={C.ink} fillRule="evenodd" />
      <path d={`${outer} ${hole}`} fill="#000" fillRule="evenodd" />
      <path d={hole} fill="none" stroke={C.ink} strokeWidth={INK_EDGE * 2} strokeLinejoin="round" />
      {ring ? (
        <path
          d={rrect(h.cx, h.cy, h.hw + ring.grow, h.hh + ring.grow, h.r + ring.grow)}
          fill="none"
          stroke={C.ground}
          strokeWidth={ring.width}
          opacity={interpolate(k, [0, 2], [1, 0.55])}
        />
      ) : null}
    </svg>
  );
};

/**
 * What the hole uncovers: the bare Day ground while our card is up (H1 at g −7…−6 shows nothing but the ground and its
 * card, which would peek out from under our squashed one), then H1's own world from f207 on.
 */
export const Underlay: React.FC<{ f: number }> = ({ f }) => {
  if (f < CONTACT) return null;
  return f >= HOOK_FROM ? <HookShot g={f - H0_FRAMES} /> : <AbsoluteFill style={{ background: C.ground }} />;
};
