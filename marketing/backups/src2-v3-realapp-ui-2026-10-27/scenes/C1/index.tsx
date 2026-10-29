import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type CharmFace, charmKick, charmSwing } from "../../brand/Charm";
import { C, type Chain, NIGHT } from "../../brand/tokens";
import { CardWithCharms, Hand, type HandPose } from "../../illustration/characters";
import { CoinSticker, PocketJeans, POCKET, SignedSlip, SLIP } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { getScene, marker } from "../../lib/timeline";
import { blinkSchedule, CaptionSlap, clamp, EASE2, eyeOpen, handoffAt, HANDOFF, NightBlind, pressAt, slapAt, SPRING2 } from "../../motion";
import { SatchelCard } from "../../components/Sticker";
import { AmountTag, ChainStrip, nightOutline, NightRig, pal, StickerButton, type Theme, WHIP_OUT, whipSmear } from "./parts";

/**
 * C1 · The catch (58–72 s). Night falls as a roller blind on the music stop. A seller (ink sleeve) holds a Satchel with
 * no number visible; the other hand taps "Send 0.85 ETH" and the signed slip tiptoes into the back pocket (one hop per
 * pizzicato pluck) while the ETH charm watches it go. The sale swings the card to a buyer (white sleeve), flat faces.
 * After the sale the slip comes back out and is slapped onto the Ethereum strip on the thud: the ETH coins fly into
 * the seller's pocket, the tag drops to 0, the charm goes "o" and grey. On the sub hit the buyer's hand freezes and
 * BTC and SOL look at us: "Is it clean?". The last 4 frames whip out to the right (T0 whips in).
 */

const sc = getScene("C1");
const F = (sec: number) => Math.round(sec * FPS);

// ── timing (scene frames), from the voice and the markers ───────────────────────────────────────────────────────────
export const C1T = {
  blind: F(marker("musicStop") - sc.start), // 0
  catchW: F(sc.wordAt("V14", "catch")), // ≈ 34
  signature: F(sc.wordAt("V15", "signature")), // ≈ 82
  before: F(sc.wordAt("V15", "before")), // ≈ 106
  sale: F(sc.wordAt("V15", "sale")), // ≈ 126
  used: F(sc.wordAt("V15", "used")), // ≈ 163
  thud: F(marker("thud") - sc.start), // 240
  subHit: F(marker("subHit") - sc.start), // 300
  how: F(sc.wordAt("V16", "how")), // ≈ 329
  end: F(sc.duration), // 420
};
const T = C1T;
const PRESS = T.signature; // the Send tap (button-thock)
const BTN_IN = PRESS - 22; // the Send button slaps in (contact +4)
const POP = PRESS + 3; // the slip pops out of the button
const PIZZ = POP + 7; // sneaky-pizz: its four plucks are the slip's tiptoe hops
const PIZZ_HITS = [0.01, 0.29, 0.57, 0.715].map((s) => PIZZ + Math.round(s * FPS));
const PLUNK = PIZZ_HITS[3]; // the slip drops into the pocket
const SALE = T.sale - HANDOFF.apex; // hand-off clock start: the apex (jingle) lands on "sale"
const CONTACT = SALE + HANDOFF.contact; // the buyer catches it
const PULL = T.used + 10; // the seller's hand reaches into the pocket
const STRIP_IN = T.used + 23; // the Ethereum strip slaps in (contact)
const DRAIN = T.thud + 4; // the coins start to leave the ETH charm
const ZERO = T.thud + 12; // the ETH tag rolls to 0
export const C1_WHIP = T.end - 4; // whip out (the cut is on the fastest frame; T0 whips in)

// ── world layout (camera at rest: world px = screen px) ──────────────────────────────────────────────────────────────
const CW = 640; // card width
const KC = CW / 400; // card UI scale
const CH = CW * (252 / 400);
const U = (CW * 0.18) / 140; // px per charm unit (CardWithCharms charmSize 0.18)
const GAP = 160 * 1.3 * U; // charm spacing (spacing 1.3)
const PIVOT_Y = CH + 4 * KC + 38 * U; // charm pivots below the card top (mount "posts", lift 0)
const COIN_Y = PIVOT_Y + 98 * U; // coin centre below the card top (stemLen 30)
const CARD_Y = 330; // card top
const SELL_CX = 980; // card centre at the seller
const BUY_CX = 1560; // card centre in the buyer's hand
const BTN = { x: 470, y: 560 }; // Send button centre
const POCKET_S = 1.6;
const POCKET_BOX = { x: -10, y: 800 }; // pocket top-left (the opening is its top edge)
const POCKET_OPEN = { x: POCKET_BOX.x + (POCKET.w * POCKET_S) / 2, y: POCKET_BOX.y };
const SLIP_S = 1.4;
const SLIP_W = SLIP.w * SLIP_S;
const SLIP_H = SLIP.h * SLIP_S;
const SLIP_IN_POCKET = { x: POCKET_OPEN.x + 4, y: POCKET_OPEN.y + SLIP_H / 2 - 78 }; // pokes 78 px out
const STRIP = { x: 900, y: 580, w: 660, h: 140 };
const SLIP_ON_STRIP = { x: STRIP.x - STRIP.w / 2 + 26 + SLIP_W / 2, y: STRIP.y + 4 }; // the strip's left end
const HAND_K = KC;
const BUYER_SLEEVE = { fill: C.white, cuff: "#e2dfee" };
const GRIP_L = { lx: 30, ly: 24 }; // the seller's pinch on the top-left corner (card-local)
const GRIP_R = { lx: CW - 28, ly: 92 }; // the buyer pinches the right edge just under the band (the S stays clear)

// ── small helpers ───────────────────────────────────────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (f: number, a: number, b: number, ease: (t: number) => number = EASE2.swing) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
const sp = (f: number, cfg: { mass: number; stiffness: number; damping: number }) => (f <= 0 ? 0 : spring({ frame: f, fps: FPS, config: cfg }));
const rot = (x: number, y: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
};
type P2 = { x: number; y: number };

/** Keyframes: each key holds until the next one; the move INTO a key uses that key's easing (default in-out cubic). */
type Key = { f: number; x: number; y: number; a?: number; pose?: HandPose; pinch?: number; press?: number; ease?: (t: number) => number };
function track(f: number, keys: Key[]) {
  let i = 0;
  while (i < keys.length - 1 && f >= keys[i + 1].f) i++;
  const k0 = keys[i];
  const k1 = keys[Math.min(i + 1, keys.length - 1)];
  const base = { x: k0.x, y: k0.y, a: k0.a ?? 0, pinch: k0.pinch ?? 1, press: k0.press ?? 0, pose: k0.pose ?? ("pinch" as HandPose) };
  if (k1 === k0 || f <= k0.f) return base;
  const t = (k1.ease ?? EASE2.swing)(Math.min(1, (f - k0.f) / (k1.f - k0.f)));
  return {
    x: lerp(k0.x, k1.x, t),
    y: lerp(k0.y, k1.y, t),
    a: lerp(k0.a ?? 0, k1.a ?? k0.a ?? 0, t),
    pinch: lerp(k0.pinch ?? 1, k1.pinch ?? k0.pinch ?? 1, t),
    press: lerp(k0.press ?? 0, k1.press ?? 0, t),
    pose: (t < 0.5 ? k0.pose : k1.pose) ?? "pinch",
  };
}

// ── the card: where it is and how it leans ──────────────────────────────────────────────────────────────────────────
const OFF = { fromX: SELL_CX, toX: BUY_CX, rest: 4 * KC };
/** After the catch the buyer draws the card in a little… and FREEZES on the sub hit. */
function buyerDrift(f: number) {
  // the buyer settles the card, then starts to take it home (to the right)… and stops dead on the sub hit
  const settle = interpolate(f, [CONTACT + 16, CONTACT + 60], [0, 1], { ...clamp, easing: EASE2.swing });
  const home = interpolate(Math.min(f, T.subHit), [DRAIN + 24, T.subHit + 18], [0, 1], { ...clamp, easing: EASE2.fall });
  const jolt = f < T.subHit ? 0 : interpolate(f - T.subHit, [0, 1, 2, 3, 5], [0, 7, -3, 1, 0], clamp);
  return { x: 18 * settle + 104 * home, y: -10 * settle + jolt };
}
function cardAt(f: number) {
  if (f < SALE) return { cx: SELL_CX, y: CARD_Y, rotate: 0, scale: 1, squash: 0, lift: 0, arc: 0 };
  if (f < CONTACT + 14) {
    const m = handoffAt(f - SALE, FPS, OFF);
    return { cx: m.x, y: CARD_Y, rotate: m.rotate, scale: m.scale, squash: m.squash, lift: m.lift, arc: m.arcY };
  }
  const d = buyerDrift(f);
  return { cx: BUY_CX + d.x, y: CARD_Y + d.y, rotate: 0, scale: 1, squash: 0, lift: 0, arc: 0 };
}
/** A point on the card (card-local px, origin = card top-left) in world px, through the swing transform. */
function onCard(f: number, lx: number, ly: number): P2 {
  const c = cardAt(f);
  const px = c.cx; // pivot: 50% -6%
  const py = c.y + c.arc - 0.06 * CH - Math.max(0, c.lift) + (c.lift < 0 ? -c.lift : 0);
  const r = rot((lx - CW / 2) * c.scale, (ly + 0.06 * CH) * c.scale, c.rotate);
  return { x: px + r.x, y: py + r.y };
}

// ── the signed slip ─────────────────────────────────────────────────────────────────────────────────────────────────
type SlipState = { x: number; y: number; tilt: number; scale: number; sx: number; sy: number; drop: number; show: boolean; layer: "top" | "pocket"; sign: number };
const HOVER = { x: BTN.x - 6, y: BTN.y - 74 }; // low enough that the pop's overshoot clears the caption
const HOPS: P2[] = [HOVER, { x: 392, y: 532 }, { x: 318, y: 610 }, { x: 236, y: 690 }, SLIP_IN_POCKET];
const OUT_TOP = { x: POCKET_OPEN.x + 10, y: POCKET_OPEN.y - SLIP_H / 2 - 24 }; // fully out of the pocket
const ABOVE_STRIP = { x: SLIP_ON_STRIP.x - 20, y: SLIP_ON_STRIP.y - 96 };
function slipAt(f: number): SlipState {
  const base = { tilt: 0, scale: 1, sx: 1, sy: 1, drop: 1, show: true, layer: "top" as const, sign: 1 };
  if (f < POP) return { ...base, x: BTN.x, y: BTN.y, show: false, sign: 0 };
  if (f < PIZZ_HITS[0]) {
    // pops out of the button and rises; the pen scribbles the signature
    const p = sp(f - POP, SPRING2.pop);
    const rise = sp(f - POP, SPRING2.land);
    return { ...base, x: lerp(BTN.x, HOVER.x, rise), y: lerp(BTN.y - 10, HOVER.y, rise), scale: Math.max(0.05, p), tilt: lerp(-10, -3, p), drop: 1 + 1.5 * p, sign: prog(f, POP + 1, POP + 10, EASE2.out) };
  }
  if (f < PLUNK + 6) {
    // tiptoe: one hop per pluck, the last a plunk into the pocket
    let i = 0;
    while (i < 3 && f >= PIZZ_HITS[i + 1]) i++;
    const a = PIZZ_HITS[i];
    const b = i < 3 ? PIZZ_HITS[i + 1] : PLUNK + 6;
    const t = Math.min(1, (f - a) / (b - a));
    const from = HOPS[i];
    const to = HOPS[i + 1];
    const e = i < 3 ? EASE2.swing(t) : EASE2.fall(t);
    const hop = i < 3 ? -44 * Math.sin(Math.PI * t) : -16 * Math.sin(Math.PI * Math.min(1, t * 1.8));
    const land = i < 3 ? interpolate(t, [0.8, 1], [0, 1], clamp) : 0;
    return {
      ...base,
      x: lerp(from.x, to.x, e),
      y: lerp(from.y, to.y, e) + hop,
      tilt: (i % 2 === 0 ? -1 : 1) * 9 * Math.sin(Math.PI * t) - 3,
      sx: 1 + 0.05 * land,
      sy: 1 - 0.05 * land,
      drop: 2.2 - 1.2 * Math.min(1, (f - PIZZ_HITS[0]) / (PLUNK - PIZZ_HITS[0])),
      layer: i >= 2 ? "pocket" : "top",
    };
  }
  if (f < PULL + 3) return { ...base, x: SLIP_IN_POCKET.x, y: SLIP_IN_POCKET.y, tilt: -3, drop: 0.3, layer: "pocket" };
  // pulled out, carried over the strip, slapped on the thud
  const out = prog(f, PULL + 3, PULL + 17, EASE2.out);
  const carry = prog(f, PULL + 19, T.thud - 16, EASE2.swing);
  const wind = prog(f, T.thud - 9, T.thud - 4, EASE2.out);
  const slam = prog(f, T.thud - 4, T.thud, EASE2.fall);
  let x = lerp(SLIP_IN_POCKET.x, OUT_TOP.x, out);
  let y = lerp(SLIP_IN_POCKET.y, OUT_TOP.y, out);
  x = lerp(x, ABOVE_STRIP.x, carry);
  y = lerp(y, ABOVE_STRIP.y, carry) - 30 * wind;
  x = lerp(x, SLIP_ON_STRIP.x, slam);
  y = lerp(y, SLIP_ON_STRIP.y, slam);
  const hover = f > PULL + 19 && f < T.thud - 9 ? 3.5 * Math.sin((f - PULL) * 0.6) * prog(f, T.thud - 30, T.thud - 22) : 0;
  if (f < T.thud) {
    return { ...base, x, y, tilt: lerp(-3, 8, carry) - 6 * wind + 1.5 * slam + hover, scale: 1 + 0.07 * wind - 0.07 * slam, drop: 1 + 2 * out * (1 - slam), layer: out < 0.9 ? "pocket" : "top" };
  }
  const s = slapAt(f - T.thud + 4, FPS, 4, { from: 1.2, squash: 0.07, drop: 0 });
  return { ...base, x: SLIP_ON_STRIP.x, y: SLIP_ON_STRIP.y, tilt: -6, sx: s.sx, sy: s.sy, drop: Math.max(0, 1 + s.lift / 4) };
}
/** Where a hand pinches the slip: its top edge, a little in. */
function slipGrip(f: number): P2 {
  const s = slipAt(f);
  const r = rot(0, -SLIP_H / 2 + 24, s.tilt);
  return { x: s.x + r.x, y: s.y + r.y };
}

// ── hands ───────────────────────────────────────────────────────────────────────────────────────────────────────────
type HandState = { x: number; y: number; a: number; pose: HandPose; pinch: number; press: number; show: boolean };
/** The seller's left hand: holds the card's top-left corner, swings it to the buyer, lets go and leaves. */
function handL(f: number): HandState {
  if (f < CONTACT + 3) {
    const g = onCard(f, GRIP_L.lx, GRIP_L.ly);
    const grip = f < SALE ? 1 - 0.1 * Math.sin(Math.PI * prog(f, POP - 2, POP + 8)) : 1; // a twitch as the slip pops
    return { x: g.x, y: g.y, a: 92 + cardAt(f).rotate, pose: "pinch", pinch: grip, press: 0, show: true };
  }
  const g = onCard(CONTACT + 3, GRIP_L.lx, GRIP_L.ly);
  const k = track(f, [
    { f: CONTACT + 3, x: g.x, y: g.y, a: 92 },
    { f: CONTACT + 7, x: g.x - 12, y: g.y - 8, a: 92, pinch: 0.1, ease: EASE2.out },
    { f: CONTACT + 19, x: -420, y: g.y - 40, a: 92, pinch: 0.1, ease: EASE2.fall },
  ]);
  return { ...k, show: f < CONTACT + 19 };
}
/** The seller's right hand: taps Send from below, leaves; later pulls the slip out of the pocket and slaps it down. */
function handR(f: number): HandState {
  const tip = { x: BTN.x + 134, y: BTN.y + 30 }; // the right end of the button, so its label stays readable
  const a = -10;
  if (f < PULL - 12) {
    const k = track(f, [
      { f: 0, x: tip.x + 60, y: 1400, a, pose: "tap" },
      { f: PRESS - 16, x: tip.x + 60, y: 1400, a, pose: "tap" },
      { f: PRESS - 6, x: tip.x + 4, y: tip.y - 26, a, pose: "tap", ease: EASE2.out },
      { f: PRESS - 3, x: tip.x + 2, y: tip.y - 18, a, pose: "tap" },
      { f: PRESS, x: tip.x, y: tip.y, a, pose: "tap", press: 1, ease: EASE2.fall },
      { f: PRESS + 3, x: tip.x, y: tip.y, a, pose: "tap", press: 1 },
      { f: PRESS + 9, x: tip.x + 18, y: tip.y + 46, a: a + 6, pose: "tap", press: 0, ease: EASE2.out },
      { f: PIZZ + 10, x: tip.x + 18, y: tip.y + 46, a: a + 6, pose: "tap" },
      { f: PIZZ + 22, x: tip.x + 60, y: 1400, a: a + 6, pose: "tap", ease: EASE2.fall },
    ]);
    return { ...k, show: f > PRESS - 16 && f < PIZZ + 22 };
  }
  if (f < PULL + 3) {
    const g = slipGrip(PULL);
    const k = track(f, [
      { f: PULL - 12, x: -380, y: g.y - 60, a: 84, pose: "pinch", pinch: 0.1 },
      { f: PULL, x: g.x, y: g.y, a: 84, pose: "pinch", pinch: 0.1, ease: EASE2.out },
      { f: PULL + 3, x: g.x, y: g.y, a: 84, pose: "pinch", pinch: 1, ease: EASE2.out },
    ]);
    return { ...k, show: true };
  }
  // the hand is the slip's grip from here: out, over, wind-up, SLAP; then it lets go and slips away
  const g = slipGrip(f);
  const release = prog(f, T.thud + 12, T.thud + 16, EASE2.out);
  const exit = prog(f, T.thud + 16, T.thud + 30, EASE2.fall);
  const ang = interpolate(f, [PULL + 3, PULL + 24, T.thud - 12, T.thud], [84, 91, 92, 93], clamp);
  return { x: lerp(g.x, -420, exit), y: lerp(g.y, g.y - 200, exit), a: ang, pose: "pinch", pinch: 1 - 0.9 * release, press: 0, show: exit < 1 };
}
/** The buyer's hand (white sleeve): reaches in from the right, catches the top-right corner, freezes on the sub hit. */
function buyerHand(f: number): HandState {
  const target = onCard(CONTACT, GRIP_R.lx, GRIP_R.ly);
  if (f < CONTACT) {
    const enter = prog(f, SALE + 2, SALE + 16, EASE2.out);
    const pre = interpolate(f, [CONTACT - 4, CONTACT - 2, CONTACT], [0, -6, 0], clamp); // rises 6 px before the catch
    return { x: lerp(target.x + 520, target.x, enter), y: lerp(target.y + 40, target.y, enter) + pre, a: 92, pose: "pinch", pinch: 0.25, press: 0, show: f >= SALE + 2 };
  }
  const g = onCard(f, GRIP_R.lx, GRIP_R.ly);
  const dip = 8 * (1 - sp(f - CONTACT, SPRING2.rebound)) * Math.min(1, (f - CONTACT) / 1.5);
  return { x: g.x, y: g.y + dip, a: 92, pose: "pinch", pinch: interpolate(f, [CONTACT, CONTACT + 3], [0.25, 1], clamp), press: 0, show: true };
}

// ── charms ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const CHAINS: Chain[] = ["btc", "evm", "sol"];
const LAG = { btc: 3, evm: 2, sol: 2 } as const; // riding lag (frames)
const REACT = { sol: 0, evm: 2, btc: 4 } as const; // reaction order
const BLINKS: Record<Chain, number[]> = {
  btc: blinkSchedule("c1-btc", 90, 420, [44, 64, T.subHit - 3]),
  evm: blinkSchedule("c1-eth", 120, 230, [42, BTN_IN + 1, POP + 1]),
  sol: blinkSchedule("c1-sol", 100, 420, [39, BTN_IN, T.subHit - 5]),
};

function charmAngle(chain: Chain, f: number) {
  const cardRot = cardAt(f).rotate;
  let world = 0;
  if (f >= SALE && f < CONTACT) {
    world = 1.5 * handoffAt(f - SALE - LAG[chain], FPS, OFF).rotate;
  } else if (f >= CONTACT) {
    const th = 1.5 * handoffAt(CONTACT - SALE - LAG[chain], FPS, OFF).rotate;
    world = charmSwing(chain, (f - CONTACT) / FPS, th + (chain === "sol" ? -6 : chain === "evm" ? -4 : -3));
  }
  world += charmKick(chain, (f - POP - REACT[chain]) / FPS, chain === "evm" ? -6 : -3); // startle at the pop
  if (chain === "evm") world += charmKick("evm", (f - DRAIN) / FPS, 13); // yanked as its coins leave
  else world += charmKick(chain, (f - DRAIN - REACT[chain]) / FPS, chain === "btc" ? 3 : -4);
  world += charmKick(chain, (f - T.subHit - REACT[chain]) / FPS, chain === "evm" ? 0 : chain === "btc" ? 2 : -3); // the freeze
  return world - cardRot; // CharmShape angles are relative to the (rotating) card
}

/** Eye target: a world point → a look offset in charm units. */
function lookAt(from: P2, to: P2, mx = 7, my = 5) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: (mx * dx) / d, y: (my * dy) / d };
}

function charmFace(chain: Chain, f: number, theme: Theme): { face: CharmFace; grey: number } {
  const i = CHAINS.indexOf(chain);
  const me = onCard(f, CW / 2 + (i - 1) * GAP, COIN_Y);
  const r = REACT[chain];
  // Day: the brand smile; Night: a worried half-smile; the sale flattens it
  const worry = theme === "night" ? 0.55 * sp(f - 6 - r, SPRING2.land) : 0;
  const flat = sp(f - SALE + 6 - r, SPRING2.land);
  const smile = Math.max(0, 1 - worry - (1 - worry) * flat);
  let look = { x: 0, y: 0 };
  // the lights went out: a worried glance cascade while the first caption sits (SOL looks up, ETH at SOL, BTC at ETH)
  if (f >= 40 + 2 * r && f < BTN_IN + 2) look = chain === "sol" ? { x: -3, y: -4 } : chain === "evm" ? { x: 6, y: -1 } : { x: 6, y: 1 };
  if (f >= BTN_IN + 2 && f < POP + r) look = lookAt(me, BTN, 6, 4); // the Send button arrives: they all look at it
  if (f >= POP + r && f < PLUNK + 10) look = lookAt(me, slipAt(f), 8, 6); // follow the slip into the pocket
  else if (f >= PLUNK + 10 && f < SALE) look = chain === "evm" ? lookAt(me, POCKET_OPEN) : { x: 0, y: 1.5 };
  else if (f >= SALE && f < CONTACT + 8) look = { x: -7, y: 1 }; // looking back at the seller
  else if (f >= CONTACT + 8 && f < PULL + 2 + r) look = chain === "evm" ? lookAt(me, POCKET_OPEN) : { x: 4, y: -3 };
  else if (f >= PULL + 2 + r && f < DRAIN + r) look = lookAt(me, slipAt(f), 8, 6); // the slip comes back out
  else if (f >= DRAIN + r && f < T.subHit) look = chain === "evm" ? { x: -7, y: 5 } : { x: chain === "btc" ? 7 : -7, y: 1 };
  else if (f >= T.subHit) look = chain === "evm" ? { x: -2, y: 6 } : { x: 0, y: -0.5 }; // BTC and SOL look at us
  const wideAt = [POP + r, PULL + 2 + r, T.thud + r];
  let wide = Math.max(...wideAt.map((w) => interpolate(f - w, [0, 1, 5, 9], [0, 1, 1, 0], clamp)));
  if (chain !== "evm" && f >= T.subHit) wide = Math.max(wide, interpolate(f - T.subHit, [0, 3, 30], [0, 0.75, 0.45], clamp));
  let blink = 1 - eyeOpen(f, BLINKS[chain]);
  if (chain !== "evm" && f >= T.subHit + 40) {
    const lb = T.subHit + (chain === "btc" ? 46 : 52); // one long worried blink (3 / 2 / 4)
    blink = Math.max(blink, interpolate(f - lb, [0, 3, 5, 9], [0, 0.88, 0.88, 0], clamp));
  }
  let o = 0;
  let grey = 0;
  if (chain === "evm") {
    o = sp(f - DRAIN, SPRING2.pop);
    grey = prog(f, DRAIN + 4, DRAIN + 26, EASE2.out);
    if (f >= DRAIN + 34) blink = Math.max(blink, 0.3 * prog(f, DRAIN + 34, DRAIN + 44)); // heavy lids
  }
  const tilt = chain === "evm" && f >= POP && f < PLUNK + 16 ? 6 * (sp(f - POP - 2, SPRING2.quick) - sp(f - PLUNK - 4, SPRING2.land)) : 0;
  return { face: { smile, look, wide, blink, o, tilt }, grey };
}

// ── camera (world → screen) ─────────────────────────────────────────────────────────────────────────────────────────
const CAM = [
  { f: 0, x: 940, y: 590, s: 1 },
  { f: BTN_IN - 4, x: 940, y: 590, s: 1 },
  { f: PRESS, x: 800, y: 600, s: 1.05 },
  { f: PIZZ + 6, x: 800, y: 600, s: 1.05 },
  { f: SALE + 2, x: 860, y: 500, s: 0.88 },
  { f: CONTACT + 4, x: 1210, y: 500, s: 0.88 },
  { f: CONTACT + 10, x: 1210, y: 500, s: 0.88 },
  { f: PULL + 2, x: 960, y: 590, s: 0.92 },
  { f: DRAIN + 30, x: 960, y: 590, s: 0.92 },
  { f: T.subHit - 2, x: 1492, y: 562, s: 1.0 },
  { f: T.end, x: 1500, y: 566, s: 1.02 },
];
function camera(f: number) {
  let i = 0;
  while (i < CAM.length - 1 && f >= CAM[i + 1].f) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const lin = i === CAM.length - 2;
  const t = b === a ? 0 : (lin ? (x: number) => x : EASE2.pan)(Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f))));
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t) };
}

/** The whip out to T0 (see parts.tsx): content slides left over the last 4 frames, smeared on the last two. */
export function whipOut(f: number) {
  const i = f - C1_WHIP;
  const dx = i < 0 ? 0 : WHIP_OUT[Math.min(i, WHIP_OUT.length - 1)];
  return { dx, smear: whipSmear(dx) };
}

// ── the world in one theme (the blind shows the Day world below its edge for 18 frames) ─────────────────────────────
function World({ f, theme }: { f: number; theme: Theme }) {
  const p = pal(theme);
  const night = theme === "night";
  const card = cardAt(f);
  const hl = handL(f);
  const hr = handR(f);
  const buyer = buyerHand(f);
  const slip = slipAt(f);

  // Send button: slaps in, pressed by the tap, pops away after the sale
  const btnIn = slapAt(f - BTN_IN, FPS, 0, { from: 1.24, squash: 0.06, drop: 0 });
  const btnOut = interpolate(f, [CONTACT + 8, CONTACT + 11, CONTACT + 15], [1, 1.08, 0], clamp);
  const press = f < PRESS - 6 ? 0 : pressAt(f, PRESS, 1, FPS).pressed;
  const showBtn = f >= BTN_IN && btnOut > 0.01;

  // Ethereum strip: slaps in after the sale; dips into its shadow when the slip lands
  const stripIn = slapAt(f - (STRIP_IN - 4), FPS, 0, { from: 1.22, squash: 0.06, drop: 0 });
  const stripPress = f >= T.thud ? 1 - sp(f - T.thud - 2, SPRING2.rebound) : 0;

  // the ETH tag (hangs under the ETH charm) and the card's ETH chip
  const roll = prog(f, ZERO, ZERO + 9, EASE2.out);
  const tagPop = 1 + 0.24 * Math.sin(Math.PI * prog(f, ZERO + 2, ZERO + 10)) + 0.12 * Math.sin(Math.PI * prog(f, ZERO + 15, ZERO + 21));
  const ethGone = f >= ZERO + 4;

  const liftU = Math.max(0, card.lift) / (8 * KC);
  const pressU = card.lift < 0 ? Math.min(1, -card.lift / (4 * KC)) : 0;
  const charms = CHAINS.map((c) => {
    const { face, grey } = charmFace(c, f, theme);
    return {
      angle: charmAngle(c, f),
      face,
      grey: c === "evm" ? grey : 0,
      squash: c === "evm" ? -0.06 * prog(f, DRAIN, DRAIN + 12) : 0,
      outlineColor: night ? NIGHT.lineStrong : C.ink,
    };
  });
  const ethCoin = onCard(f, CW / 2, COIN_Y);
  const ethAngle = charmAngle("evm", f) + card.rotate;
  const tagAnchor = rot(0, 64 * U, ethAngle);

  const hand = (h: HandState, layer: "back" | "front" | "both", who: "L" | "R" | "B") =>
    h.show ? (
      <Hand
        pose={h.pose}
        x={h.x}
        y={h.y}
        k={HAND_K}
        angle={h.a}
        mirror={who === "B" || (who === "R" && h.pose === "tap")}
        sleeve={who === "B" ? BUYER_SLEEVE : "seller"}
        pinch={h.pinch}
        press={h.press}
        armLength={760}
        layer={layer}
        night={night}
        drop={night ? 0 : 1}
        squash={who === "R" && h.press > 0.5 ? 1 : 0}
        style={night ? { filter: nightOutline() } : undefined}
      />
    ) : null;

  const slipNode = (
    <SignedSlip
      scale={SLIP_S * slip.scale}
      sign={slip.sign}
      tilt={slip.tilt}
      drop={slip.drop}
      night={night}
      style={{
        position: "absolute",
        left: slip.x - (SLIP_W * slip.scale) / 2,
        top: slip.y - (SLIP_H * slip.scale) / 2,
        scale: `${slip.sx} ${slip.sy}`,
        filter: night ? nightOutline(NIGHT.danger, 2.5) : undefined,
      }}
    />
  );
  // R holds the slip between its back and front layers while it carries it
  const slipHeld = f >= PULL && f < T.thud + 16 && slip.layer === "top";

  // three ETH coins leave the charm and arc into the seller's pocket
  const coins = [0, 1, 2].map((i) => {
    const t0 = DRAIN + i * 4;
    const dur = 22;
    const t = (f - t0) / dur;
    if (t < 0 || t > 1) return null;
    const start = onCard(t0, CW / 2, COIN_Y);
    const end = { x: POCKET_OPEN.x + (i - 1) * 46, y: POCKET_OPEN.y + 14 };
    const e = EASE2.swing(t);
    const x = lerp(start.x, end.x, e);
    const y = lerp(start.y, end.y, e) - (250 + 40 * i) * Math.sin(Math.PI * t);
    const s = interpolate(t, [0, 0.16, 0.86, 1], [0.2, 1, 1, 0], clamp);
    const size = 104;
    return <CoinSticker key={i} chain="evm" size={size} k={2} flip={(f - t0) * 31} night={night} drop={night ? 0 : 1} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, scale: `${s}`, filter: night ? nightOutline() : undefined }} />;
  });

  const bump = 1 - 0.04 * Math.sin(Math.PI * prog(f, DRAIN + 18, DRAIN + 32)) - 0.045 * Math.sin(Math.PI * prog(f, PLUNK, PLUNK + 8));
  const pocketStyle = { position: "absolute" as const, left: POCKET_BOX.x, top: POCKET_BOX.y, transformOrigin: "50% 0%", scale: `${2 - bump} ${bump}`, filter: night ? nightOutline() : undefined };

  return (
    <AbsoluteFill>
      {/* the seller's back pocket (bottom-left corner): back, the slip when it is in it, front */}
      <PocketJeans scale={POCKET_S} part="back" fabric night={night} drop={night ? 0 : 1} style={pocketStyle} />
      {slip.show && slip.layer === "pocket" && !slipHeld ? slipNode : null}
      <PocketJeans scale={POCKET_S} part="front" night={night} drop={night ? 0 : 1} style={pocketStyle} />

      {/* the Ethereum strip */}
      {f >= STRIP_IN - 4 ? (
        <div style={{ position: "absolute", left: STRIP.x - STRIP.w / 2, top: STRIP.y - STRIP.h / 2, opacity: stripIn.opacity, scale: `${stripIn.sx} ${stripIn.sy}` }}>
          <ChainStrip w={STRIP.w} h={STRIP.h} theme={theme} align="right" press={stripPress} />
        </div>
      ) : null}

      {/* the Send button */}
      {showBtn ? (
        <div style={{ position: "absolute", left: BTN.x, top: BTN.y, translate: "-50% -50%", opacity: btnIn.opacity, scale: `${btnIn.sx * btnOut} ${btnIn.sy * btnOut}` }}>
          <StickerButton label="Send 0.85 ETH" k={2.05} theme={theme} press={press} />
        </div>
      ) : null}

      {/* hands behind the card, the card with its charms, hands in front */}
      {hand(hl, "back", "L")}
      {hand(buyer, "back", "B")}
      <div
        style={{
          position: "absolute",
          left: card.cx - CW / 2,
          top: card.y + card.arc + (card.lift < 0 ? -card.lift : 0),
          width: CW,
          height: CH,
          rotate: `${card.rotate}deg`,
          transformOrigin: "50% -6%",
          scale: `${card.scale * (1 + card.squash)} ${card.scale * (1 - card.squash)}`,
        }}
      >
        {night ? <NightRig width={CW} lift={liftU} angles={[charms[0].angle, charms[1].angle, charms[2].angle]} /> : null}
        <CardWithCharms
          width={CW}
          night={night}
          lift={liftU}
          front={
            <SatchelCard
              width={CW}
              night={night}
              name="Satchel"
              icons="dot"
              lift={liftU}
              chips={[
                { chain: "btc", amount: "0.0412" },
                { chain: "evm", amount: ethGone ? "0" : "0.85" },
                { chain: "sol", amount: "12.4" },
              ]}
            />
          }
          charms={charms}
        />
      </div>
      <div style={{ position: "absolute", left: ethCoin.x + tagAnchor.x, top: ethCoin.y + tagAnchor.y, translate: "-50% 0", scale: `${tagPop}`, transformOrigin: "50% 0%" }}>
        <AmountTag from="0.85 ETH" to="0 ETH" roll={roll} toColor={p.danger} k={1.9} theme={theme} />
      </div>
      {hand(hl, "front", "L")}
      {hand(buyer, "front", "B")}

      {/* the slip in the open air (in R's pinch while carried), then the coins */}
      {slipHeld ? hand(hr, "back", "R") : null}
      {slip.show && (slip.layer === "top" || slipHeld) ? slipNode : null}
      {hand(hr, slipHeld ? "front" : "both", "R")}
      {coins}
    </AbsoluteFill>
  );
}

/** A caption (or a stack of lines) slapped in on its contact frame; plain Night ink, centred, top of frame. */
function Caption({ text, size, seed }: { text: string; size: number; seed: string }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center", whiteSpace: "pre-line", textAlign: "center" }}>
      <CaptionSlap text={text} size={size} seed={seed} color={NIGHT.ink} />
    </div>
  );
}

// contact frames on the VO words; each holds ≥ 0.8 s + 0.25 s per word after it lands (slapped over by the next one)
const CAP2 = T.before - 2;
const CAP3 = T.used + 2;
const CAP4 = T.how + 1;
const CAPTIONS = [
  { at: T.catchW, until: CAP2, text: "But there's a catch.", size: 124 },
  { at: CAP2, until: CAP3, text: "Signed before\nthe sale.", size: 116 },
  { at: CAP3, until: CAP4, text: "Used after it.", size: 140 },
  { at: CAP4, until: T.end + 30, text: "Is it clean?", size: 150 },
];

function Captions({ f }: { f: number }) {
  return (
    <AbsoluteFill>
      {CAPTIONS.map((c) =>
        f >= c.at - 4 && f < c.until - 4 ? (
          <Sequence key={c.text} from={c.at - 4} layout="none">
            <Caption text={c.text} size={c.size} seed={`c1-${c.at}`} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
}

function Sounds() {
  const s = (fr: number) => fr / FPS;
  return (
    <>
      <Sfx name="swoop-down" at={s(10)} align="peak" gainDb={-5} />
      <Sfx name="sticker-slap" at={s(18)} gainDb={-12} />
      {CAPTIONS.filter((c) => c.at !== CAP2).map((c) => (
        <Sfx key={c.at} name="sticker-slap" at={s(c.at)} gainDb={-14} />
      ))}
      <Sfx name="sticker-slap" at={s(BTN_IN + 4)} gainDb={-12} />
      <Sfx name="button-thock" at={s(PRESS)} gainDb={-1} />
      <Sfx name="pop-high" at={s(POP)} gainDb={-3} />
      <Sfx name="sneaky-pizz" at={s(PIZZ)} gainDb={-1} />
      <Sfx name="pocket-slip" at={s(PLUNK + 2)} align="peak" gainDb={0} />
      <Sfx name="swing-swish" at={s(SALE + 10)} align="peak" gainDb={-3} />
      <Sfx name="charm-jingle" at={s(SALE + HANDOFF.apex)} align="peak" gainDb={-6} rate={0.84} />
      <Sfx name="sticker-slap" at={s(CONTACT)} gainDb={-7} />
      <Sfx name="pocket-slip" at={s(PULL + 10)} align="peak" gainDb={3} />
      <Sfx name="sticker-slap" at={s(STRIP_IN)} gainDb={-9} />
      <Sfx name="swoop-up" at={s(T.thud - 6)} align="peak" gainDb={-8} />
      <Sfx name="sticker-slap" at={s(T.thud)} gainDb={-5} />
      <Sfx name="drum-hit-soft" at={s(T.thud)} gainDb={-10} />
      <Sfx name="whoosh-soft" at={s(DRAIN + 10)} align="peak" gainDb={-2} />
      <Sfx name="pop" at={s(ZERO + 2)} gainDb={-4} />
      <Sfx name="coin-ding" at={s(DRAIN + 8 + 22)} gainDb={-9} />
    </>
  );
}

export default function C1() {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const cam = camera(f);
  const whip = whipOut(f);
  // the blind's edge, as in the kit's NightBlind: Night is drawn above it, Day below it, for its 18-frame fall
  const fall = interpolate(f, [T.blind, T.blind + 18], [0, 1], { ...clamp, easing: EASE2.fall });
  const edge = fall * height;
  const blindDone = f >= T.blind + 18;
  const view = (node: ReactNode) => (
    <AbsoluteFill style={{ translate: `${whip.dx}px 0`, scale: `${whip.smear} 1` }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`, transformOrigin: "0 0" }}>{node}</AbsoluteFill>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: blindDone ? NIGHT.ground : C.ground, overflow: "hidden" }}>
      {!blindDone ? view(<World f={f} theme="day" />) : null}
      {!blindDone ? <NightBlind at={T.blind} night={NIGHT.ground} /> : null}
      <AbsoluteFill style={{ clipPath: blindDone ? undefined : `inset(0 0 ${Math.max(0, height - edge)}px 0)` }}>{view(<World f={f} theme="night" />)}</AbsoluteFill>
      <AbsoluteFill style={{ translate: `${whip.dx}px 0`, scale: `${whip.smear} 1` }}>
        <Captions f={f} />
      </AbsoluteFill>
      <Sounds />
    </AbsoluteFill>
  );
}
