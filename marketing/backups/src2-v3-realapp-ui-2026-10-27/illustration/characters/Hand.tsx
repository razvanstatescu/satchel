import { type CSSProperties, useId } from "react";
import { C, DROP, F, OUTLINE } from "../../brand/tokens";
import { add, chainPath, clamp01, dirUp, distToChain, len, mix, mul, P, type Pt, r2, rot, roundRectPath, sub, svgId, taperChainPath } from "./geometry";

/**
 * Sticker hands — flat, friendly mitten-style hands with an ink outline, one neutral fill (white, like the sticker S)
 * and a hard ink drop, coming out of a sleeve with a cuff. Sleeves (colour / stripes) and a small mono name tag tell
 * the holders apart (concepts-v2 §4.1). No internal timing: every state comes from props.
 *
 * <Hand pose="pinch" x={…} y={…} k={2} angle={90} sleeve="alice" />
 *
 * Placement
 *   x, y      px in the parent where the ANCHOR lands. The parent must be positioned (absolute layouts).
 *   anchor    "contact" (default; per pose, see below) | "wrist" | "palm".
 *   angle     deg, rotates the whole hand about the anchor. 0 = fingers up (arm from below), 90 = fingers point
 *             right (arm from the left), −90 = fingers left, 180 = fingers down.
 *   mirror    reflects the whole hand left↔right about the anchor, after `angle` (a left hand): set a pose up for
 *             the left side of the frame and mirror it for the right.
 *   arm       deg, swings the sleeve about the wrist relative to the hand (a wrist bend). 0 = straight back.
 *   armLength sleeve length in hand units (default 420; ~1260 px at k 2) so it leaves the frame.
 * Scale and weight
 *   k         UI scale, as in the Sticker kit: outline 3k px, drop 4k px (match the card you hold: card width / 400).
 *   size      hand size multiplier (default 1.45 → palm ≈ 100k px wide, wrist→fingertip ≈ 160k px). The outline
 *             stays 3k at any size, so lines match the card.
 * Layers (for holding things)
 *   layer     "both" (default) | "back" | "front". Render the hand twice around the held object:
 *             <Hand layer="back" …/> <Card/> <Hand layer="front" …/>. Front = whatever crosses OVER the object
 *             (pinch & hold: the thumb; grab: palm + fingers). Back = the sleeve and the rest.
 * Poses and their contact point (where the hand touches the thing)
 *   "pinch"   thumb in front + index behind, the other fingers curled. contact = where the thumb and index tips
 *             meet (put it just inside the card corner). `pinch` 0 open → 1 closed (default).
 *   "hold"    palm under the card: a flat hand seen from the side, the card resting on it, the thumb up in front
 *             of the card. Natural orientation (angle 0): fingers point LEFT, the arm comes from the RIGHT (mirror
 *             for the left). contact = where the card's bottom edge rests (put it on the card's bottom edge).
 *             `grip` 0 thumb raised, fingers straight (ready to catch) → 1 thumb pressed on the card, tips curled.
 *   "tap"     index finger pressing, the rest a fist. contact = the fingertip pad (put it on the button).
 *             `press` 0..1 foreshortens the finger as it pushes in (move the hand 4k px with the button too).
 *   "open"    open hand, fingers together, thumb out. contact = the middle fingertip. "reach" is the same pose.
 *             `spread` 0..1 fans the fingers; `wiggle` 0..1 + `phase` (radians, animate it) wiggles them.
 *   "wave"    fingers spread, thumb out. contact = the wrist (rotate `angle` ±15° about it to wave).
 *   "grab"    fingers curled over an edge in front, thumb behind. contact = the edge point.
 *             `grip` 0 loose → 1 tight (fingers shorten as they curl).
 * Look
 *   sleeve    preset name (alice, bob, carol, seller, stranger, team) or {fill, cuff?, stripes?, tag?}.
 *   tag       override the preset's name tag (string), or null to hide it. Tags stay upright on screen.
 *   tagTilt   deg, screen tilt of the tag (±2° reads as slapped on).
 *   drop      shadow multiplier (1 = 4k px, 0 = none). night = true uses the Night shadow (#000).
 *   squash    0..1 the contact squash: 4% across / along the hand about the anchor (pinch or press frame).
 *   fill      hand fill override (default HAND_FILL, white).
 */

export type HandPose = "pinch" | "hold" | "tap" | "open" | "reach" | "wave" | "grab";
export type HandLayer = "both" | "back" | "front";
export type HandAnchor = "contact" | "wrist" | "palm";

export interface SleeveStyle {
  /** sleeve fill */
  fill: string;
  /** cuff fill (defaults to the sleeve fill) */
  cuff?: string;
  /** colour of horizontal stripes around the sleeve (carol) */
  stripes?: string;
  /** default name tag text */
  tag?: string;
}

/** The cast's sleeves. alice lemon, bob sky, carol white with ink stripes, the seller ink (Night), the stranger grey, the team plain. */
export const SLEEVES = {
  alice: { fill: C.lemon, tag: "alice.near" },
  bob: { fill: C.sky, tag: "bob.near" },
  carol: { fill: C.white, stripes: C.ink, tag: "carol.near" },
  seller: { fill: C.ink, cuff: "#3d3273" },
  stranger: { fill: "#b9b4c9", cuff: "#a8a2bb" },
  team: { fill: C.white, tag: "satchelhq" },
} as const satisfies Record<string, SleeveStyle>;

export type SleevePreset = keyof typeof SLEEVES;

/** The one hand fill for every hand in the film (skin-agnostic: a white sticker, like the S). */
export const HAND_FILL = C.white;

/** Default size multiplier. */
export const HAND_SIZE = 1.45;

export interface HandProps {
  pose: HandPose;
  x?: number;
  y?: number;
  k?: number;
  size?: number;
  angle?: number;
  mirror?: boolean;
  arm?: number;
  armLength?: number;
  anchor?: HandAnchor;
  layer?: HandLayer;
  sleeve?: SleevePreset | SleeveStyle;
  tag?: string | null;
  tagTilt?: number;
  drop?: number;
  night?: boolean;
  fill?: string;
  // pose parameters
  spread?: number;
  wiggle?: number;
  phase?: number;
  press?: number;
  pinch?: number;
  grip?: number;
  /** 0..1 the contact squash (fingers squash 4% on the contact frame, about the anchor) */
  squash?: number;
  style?: CSSProperties;
}

// ── pose geometry (hand units; canonical: a right hand seen from the back, fingers up, wrist at 0,0) ───────────
type Layer = "back" | "front";
interface Part {
  d: string;
  layer: Layer;
  /** drawn BEFORE the union with its own outline (a thumb tucked behind the hand) */
  under?: boolean;
  /** drawn AFTER the union with its own outline (a thumb crossing in front of the palm) */
  sep?: boolean;
}
interface Crease {
  pts: Pt[];
  layer: Layer;
  sep?: boolean;
}
interface PoseGeo {
  parts: Part[];
  creases: Crease[];
  contact: Pt;
  palmLayer: Layer;
  /** the pose's natural orientation (deg) on top of the user's angle (hold: −90, palm up with the arm from the right) */
  baseAngle?: number;
}

/** The palm seen from its thumb side (the "hold" pose): a flat paddle about 38 units thick. */
const PALM_SIDE = "M -19 10 C -21 -10 -21 -32 -18 -46 C -16 -58 -10 -64 -2 -64 L 6 -64 C 14 -64 19.5 -58 19.5 -50 C 20.5 -36 19 -12 17 10 Z";

const PALM = "M -23 10 C -29 -10 -36 -30 -35 -46 C -34 -58 -25 -64 -12 -64 L 14 -64 C 28 -64 36 -57 35 -45 C 34 -29 29 -10 23 10 Z";

function finger(base: Pt, angle: number, length: number, bend = 0, at = 0.55): Pt[] {
  if (!bend) return [base, add(base, mul(dirUp(angle), length))];
  const mid = add(base, mul(dirUp(angle), length * at));
  return [base, mid, add(mid, mul(dirUp(angle + bend), length * (1 - at)))];
}

const tipOf = (pts: Pt[], r: number, angle: number) => add(pts[pts.length - 1], mul(dirUp(angle), r));

/**
 * The crease between two touching fingers: starts in the notch where their outlines meet and runs down their
 * shared seam to `endT` (0 = the finger bases, 1 = the tips). Null when the fingers no longer overlap there.
 */
function seam(A: Pt[], rA: number, B: Pt[], rB: number, endT: number): Pt[] | null {
  const m0 = mix(A[0], B[0], 0.5);
  const m1 = mix(A[A.length - 1], B[B.length - 1], 0.5);
  const axis = sub(m1, m0);
  const L = len(axis);
  if (L < 1e-3) return null;
  const u = mul(axis, 1 / L);
  const ext = Math.max(rA, rB) + 2;
  for (let s = 0; s <= L + ext; s += 0.4) {
    const p = sub(add(m1, mul(u, ext)), mul(u, s));
    if (distToChain(p, A) <= rA - 0.3 && distToChain(p, B) <= rB - 0.3) {
      const t = (L + ext - s) / L;
      if (t <= endT + 0.06) return null;
      return [p, add(m0, mul(axis, endT))];
    }
  }
  return null;
}

interface PoseParams {
  spread: number;
  wiggle: number;
  phase: number;
  press: number;
  pinch: number;
  grip: number;
}

const FR = 10.5; // finger radius
const OPEN_BASES = [P(-24, -53), P(-8, -56), P(8.5, -55), P(24, -50)];
const OPEN_ANG = [-3, -1, 2, 6];
const OPEN_LEN = [40, 46, 42, 31];
const OPEN_R = [FR, FR, FR, 9.8];

function openFingers(spread: number, fan: number[], wiggle: number, phase: number, lenScale = 1) {
  return OPEN_BASES.map((b, i) => {
    const a = OPEN_ANG[i] + spread * fan[i] + wiggle * 8 * Math.sin(phase + i * 1.3);
    return { pts: finger(b, a, OPEN_LEN[i] * lenScale), r: OPEN_R[i], a };
  });
}

function seams(fingers: { pts: Pt[]; r: number }[], endT: number, layer: Layer): Crease[] {
  const out: Crease[] = [];
  for (let i = 0; i < fingers.length - 1; i++) {
    const s = seam(fingers[i].pts, fingers[i].r, fingers[i + 1].pts, fingers[i + 1].r, endT);
    if (s) out.push({ pts: s, layer });
  }
  return out;
}

/** Curled middle, ring and pinky seen from the back: three knuckle bumps on the right of the fist. */
function knuckles(dx = 0) {
  return [
    { pts: finger(P(-3.5 + dx, -51), 3, 9), r: 10.5 },
    { pts: finger(P(12 + dx, -50), 7, 6), r: 10 },
    { pts: finger(P(25.5 + dx, -45), 13, 2.5), r: 9.4 },
  ];
}

const capPart = (pts: Pt[], r: number, layer: Layer, extra: Partial<Part> = {}): Part => ({ d: chainPath(pts, r), layer, ...extra });
/** A thumb: a tapered chain, wide at the base (12.5) and rounder at the tip (10). */
const thumbPart = (pts: Pt[], layer: Layer, extra: Partial<Part> = {}, r0 = 12.5, r1 = 10): Part => ({ d: taperChainPath(pts, r0, r1), layer, ...extra });

function poseGeo(pose: HandPose, q: PoseParams): PoseGeo {
  switch (pose) {
    case "open":
    case "reach": {
      const fs = openFingers(q.spread, [-9, -3, 4, 11], q.wiggle, q.phase);
      const thumb = finger(P(-26, -27), -52 - 12 * q.spread + q.wiggle * 5 * Math.sin(q.phase - 1.1), 29);
      return {
        parts: [{ d: PALM, layer: "back" }, thumbPart(thumb, "back"), ...fs.map((f) => capPart(f.pts, f.r, "back"))],
        creases: seams(fs, 0.5, "back"),
        contact: tipOf(fs[1].pts, FR, fs[1].a),
        palmLayer: "back",
      };
    }
    case "wave": {
      const fs = openFingers(1, [-14, -4, 6, 16], q.wiggle, q.phase);
      const thumb = finger(P(-26, -27), -70 + q.wiggle * 5 * Math.sin(q.phase - 1.1), 29);
      return {
        parts: [{ d: PALM, layer: "back" }, thumbPart(thumb, "back"), ...fs.map((f) => capPart(f.pts, f.r, "back"))],
        creases: seams(fs, 0.5, "back"),
        contact: P(0, 0),
        palmLayer: "back",
      };
    }
    case "tap": {
      const p = clamp01(q.press);
      const ri = FR + 0.8 * p;
      const index = finger(P(-21, -50), 0, 54 * (1 - 0.16 * p));
      const ks = knuckles(0);
      const thumb = [P(-20, -24), P(-37, -41)];
      return {
        parts: [thumbPart(thumb, "back", { under: true }, 12, 10.5), { d: PALM, layer: "back" }, capPart(index, ri, "back"), ...ks.map((f) => capPart(f.pts, f.r, "back"))],
        creases: seams([{ pts: index, r: ri }, ...ks], 0, "back"),
        contact: index[1],
        palmLayer: "back",
      };
    }
    case "pinch": {
      const c = clamp01(q.pinch);
      const index = [P(-17, -50), P(-17, -74), P(-21, -91)];
      const ks = knuckles(1.5);
      const open = [P(-30, -34), P(-42, -50), P(-47, -64), P(-49, -77)];
      const closed = [P(-30, -34), P(-37, -52), P(-34.5, -68), P(-27, -80)];
      const thumb = open.map((o, i) => mix(o, closed[i], c));
      return {
        parts: [{ d: PALM, layer: "back" }, capPart(index, FR, "back"), ...ks.map((f) => capPart(f.pts, f.r, "back")), thumbPart(thumb, "front")],
        creases: seams([{ pts: index.slice(0, 2), r: FR }, ...ks], 0, "back"),
        contact: mix(index[2], thumb[3], 0.5),
        palmLayer: "back",
      };
    }
    case "hold": {
      // Side view of a flat hand, palm facing +x (which the base angle turns to face UP): the card rests on it.
      const g = clamp01(q.grip);
      const fingers = [P(-2, -44), P(-1, -86), P(2 + 4 * g, -104)];
      const open = [P(8, -22), P(20, -26), P(30, -27)];
      const closed = [P(8, -22), P(19, -33), P(25, -46)];
      const thumb = open.map((o, i) => mix(o, closed[i], g));
      // the middle fingertip peeks past the index (stacked fingers seen from the side)
      const middle = [P(-3, -60), P(-3, -92), P(0 + 4 * g, -111)];
      return {
        parts: [
          { d: taperChainPath(middle, 12, 10.5), layer: "back", under: true },
          { d: PALM_SIDE, layer: "back" },
          { d: taperChainPath(fingers, 16, 13), layer: "back" },
          thumbPart(thumb, "front", {}, 12, 9.5),
        ],
        creases: [],
        contact: P(19, -46),
        palmLayer: "back",
        baseAngle: -90,
      };
    }
    case "grab": {
      const g = clamp01(q.grip);
      const fs = OPEN_BASES.map((b, i) => {
        const a = [-3, -1, 2, 6][i];
        return { pts: finger(P(b.x, b.y + 3), a, [24, 27, 25, 18][i] * (1.25 - 0.35 * g)), r: OPEN_R[i] + 0.6, a };
      });
      const thumb = [P(-25, -44), P(-37, -60)];
      return {
        parts: [thumbPart(thumb, "back", {}, 12, 10.5), { d: PALM, layer: "front" }, ...fs.map((f) => capPart(f.pts, f.r, "front"))],
        creases: seams(fs, 0.08, "front"),
        contact: P(0, -60),
        palmLayer: "front",
      };
    }
  }
}

// ── sleeve (sleeve-local units: hanging down from the wrist at 0,0) ─────────────────────────────────────────────
const CUFF = roundRectPath(-36, -3, 72, 19, 7);
const tubePath = (L: number) => `M -32 12 H 32 V ${L} H -32 Z`;
const TAG_ANCHOR = P(0, 44);

function resolveSleeve(s: HandProps["sleeve"]): SleeveStyle {
  if (!s) return SLEEVES.alice;
  return typeof s === "string" ? SLEEVES[s] : s;
}

/** Everything in hand units for one hand: transforms, parts, sleeve. */
function handModel(p: HandProps) {
  const k = p.k ?? 1;
  const size = p.size ?? HAND_SIZE;
  const px = k * size; // px per hand unit
  const o = OUTLINE / size; // outline in hand units → 3k px on screen
  const geo = poseGeo(p.pose, {
    spread: p.spread ?? (p.pose === "reach" ? 0.25 : 0),
    wiggle: p.wiggle ?? 0,
    phase: p.phase ?? 0,
    press: p.press ?? 0,
    pinch: p.pinch ?? 1,
    grip: p.grip ?? 1,
  });
  const anchorPt = p.anchor === "wrist" ? P(0, 0) : p.anchor === "palm" ? P(0, -34) : geo.contact;
  const mx = p.mirror ? -1 : 1;
  const angle = (p.angle ?? 0) + (geo.baseAngle ?? 0);
  // mirror is a screen-space reflection about the anchor, applied after the rotation
  const sq = clamp01(p.squash ?? 0) * 0.04;
  const T = `scale(${r2(px * mx * 1000) / 1000} ${r2(px * 1000) / 1000}) rotate(${r2(angle)}) scale(${r2((1 + sq) * 1000) / 1000} ${r2((1 - sq) * 1000) / 1000}) translate(${r2(-anchorPt.x)} ${r2(-anchorPt.y)})`;
  const toScreen = (h: Pt) => {
    const q = mul(rot(sub(h, anchorPt), angle), px);
    return P(q.x * mx, q.y);
  };
  return { k, size, px, o, geo, T, toScreen, angle, mx };
}

function GeoPaths({ parts, creases, o, fill, mode, shadow }: { parts: Part[]; creases: Crease[]; o: number; fill: string; mode: "shadow" | "content"; shadow: string }) {
  if (mode === "shadow") {
    return (
      <>
        {parts.map((pt, i) => (
          <path key={i} d={pt.d} fill={shadow} stroke={shadow} strokeWidth={2 * o} strokeLinejoin="round" />
        ))}
      </>
    );
  }
  const unders = parts.filter((x) => x.under);
  const union = parts.filter((x) => !x.sep && !x.under);
  const seps = parts.filter((x) => x.sep);
  const line = (c: Crease, i: number) => (
    <path key={`c${i}`} d={`M ${c.pts.map((q) => `${r2(q.x)} ${r2(q.y)}`).join(" L ")}`} fill="none" stroke={C.ink} strokeWidth={o} strokeLinecap="round" strokeLinejoin="round" />
  );
  return (
    <>
      {unders.map((pt, i) => (
        <g key={`u${i}`}>
          <path d={pt.d} fill={C.ink} stroke={C.ink} strokeWidth={2 * o} strokeLinejoin="round" />
          <path d={pt.d} fill={fill} />
        </g>
      ))}
      {union.map((pt, i) => (
        <path key={`s${i}`} d={pt.d} fill={C.ink} stroke={C.ink} strokeWidth={2 * o} strokeLinejoin="round" />
      ))}
      {union.map((pt, i) => (
        <path key={`f${i}`} d={pt.d} fill={fill} />
      ))}
      {creases.filter((c) => !c.sep).map(line)}
      {seps.map((pt, i) => (
        <g key={`p${i}`}>
          <path d={pt.d} fill={C.ink} stroke={C.ink} strokeWidth={2 * o} strokeLinejoin="round" />
          <path d={pt.d} fill={fill} />
        </g>
      ))}
      {creases.filter((c) => c.sep).map(line)}
    </>
  );
}

function SleeveTube({ style, L, o, shadow, mode, clipId }: { style: SleeveStyle; L: number; o: number; shadow: string; mode: "shadow" | "content"; clipId: string }) {
  const d = tubePath(L);
  if (mode === "shadow") return <path d={d} fill={shadow} stroke={shadow} strokeWidth={2 * o} strokeLinejoin="round" />;
  const stripes: number[] = [];
  if (style.stripes) for (let y = 25; y < L; y += 17) stripes.push(y);
  return (
    <g>
      <path d={d} fill={C.ink} stroke={C.ink} strokeWidth={2 * o} strokeLinejoin="round" />
      <path d={d} fill={style.fill} />
      {style.stripes ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={d} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {stripes.map((y) => (
              <rect key={y} x={-44} y={y} width={88} height={5.5} fill={style.stripes} />
            ))}
          </g>
        </>
      ) : null}
    </g>
  );
}

function Cuff({ style, o, shadow, mode }: { style: SleeveStyle; o: number; shadow: string; mode: "shadow" | "content" }) {
  if (mode === "shadow") return <path d={CUFF} fill={shadow} stroke={shadow} strokeWidth={2 * o} />;
  return (
    <>
      <path d={CUFF} fill={C.ink} stroke={C.ink} strokeWidth={2 * o} strokeLinejoin="round" />
      <path d={CUFF} fill={style.cuff ?? style.fill} />
    </>
  );
}

/** A small mono name tag (screen space, upright). */
export function NameTag({ x, y, text, k = 1, tilt = 0, night = false }: { x: number; y: number; text: string; k?: number; tilt?: number; night?: boolean }) {
  const fs = 11.5 * k;
  const padX = 7 * k;
  const h = fs * 1.2 + 8 * k;
  const w = text.length * fs * 0.6 + 2 * padX;
  const ow = 2 * k;
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(tilt)})`}>
      <rect x={-w / 2} y={-h / 2 + 2 * k} width={w} height={h} rx={6 * k} fill={night ? "#000" : C.ink} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6 * k} fill={C.white} stroke={C.ink} strokeWidth={ow} />
      <text x={0} y={0.5 * k} textAnchor="middle" dominantBaseline="central" fontFamily={F.mono} fontWeight={500} fontSize={fs} fill={C.ink}>
        {text}
      </text>
    </g>
  );
}

/**
 * The hand as SVG content, for embedding in a larger <svg> (x, y in that svg's px coordinates).
 * Same props as <Hand>.
 */
export function HandG(props: HandProps) {
  const m = handModel(props);
  const { o, geo, T } = m;
  const layer = props.layer ?? "both";
  const st = resolveSleeve(props.sleeve);
  const tagText = props.tag === null ? null : props.tag ?? st.tag ?? null;
  const shadow = props.night ? "#000" : C.ink;
  const dropPx = DROP * m.k * (props.drop ?? 1);
  const fill = props.fill ?? HAND_FILL;
  const L = props.armLength ?? 420;
  const arm = props.arm ?? 0;
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const clipId = svgId(useId(), "hand-sleeve");

  const backParts = geo.parts.filter((pt) => pt.layer === "back");
  const frontParts = geo.parts.filter((pt) => pt.layer === "front");
  const backCreases = geo.creases.filter((c) => c.layer === "back");
  const frontCreases = geo.creases.filter((c) => c.layer === "front");
  const cuffInFront = geo.palmLayer === "front";

  const sleeveT = `rotate(${r2(arm)})`;
  const tagPos = m.toScreen(rot(TAG_ANCHOR, arm));

  const showBack = layer !== "front";
  const showFront = layer !== "back";

  return (
    <g transform={`translate(${r2(x)} ${r2(y)})`}>
      {showBack ? (
        <>
          {dropPx > 0 ? (
            <g transform={`translate(0 ${r2(dropPx)})`}>
              <g transform={T}>
                <g transform={sleeveT}>
                  <SleeveTube style={st} L={L} o={o} shadow={shadow} mode="shadow" clipId={clipId} />
                  {!cuffInFront ? <Cuff style={st} o={o} shadow={shadow} mode="shadow" /> : null}
                </g>
                <GeoPaths parts={backParts} creases={[]} o={o} fill={fill} mode="shadow" shadow={shadow} />
              </g>
            </g>
          ) : null}
          <g transform={T}>
            <g transform={sleeveT}>
              <SleeveTube style={st} L={L} o={o} shadow={shadow} mode="content" clipId={clipId} />
            </g>
            <GeoPaths parts={backParts} creases={backCreases} o={o} fill={fill} mode="content" shadow={shadow} />
            {!cuffInFront ? (
              <g transform={sleeveT}>
                <Cuff style={st} o={o} shadow={shadow} mode="content" />
              </g>
            ) : null}
          </g>
          {tagText ? <NameTag x={tagPos.x} y={tagPos.y} text={tagText} k={m.k} tilt={props.tagTilt ?? 0} night={props.night} /> : null}
        </>
      ) : null}
      {showFront && (frontParts.length > 0 || cuffInFront) ? (
        <>
          {dropPx > 0 ? (
            <g transform={`translate(0 ${r2(dropPx)})`}>
              <g transform={T}>
                {cuffInFront ? (
                  <g transform={sleeveT}>
                    <Cuff style={st} o={o} shadow={shadow} mode="shadow" />
                  </g>
                ) : null}
                <GeoPaths parts={frontParts} creases={[]} o={o} fill={fill} mode="shadow" shadow={shadow} />
              </g>
            </g>
          ) : null}
          <g transform={T}>
            <GeoPaths parts={frontParts} creases={frontCreases} o={o} fill={fill} mode="content" shadow={shadow} />
            {cuffInFront ? (
              <g transform={sleeveT}>
                <Cuff style={st} o={o} shadow={shadow} mode="content" />
              </g>
            ) : null}
          </g>
        </>
      ) : null}
    </g>
  );
}

/** A sticker hand as a positioned element (an overflow-visible <svg> whose origin sits at x, y). */
export function Hand({ style, ...props }: HandProps) {
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", ...style }}>
      <HandG {...props} />
    </svg>
  );
}

/** Where a hand's contact point, wrist, palm centre or tag land on screen (px, in the same space as x / y). */
export function handPoint(props: HandProps, which: "contact" | "wrist" | "palm" | "tag") {
  const m = handModel(props);
  const h = which === "wrist" ? P(0, 0) : which === "palm" ? P(0, -34) : which === "tag" ? rot(TAG_ANCHOR, props.arm ?? 0) : m.geo.contact;
  const s = m.toScreen(h);
  return { x: (props.x ?? 0) + s.x, y: (props.y ?? 0) + s.y };
}

export const HAND_POSES: HandPose[] = ["pinch", "hold", "tap", "open", "wave", "grab"];
