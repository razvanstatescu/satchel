import { type CSSProperties, useId } from "react";
import { interpolateColors } from "remotion";
import { CHARM_LAG, CHARM_SWING } from "../motion/motion";
import { C, type Chain, CHAIN } from "./tokens";

/**
 * The chain charms (marketing/brand-v2/illustration/satchel-charms-chains.svg): a round coin (r 64) with a 12-unit
 * ink outline, two dot eyes (r 9) and a smile, hanging from a short stem below a bar. They are Satchel's own
 * characters: never put real chain logos inside them. The logo's S never gets a face; only charms do. Charms never
 * talk (they emote with faces and motion only), never get frowns, teeth, tongues, brows or blush.
 *
 * Geometry is in "charm units" (the SVG's units): the pivot (top of the stem, just under the bar) is the origin.
 * Stem: x −6…6, y 12…52 (40 long). Coin centre: y 108. Coin radius 64, outline 12. Eyes at (±22, 102).
 * Illustrations keep their own proportions when scaled (motion bible §2.0): the outline is always 12/140 of the coin.
 *
 * ── Face (CharmFace, every value animatable; combine freely) ───────────────────────────────────────────────────
 *   blink 0..1   eyes close to a soft lid line (1 = closed). Use charmBlink(t, [times]) for the 6-frame blink.
 *   joy   0..1   eyes become closed-joy arcs (∩). Wins over blink.
 *   wide  0..1   surprise: the dots grow 28%.
 *   look  {x,y}  eye offset in charm units (≤ 8 x, ≤ 6 y reads best); the mouth follows at 60%.
 *   smile        mouth curvature: 1 brand smile, 0 flat (concern), 1.6 big smile. Never negative in the film.
 *   grin  0..1   opens the mouth into the big open grin (a solid ink "D", no teeth or tongue).
 *   o     0..1   the small round "o" mouth (surprise, "uh-oh").
 *   tilt  deg    the face rotates about the coin centre (ETH's curious head tilt, ±6°).
 * ── Body (CharmShape props) ─────────────────────────────────────────────────────────────────────────────────────
 *   angle        swing angle about the pivot, degrees, + = clockwise (the bob swings left). Pass it here (not on an
 *                outer <g>) when using `drop`, so the hard shadow stays straight down.
 *   squash       + squashes (scaleY 1 − 0.12·squash, scaleX 1 + 0.12·squash), − stretches. 1 ≈ the landing squash.
 *   squashAnchor "center" (default) | "bottom" (landing on its bottom edge) | "top" (caught by its stem: stretch).
 *   grey  0..1   drains the fill to CHARM_GREY (sad / drained, C1).
 *   puff  0..1   cheeks puff (the gulp in P2): the lower sides bulge and the mouth pinches.
 *   hat   0..1   the tiny lemon party hat (P6 gift), scaled in about its brim; hatSide ±1 picks the shoulder.
 *   drop         hard shadow offset in charm units (0 while hanging, per the motion bible; ~10 as a sticker).
 *   stemLen      stem length (default 40); the coin moves with it.
 */
export const CHARM = { stemTop: 12, stemLen: 40, cy: 108, r: 64, outline: 12, eyeX: 22, eyeY: 102, eyeR: 9 } as const;

/** Drained / sad fill (C1: the ETH charm after its coins are taken). */
export const CHARM_GREY = "#b9b4c9";

export interface CharmFace {
  /** 0 = open, 1 = closed (a soft lid line remains). */
  blink?: number;
  /** 1 = the brand smile; 0 = flat; 1.6 = big smile. (Negative frowns exist for compatibility; the film never uses them.) */
  smile?: number;
  /** eye offset in charm units, e.g. {x: 6, y: -3} to look up-right. The mouth follows at 60%. */
  look?: { x: number; y: number };
  /** 0..1: eyes go wide (surprise). */
  wide?: number;
  /** 0..1: closed-joy arcs (∩). */
  joy?: number;
  /** 0..1: the big open grin (solid ink D). */
  grin?: number;
  /** 0..1: the small "o" mouth. */
  o?: number;
  /** degrees: the face rotates about the coin centre (head tilt). */
  tilt?: number;
}

export function charmFill(chain: Chain) {
  return CHAIN[chain].color;
}

// ── small math ────────────────────────────────────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f2 = (v: number) => Math.round(v * 100) / 100;

type MouthPose = { l: [number, number]; r: [number, number]; t1: [number, number]; t2: [number, number]; b1: [number, number]; b2: [number, number] };

/** The brand smile (and flat / wider smiles) as a zero-area closed shape: top and bottom are the same curve. */
function lineMouth(smile: number): MouthPose {
  // brand: M −16 18 Q 0 (18 + 14·smile) 16 18  →  cubic controls at 2/3 of the way to the quadratic control
  const cy = 18 + (2 / 3) * 14 * smile;
  return { l: [-16, 18], r: [16, 18], t1: [-16 / 3, cy], t2: [16 / 3, cy], b1: [-16 / 3, cy], b2: [16 / 3, cy] };
}
/** The big open grin: slightly smiling top lip, deep round bottom. */
const GRIN: MouthPose = { l: [-21, 15], r: [21, 15], t1: [-8, 19.5], t2: [8, 19.5], b1: [-21, 47], b2: [21, 47] };
/** The small "o": an ellipse rx 6.5, ry 8.5 centred 26 below the coin centre (the stroke adds 4.5 all round). */
const O_MOUTH: MouthPose = { l: [-6.5, 26], r: [6.5, 26], t1: [-6.5, 14.7], t2: [6.5, 14.7], b1: [-6.5, 37.3], b2: [6.5, 37.3] };

function mixMouth(poses: { p: MouthPose; w: number }[]): MouthPose {
  const keys = ["l", "r", "t1", "t2", "b1", "b2"] as const;
  const total = poses.reduce((s, x) => s + x.w, 0) || 1;
  const out = {} as MouthPose;
  for (const k of keys) {
    let x = 0;
    let y = 0;
    for (const { p, w } of poses) {
      x += (p[k][0] * w) / total;
      y += (p[k][1] * w) / total;
    }
    out[k] = [x, y];
  }
  return out;
}

function mouthPath(m: MouthPose, dx: number, dy: number, squeeze: number) {
  const P = ([x, y]: [number, number]) => `${f2(x * squeeze + dx)} ${f2(y + dy)}`;
  return `M ${P(m.l)} C ${P(m.t1)} ${P(m.t2)} ${P(m.r)} C ${P(m.b2)} ${P(m.b1)} ${P(m.l)} Z`;
}

/** One eye as a round-capped stroked curve: a dot (open), a soft lid line (blink) or a ∩ arc (joy). */
function eyePath(cx: number, cy: number, blink: number, joy: number, wide: number) {
  const R = CHARM.eyeR * (1 + 0.28 * wide);
  // [half-width, curve control offset, vertical offset, stroke width]
  const open = [0.01, 0, 0, 2 * R];
  const closed = [8.5, 2, 1.5, 5.5];
  const arc = [9.5, -12, 4, 6.5];
  const e = open.map((v, i) => lerp(lerp(v, closed[i], blink), arc[i], joy));
  const [hw, c, dy, sw] = e;
  const y = cy + dy;
  return { d: `M ${f2(cx - hw)} ${f2(y)} Q ${f2(cx)} ${f2(y + c)} ${f2(cx + hw)} ${f2(y)}`, sw };
}

/** The coin body: an exact circle, or (puff > 0) a circle whose lower sides bulge (cheeks full). */
function bodyPath(cy: number, r: number, puff: number) {
  const K = 0.5523 * r;
  const bx = r + 7 * puff; // side bulge
  const by = cy + 9 * puff; // the widest point drops below the centre
  const bot = cy + r + 2 * puff;
  return [
    `M 0 ${f2(cy - r)}`,
    `C ${f2(K)} ${f2(cy - r)} ${f2(bx)} ${f2(by - K * (1 + 0.15 * puff))} ${f2(bx)} ${f2(by)}`,
    `C ${f2(bx)} ${f2(by + K * (0.85 - 0.1 * puff))} ${f2(K * (1 + 0.3 * puff))} ${f2(bot)} 0 ${f2(bot)}`,
    `C ${f2(-K * (1 + 0.3 * puff))} ${f2(bot)} ${f2(-bx)} ${f2(by + K * (0.85 - 0.1 * puff))} ${f2(-bx)} ${f2(by)}`,
    `C ${f2(-bx)} ${f2(by - K * (1 + 0.15 * puff))} ${f2(-K)} ${f2(cy - r)} 0 ${f2(cy - r)} Z`,
  ].join(" ");
}

/** The tiny party hat: lemon cone, sky stripes, ink outline, white pom-pom. Drawn with its brim centre at (0,0), pointing up. */
function PartyHat({ outline }: { outline: number }) {
  const id = `charm-hat-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cone = "M -30 2 Q 0 12 30 2 L 5 -62 Q 0 -70 -5 -62 Z";
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={cone} />
        </clipPath>
      </defs>
      <path d={cone} fill={C.lemon} stroke={C.ink} strokeWidth={outline} strokeLinejoin="round" />
      <g clipPath={`url(#${id})`}>
        <path d="M -40 -12 L 40 -34 L 40 -22 L -40 0 Z" fill={C.sky} />
        <path d="M -40 -40 L 40 -62 L 40 -51 L -40 -29 Z" fill={C.sky} />
      </g>
      <path d={cone} fill="none" stroke={C.ink} strokeWidth={outline} strokeLinejoin="round" />
      <circle cx={0} cy={-68} r={10} fill={C.white} stroke={C.ink} strokeWidth={outline * 0.85} />
    </g>
  );
}

export interface CharmShapeProps {
  fill: string;
  /** outline + stem colour (default ink). Night: #8A82AE (ink vanishes on the Night ground, D-44). Eyes/mouth stay ink. */
  outlineColor?: string;
  face?: CharmFace;
  showStem?: boolean;
  squash?: number;
  squashAnchor?: "center" | "bottom" | "top";
  /** swing angle about the pivot (deg). Applied here so the hard shadow can stay straight down. */
  angle?: number;
  /** 0..1 drains the fill to grey. */
  grey?: number;
  /** 0..1 cheeks puff (gulp). */
  puff?: number;
  /** 0..1 the party hat (scale-in). */
  hat?: number;
  /** +1 right shoulder (default), −1 left. */
  hatSide?: number;
  /** hard shadow offset in charm units, straight down in world space (0 = none). */
  drop?: number;
  /** shadow colour (C.ink on Day, #000 on Night). */
  shadowColor?: string;
  /** stem length in charm units (default 40). */
  stemLen?: number;
}

/** One charm drawn in charm units with the pivot at (0,0). Swing it with `angle`; scale it from the outside. */
export function CharmShape({
  fill,
  face = {},
  showStem = true,
  squash = 0,
  squashAnchor = "center",
  angle = 0,
  grey = 0,
  puff = 0,
  hat = 0,
  hatSide = 1,
  drop = 0,
  shadowColor = C.ink,
  stemLen = CHARM.stemLen,
  outlineColor = C.ink,
}: CharmShapeProps) {
  const blink = clamp01(face.blink ?? 0);
  const joy = clamp01(face.joy ?? 0);
  const wide = clamp01(face.wide ?? 0);
  const smile = face.smile ?? 1;
  const grin = clamp01(face.grin ?? 0);
  const oo = clamp01(face.o ?? 0);
  const lx = face.look?.x ?? 0;
  const ly = face.look?.y ?? 0;
  const tilt = face.tilt ?? 0;
  const pf = clamp01(puff);

  const cy = CHARM.stemTop + stemLen + 56; // coin centre (108 with the brand stem)
  const r = CHARM.r;
  const sy = 1 - 0.12 * squash; // squash: shorter and wider; negative stretches
  const sx = 1 + 0.12 * squash;
  const ay = squashAnchor === "bottom" ? cy + r : squashAnchor === "top" ? cy - r : cy;
  const squashT = `translate(0 ${f2(ay)}) scale(${f2(sx * 1000) / 1000} ${f2(sy * 1000) / 1000}) translate(0 ${f2(-ay)})`;

  // the stem always reaches the coin, wherever the squash is anchored (top of the squashed coin + 8 overlap)
  const coinTop = ay + (cy - r - ay) * sy;
  const stemBottom = Math.max(CHARM.stemTop + 6, coinTop + 8);
  const fillNow = grey > 0 ? interpolateColors(clamp01(grey), [0, 1], [fill, CHARM_GREY]) : fill;
  const body = pf > 0.001 ? bodyPath(cy, r, pf) : null;

  // eyes (relative to the coin centre, then placed)
  const eL = eyePath(-CHARM.eyeX + lx, CHARM.eyeY - CHARM.cy + ly, blink, joy, wide);
  const eR = eyePath(CHARM.eyeX + lx, CHARM.eyeY - CHARM.cy + ly, blink, joy, wide);
  // mouth: blend line → grin / o; follows the look at 60%; puff pinches it
  const wl = Math.max(0, 1 - grin - oo);
  const mouth = mixMouth([
    { p: lineMouth(smile), w: wl },
    { p: GRIN, w: grin },
    { p: O_MOUTH, w: oo },
  ]);
  const md = mouthPath(mouth, 0.6 * lx, 0.6 * ly + 4 * pf, 1 - 0.45 * pf);

  // world-down shadow offset expressed in the rotated frame
  const a = (angle * Math.PI) / 180;
  const sdx = drop * Math.sin(a);
  const sdy = drop * Math.cos(a);

  // hat placement on the shoulder: 40° from the top
  const phi = 40 * (hatSide >= 0 ? 1 : -1);
  const pr = (phi * Math.PI) / 180;
  const hx = Math.sin(pr) * (r - 4);
  const hy = cy - Math.cos(pr) * (r - 4);
  const hs = clamp01(hat);

  const bodyEl = (paint: { fill: string; stroke: string }) =>
    body ? (
      <path d={body} fill={paint.fill} stroke={paint.stroke} strokeWidth={CHARM.outline} strokeLinejoin="round" />
    ) : (
      <circle cx={0} cy={cy} r={r} fill={paint.fill} stroke={paint.stroke} strokeWidth={CHARM.outline} />
    );

  return (
    <g transform={angle ? `rotate(${f2(angle)})` : undefined}>
      {showStem ? <rect x={-6} y={CHARM.stemTop} width={12} height={f2(stemBottom - CHARM.stemTop)} rx={6} fill={outlineColor} /> : null}
      {drop > 0 ? (
        <g transform={`translate(${f2(sdx)} ${f2(sdy)})`}>
          <g transform={squashT}>{bodyEl({ fill: shadowColor, stroke: shadowColor })}</g>
        </g>
      ) : null}
      <g transform={squashT}>
        {bodyEl({ fill: fillNow, stroke: outlineColor })}
        <g transform={`translate(0 ${cy})${tilt ? ` rotate(${f2(tilt)})` : ""}`}>
          <path d={eL.d} fill="none" stroke={C.ink} strokeWidth={eL.sw} strokeLinecap="round" />
          <path d={eR.d} fill="none" stroke={C.ink} strokeWidth={eR.sw} strokeLinecap="round" />
          <path d={md} fill={C.ink} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {hs > 0.001 ? (
          <g transform={`translate(${f2(hx)} ${f2(hy)}) rotate(${phi}) scale(${f2(hs * 0.82 * 100) / 100})`}>
            <PartyHat outline={9} />
          </g>
        ) : null}
      </g>
    </g>
  );
}

/**
 * A standalone charm as an SVG element. `size` = the coin's outer diameter in px. `angle` swings it about the pivot
 * (degrees, positive = clockwise). Place it with `style` (the SVG's top-centre is the pivot). Every CharmShape prop
 * (grey, puff, hat, drop, squashAnchor…) passes through.
 */
export function Charm({
  chain,
  size,
  angle = 0,
  face,
  squash = 0,
  showStem = true,
  style,
  fill,
  ...rest
}: { chain: Chain; size: number; angle?: number; face?: CharmFace; squash?: number; showStem?: boolean; style?: CSSProperties; fill?: string } & Omit<
  CharmShapeProps,
  "fill" | "face" | "squash" | "showStem" | "angle"
>) {
  const k = size / (2 * CHARM.r + CHARM.outline); // px per charm unit
  const H = CHARM.cy + CHARM.r + CHARM.outline; // pivot to coin bottom
  const W = 2 * CHARM.r + CHARM.outline + 40;
  return (
    <svg viewBox={`${-W / 2} 0 ${W} ${H + 20}`} width={W * k} height={(H + 20) * k} style={{ display: "block", overflow: "visible", ...style }}>
      <CharmShape fill={fill ?? charmFill(chain)} face={face} squash={squash} showStem={showStem} angle={angle} {...rest} />
    </svg>
  );
}

/**
 * Damped pendulum released from rest at θ0 (t in seconds since release; θ0 before it):
 *   θ(t) = θ0 · e^(−ζωt) · (cos ω_d t + (ζω/ω_d) · sin ω_d t),  ω = 2π·freqHz (undamped), ω_d = ω·√(1−ζ²).
 * It equals Remotion's spring({ from: θ0, to: 0, config: { mass: 1, stiffness: ω², damping: 2ζω } }).
 * Defaults = the film's hand-off swing (motion kit SPRING2.handoff {1, 267, 7.2}: 2.60 Hz, ζ 0.22):
 * 10° → −4.9° (0.20 s) → +2.4° (0.40 s) → −1.2° (0.60 s).
 */
export function pendulum(t: number, theta0 = 10, freqHz = 2.6, zeta = 0.22) {
  if (t <= 0) return theta0;
  const w = 2 * Math.PI * freqHz;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const sigma = zeta * w;
  return theta0 * Math.exp(-sigma * t) * (Math.cos(wd * t) + (sigma / wd) * Math.sin(wd * t));
}

// ── Personalities: swing physics per charm (single source of truth: the motion kit's CHARM_SWING / CHARM_LAG) ───
type SpringConfig = { mass: number; stiffness: number; damping: number };
const KIT_KEY = { btc: "btc", evm: "eth", sol: "sol" } as const;
/** Riding a hand-off, the charms trail the card by 2 / 2 / 3 frames (SOL, ETH, BTC): motion kit rideAngle. */
const RIDE_LAG_F = { btc: 3, evm: 2, sol: 2 } as const;

export interface CharmPersonality {
  /** one word for the bible */
  trait: string;
  /** the Remotion spring for a swing released from an angle: spring({ frame, fps, from: deg, to: 0, config }) */
  spring: SpringConfig;
  /** undamped frequency (Hz) and damping ratio of that spring (pendulum(t, θ0, freqHz, zeta) reproduces it) */
  freqHz: number;
  zeta: number;
  /** damped period, seconds (BTC 0.9, ETH 0.7, SOL 0.45) */
  period: number;
  /** reaction order after a cue, frames (SOL 0, ETH 2, BTC 4) */
  reactLagF: number;
  /** trailing the card in a hand-off, frames (SOL 2, ETH 2, BTC 3) */
  rideLagF: number;
  /** amplitude riding the card (1.5× the card's angle) */
  gain: number;
  /** head-tilt amplitude in degrees (face.tilt) when it notices something (ETH ±6) */
  tilt: number;
}

function personality(chain: Chain, trait: string, tilt: number): CharmPersonality {
  const sp = CHARM_SWING[KIT_KEY[chain]];
  const wn = Math.sqrt(sp.stiffness / sp.mass);
  const zeta = sp.damping / (2 * Math.sqrt(sp.stiffness * sp.mass));
  return {
    trait,
    spring: { ...sp },
    freqHz: wn / (2 * Math.PI),
    zeta,
    period: (2 * Math.PI) / (wn * Math.sqrt(1 - zeta * zeta)),
    reactLagF: CHARM_LAG[KIT_KEY[chain]],
    rideLagF: RIDE_LAG_F[chain],
    gain: 1.5,
    tilt,
  };
}

/**
 * BTC is heavy (period 0.9 s, ζ 0.35, lands last), ETH curious (0.7 s, ζ 0.30, tilts its head ±6°, notices
 * first), SOL quick (0.45 s, ζ 0.20: overshoots most, reacts first). Released from 10°: SOL −5.2° at 0.23 s,
 * ETH −3.7° at 0.37 s, BTC −3.1° at 0.47 s. Derived from the motion kit (src2/motion: CHARM_SWING, CHARM_LAG).
 */
export const CHARM_PERSONALITY: Record<Chain, CharmPersonality> = {
  btc: personality("btc", "heavy", 0),
  evm: personality("evm", "curious", 6),
  sol: personality("sol", "quick", 0),
};

/** The Remotion spring config for a charm's swing (same numbers as the kit's CHARM_SWING). */
export const charmSpring = (chain: Chain): SpringConfig => CHARM_PERSONALITY[chain].spring;

/**
 * θ(t) for a charm RELEASED from θ0 (held before t = 0, zero speed at release): the personality's swing.
 * t in seconds (frame / fps). Degrees, + = clockwise. Equals spring({ from: θ0, to: 0, config: charmSpring(chain) }).
 */
export function charmSwing(chain: Chain, t: number, theta0 = 10) {
  const p = CHARM_PERSONALITY[chain];
  return pendulum(t, theta0, p.freqHz, p.zeta);
}

/**
 * θ(t) for a charm KICKED from rest at t = 0 (a bump, a tap, the bar stopping): starts at 0, its first peak is
 * exactly `peak` degrees (sign = direction), then rings down with the personality. 0 before t = 0.
 */
export function charmKick(chain: Chain, t: number, peak = 10) {
  if (t <= 0) return 0;
  const p = CHARM_PERSONALITY[chain];
  const wn = 2 * Math.PI * p.freqHz;
  const sigma = p.zeta * wn;
  const wd = wn * Math.sqrt(1 - p.zeta * p.zeta);
  const tp = Math.atan2(wd, sigma) / wd; // time of the first peak
  const norm = Math.exp(-sigma * tp) * Math.sin(wd * tp);
  return (peak * Math.exp(-sigma * t) * Math.sin(wd * t)) / norm;
}

/**
 * θ(t) for a charm hanging from a pivot that MOVES: `pivotX(t)` is the pivot's x in px at time t (seconds; the bar or
 * card position; it must accept slightly negative and fractional times, e.g. a clamped interpolate). Integrates
 * θ'' = −ωn²θ − 2ζωn·θ' − gain·a(t − lag)/L from t = 0 at 240 Hz with the personality's spring and ride lag. A bar
 * sliding right makes the charm trail left (+θ). `lengthPx` sets the sensitivity (≈ the travel for a ~10° answer);
 * `maxDeg` soft-limits (12°, the bible's ceiling). For authored moments prefer the kit's swingTrack / rideAngle.
 */
export function charmFollow(chain: Chain, t: number, pivotX: (t: number) => number, { lengthPx = 600, maxDeg = 12, fps = 30 }: { lengthPx?: number; maxDeg?: number; fps?: number } = {}) {
  if (t <= 0) return 0;
  const p = CHARM_PERSONALITY[chain];
  const wn = 2 * Math.PI * p.freqHz;
  const lag = p.rideLagF / fps;
  const dt = 1 / 240;
  const h = 1 / 120; // finite-difference step for the acceleration
  let th = 0;
  let om = 0;
  const steps = Math.floor(t / dt);
  for (let i = 0; i < steps; i++) {
    const tt = i * dt - lag;
    const acc = (pivotX(tt + h) - 2 * pivotX(tt) + pivotX(tt - h)) / (h * h);
    om += (-wn * wn * th - 2 * p.zeta * wn * om - (p.gain * acc) / lengthPx) * dt;
    th += om * dt;
  }
  const deg = (th * 180) / Math.PI;
  return maxDeg * Math.tanh(deg / maxDeg);
}

/**
 * The curious head tilt: eases to ±tilt° (ETH 6°, others 4°) with a small overshoot from t = 0 (seconds), dir ±1.
 * Feed it to face.tilt. 0 before t = 0. (The kit's headTilt(f, fps, holdF, dir) adds the hold and the return.)
 */
export function charmTilt(chain: Chain, t: number, dir = 1) {
  if (t <= 0) return 0;
  const amp = CHARM_PERSONALITY[chain].tilt || 4;
  const w = (2 * Math.PI) / 0.5;
  const s = 7;
  const v = 1 - Math.exp(-s * t) * (Math.cos(w * t) + (s / w) * Math.sin(w * t));
  return dir * amp * v;
}

/**
 * Blink amount (0 open … 1 closed) for blinks starting at the given times (seconds): close 2 f, closed 1 f, open 3 f
 * (the bible's 6-frame blink). Feed it to face.blink. With the kit's schedule use face.blink = 1 − eyeOpen(f, blinks).
 */
export function charmBlink(t: number, times: number[]) {
  let b = 0;
  for (const s of times) {
    const u = t - s;
    if (u < 0 || u > 0.2) continue;
    const v = u < 2 / 30 ? u / (2 / 30) : u < 3 / 30 ? 1 : 1 - (u - 3 / 30) / (3 / 30);
    const eased = v * v * (3 - 2 * v);
    b = Math.max(b, eased * 0.92);
  }
  return b;
}

/** The bar with the three charms (BTC, ETH, SOL), as in the brand illustration. Angles and faces per charm. */
export function CharmBar({
  width,
  angles = [0, 0, 0],
  faces = [{}, {}, {}],
  squash = [0, 0, 0],
  show = [1, 1, 1],
  barProgress = 1,
  extras,
}: {
  width: number;
  angles?: [number, number, number];
  faces?: [CharmFace, CharmFace, CharmFace];
  squash?: [number, number, number];
  show?: [number, number, number];
  barProgress?: number;
  /** extra CharmShape props per charm (grey, hat, puff, drop…) */
  extras?: [Partial<CharmShapeProps>, Partial<CharmShapeProps>, Partial<CharmShapeProps>];
}) {
  // brand geometry: bar 440 wide × 22 tall at y 40 (viewBox 40 20 480 236); charms at x 120/280/440 → −160/0/+160
  const k = width / 480;
  const chains: Chain[] = ["btc", "evm", "sol"];
  return (
    <svg viewBox="40 20 480 260" width={width} height={260 * k} style={{ display: "block", overflow: "visible" }}>
      <rect x={60 + 220 * (1 - barProgress)} y={40} width={440 * barProgress} height={22} rx={11} fill={C.ink} />
      {chains.map((c, i) => {
        const s = show[i];
        if (s <= 0) return null;
        return (
          <g key={c} transform={`translate(${120 + 160 * i} 62) scale(${s})`}>
            <CharmShape fill={charmFill(c)} face={faces[i]} squash={squash[i]} angle={angles[i]} {...(extras?.[i] ?? {})} />
          </g>
        );
      })}
    </svg>
  );
}
