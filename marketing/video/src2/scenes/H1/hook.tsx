import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { type CharmFace, charmFill, charmKick, CharmShape } from "../../brand/Charm";
import { C } from "../../brand/tokens";
import { CardWithCharms, type CharmSlot } from "../../illustration/characters/CardWithCharms";
import { Hand } from "../../illustration/characters/Hand";
import { blinkAt, blinkSchedule, clamp, EASE2, handoffAt, headTilt, rideAngle, SPRING2 } from "../../motion";
import { SlapLockup } from "./lockup";
import { PeelFront, peelThumb } from "./PeelFront";
import { InkLine, kf, StickerCaption } from "./stickers";
import { CAM, T } from "./timing";

/**
 * H1 + H2, the hook (concepts-v2 §4.4, re-timed to the voiced timeline): ONE continuous shot on one clock (g = frames
 * from the start of H1). World coordinates = screen coordinates at zoom 1; captions and the lockup live in screen space.
 *   0–23    frame 0 already moves: Satchel #7 slides home with an empty charm bar while the camera settles back from
 *           1.12; BTC (mid-fall, eyes shut, smeared) curls round the card onto its ring, ETH drops behind the card, SOL
 *           zips in low and overshoots. Snaps on the 8th-note grid around beat 2 (8 / 15 / 23); eyes pop open;
 *           "Stick it on." slaps in with ETH on the beat.
 *   27–53   alice's hand (lemon sleeve, alice.near) pinches the top-left corner and peels it: for 4 frames the flap
 *           shows the card's back with dashed history outlines (the plant paid off at T0). "Stick it on." peels too.
 *   48–75   THE SWING (motion kit handoffAt): lift, 10° lean, the pendulum, the charms riding at 1.5× with happy shut
 *           eyes, the jingle at the apex, set down into bob's pinch (sky sleeve, bob.near) on hookLand: impact thump,
 *           the groove. "Hand it over." lands on V02.
 *   H2      the camera punches in on "Bitcoin," (2.9×): each charm reacts as its name sticker lands under it; the
 *           stickers drop away, pull back to "One NFT." (on "NFT."); the frame makes room: "Whoever holds it", the
 *           lockup on "Satchel" (bob bounces the card, the charms squeal with joy), "holds everything inside."
 */

const FPS = 30;

// ── the card and its charms (world px) ─────────────────────────────────────────────────────────────────────────
export const CW = 720; // card width (k 1.8)
const K = CW / 400; // UI → video scale of the card
const CH = (CW * 252) / 400; // card height
const REST = 4 * K; // the card's hard drop at rest
const X0 = 900; // card centre before the hand-off
const D = 260; // the hand-off travel (alice → bob): both sleeves and name tags stay in frame
const TOP = 350; // card top at rest (the hook captions sit in a band above it, clear of the swing's arc)
const U = (CW * 0.18) / 140; // px per charm unit (CardWithCharms defaults: charmSize 0.18, spacing 1.3, stem 30)
const GAP = 160 * 1.3 * U;
const BAR_H = 22 * U;
const PIVOT_Y = CH + 4 * K + 16 * U + BAR_H; // the jump rings (card px)
const COIN_DY = 98 * U; // pivot → coin centre
const hookX = (i: number) => CW / 2 + (i - 1) * GAP; // card px

type ChainKey = "btc" | "evm" | "sol";
const CHAINS: ChainKey[] = ["btc", "evm", "sol"];
const SNAP = [T.btcSnap, T.ethSnap, T.solSnap];
const REACT_LAG = [4, 2, 0]; // reaction order SOL → ETH → BTC
const RIDE_LAG = [3, 2, 2];

// ── camera ─────────────────────────────────────────────────────────────────────────────────────────────────────
type Cam = { x: number; y: number; z: number }; // the world point at the screen centre, and the zoom
const COIN_Y = TOP + PIVOT_Y + COIN_DY; // coin centres after the hand-off (world)
const CAM_HOME: Cam = { x: 960, y: 540, z: 1 };
const PUNCH_Z = 2.9; // close enough that each charm gets its own name sticker underneath (≥ 30 px between them)
const CAM_PUNCH: Cam = { x: X0 + D, y: COIN_Y + (540 - 440) / PUNCH_Z, z: PUNCH_Z }; // coins at y 440: the chips leave the top, the bar stays
const CAM_CARD: Cam = { x: X0 + D, y: 540, z: 1 };
/** The punch-in: a quick in-out (gathers over 2–3 f, settles by "Bitcoin.") instead of an ease-out's 1-frame snap. */
const PUNCH_EASE = Easing.bezier(0.5, 0, 0.2, 1);
// V04: the promise top left, bob's card bottom right (his sleeve and tag ≥ 90 px inside the frame: QA v5 r1 #5)
const V04_Z = 0.68;
const V04_CARD = { x: 1335, top: 366 }; // screen
const CAM_V04: Cam = { x: X0 + D - (V04_CARD.x - 960) / V04_Z, y: TOP - (V04_CARD.top - 540) / V04_Z, z: V04_Z };

const mixCam = (a: Cam, b: Cam, t: number): Cam => {
  const z = a.z * Math.pow(b.z / a.z, t); // zoom in log space
  // keep the motion of the centre proportional to the zoom change (no swing): interpolate in screen-scaled space
  const w = a.z === b.z ? t : (1 / a.z - 1 / z) / (1 / a.z - 1 / b.z);
  return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z };
};

/**
 * The opening pull-back (frame 0 already moves): 1.12 → 1 over f0–15 on EASE2.out. Before frame 0 (an intro rendering
 * H1's world at negative frames) the same move eases IN over PREROLL_F frames from rest at a closer framing and reaches
 * EASE2.out's own starting speed exactly on frame 0, so the pull-back is one smooth in-out move across the join.
 * EASE2.out = bezier(0.16, 1, 0.3, 1), whose slope at 0 is 1 / 0.16 (per T.ethSnap frames). Frames ≥ 0 are unchanged.
 */
const OPEN_V0 = 1 / (0.16 * T.ethSnap);
const PREROLL_F = 12;
function openMixAt(g: number) {
  if (g >= 0) return kf(g, [0, T.ethSnap], [0, 1], EASE2.out);
  const s = Math.min(-g, PREROLL_F);
  return -OPEN_V0 * (s - (s * s) / (2 * PREROLL_F)); // velocity ramps 0 → OPEN_V0 over the preroll
}
const CAM_OPEN: Cam = { x: X0, y: TOP + 250, z: 1.12 };

function camAt(g: number): Cam {
  // frame 0 already moves: the camera settles back from 1.12 as the card slides home and the first charms snap on
  let c = mixCam(CAM_OPEN, CAM_HOME, openMixAt(g));
  // after the catch the camera drifts after the card (carry), so the held card isn't left hanging off-centre
  const follow = spring({ frame: g - T.hookLand - 2, fps: FPS, config: SPRING2.carry });
  c = { ...c, x: c.x + 0.45 * (X0 + D - 960) * follow };
  c = mixCam(c, CAM_PUNCH, kf(g, [T.punchIn, T.punchIn + T.punchDur], [0, 1], PUNCH_EASE));
  c = mixCam(c, CAM_CARD, kf(g, [CAM.pullBack, CAM.pullBack + CAM.pullDur], [0, 1], EASE2.pan));
  c = mixCam(c, CAM_V04, kf(g, [CAM.reframe, CAM.reframe + CAM.reframeDur], [0, 1], EASE2.pan));
  return c;
}

// ── the card on one clock ──────────────────────────────────────────────────────────────────────────────────────
const BOUNCE = T.wSatchel + 3; // bob's little bounce, just after the lockup lands on "Satchel"
export const BOUNCE_CONTACT = BOUNCE + 9; // the card comes back down into his hand

/** bob's proud bounce: up 16 px (out, 5 f), back down into his hand (fall, 4 f), pressed 1 f, rebound. */
function bounceAt(t: number) {
  if (t < 0) return { lift: 0, squash: 0 };
  if (t < 5) return { lift: interpolate(t, [0, 5], [0, 16], { ...clamp, easing: EASE2.out }), squash: 0 };
  if (t < 9) return { lift: interpolate(t, [5, 9], [16, -REST], { ...clamp, easing: EASE2.fall }), squash: 0 };
  const r = spring({ frame: t - 10, fps: FPS, config: SPRING2.rebound });
  const sq = 0.03 * (1 - spring({ frame: t - 9, fps: FPS, config: SPRING2.rebound }));
  return { lift: -REST * (1 - r), squash: sq };
}

/**
 * The card's slide home. Since the cold open H0 slaps the card on in its rest pose (coordinator, 2026-11-11), the card
 * is AT REST from H1 frame 0 (and at every negative frame an intro renders): `slideAt` is 1 everywhere. It used to slide
 * up from 85% of the way on frame 0 and settle by `T.cardSettle` (f5); frames from f5 on are unchanged, and so are the
 * camera's 1.12 → 1 settle and BTC's fall (both independent of the slide).
 */
const SLIDE_FROM = 0.85;
const SLIDE_TRAVEL = 640; // world px below rest at slide 0
const SLIDE_LIFT = 40; // px of lift at slide 0
const SLIDE_V0 = ((1 - SLIDE_FROM) * 3) / T.cardSettle; // the old ease-out's slope at frame 0 (kept for H1_WORLD)
function slideAt(_g: number) {
  return 1;
}

function cardAt(g: number) {
  const slide = slideAt(g);
  const ho = handoffAt(g - T.handoff, FPS, { fromX: X0, toX: X0 + D, rest: REST });
  const b = bounceAt(g - BOUNCE);
  return {
    cx: ho.x,
    top: TOP + (1 - slide) * SLIDE_TRAVEL + ho.arcY,
    lift: ho.lift + Math.min(1 - slide, 1 - SLIDE_FROM) * SLIDE_LIFT + b.lift, // px above rest; the hard shadow stays on the ground
    rotate: ho.rotate,
    scale: ho.scale,
    squash: ho.squash + b.squash,
    riding: ho.eyesClosed,
  };
}

/** The corner peel: 0 → 0.28 over 8 f (rip), then the card comes free and snaps flat during the lift (6 f). */
const PEEL_MAX = 0.28;
const UNPEEL = 6;
function peelAt(g: number) {
  if (g < T.peelStart) return 0;
  if (g < T.handoff) return interpolate(g, [T.peelStart, T.handoff], [0, PEEL_MAX], { ...clamp, easing: EASE2.rip });
  return interpolate(g, [T.handoff, T.handoff + UNPEEL], [PEEL_MAX, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
}

// ── the charms ────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * World pivot (stem top) of a falling charm before its snap, with its velocity (px/f). Each path keeps the card's face
 * clear: BTC (already falling on frame 0, the poster frame) curls down past the card's left edge into its ring, ETH
 * drops straight down BEHIND the card and pops out under it, SOL zips in low from the right.
 */
function fallAt(i: number, g: number) {
  const hook = { x: X0 - CW / 2 + hookX(i), y: TOP + PIVOT_Y };
  const t0 = [0, T.ethSnap - 7, T.solSnap - 7][i];
  const dur = SNAP[i] - t0;
  const e = (t: number) => t * (0.55 + 0.45 * t); // already moving at the start, still accelerating into the hook
  const t = Math.max(0, Math.min(1, (g - t0) / dur));
  const u = e(t);
  const du = (0.55 + 0.9 * t) / dur;
  // quadratic Bézier from → ctrl → hook (BTC curls around the card; the others are straight lines)
  const paths = [
    { from: { x: X0 - 500, y: 150 }, ctrl: { x: X0 - 480, y: TOP + PIVOT_Y + 40 } },
    { from: { x: hook.x, y: -170 }, ctrl: { x: hook.x, y: (hook.y - 170) / 2 } },
    { from: { x: 2000, y: 170 }, ctrl: { x: (2000 + hook.x) / 2, y: (170 + hook.y) / 2 } },
  ];
  const { from: a, ctrl: c } = paths[i];
  if (i === 0 && g < t0) {
    // before frame 0 (an intro rendering H1's world): BTC was already falling, in a straight line at its frame-0
    // velocity (≈ 101 world px/f, almost straight down), so it drops into the top-left of the frame and is mid-fall on 0
    const v0 = { x: 2 * (c.x - a.x) * (0.55 / dur), y: 2 * (c.y - a.y) * (0.55 / dur) };
    return { x: a.x + v0.x * (g - t0), y: a.y + v0.y * (g - t0), vx: v0.x, vy: v0.y, visible: true };
  }
  const bx = (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * c.x + u * u * hook.x;
  const by = (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * c.y + u * u * hook.y;
  const dx = 2 * (1 - u) * (c.x - a.x) + 2 * u * (hook.x - c.x);
  const dy = 2 * (1 - u) * (c.y - a.y) + 2 * u * (hook.y - c.y);
  return { x: bx, y: by, vx: dx * du, vy: dy * du, visible: g >= t0 && g < SNAP[i] };
}

/** Sum of the charm's own swings (kicks on its personality spring), in world degrees (+ = the coin swings left). */
function personalSwing(i: number, g: number) {
  const ch = CHAINS[i];
  const kick = (at: number, peak: number) => charmKick(ch, (g - at) / FPS, peak);
  const snapKick = [-12, 5, 14][i]; // BTC fell from the left (swings right), ETH straight down, SOL from the right
  let a = kick(SNAP[i], snapKick);
  // the bar answers each later arrival a little (secondary motion)
  for (let j = i + 1; j < 3; j++) a += kick(SNAP[j] + 1, j === 2 ? 3 : -2);
  // settle on their personality springs after the landing (the card stopped moving right: they keep going right)
  a += kick(T.hookLand + REACT_LAG[i], -7);
  // their names (H2): BTC wiggles ±8°, ETH gives a little nod with its tilt, SOL hops (and swings)
  if (i === 0) a += kick(T.wBtc, 8);
  if (i === 1) a += kick(T.wEth, -4);
  if (i === 2) a += kick(T.wSol + 2, 6);
  // bob's bounce shakes them, in reaction order
  a += kick(BOUNCE + 9 + REACT_LAG[i], [-5, 4, -7][i]);
  return a;
}

function charmSlot(i: number, g: number, card: ReturnType<typeof cardAt>): CharmSlot {
  const snap = SNAP[i];
  if (g < snap) return { hidden: true };
  const t = g - snap;
  const ride = rideAngle(g - T.handoff, FPS, { fromX: X0, toX: X0 + D, rest: REST }, RIDE_LAG[i]);
  const world = Math.max(-15, Math.min(15, personalSwing(i, g) + ride));
  // snap: squash 0.85 about the coin's top on contact (2 f), a little stretch on the rebound
  const squash = t <= 1 ? 1.25 : kf(t, [1, 4, 8], [1.25, -0.15, 0], Easing.out(Easing.quad));
  // SOL overshoots its hook by 40 px along its flight (in low from the right: down-left) and springs back
  const over = i === 2 ? kf(t, [0, 2, 5, 8], [0, 40, -6, 0], Easing.inOut(Easing.sin)) : 0;
  const ovx = -0.8;
  const ovy = 0.6;
  // SOL hops on "Solana," (12 px on pop)
  const hop = i === 2 ? -12 * (spring({ frame: g - T.wSol, fps: FPS, config: SPRING2.pop }) - spring({ frame: g - T.wSol - 6, fps: FPS, config: SPRING2.pop })) : 0;
  return {
    angle: world - card.rotate,
    squash,
    squashAnchor: "top",
    dx: ovx * over,
    dy: ovy * over + hop,
    face: faceAt(i, g, card, world),
  };
}

function faceAt(i: number, g: number, card: ReturnType<typeof cardAt>, world: number): CharmFace {
  const snap = SNAP[i];
  const lag = REACT_LAG[i];
  // eyes: closed while falling (SOL arrives wide awake), pop open 2 f after the snap
  const openAt = i === 2 ? snap - 8 : snap + 2;
  let blink = g < openAt ? 1 : 0;
  let wide = i === 2 ? 0 : kf(g, [openAt, openAt + 1, openAt + 6], [0, 1, 0]);
  let joy = 0;
  let smile = g < openAt ? 0.6 : 1.3;
  let grin = i === 2 ? kf(g, [snap - 8, snap - 6, snap + 14, snap + 22], [0, 1, 1, 0.25]) : 0;
  // eyes look where the swing goes next; ETH looks at BTC as it arrives; everyone glances at alice's hand
  let lx = Math.max(-6, Math.min(6, -0.5 * world));
  let ly = 0;
  if (i === 1) lx += kf(g, [snap + 2, snap + 5, snap + 18, snap + 22], [0, -7, -7, 0]);
  const glance = kf(g, [T.aliceIn + 4 + lag, T.aliceIn + 8 + lag, T.handoff, T.handoff + 4], [0, 1, 1, 0]);
  lx = lx * (1 - glance) - 7 * glance;
  ly = -4 * glance;
  let tilt = 0;
  if (i === 1) tilt = headTilt(g - snap - 2, FPS, 16, -1) + headTilt(g - T.wEth, FPS, 14, 1); // toward BTC; then curious
  // riding the hand-off: happy closed eyes, big smile; open again 1 f after the landing
  if (card.riding || (g >= T.handoff + 6 && g < T.hookLand + 1)) {
    joy = 1;
    smile = 1.5;
    grin = 0;
  }
  // after the landing: smiles at the camera, idle blinks on per-charm clocks (never in sync)
  if (g >= T.hookLand + 1) {
    smile = 1.35;
    const blinks = blinkSchedule(`hook-${CHAINS[i]}`, T.hookLand + 30, T.h2Last + 30, [T.hookLand + 1 + lag]);
    blink = Math.max(blink, 1 - Math.min(1, ...blinks.map((b) => blinkAt(g, b))));
    // their names: BTC squints with joy, ETH goes wide-eyed, SOL grins
    if (i === 0) joy = Math.max(joy, kf(g, [T.wBtc, T.wBtc + 2, T.wBtc + 12, T.wBtc + 16], [0, 1, 1, 0]));
    if (i === 1) wide = Math.max(wide, kf(g, [T.wEth, T.wEth + 2, T.wEth + 10, T.wEth + 14], [0, 1, 1, 0]));
    if (i === 2) grin = Math.max(grin, kf(g, [T.wSol, T.wSol + 2, T.wSol + 12, T.wSol + 16], [0, 1, 1, 0]));
    // the bounce: a squeal of joy (motion only), in reaction order
    joy = Math.max(joy, kf(g, [BOUNCE + 9 + lag, BOUNCE + 11 + lag, BOUNCE + 19 + lag, BOUNCE + 22 + lag], [0, 1, 1, 0]));
    // the pull back: all three look at the camera
    const atCam = kf(g, [CAM.pullBack + lag, CAM.pullBack + 6 + lag], [0, 1]);
    lx *= 1 - 0.8 * atCam;
  }
  return { blink, wide, joy, smile, grin, look: { x: lx, y: ly }, tilt };
}

/** A charm in free fall (world px), eyes closed, smeared along its motion, with two ink speed lines. */
function FallingCharm({ i, g }: { i: number; g: number }) {
  const f = fallAt(i, g);
  if (!f.visible) return null;
  const v = Math.hypot(f.vx, f.vy);
  const s = 1 + Math.min(0.25, v / 350); // smear: stretch along the motion, keep the area
  const a = (Math.atan2(f.vy, f.vx) * 180) / Math.PI;
  const coin = { x: f.x, y: f.y + COIN_DY };
  const ux = f.vx / (v || 1);
  const uy = f.vy / (v || 1);
  const r = 70 * U;
  const len = Math.min(150, v * 1.5);
  const showLines = i === 0 ? g <= 3 : SNAP[i] - g <= 3;
  const face: CharmFace = i === 2 ? { grin: 1, smile: 1.4, look: { x: -5, y: 3 } } : { blink: 1, smile: 0.6 };
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {showLines
        ? [-0.45, 0.45].map((o, j) => {
            const px = coin.x - uy * o * r * 1.4 - ux * r * 0.9;
            const py = coin.y + ux * o * r * 1.4 - uy * r * 0.9;
            const L = len * (j === 0 ? 1 : 0.7);
            return <line key={j} x1={px} y1={py} x2={px - ux * L} y2={py - uy * L} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />;
          })
        : null}
      <g transform={`translate(${f.x} ${f.y}) scale(${U})`}>
        <g transform={`translate(0 98) rotate(${a}) scale(${s} ${1 / s}) rotate(${-a}) translate(0 -98)`}>
          <CharmShape fill={charmFill(CHAINS[i])} face={face} stemLen={30} angle={i === 0 ? -8 : i === 2 ? 10 : 0} />
        </g>
      </g>
    </svg>
  );
}

// ── hands ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CORNER = { x: 16, y: 16 }; // alice's thumb on the top-left corner (card px)
const ALICE_ANGLE = 104; // fingers right, the arm from the left
const BOB_ANGLE = 142; // mirrored: fingers down-left, the arm reaching down from the upper right (tag ≥ 90 px inside)

/** alice (card px, inside the card's swinging frame): reach, pinch, peel, carry, let go, leave. */
function aliceAt(g: number, peel: number) {
  if (g < T.aliceIn) return null;
  const p = spring({ frame: g - T.aliceIn, fps: FPS, config: SPRING2.land });
  const enter = { x: -720 + (CORNER.x + 720) * p, y: 150 + (CORNER.y - 150) * p - 50 * Math.sin(Math.PI * Math.min(1, p)) };
  const thumb = peelThumb(CW, CH, peel);
  const at = g < T.peelStart ? enter : g < T.aliceOut ? thumb : CORNER;
  const leave = kf(g, [T.aliceOut + 2, T.aliceOut + 10], [0, 1], EASE2.fall);
  const pinch = g < T.aliceOut ? kf(g, [T.pinch - 4, T.pinch], [0, 1], EASE2.out) : kf(g, [T.aliceOut, T.aliceOut + 2], [1, 0.1]);
  const squash = g >= T.pinch && g < T.pinch + 2 ? 1 : 0;
  if (leave >= 1) return null;
  return { x: at.x - 1000 * leave, y: at.y + 140 * leave, pinch, squash, angle: ALICE_ANGLE + 6 * leave };
}

/** bob (world px): reaches in from the right, rises 6 px before the catch, pinches the top-right corner, then holds
 *  the card by it (the charms hang below, so no palm-under hold). */
const CATCH = { x: X0 + D + CW / 2 - CORNER.x, y: TOP + CORNER.y };
function bobAt(g: number, card: ReturnType<typeof cardAt>) {
  const start = T.bobIn;
  if (g < start) return null;
  const p = spring({ frame: g - start, fps: FPS, config: SPRING2.land });
  const rise = kf(g, [T.hookLand - 4, T.hookLand - 2, T.hookLand], [0, -6, -6]);
  const ride = g >= T.hookLand ? card.top - TOP - card.lift : 0; // after the catch it moves with the card
  return {
    x: CATCH.x + 430 * (1 - p),
    y: CATCH.y - 380 * (1 - p) + (g < T.hookLand ? rise : ride),
    pinch: kf(g, [T.hookLand - 3, T.hookLand], [0, 1], EASE2.out),
    squash: g >= T.hookLand && g < T.hookLand + 2 ? 1 : 0,
  };
}

// ── screen-space type ─────────────────────────────────────────────────────────────────────────────────────────
const ZONE_Y = 166; // the hook's caption band (box 88–244: must-read text below y 100, clear of the card)
const CAPTION = 110; // the hook captions (brief: 110–160 px)
const WORD_SIZE = 110;
const WORD_Y = 742; // H2: each name sticker under its own charm (the punch-in puts the coins at y 440)
const WORDS = [
  { text: "Bitcoin.", at: T.wBtc },
  { text: "Ethereum.", at: T.wEth },
  { text: "Solana.", at: T.wSol },
];
const wordX = WORDS.map((_, i) => 960 + (i - 1) * GAP * PUNCH_Z);
/**
 * The name stickers are stuck on the WORLD (under their charms), laid out at the punch-in's screen size: when the
 * camera pulls back they shrink and travel with their charms, then come unstuck and drop (QA v5 r1 #4: as screen-space
 * stickers they used to float over the shrinking charms and card for ~6 f).
 */
const wordWorld = WORDS.map((_, i) => ({ x: CAM_PUNCH.x + (wordX[i] - 960) / PUNCH_Z, y: CAM_PUNCH.y + (WORD_Y - 540) / PUNCH_Z }));

const LOCKUP = { x: 150, y: 184, h: 124 };
const LINE_SIZE = 112;
const LINE_Y = LOCKUP.y + LOCKUP.h + 60;

// ── the shot ──────────────────────────────────────────────────────────────────────────────────────────────────
export function HookShot({ g }: { g: number }) {
  const cam = camAt(g);
  const card = cardAt(g);
  const peel = peelAt(g);
  const liftU = card.lift / (8 * K); // CardWithCharms / SatchelCard lift units (8k px each)
  const charms = CHAINS.map((_, i) => charmSlot(i, g, card));
  const alice = aliceAt(g, peel);
  const peeling = g < T.handoff + UNPEEL;
  // while the card is still stuck, her palm and index are over the card face but under the flap (only the thumb is
  // on top of it); once it comes free, the index goes behind the card
  const bob = bobAt(g, card);
  const handK = K;

  // impact thump on the catch (hookLand, the groove kicks in): the world drops 6 px and recovers in 5 f (one of the
  // film's three thumps); the caption being read stays still
  const thump = interpolate(g - T.hookLand, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });
  const world = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
    transformOrigin: "0 0",
    transform: `translate(960px, ${540 + thump}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
  };
  const cardBox = {
    position: "absolute" as const,
    left: card.cx - CW / 2,
    top: card.top,
    width: CW,
    height: CH,
    transformOrigin: `${CW / 2}px ${-0.06 * CH}px`,
    rotate: `${card.rotate}deg`,
    scale: `${card.scale * (1 + card.squash)} ${card.scale * (1 - card.squash)}`,
  };
  const aliceProps = alice
    ? ({ pose: "pinch", x: alice.x, y: alice.y - card.lift, k: handK, angle: alice.angle, pinch: alice.pinch, squash: alice.squash, sleeve: "alice" } as const)
    : null;
  const bobProps = bob ? ({ pose: "pinch", x: bob.x, y: bob.y, k: handK, angle: BOB_ANGLE, mirror: true, pinch: bob.pinch, squash: bob.squash, sleeve: "bob" } as const) : null;

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <div style={world}>
        {bobProps ? <Hand {...bobProps} layer="back" /> : null}
        <FallingCharm i={1} g={g} />
        <div style={cardBox}>
          {aliceProps && !peeling ? <Hand {...aliceProps} layer="back" /> : null}
          <CardWithCharms
            width={CW}
            lift={liftU}
            charms={charms}
            front={<PeelFront width={CW} progress={peel} lift={liftU} between={aliceProps && peeling ? <Hand {...aliceProps} layer="back" /> : null} />}
          />
          {aliceProps ? <Hand {...aliceProps} layer="front" /> : null}
        </div>
        {bobProps ? <Hand {...bobProps} layer="front" /> : null}
        <FallingCharm i={0} g={g} />
        <FallingCharm i={2} g={g} />
        {/* the name stickers, stuck under their charms (world); drawn at punch-in screen size, scaled by 1 / PUNCH_Z */}
        {WORDS.map((w, i) => (
          <div key={w.text} style={{ position: "absolute", left: wordWorld[i].x, top: wordWorld[i].y, scale: `${1 / PUNCH_Z}`, transformOrigin: "0 0" }}>
            <StickerCaption text={w.text} size={WORD_SIZE} x={0} y={0} f={g - (w.at - 4)} out={g - (CAM.wordsOut + 2 * i)} seed={`word-${i}`} corner="tr" away={i - 1 || 0.3} exit="fall" from={1.1} />
          </div>
        ))}
      </div>

      {/* screen-space captions */}
      <StickerCaption text="Stick it on." size={CAPTION} x={960} y={ZONE_Y} f={g - T.stickIn} out={g - T.stickOut} seed="stick" corner="tl" away={-1} />
      <StickerCaption text="Hand it over." size={CAPTION} x={960} y={ZONE_Y} f={g - T.handIn} out={g - T.handOut} seed="hand" corner="br" away={1} />
      <StickerCaption text="One NFT." size={114} x={960} y={ZONE_Y} f={g - (T.wNft - 5)} out={g - CAM.oneOut} seed="one-nft" corner="br" away={1} />
      <InkLine size={LINE_SIZE} x={LOCKUP.x - 6} y={LINE_Y} f={g - (T.wWhoever - 6)} seed="promise">
        Whoever holds it
      </InkLine>
      <InkLine size={LINE_SIZE} x={LOCKUP.x - 6} y={LINE_Y + LINE_SIZE * 1.06} f={g - (T.wHolds2 - 6)} seed="promise">
        {"holds everything\ninside."}
      </InkLine>
      <SlapLockup x={LOCKUP.x} y={LOCKUP.y} h={LOCKUP.h} f={g - (T.wSatchel - 6)} />
    </AbsoluteFill>
  );
}

// ── the hook's pose as data (for the H0 cold open's hand-off; see marketing/notes/intro-research/h1-handoff.md) ─────
/** H1's world constants (world px = screen px at zoom 1). The card box is CW × CH at (cx − CW / 2, top). */
export const H1_WORLD = { CW, CH, K, REST, X0, D, TOP, U, GAP, PIVOT_Y, COIN_DY, SLIDE_FROM, SLIDE_TRAVEL, SLIDE_V0, CAM_OPEN, CAM_HOME, OPEN_V0, PREROLL_F } as const;

/** World → screen for a camera pose (the transform HookShot applies to its world layer). */
export const worldToScreen = (p: { x: number; y: number }, cam: Cam, thump = 0) => ({
  x: 960 + (p.x - cam.x) * cam.z,
  y: 540 + thump + (p.y - cam.y) * cam.z,
});

/**
 * Everything HookShot draws at clock g, as plain numbers: the camera, the card box (centre x, top, lift, rotation,
 * scale, squash, peel), the three falling charms (pivot = stem top, velocity in world px/f, visibility) and the charm
 * slots on the bar. Pure; defined for any g, including negative frames (the card keeps sliding up from below at its
 * frame-0 speed, BTC keeps falling at its frame-0 velocity, the camera eases into its pull-back from a closer framing
 * over PREROLL_F frames; nothing else is on).
 * `<HookShot g={g} />` renders exactly this, so an intro can render H1's own world for its last frames.
 */
export function h1PoseAt(g: number) {
  const camera = camAt(g);
  const thump = interpolate(g - T.hookLand, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });
  const card = cardAt(g);
  return {
    g,
    camera,
    thump,
    card: { ...card, left: card.cx - CW / 2, width: CW, height: CH, peel: peelAt(g), shadow: Math.max(0, REST + card.lift) },
    falling: CHAINS.map((chain, i) => ({ chain, ...fallAt(i, g), coinDy: COIN_DY })),
    charms: CHAINS.map((_, i) => charmSlot(i, g, card)),
  };
}
