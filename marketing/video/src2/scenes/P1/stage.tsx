import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring } from "remotion";
import { Check } from "lucide-react";
import { type CharmFace, charmFill } from "../../brand/Charm";
import { C, type Chain, CHAIN, display, mono, sans } from "../../brand/tokens";
import { CardWithCharms, type CharmSlot, Hand, PhoneFrame } from "../../illustration/characters";
import { blinkSchedule, CaptionSlap, CHARM_LAG, CHARM_SWING, clamp, EASE2, eyeOpen, pressAt, slapAt, SPRING2 } from "../../motion";

/**
 * The product stage shared by P1 Mint, P2 Fill and P3 Send: one set, one light, one camera height.
 *   the phone   left, ~950 px tall (PhoneFrame 406 × 860 UI around the kit's 390 × 844 screens, k 1.1)
 *   the world   right: Satchel #7 (CardWithCharms, the film's hero look) with an address tag under each charm
 *   captions    screen space, top right (ink, Funnel Display 800, plain: not the hook's sticker treatment)
 * P1 ends exactly where P2 begins and P2 where P3 begins, so the two hard cuts read as one shot whose phone screen
 * changes. Every component here is prop-driven (no internal timing) unless it says otherwise; the scenes own the clocks.
 */

export const FPS = 30;
export const fr = (sec: number) => Math.round(sec * FPS);
export const CHAINS3: Chain[] = ["btc", "evm", "sol"];

// ── the phone ───────────────────────────────────────────────────────────────────────────────────────────────────
export const PHONE = { x: 196, y: 67, k: 1.1, frameW: 406, frameH: 860, bezel: 8, uiW: 390, uiH: 844 } as const;

/** UI px inside the kit screen (390 × 844) → frame px (phone at rest). */
export const ui = (ux: number, uy: number) => ({
  x: PHONE.x + (PHONE.bezel + ux) * PHONE.k,
  y: PHONE.y + (PHONE.bezel + uy) * PHONE.k,
});

/** The phone with a kit screen inside (children fill a 390 × 844 UI box). `dx, dy` slide it; `lift` raises it. */
export function Phone({ children, dx = 0, dy = 0, lift = 0, style }: { children: ReactNode; dx?: number; dy?: number; lift?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: PHONE.x + dx, top: PHONE.y + dy, ...style }}>
      <PhoneFrame k={PHONE.k} width={PHONE.frameW} height={PHONE.frameH} bezel={PHONE.bezel} lift={lift}>
        <div style={{ position: "absolute", left: 0, top: 0, width: PHONE.uiW, height: PHONE.uiH }}>{children}</div>
      </PhoneFrame>
    </div>
  );
}

/**
 * A page push inside the phone (the bible's T9 "slide() + springTiming(land)" as plain layers): the old screen slides
 * left 30 % while the new one slides in from the right. p 0..1 (drive it with SPRING2.land).
 */
export function PagePush({ p, from, to }: { p: number; from: ReactNode; to: ReactNode }) {
  if (p <= 0.001) return <div style={{ position: "absolute", inset: 0 }}>{from}</div>;
  if (p >= 0.999) return <div style={{ position: "absolute", inset: 0 }}>{to}</div>;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, translate: `${-30 * p}% 0` }}>{from}</div>
      <div style={{ position: "absolute", inset: 0, translate: `${100 * (1 - p)}% 0`, boxShadow: `-3px 0 0 ${C.line}` }}>{to}</div>
    </>
  );
}

/** Where the minted card was: a sunken, card-shaped spot in the phone (the sticker has left its backing). */
export const PH_CARD = { x: 16, y: 120, w: 358, h: (358 * 252) / 400 } as const;
export function EmptySlot({ show = 1 }: { show?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: PH_CARD.x,
        top: PH_CARD.y,
        width: PH_CARD.w,
        height: PH_CARD.h,
        borderRadius: 25,
        background: C.sunken,
        border: `2px solid ${C.line}`,
        boxSizing: "border-box",
        opacity: show,
      }}
    />
  );
}

// ── Satchel #7 in the world ─────────────────────────────────────────────────────────────────────────────────────
/** World card: centre x, top y, width (k = 1.3). Charm geometry mirrors CardWithCharms' defaults. */
export const CARD = { cx: 1262, top: 284, w: 520 } as const;
const CHARM_SIZE = 0.18;
const SPACING = 1.3;
const STEM = 30;

export function cardGeo(w: number = CARD.w, lift = 0) {
  const H = (w * 252) / 400;
  const k = w / 400;
  const u = (w * CHARM_SIZE) / 140;
  const barH = 22 * u;
  const rise = -8 * lift * k;
  const barY = H + rise + 4 * k + 16 * u + barH / 2;
  const pivotY = barY + barH / 2;
  const gap = 160 * SPACING * u;
  const coinCy = pivotY + (12 + STEM + 56) * u;
  return { H, k, u, pivotY, gap, coinCy, coinR: 64 * u, coinBottom: coinCy + 70 * u, pivotX: [-gap, 0, gap].map((d) => w / 2 + d) };
}

/** Frame position of a point on charm i (coin centre, mouth or bottom) for a swing angle (card at CARD, at rest). */
export function charmPoint(i: number, angleDeg = 0, along: "coin" | "mouth" | "bottom" = "coin", dy = 0) {
  const g = cardGeo();
  const px = CARD.cx - CARD.w / 2 + g.pivotX[i];
  const py = CARD.top + g.pivotY + dy;
  const r = along === "coin" ? g.coinCy - g.pivotY : along === "mouth" ? g.coinCy - g.pivotY + 22 * g.u : g.coinBottom - g.pivotY;
  const a = (angleDeg * Math.PI) / 180;
  return { x: px - r * Math.sin(a), y: py + r * Math.cos(a), px, py };
}

export function WorldCard({
  charms,
  chips,
  lift = 0,
  bar = 1,
  scaleX = 1,
  scaleY = 1,
  origin = "50% 100%",
  dx = 0,
  dy = 0,
  style,
  children,
}: {
  charms: CharmSlot[];
  chips?: { chain: Chain; amount?: string }[];
  lift?: number;
  bar?: number;
  scaleX?: number;
  scaleY?: number;
  origin?: string;
  dx?: number;
  dy?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.cx - CARD.w / 2 + dx,
        top: CARD.top + dy,
        width: CARD.w,
        transformOrigin: origin,
        scale: `${scaleX} ${scaleY}`,
        ...style,
      }}
    >
      <CardWithCharms width={CARD.w} id="7" total="3 chains" chips={chips} lift={lift} bar={bar} charms={charms} />
      {children}
    </div>
  );
}

/**
 * The app's lemon "Yours" sticker after the name in the card's band (SatchelCard `yours`, D-44), redrawn as an overlay
 * at exactly the same place and size so it can pop on (the freshly minted #7 is alice's). At pop 1 it matches the
 * component's own sticker pixel for pixel. Render it as a WorldCard child; `lift` follows the card's lift (px).
 */
export function YoursSticker({ pop = 1, lift = 0 }: { pop?: number; lift?: number }) {
  if (pop <= 0.001) return null;
  const k = CARD.w / 400;
  return (
    <div style={{ position: "absolute", left: 0, top: -lift, width: 400, height: 66, transform: `scale(${k})`, transformOrigin: "0 0", pointerEvents: "none" }}>
      <div style={{ height: 66, display: "flex", alignItems: "center", gap: 10, padding: "0 16px 0 20px", boxSizing: "border-box" }}>
        <span style={{ ...display(800), fontSize: 22, letterSpacing: "-0.02em", visibility: "hidden" }}>Satchel #7</span>
        <span
          style={{
            display: "inline-block",
            ...sans(700),
            fontSize: 12,
            lineHeight: "16px",
            padding: "2px 8px",
            borderRadius: 999,
            background: C.lemon,
            color: C.ink,
            border: `2px solid ${C.ink}`,
            scale: `${pop}`,
            rotate: `${-6 * (1 - Math.min(1, pop))}deg`,
          }}
        >
          Yours
        </span>
      </div>
    </div>
  );
}

// ── charm rig helpers ───────────────────────────────────────────────────────────────────────────────────────────
const KIT = { btc: "btc", evm: "eth", sol: "sol" } as const;
export const charmSpring = (c: Chain) => CHARM_SWING[KIT[c]];
export const charmLag = (c: Chain) => CHARM_LAG[KIT[c]];

/** Blink amount (0 open … 1 closed) on a per-charm seeded idle schedule plus forced blinks. */
export function charmBlink(c: Chain, f: number, forced: number[] = [], seed = "stage") {
  const blinks = blinkSchedule(`${seed}-${c}`, 10, 900, forced);
  return Math.min(1, Math.max(0, (1 - eyeOpen(f, blinks)) / 0.88));
}

/** A personality swing released from `deg` at frame `at` (0 before). */
export function releaseSwing(c: Chain, f: number, at: number, deg: number) {
  if (f < at) return 0;
  return spring({ frame: f - at, fps: FPS, from: deg, to: 0, config: charmSpring(c) });
}

/** Eyes (charm units, ≤ 6 x, 4 y) looking from a charm's coin centre toward a frame point. */
export function lookToward(from: { x: number; y: number }, to: { x: number; y: number }, amt = 1): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: (6 * dx * amt) / L, y: (4 * dy * amt) / L };
}

export type { CharmFace, CharmSlot };

// ── the address tags ────────────────────────────────────────────────────────────────────────────────────────────
export const TAG = { w: 182, k: 1.3, splay: 1.47 } as const;
export const SHORT: Record<Chain, string> = { btc: "bc1q9h…x4d7", evm: "0x8f2a…41c9", sol: "7xKX…gAsU" };

/** Frame position (top centre) of tag i, hanging under its charm, splayed outward so three tags fit. */
export function tagAnchor(i: number) {
  const g = cardGeo();
  return { x: CARD.cx + (i - 1) * g.gap * TAG.splay, y: CARD.top + g.coinBottom + 20 };
}

export interface TagState {
  /** 0..1 the address prints (string slicing) */
  typed?: number;
  /** the balance line (P2 counts it up); undefined = no line */
  amount?: string;
  /** 0..1 the balance line grows in */
  amountIn?: number;
  /** 0..1 the 8 % pop on the final value */
  amountPop?: number;
  /** frames since the tag's slap started (14 f slap, contact f4); null = at rest; < 0 = not there yet */
  slap?: number | null;
  /** 0..1 the string drops from the charm to the tag */
  string?: number;
  lift?: number;
}

/**
 * An address tag: a white luggage-tag sticker (ink outline, hard drop, a ring hole) printed with the chain name and
 * the charm's address in Geist Mono; `amount` adds the balance line.
 */
export function AddressTag({ chain, x, y, w = TAG.w, state }: { chain: Chain; x: number; y: number; w?: number; state: TagState }) {
  const { typed = 1, amount, amountIn = 1, amountPop = 0, slap = null, lift = 0 } = state;
  if (slap !== null && slap < 0) return null;
  const k = TAG.k;
  const rest = Math.round(4 * k);
  const s = slap === null ? { sx: 1, sy: 1, lift: 0, opacity: 1 } : slapAt(slap, FPS, rest, { from: 1.28, squash: 0.07, drop: 22 });
  const L = lift + s.lift;
  const addr = SHORT[chain];
  const shown = addr.slice(0, Math.max(0, Math.round(typed * addr.length)));
  const caret = typed > 0 && typed < 1;
  const amountH = (6 + 5 + 26) * k + 2;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, opacity: s.opacity, scale: `${s.sx} ${s.sy}`, transformOrigin: "50% 0%" }}>
      <div
        style={{
          position: "relative",
          background: C.surface,
          border: `${Math.round(3 * k)}px solid ${C.ink}`,
          borderRadius: 14 * k,
          boxShadow: `0 ${Math.max(0, rest + L)}px 0 ${C.ink}`,
          translate: `0 ${-L}px`,
          padding: `${10 * k}px ${10 * k}px ${9 * k}px`,
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* the ring hole the string ties to */}
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: 5 * k,
            width: 9 * k,
            height: 9 * k,
            marginLeft: -4.5 * k,
            borderRadius: 99,
            background: C.ground,
            border: `${Math.round(2 * k)}px solid ${C.ink}`,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * k, marginTop: 6 * k, ...sans(650), fontSize: 14.5 * k, lineHeight: `${19 * k}px`, color: C.ink }}>
          <span style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: CHAIN[chain].ui, flexShrink: 0 }} />
          {CHAIN[chain].name}
        </div>
        <div style={{ ...mono(500), fontSize: 15.5 * k, lineHeight: `${21 * k}px`, color: C.ink, marginTop: 2 * k, whiteSpace: "nowrap", minHeight: 21 * k }}>
          {shown}
          {caret ? <span style={{ display: "inline-block", width: 2 * k, height: 16 * k, marginLeft: 1, background: C.ink, translate: `0 ${2 * k}px` }} /> : null}
        </div>
        {amount !== undefined && amountIn > 0 ? (
          <div style={{ height: amountH * amountIn, overflow: "hidden" }}>
            <div
              style={{
                ...display(800),
                fontSize: 22 * k,
                lineHeight: `${26 * k}px`,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                color: C.ink,
                marginTop: 6 * k,
                paddingTop: 5 * k,
                borderTop: `${Math.round(1.5 * k)}px dashed ${C.lineStrong}`,
                scale: `${1 + 0.08 * amountPop}`,
                whiteSpace: "nowrap",
              }}
            >
              {amount} <span style={{ ...display(700), fontSize: 15 * k, color: C.inkMuted }}>{CHAIN[chain].ticker}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The string from a charm's coin bottom to its tag's ring (frame px, inside a full-frame <svg>). */
export function TagString({ from, to, progress = 1 }: { from: { x: number; y: number }; to: { x: number; y: number }; progress?: number }) {
  if (progress <= 0.01) return null;
  const mx = (from.x + to.x) / 2;
  const my = Math.max(from.y, to.y) + 8;
  const ex = from.x + (to.x - from.x) * progress;
  const ey = from.y + (to.y - from.y) * progress;
  const cx = from.x + (mx - from.x) * progress;
  const cy = from.y + (my - from.y) * progress;
  return <path d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${ex} ${ey}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />;
}

/** The three strings and tags. `angles` are the charms' swing angles (the strings follow the coins). */
export function TagsLayer({ tags, angles, dys = [0, 0, 0] }: { tags: TagState[]; angles: number[]; dys?: number[] }) {
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {CHAINS3.map((c, i) => {
          const a = tagAnchor(i);
          return <TagString key={c} from={charmPoint(i, angles[i] ?? 0, "bottom", dys[i] ?? 0)} to={{ x: a.x, y: a.y + 12 }} progress={tags[i]?.string ?? 1} />;
        })}
      </svg>
      {CHAINS3.map((c, i) => {
        const a = tagAnchor(i);
        return <AddressTag key={c} chain={c} x={a.x} y={a.y} state={tags[i] ?? {}} />;
      })}
    </>
  );
}

/** Count-up value with fixed decimals (never jitters), tabular. */
export const fmt = (v: number, decimals: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// ── alice's tapping hand ────────────────────────────────────────────────────────────────────────────────────────
/**
 * alice's hand (lemon sleeve) taps a point: arrives on SPRING2.land from `arrive`, the fingertip dips into the press
 * (pressAt: fully down ON `at`), lifts, and leaves accelerating (10 f) from `leave`. `pressPx` = how far the button
 * sinks (4 UI px × phone k).
 */
export function TapHand({
  f,
  x,
  y,
  arrive,
  at,
  leave,
  angle = -52,
  away = { x: 560, y: 330 },
  k = 1.55,
  pressPx = 4 * PHONE.k,
}: {
  f: number;
  x: number;
  y: number;
  arrive: number;
  at: number;
  leave: number;
  angle?: number;
  away?: { x: number; y: number };
  k?: number;
  pressPx?: number;
}) {
  if (f < arrive) return null;
  const outP = ease(f, leave, leave + 10, 0, 1, EASE2.fall);
  if (outP >= 1) return null;
  const inP = sp(f, arrive, SPRING2.land);
  const { pressed } = pressAt(f, at, 4, FPS);
  const hover = 1 - ease(f, at - 4, at, 0, 1, EASE2.fall);
  const hx = x + away.x * (1 - inP) + away.x * outP;
  const hy = y + away.y * (1 - inP) + away.y * outP - 16 * hover * (f < at ? 1 : 0) + pressPx * pressed;
  return <Hand pose="tap" sleeve="alice" k={k} x={hx} y={hy} angle={angle} press={pressed} arm={8} tagTilt={-2} />;
}

// ── captions (screen space) ─────────────────────────────────────────────────────────────────────────────────────
export const CAPTION = { x: 770, y: 46, size: 112 } as const;

/** A caption slap at the stage's caption spot (mount it inside a <Sequence> that starts at the slap). */
export function CaptionAt({ text, seed, x = CAPTION.x, y = CAPTION.y, size = CAPTION.size }: { text: string; seed: string; x?: number; y?: number; size?: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, whiteSpace: "pre-line", lineHeight: 0.98 }}>
      <CaptionSlap text={text} seed={seed} size={size} />
    </div>
  );
}

/** "Standard NEAR NFT": a white sticker chip beside "One NFT." (`f` = frames since its slap started). */
export function NftChip({ f = 99 }: { f?: number }) {
  const k = 2.05;
  const rest = Math.round(3 * k);
  const s = slapAt(f, FPS, rest, { from: 1.28, squash: 0.07, drop: 24 });
  return (
    <div style={{ position: "absolute", left: CAPTION.x + 498, top: CAPTION.y + 134, opacity: s.opacity, scale: `${s.sx} ${s.sy}`, rotate: "-2deg" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8 * k,
          padding: `${7 * k}px ${14 * k}px ${7 * k}px ${10 * k}px`,
          borderRadius: 999,
          background: C.surface,
          border: `${Math.round(2.4 * k)}px solid ${C.ink}`,
          boxShadow: `0 ${Math.max(0, rest + s.lift)}px 0 ${C.ink}`,
          translate: `0 ${-s.lift}px`,
          ...sans(700),
          fontSize: 16 * k,
          lineHeight: `${20 * k}px`,
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 22 * k, height: 22 * k, borderRadius: 99, background: C.success, display: "grid", placeItems: "center" }}>
          <Check size={15 * k} strokeWidth={2.6} color={C.white} />
        </span>
        Standard NEAR NFT
      </div>
    </div>
  );
}

// ── tiny utils ──────────────────────────────────────────────────────────────────────────────────────────────────
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (f: number, a: number, b: number, from = 0, to = 1, easing: (t: number) => number = EASE2.out) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });
export const sp = (f: number, at: number, config: { mass: number; stiffness: number; damping: number } = SPRING2.land) => spring({ frame: f - at, fps: FPS, config });
export { charmFill };
