import type { CSSProperties, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { Check, ChevronLeft, CircleDashed, LoaderCircle, Minimize2, Snowflake, X, type LucideIcon } from "lucide-react";
import { CharmShape, type CharmFace } from "../../brand/Charm";
import { Lockup } from "../../brand/Logo";
import { C, CHAIN, type Chain, display, mono, NIGHT, sans } from "../../brand/tokens";

/**
 * Satchel 2.0 UI kit: shared primitives for the film's app screens. Everything is authored at TRUE UI px (390 × 844
 * phone, 1280 × 800 browser); the scene builder scales the whole screen. Every state is a prop, nothing keeps time:
 *   press 0..1  primary buttons sink 4px into their shadow (shadow → 0) and the fill deepens to brand-deep
 *   spin  0..1  one turn of a spinner      pulse 0..1  one beat of a pulsing dot (pass (frame % 30) / 30)
 *   open  0..1  a sheet slides up over its scrim      show 0..1  a toast pops in
 * Lucide icons at stroke 2. Coral (brand) only as fills with ink text; never text.
 */

export const STROKE = 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mix = (t: number, a: number, b: number) => a + (b - a) * t;

/** The type ramp (tokens.json), at true px. */
export const TY = {
  hero: { ...display(800), fontSize: 48, lineHeight: "52px", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" },
  title: { ...display(750), fontSize: 30, lineHeight: "34px", letterSpacing: "-0.02em" },
  sheetTitle: { ...display(800), fontSize: 28, lineHeight: "32px", letterSpacing: "-0.02em" },
  heading: { ...display(700), fontSize: 20, lineHeight: "26px", letterSpacing: "-0.01em" },
  body: { ...sans(400), fontSize: 16, lineHeight: "24px" },
  bodySm: { ...sans(400), fontSize: 14, lineHeight: "20px" },
  label: { ...sans(600), fontSize: 15, lineHeight: "20px" },
  caption: { ...sans(500), fontSize: 13, lineHeight: "18px" },
  mono: { ...mono(450), fontSize: 13, lineHeight: "18px" },
} satisfies Record<string, CSSProperties>;

export const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/* ───────────────────────────── screens ───────────────────────────── */

export interface PhoneChrome {
  /** Draw a status bar (9:41, signal, wifi, battery) in the top inset. Turn off when the phone frame draws its own. */
  statusBar?: boolean;
  /** Top safe area (status bar + dynamic island), px. */
  insetTop?: number;
  /** Bottom safe area (home indicator), px. */
  insetBottom?: number;
}

/**
 * Root of every phone screen: fills its parent (give it a 390 × 844 box), Day ground, a flex column between the safe
 * areas. `footer` is the pinned action bar (white, hairline on top, runs into the home-indicator area; pass
 * `footerStyle={{ background: "transparent", borderTop: "none" }}` for buttons straight on the ground).
 * `overlay` renders above everything (full bleed): sheets, toasts.
 */
export function PhoneScreen({
  statusBar = true,
  insetTop = 54,
  insetBottom = 34,
  bg = C.ground,
  children,
  footer,
  footerStyle,
  overlay,
  style,
}: PhoneChrome & { bg?: string; children?: ReactNode; footer?: ReactNode; footerStyle?: CSSProperties; overlay?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: bg,
        color: C.ink,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        ...sans(400),
        ...style,
      }}
    >
      <div style={{ height: insetTop, flexShrink: 0, position: "relative" }}>{statusBar ? <StatusBar height={insetTop} /> : null}</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>{children}</div>
      {footer ? (
        <div style={{ flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.line}`, padding: `14px 16px ${Math.max(12, insetBottom - 2)}px`, ...footerStyle }}>{footer}</div>
      ) : (
        <div style={{ height: insetBottom, flexShrink: 0 }} />
      )}
      {overlay ? <div style={{ position: "absolute", inset: 0 }}>{overlay}</div> : null}
    </div>
  );
}

/** A minimal iOS-style status bar in ink (glyphs drawn here, not Lucide, so they read as system chrome). */
export function StatusBar({ height = 54, time = "9:41", color = C.ink }: { height?: number; time?: string; color?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, height, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 30px 0 34px", boxSizing: "border-box" }}>
      <span style={{ ...sans(650), fontSize: 16.5, letterSpacing: "-0.01em", color, ...NUM }}>{time}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width={18} height={12} viewBox="0 0 18 12" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.8} y={9 - i * 3} width={3.2} height={3 + i * 3} rx={0.9} fill={color} />
          ))}
        </svg>
        <svg width={16} height={12} viewBox="0 0 16 12" aria-hidden>
          <path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0L8 11.2Z" fill={color} />
          <path d="M3.4 6.5a6.6 6.6 0 0 1 9.2 0l-1.3 1.4a4.7 4.7 0 0 0-6.6 0L3.4 6.5Z" fill={color} />
          <path d="M1.2 4.2a9.8 9.8 0 0 1 13.6 0l-1.3 1.4a7.9 7.9 0 0 0-11 0L1.2 4.2Z" fill={color} />
        </svg>
        <svg width={27} height={13} viewBox="0 0 27 13" aria-hidden>
          <rect x={0.6} y={0.6} width={22.8} height={11.8} rx={3.6} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1.2} />
          <rect x={2.4} y={2.4} width={19.2} height={8.2} rx={2.2} fill={color} />
          <path d="M25 4.4v4.2c.9-.3 1.4-1.1 1.4-2.1S25.9 4.7 25 4.4Z" fill={color} fillOpacity={0.45} />
        </svg>
      </span>
    </div>
  );
}

/** Flow header (Send, Fund, Mint): a round close/back button, a centred title with an optional subtitle, a right slot. */
export function FlowHeader({
  title,
  subtitle,
  left = "close",
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: "close" | "back" | "minimize" | "none";
  right?: ReactNode;
}) {
  const Icon = left === "back" ? ChevronLeft : left === "minimize" ? Minimize2 : X;
  return (
    <div style={{ height: 60, flexShrink: 0, display: "grid", gridTemplateColumns: "56px 1fr 56px", alignItems: "center", padding: "0 8px" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {left === "none" ? null : (
          <span style={{ width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1.5px solid ${C.line}`, display: "grid", placeItems: "center", boxSizing: "border-box" }}>
            <Icon size={20} strokeWidth={STROKE} color={C.ink} />
          </span>
        )}
      </div>
      <div style={{ textAlign: "center", minWidth: 0 }}>
        <div style={{ ...TY.heading, whiteSpace: "nowrap" }}>{title}</div>
        {subtitle ? <div style={{ ...TY.caption, color: C.inkMuted, marginTop: 1, whiteSpace: "nowrap" }}>{subtitle}</div> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>{right}</div>
    </div>
  );
}

/** App bar (Satchel page): the lockup left, the connected account right. */
export function AppBar({ account = "alice.near", height = 60 }: { account?: string; height?: number }) {
  return (
    <div style={{ height, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 18px" }}>
      <Lockup height={30} />
      <AccountChip account={account} />
    </div>
  );
}

export function AccountChip({ account, size = 28 }: { account: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px 4px 4px", borderRadius: 999, background: C.surface, border: `1.5px solid ${C.line}` }}>
      <Avatar account={account} size={size} />
      <span style={{ ...mono(500), fontSize: 13, color: C.ink }}>{account}</span>
    </span>
  );
}

/* ───────────────────────────── buttons ───────────────────────────── */

export type ButtonKind = "primary" | "secondary" | "tertiary" | "neutral" | "neutralSecondary";

/**
 * Buttons. `primary` = the coral sticker button (2px ink border, hard 4px ink drop) that presses 4px into its shadow and
 * deepens to brand-deep. `secondary` = white with a line-strong border. `neutral*` = the outside wallet's buttons
 * (ink / plain, no sticker drop; they press by scaling). `busy` swaps the icon for a spinner (spin 0..1 turns it).
 * `disabled` dims the whole button to 40 %.
 */
export function UiButton({
  label,
  kind = "primary",
  icon: Icon,
  iconRight,
  press = 0,
  busy = false,
  spin = 0,
  disabled = false,
  disabledLook = "flat",
  block = false,
  size = "md",
  style,
}: {
  label: ReactNode;
  kind?: ButtonKind;
  icon?: LucideIcon;
  iconRight?: boolean;
  press?: number;
  busy?: boolean;
  spin?: number;
  disabled?: boolean;
  /** "flat" (the app's aria-disabled primary: sunken, muted, no drop) or "dim" (the whole button at 40 %). */
  disabledLook?: "flat" | "dim";
  block?: boolean;
  size?: "md" | "sm";
  style?: CSSProperties;
}) {
  const p = clamp01(press);
  const primary = kind === "primary";
  const pad = size === "sm" ? "11px 16px" : "15px 20px";
  const fs = size === "sm" ? 15 : 16;
  const base: CSSProperties = {
    display: block ? "flex" : "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...sans(700),
    fontSize: fs,
    lineHeight: "20px",
    padding: pad,
    borderRadius: 18,
    width: block ? "100%" : undefined,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    opacity: disabled && disabledLook === "dim" ? 0.4 : 1,
    flexShrink: 0,
  };
  let skin: CSSProperties;
  if (primary) {
    skin = {
      background: interpolateColors(p, [0, 1], [C.brand, C.brandDeep]),
      color: C.onBrand,
      border: `2px solid ${C.ink}`,
      boxShadow: `0 ${4 * (1 - p)}px 0 ${C.ink}`,
      transform: `translateY(${4 * p}px)`,
    };
  } else if (kind === "secondary") {
    skin = {
      background: interpolateColors(p, [0, 1], [C.surface, C.sunken]),
      color: C.ink,
      border: `2px solid ${C.lineStrong}`,
      transform: `scale(${1 - 0.025 * p})`,
    };
  } else if (kind === "tertiary") {
    skin = {
      background: interpolateColors(p, [0, 1], [C.sunken, C.line]),
      color: C.ink,
      border: `2px solid ${C.lineStrong}`,
      transform: `scale(${1 - 0.025 * p})`,
    };
  } else if (kind === "neutral") {
    skin = { background: interpolateColors(p, [0, 1], [C.ink, "#3a2f63"]), color: C.white, border: `2px solid ${C.ink}`, borderRadius: 14, transform: `scale(${1 - 0.03 * p})` };
  } else {
    skin = { background: interpolateColors(p, [0, 1], [C.surface, C.sunken]), color: C.ink, border: `1.5px solid ${C.line}`, borderRadius: 14, transform: `scale(${1 - 0.03 * p})` };
  }
  if (disabled && disabledLook === "flat") {
    skin = { background: C.sunken, color: C.lineStrong, border: `2px solid ${C.line}`, boxShadow: "none", transform: "none" };
  }
  const glyph = busy ? <Spinner size={18} spin={spin} color={primary ? C.onBrand : "currentColor"} /> : Icon ? <Icon size={18} strokeWidth={STROKE} /> : null;
  return (
    <div style={{ ...base, ...skin, ...style }}>
      {!iconRight ? glyph : null}
      <span>{label}</span>
      {iconRight ? glyph : null}
    </div>
  );
}

/** Spinner: Lucide's LoaderCircle, rotated by `spin` (0..1 = one turn). */
export function Spinner({ size = 18, spin = 0, color = C.inkMuted }: { size?: number; spin?: number; color?: string }) {
  return (
    <span style={{ display: "inline-grid", placeItems: "center", width: size, height: size, transform: `rotate(${spin * 360}deg)`, flexShrink: 0 }}>
      <LoaderCircle size={size} strokeWidth={STROKE} color={color} />
    </span>
  );
}

/** The in-progress dot (frozen blue) with a ring that breathes out once per `pulse` cycle (0..1). */
export function PulseDot({ pulse = 0, color = C.frozen, size = 10 }: { pulse?: number; color?: string; size?: number }) {
  const ph = ((pulse % 1) + 1) % 1;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: color, opacity: 0.35 * (1 - ph), transform: `scale(${1 + 1.5 * ph})` }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: color, transform: `scale(${1 - 0.12 * Math.sin(ph * Math.PI)})` }} />
    </span>
  );
}

/* ───────────────────────────── pills, badges, chips ───────────────────────────── */

export type Tone = "success" | "frozen" | "danger" | "muted" | "ink";
export const TONE: Record<Tone, string> = { success: C.success, frozen: C.frozen, danger: C.danger, muted: C.inkMuted, ink: C.ink };

/** Status pill: icon + word in the state colour on sunken (never colour alone). `pop` 0..1 punches it in. */
export function StatusPill({
  tone,
  icon: Icon,
  word,
  pop,
  bg = C.sunken,
  size = "md",
  spin = 0,
  style,
}: {
  tone: Tone;
  icon?: LucideIcon | "spinner" | "dot";
  word: ReactNode;
  pop?: number;
  bg?: string;
  size?: "md" | "sm";
  spin?: number;
  style?: CSSProperties;
}) {
  const color = TONE[tone];
  const fs = size === "sm" ? 12 : 13;
  const s = pop === undefined ? 1 : popScale(pop);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...sans(600),
        fontSize: fs,
        lineHeight: "18px",
        padding: size === "sm" ? "4px 10px" : "6px 12px",
        borderRadius: 999,
        background: bg,
        color,
        whiteSpace: "nowrap",
        transform: `scale(${s})`,
        opacity: pop === undefined ? 1 : clamp01(pop * 4),
        flexShrink: 0,
        ...style,
      }}
    >
      {Icon === "spinner" ? <Spinner size={14} spin={spin} color={color} /> : Icon === "dot" ? <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} /> : Icon ? <Icon size={14} strokeWidth={STROKE} color={color} /> : null}
      {word}
    </span>
  );
}

/** 0 → 1 pop: overshoots to 1.18 at ~0.35, settles at 1. */
export function popScale(t: number) {
  const x = clamp01(t);
  if (x <= 0) return 0.6;
  if (x < 0.35) return mix(x / 0.35, 0.6, 1.18);
  return mix((x - 0.35) / 0.65, 1.18, 1);
}

/** The lemon "New" badge (brand: lemon fill, 2px ink border, ink text). */
export function NewBadge({ style }: { style?: CSSProperties }) {
  return <span style={{ ...sans(700), fontSize: 12, lineHeight: "16px", padding: "3px 10px", borderRadius: 999, background: C.lemon, border: `2px solid ${C.ink}`, color: C.ink, ...style }}>New</span>;
}

/** Chain dot: 8px in the Day UI chain colour (graphics only). */
export function Dot({ chain, size = 8 }: { chain: Chain; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 999, background: CHAIN[chain].ui, display: "inline-block", flexShrink: 0 }} />;
}

/** A chain chip: dot + "0.0412 BTC" on sunken (tabular figures). */
export function AmountChip({ chain, amount, ticker = true, bg = C.sunken, style }: { chain: Chain; amount?: string; ticker?: boolean; bg?: string; style?: CSSProperties }) {
  const t = CHAIN[chain].ticker;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...sans(500), fontSize: 13, lineHeight: "18px", padding: "6px 10px", borderRadius: 12, background: bg, color: C.ink, whiteSpace: "nowrap", ...NUM, ...style }}>
      <Dot chain={chain} />
      {amount === undefined ? t : ticker ? `${amount} ${t}` : amount}
    </span>
  );
}

/**
 * The chain charm's face as a round avatar (no stem): coin fill, 12-unit ink outline, dot eyes and smile, optional hard
 * ink drop under it (sticker). Satchel's own characters, never real chain logos.
 */
export function CoinFace({ chain, size = 32, face, drop = true, style }: { chain: Chain; size?: number; face?: CharmFace; drop?: boolean; style?: CSSProperties }) {
  const pad = drop ? 10 : 0;
  return (
    <svg width={size} height={(size * (140 + pad)) / 140} viewBox={`-70 38 140 ${140 + pad}`} style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }} aria-hidden>
      {drop ? <circle cx={0} cy={108 + 10} r={70} fill={C.ink} /> : null}
      <CharmShape fill={CHAIN[chain].color} face={face} showStem={false} />
    </svg>
  );
}

/** People: sleeves in the film (alice lemon, bob sky, carol white), echoed by their avatars. */
// The real app draws every account avatar the same way: sky disc, ink ring, the initial in Onest bold.
const PERSON: Record<string, string> = {};
export function Avatar({ account, size = 28 }: { account: string; size?: number }) {
  const ch = account.slice(0, 1).toLowerCase();
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: PERSON[ch] ?? C.sky,
        border: `1.5px solid ${C.ink}`,
        boxSizing: "border-box",
        display: "inline-grid",
        placeItems: "center",
        ...sans(700),
        fontSize: size * 0.42,
        lineHeight: 1,
        color: C.ink,
        flexShrink: 0,
      }}
    >
      {ch.toUpperCase()}
    </span>
  );
}

/* ───────────────────────────── addresses ───────────────────────────── */

/**
 * Addresses in Geist Mono only. `grouped`: 4-character groups after a head group, the head and the last group in ink 600,
 * the middle in ink-muted (the product's AddressDisplay; the bold ends match the truncated form). `reveal` 0..1 types it in without reflowing (hidden characters keep their
 * space). `truncated`: "bc1q9h…x4d7".
 */
export function AddressText({
  value,
  mode = "grouped",
  size = 13,
  reveal = 1,
  color = C.ink,
  align = "left",
  style,
}: {
  value: string;
  mode?: "grouped" | "truncated" | "full";
  size?: number;
  reveal?: number;
  color?: string;
  align?: "left" | "center";
  style?: CSSProperties;
}) {
  const base: CSSProperties = { ...mono(450), fontSize: size, lineHeight: `${Math.round(size * 1.45)}px`, color, textAlign: align, ...style };
  const shown = Math.round(clamp01(reveal) * value.length);
  if (mode !== "grouped") {
    return (
      <span style={base}>
        {value.split("").map((ch, i) => (
          <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
            {ch}
          </span>
        ))}
      </span>
    );
  }
  // head group = 4 + (length mod 4) characters, then 4s: the bold ends read exactly like the truncation
  // ("bc1q9h … x4d7", "0x8f2a … 41c9", "7xKX … gAsU")
  const head = 4 + (value.length % 4);
  const groups: string[] = [value.slice(0, head)];
  for (let i = head; i < value.length; i += 4) groups.push(value.slice(i, i + 4));
  let idx = 0;
  return (
    <span style={{ ...base, display: "inline", wordSpacing: 0 }}>
      {groups.map((g, gi) => {
        const strong = gi === 0 || gi === groups.length - 1;
        const startIdx = idx;
        idx += g.length;
        return (
          <span key={gi} style={{ display: "inline-block", marginRight: gi === groups.length - 1 ? 0 : "0.42em", fontWeight: strong ? 600 : 450, color: strong ? color : C.inkMuted }}>
            {g.split("").map((ch, ci) => (
              <span key={ci} style={{ opacity: startIdx + ci < shown ? 1 : 0 }}>
                {ch}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

/* ───────────────────────────── containers ───────────────────────────── */

/** A list group: white surface, radius 18, hairline rows (children are rows; dividers come from `Row`). */
export function Group({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.line}`, overflow: "hidden", ...style }}>{children}</div>;
}

export function Row({ children, divider = true, style }: { children: ReactNode; divider?: boolean; style?: CSSProperties }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: divider ? `1px solid ${C.line}` : undefined, ...style }}>{children}</div>;
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...sans(600), fontSize: 13, lineHeight: "18px", color: C.inkMuted, letterSpacing: "0.01em", ...style }}>{children}</div>;
}

/** Banner (product anatomy): sunken panel, 20px icon + title in the state colour, body in ink, no tints. */
export function Banner({ tone, icon: Icon, title, children, style }: { tone: Tone; icon: LucideIcon; title: ReactNode; children?: ReactNode; style?: CSSProperties }) {
  const color = TONE[tone];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 18, background: C.sunken, ...style }}>
      <Icon size={20} strokeWidth={STROKE} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...TY.label, color }}>{title}</div>
        {children ? <div style={{ ...TY.bodySm, color: C.ink, marginTop: 3 }}>{children}</div> : null}
      </div>
    </div>
  );
}

/**
 * The listed state's banner (frozen, snowflake), beside the "Paused for sale" pill: it says what stops and what still
 * works. No countdown, ever. `title` defaults to the brand's "Paused while it's for sale".
 */
export function PausedBanner({ id = "7", title = "Signing paused while it's for sale", style }: { id?: string; title?: string; style?: CSSProperties }) {
  return (
    <Banner tone="frozen" icon={Snowflake} title={title} style={style}>
      No coins can leave Satchel #{id} until it sells or you delist it. Anyone can still fund it.
    </Banner>
  );
}

/**
 * A text field look (inputs are 16px; addresses and accounts in mono). `focus` draws the 2px ink focus border;
 * `caret` 0..1 shows a blinking caret after the text (pass 1/0 from the scene).
 */
export function Field({
  value,
  placeholder,
  monoText = true,
  focus = false,
  caret = 0,
  right,
  size = 16,
  style,
}: {
  value: ReactNode;
  placeholder?: string;
  monoText?: boolean;
  focus?: boolean;
  caret?: number;
  right?: ReactNode;
  size?: number;
  style?: CSSProperties;
}) {
  const empty = value === "" || value === null || value === undefined;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
        padding: "0 14px",
        borderRadius: 12,
        background: C.sunken,
        border: `2px solid ${focus ? C.ink : C.lineStrong}`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", ...(monoText ? mono(500) : sans(500)), fontSize: size, color: empty ? C.inkMuted : C.ink, whiteSpace: "nowrap" }}>
        {empty && caret > 0 ? <span style={{ display: "inline-block", width: 2, height: size + 4, marginRight: 1, background: C.ink, opacity: caret }} /> : null}
        {empty ? placeholder : value}
        {!empty && caret > 0 ? <span style={{ display: "inline-block", width: 2, height: size + 4, marginLeft: 1, background: C.ink, opacity: caret }} /> : null}
      </span>
      {right}
    </div>
  );
}

/** Segmented control on a sunken pill track; the selected segment is a white sticker-lite pill with an ink border. */
export function Segmented<K extends string>({
  items,
  selected,
  style,
}: {
  items: { key: K; label: ReactNode; lead?: ReactNode }[];
  selected: K;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", padding: 4, gap: 4, borderRadius: 999, background: C.sunken, ...style }}>
      {items.map((it) => {
        const on = it.key === selected;
        return (
          <div
            key={it.key}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              height: 40,
              borderRadius: 999,
              background: on ? C.surface : "transparent",
              border: `1.5px solid ${on ? C.ink : "transparent"}`,
              boxShadow: on ? `0 2px 0 ${C.ink}` : undefined,
              ...sans(on ? 650 : 550),
              fontSize: 14,
              color: on ? C.ink : C.inkMuted,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              ...NUM,
            }}
          >
            {it.lead}
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── overlays ───────────────────────────── */

/**
 * A bottom sheet over a scrim, full bleed over its parent (layer it over a screen, or pass it as a screen's `overlay`).
 * `open` 0..1 slides it up (1 = resting). `variant`: "satchel" = the brand sheet (white, 3px ink outline on top, radius
 * 28, grabber); "neutral" = an outside app's sheet (no sticker outline, soft overlay shadow, radius 24).
 */
export function Sheet({
  open = 1,
  variant = "satchel",
  insetBottom = 34,
  children,
  style,
}: {
  open?: number;
  variant?: "satchel" | "neutral";
  insetBottom?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const o = clamp01(open);
  const satchel = variant === "satchel";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(29, 19, 64, 0.42)", opacity: o }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          transform: `translateY(${(1 - o) * 104}%)`,
          background: C.surface,
          borderRadius: satchel ? "28px 28px 0 0" : "24px 24px 0 0",
          border: satchel ? `3px solid ${C.ink}` : undefined,
          borderBottom: "none",
          boxShadow: satchel ? undefined : "0 -12px 40px rgba(29, 19, 64, 0.18)",
          padding: `10px 20px ${insetBottom + 12}px`,
          boxSizing: "border-box",
          ...style,
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: satchel ? C.lineStrong : "#c9c5d8", margin: "0 auto 14px" }} />
        {children}
      </div>
    </div>
  );
}

/**
 * Toast: brand-soft fill (the brand's "toast behind Sent"), 2px ink outline and a hard drop, a round state badge.
 * `show` 0..1 pops it in from above.
 */
export function Toast({
  title,
  sub,
  tone = "success",
  icon: Icon = Check,
  show = 1,
  bg = C.brandSoft,
  style,
}: {
  title: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  show?: number;
  bg?: string;
  style?: CSSProperties;
}) {
  const s = clamp01(show);
  const scale = s >= 1 ? 1 : popScale(s);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: sub ? "10px 18px 10px 10px" : "10px 18px 10px 10px",
        borderRadius: 18,
        background: bg,
        border: `2px solid ${C.ink}`,
        boxShadow: `0 4px 0 ${C.ink}`,
        transform: `translateY(${(1 - Math.min(1, s * 2)) * -24}px) scale(${scale})`,
        opacity: Math.min(1, s * 3),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ width: 30, height: 30, borderRadius: 999, background: TONE[tone], display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon size={18} strokeWidth={2} color={C.white} />
      </span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ ...sans(700), fontSize: 16, lineHeight: "20px", color: C.ink, ...NUM }}>{title}</span>
        {sub ? <span style={{ ...TY.caption, color: C.inkMuted }}>{sub}</span> : null}
      </span>
    </div>
  );
}

export type StepState = "done" | "active" | "future";

/** A compact step list (mint, give, list): ✓ done, a pulsing frozen dot for the active step, a dashed ring for future. */
export function Steps({ steps, pulse = 0, style }: { steps: [string, StepState][]; pulse?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, ...style }}>
      {steps.map(([label, s]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, ...sans(s === "active" ? 650 : 450), fontSize: 15, lineHeight: "20px", color: s === "future" ? C.inkMuted : C.ink }}>
          <span style={{ width: 20, height: 20, display: "grid", placeItems: "center", flexShrink: 0 }}>
            {s === "done" ? <Check size={18} strokeWidth={2} color={C.success} /> : s === "active" ? <PulseDot pulse={pulse} /> : <CircleDashed size={18} strokeWidth={STROKE} color={C.lineStrong} />}
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── utilities ───────────────────────────── */

/** Render a fixed-size screen (e.g. 390 × 844) scaled by `scale` inside a box of the scaled size. */
export function Scaled({ w, h, scale, children, style }: { w: number; h: number; scale: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ width: w * scale, height: h * scale, position: "relative", flexShrink: 0, ...style }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

export const PHONE = { w: 390, h: 844 } as const;
export const BROWSER = { w: 1280, h: 800 } as const;
export { NIGHT };
