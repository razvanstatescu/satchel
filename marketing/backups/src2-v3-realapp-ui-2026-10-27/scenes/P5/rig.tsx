import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import type { Chain } from "../../brand/tokens";
import { CardWithCharms, type CharmFace, charmKick, type CharmSlot } from "../../illustration/characters";
import { blinkSchedule, CaptionSlap, clamp, eyeOpen, HANDOFF, handoffAt, SLAP_CONTACT } from "../../motion";

/**
 * Scene builder 3's rig for P4–P6 (imported by P4 and P6 too). Everything here is built ON the shared kits
 * (motion: handoffAt / rideAngle numbers, CaptionSlap, blinks; characters: CardWithCharms; brand: charm springs),
 * so the swing is the bible's swing (§2.6) and the hero card is the kit's card.
 */

export const FPS = 30;
export const CARD_RATIO = 252 / 400;
export const CHAINS3: Chain[] = ["btc", "evm", "sol"];
/** Riding a hand-off the charms trail the card: BTC 3 f, ETH 2 f, SOL 2 f (motion bible §2.4). Slots are [BTC, ETH, SOL]. */
export const RIDE_LAG = [3, 2, 2] as const;
/** Reaction order after a cue: SOL first, ETH +2 f, BTC +4 f. Slots are [BTC, ETH, SOL]. */
export const REACT_LAG = [4, 2, 0] as const;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const sec = (s: number) => Math.round(s * FPS);
/** 0 → 1 between two frames (clamped), with an optional easing. */
export const ramp = (f: number, a: number, b: number, easing?: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });

// whip curves: cubic so the 4-frame halves read (an expo-in is so flat that the outgoing stage would barely move
// before the cut); the cut sits on the fastest frame
const whipIn = Easing.in(Easing.cubic);
const whipOut = Easing.out(Easing.cubic);

// ── the hand-off clock on a SatchelCard with its charms ──────────────────────────────────────────────────────────

export interface SwingOpts {
  fromX: number; // card centre x before the swing (px)
  toX: number; // card centre x after it
  y: number; // card TOP y at rest (px)
  width: number; // card width (px)
}

/** Card geometry on the hand-off clock: t = frames since the lift (negative = before it). */
export function swingGeom(t: number, o: SwingOpts) {
  const k = o.width / 400;
  const rest = 4 * k;
  const H = o.width * CARD_RATIO;
  const m = handoffAt(t, FPS, { fromX: o.fromX, toX: o.toX, rest });
  const left = m.x - o.width / 2;
  const top = o.y + m.arcY;
  const sx = m.scale * (1 + m.squash);
  const sy = m.scale * (1 - m.squash);
  const ox = o.width / 2;
  const oy = -0.06 * H;
  /** World position of a card-local point (px from the card's top-left, before lift). */
  const point = (px: number, py: number) => {
    const lx = (px - ox) * sx;
    const ly = (py - m.lift - oy) * sy;
    const r = (m.rotate * Math.PI) / 180;
    return { x: left + ox + lx * Math.cos(r) - ly * Math.sin(r), y: top + oy + lx * Math.sin(r) + ly * Math.cos(r) };
  };
  return { m, k, rest, H, left, top, sx, sy, point };
}

/** World angle of charm slot i riding the swing: 1.5× the card, lagged; after the landing it rings down on its own spring. */
export function rideWorldAngle(t: number, i: number, o: SwingOpts, kickPeak = -7) {
  const lag = RIDE_LAG[i];
  const k = o.width / 400;
  const ride = 1.5 * handoffAt(t - lag, FPS, { fromX: o.fromX, toX: o.toX, rest: 4 * k }).rotate;
  const dir = Math.sign(o.toX - o.fromX) || 1;
  const after = t - HANDOFF.contact - lag;
  return ride + (after > 0 ? charmKick(CHAINS3[i], after / FPS, kickPeak * dir) : 0);
}

/** Eyes closed in joy from the lift to the landing (+1 f), soft in and out. 0..1. */
export function rideJoy(t: number, i: number) {
  const lag = RIDE_LAG[i];
  const on = ramp(t, HANDOFF.slideStart - 3, HANDOFF.slideStart - 1);
  const off = 1 - ramp(t, HANDOFF.contact + lag + 1, HANDOFF.contact + lag + 4);
  return Math.min(on, off);
}

/** Idle blink amount (0 open … 1 closed) for a charm, seeded, never in sync. */
export function idleBlink(frame: number, seed: string, from = 0, to = 900, forced: number[] = []) {
  const open = eyeOpen(frame, blinkSchedule(seed, from, to, forced));
  return clamp01((1 - open) / 0.88);
}

export type SlotFx = Partial<Omit<CharmSlot, "face">> & { face?: CharmFace; worldAngle?: number };

/** How a card looks and acts: its face (default: the kit's SatchelCard), per-charm acting, overlays. */
export interface CardLook {
  id?: string;
  chips?: { chain: Chain; amount?: string }[];
  total?: ReactNode;
  label?: string;
  /** a custom card face (receives the kit lift value) */
  front?: (lift: number) => ReactNode;
  /** scene acting per charm, merged over the ride */
  fx?: (i: number) => SlotFx | undefined;
  blinkSeed?: string;
  style?: CSSProperties;
  /** drawn over the card, in card px (rotates with it) */
  children?: ReactNode;
}

/**
 * The general rig: a card with its charms at a given pose. `rotate` turns the card about "50% -6%" (just above its
 * top centre: the hand-off pivot); `charmWorld(i)` is each charm's WORLD angle (the rig subtracts the card's own
 * rotation, since the charms hang inside the card's frame); `joy(i)` closes their eyes in joy (riding).
 */
export function CardRig({
  left,
  top,
  width,
  rotate = 0,
  sx = 1,
  sy = 1,
  lift = 0,
  charmWorld,
  joy,
  frame,
  look,
}: {
  left: number;
  top: number;
  width: number;
  rotate?: number;
  sx?: number;
  sy?: number;
  /** px above rest (negative = pressed into its shadow) */
  lift?: number;
  charmWorld: (i: number) => number;
  joy?: (i: number) => number;
  frame: number;
  look: CardLook;
}) {
  const k = width / 400;
  const liftK = lift / (8 * k);
  const slots: CharmSlot[] = [0, 1, 2].map((i) => {
    const extra = look.fx?.(i) ?? {};
    const world = charmWorld(i) + (extra.worldAngle ?? 0);
    const j = joy?.(i) ?? 0;
    const blink = idleBlink(frame, `${look.blinkSeed ?? "card"}-${i}`);
    const { face: fxFace, worldAngle: _w, ...shape } = extra;
    const face: CharmFace = {
      ...fxFace,
      blink: Math.max(blink, fxFace?.blink ?? 0),
      joy: Math.max(j, fxFace?.joy ?? 0), // joy arcs win over the blink lid
      smile: lerp(fxFace?.smile ?? 1, Math.max(1.45, fxFace?.smile ?? 1), j),
    };
    return { ...shape, angle: world - rotate, face };
  });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: width * CARD_RATIO,
        rotate: `${rotate}deg`,
        scale: `${sx} ${sy}`,
        transformOrigin: "50% -6%",
        ...look.style,
      }}
    >
      <CardWithCharms width={width} id={look.id ?? "7"} chips={look.chips} total={look.total} label={look.label} lift={liftK} charms={slots} front={look.front ? look.front(liftK) : undefined}>
        {look.children}
      </CardWithCharms>
    </div>
  );
}

/**
 * A Satchel card with its charm bar on the hand-off clock (motion bible §2.6, the kit's handoffAt): `t` = frames since
 * the lift (contact at t = 27). Before the lift it rests at fromX and the charms idle (blinks); riding, they swing at
 * 1.5× the card, 2/2/3 f late (SOL, ETH, BTC), eyes closed in joy; after the landing they ring down on their own
 * personality springs. `fx(i)` adds scene acting per charm (looks, smiles, hats, extra world angle), merged over it.
 */
export function SwingCard({
  t,
  o,
  frame,
  extraLift = 0,
  offsetY = 0,
  extraSquash = 0,
  kickPeak = -7,
  ...look
}: CardLook & {
  t: number;
  o: SwingOpts;
  /** scene frame (for idle blinks) */
  frame: number;
  /** extra lift in px above rest (moves the card off its shadow) */
  extraLift?: number;
  /** a plain vertical offset in px (the card and its shadow move together: e.g. rising out of a box) */
  offsetY?: number;
  /** extra landing squash (a heavy card) */
  extraSquash?: number;
  kickPeak?: number;
}) {
  const g = swingGeom(t, o);
  const sq = g.m.squash + (t >= HANDOFF.contact ? extraSquash * Math.max(0, 1 - (t - HANDOFF.contact) / 8) : 0);
  return (
    <CardRig
      left={g.left}
      top={g.top + offsetY}
      width={o.width}
      rotate={g.m.rotate}
      sx={g.m.scale * (1 + sq)}
      sy={g.m.scale * (1 - sq)}
      lift={g.m.lift + extraLift}
      charmWorld={(i) => rideWorldAngle(t, i, o, kickPeak)}
      joy={(i) => rideJoy(t, i)}
      frame={frame}
      look={look}
    />
  );
}

// ── captions ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A caption that slaps in with its contact on `at` (scene frame; the kit's CaptionSlap, contact f4) and is slapped
 * over at `until` (gone from that frame: the next caption starts its slap there). Centred; top edge at `y`. `width` wraps
 * long lines.
 */
export function Caption({ text, at, until, size = 120, y = 100, width = 1080, seed, x = 960 }: { text: string; at: number; until?: number; size?: number; y?: number; width?: number; seed: string; x?: number }) {
  const frame = useCurrentFrame();
  const start = Math.round(at - SLAP_CONTACT);
  if (frame < start || (until !== undefined && frame >= Math.round(until))) return null;
  return (
    <div style={{ position: "absolute", left: x - width / 2, width, top: y, display: "flex", justifyContent: "center", textAlign: "center", pointerEvents: "none" }}>
      <Sequence from={start} layout="none">
        <CaptionSlap text={text} size={size} seed={seed} />
      </Sequence>
    </div>
  );
}

// ── whip (camera travel with a 2-frame smear; cut on the fastest frame) ────────────────────────────────────────────

/**
 * A whip between two stages: the outgoing stage leaves over 4 f (accelerating), the cut is at `cut`, the incoming
 * stage arrives over 4 f (decelerating). dir 1 = the camera moves right (content travels left). Returns the x offset and the
 * smear (stretch along x, area kept) for the outgoing and incoming stage.
 */
export function whip(frame: number, cut: number, dir = 1, dist = 1150) {
  const outP = ramp(frame, cut - 4, cut, whipIn);
  const inP = ramp(frame, cut, cut + 4, whipOut);
  const smearOf = (d: number) => (d === 0 || d === -1 ? 1.25 : d === 1 || d === -2 ? 1.1 : 1);
  return {
    outX: -dir * dist * outP,
    inX: dir * dist * (1 - inP),
    outShow: frame < cut,
    inShow: frame >= cut,
    stretch: smearOf(frame - cut),
  };
}

/** A stage layer for a whip: translates and smears its children along the travel (a speed stretch on x). */
export function WhipLayer({ x, stretch, children, origin = "50% 50%" }: { x: number; stretch: number; children: ReactNode; origin?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, translate: `${x}px 0`, scale: `${stretch} 1`, transformOrigin: origin }}>
      {children}
    </div>
  );
}

// ── name tags at a readable size (the kit's NameTag, scaled up) ──────────────────────────────────────────────────

/** Unit vector along a kit hand's sleeve (from the wrist toward the shoulder) for a given angle / arm / mirror. */
export function sleeveDir(angle: number, arm = 0, mirror = false) {
  const a = ((angle + arm) * Math.PI) / 180;
  const x = -Math.sin(a);
  return { x: mirror ? -x : x, y: Math.cos(a) };
}

/** A centred SVG overlay (0×0 box at the frame origin) for SVG-only kit pieces such as NameTag. */
export function SvgLayer({ children }: { children: ReactNode }) {
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {children}
    </svg>
  );
}
