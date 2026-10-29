import Link from "next/link";
import type { ComponentProps, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleQuestionMark,
  CircleX,
  Clock,
  Handshake,
  Hourglass,
  Info,
  LoaderCircle,
  Minimize2,
  Snowflake,
  TriangleAlert,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { ChainCharms } from "@/components/brand/ChainCharm";
import { Charm } from "@/components/brand/Charm";
import { copy } from "@/lib/copy";
import type { SatchelStatus } from "@/lib/near/contract";
import type { ItemStatus } from "@/lib/data/types";

/**
 * The shared UI primitives of Satchel 2.0 (design-system-impl §4; proto/components.css is the visual target). Server-safe:
 * no hooks and no "use client", so server components can render them; the interactive ones (Segmented, FilterChip,
 * buttons with onClick) take their handlers from client components. Colour only through the tokens in globals.css.
 */

export type UiChain = "btc" | "evm" | "sol";
export type Tone = "success" | "frozen" | "danger" | "muted";

/** Lucide at stroke 2 (brand 2.0; it was 1.75). Sizes: 14 in pills and chips, 16 inline, 20 in buttons and rows, 24 in
 * the header and nav. */
export const STROKE = 2;

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const TONE_TEXT: Record<Tone, string> = { success: "text-success", frozen: "text-frozen", danger: "text-danger", muted: "text-ink-muted" };

/** A Lucide icon, decorative unless `label` names it. `spin` turns it once a second (static under reduced motion). */
export function Icon({ icon: I, size = 20, className, label, spin = false }: { icon: LucideIcon; size?: number; className?: string; label?: string; spin?: boolean }) {
  return (
    <I
      size={size}
      strokeWidth={STROKE}
      className={cx("shrink-0", spin && "animate-spin", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * One button system for the landing and the app (§4.1, design-spec §3.3). `primary` is the coral sticker, at most one
 * per view; `paper` (a white sticker) and `ghost-on-brand` are only for coral grounds (put them in a
 * `data-scheme="day"` island). `danger` is outlined, never filled. `icon` is 44 round and needs a label (use
 * `IconButton`).
 */
export type ButtonVariant = "primary" | "secondary" | "link" | "danger" | "icon" | "paper" | "ghost-on-brand";
/** md 44 · lg 52 · xl 56 (xl only for the landing hero and the final CTA). */
export type ButtonSize = "md" | "lg" | "xl";

/* The base sets no display, radius or border: each size and variant sets its own, because two utilities for one property
   on an element resolve by Tailwind's sort order, not by their order in the class list. */
const BTN_BASE =
  "relative items-center justify-center gap-2 whitespace-nowrap font-sans no-underline select-none [-webkit-tap-highlight-color:transparent] transition-[translate,scale,box-shadow,background-color] duration-[140ms,140ms,140ms,120ms] ease-out";
/** The sticker press (motion-spec §3): 4 px down into the drop in 60 ms, back in 140 ms; the fill never darkens. */
const BTN_PRESS =
  "active:translate-y-1 active:shadow-pressed active:duration-60 data-pressed:translate-y-1 data-pressed:shadow-pressed data-pressed:duration-60";
const BTN_LATCHED = "translate-y-1 shadow-pressed";
const BTN_SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 rounded-md px-4.5 text-button",
  lg: "min-h-13 rounded-md px-6 text-button-lg",
  xl: "min-h-14 rounded-[20px] px-7 text-[1.0625rem] leading-5 font-bold",
};
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "border-2 border-sticker bg-brand text-on-brand shadow-sticker hover:bg-brand-hover",
  paper: "border-2 border-on-brand bg-surface text-on-brand shadow-[0_4px_0_var(--on-brand)] hover:bg-brand-soft",
  secondary: "border-2 border-line-strong bg-surface text-ink hover:bg-surface-sunken active:bg-surface-sunken",
  "ghost-on-brand": "border-2 border-on-brand bg-transparent text-on-brand hover:bg-brand-hover",
  danger: "border-2 border-danger bg-surface text-danger hover:bg-surface-sunken active:bg-surface-sunken",
  link: "min-h-11 min-w-11 px-0.5 font-semibold text-link underline decoration-1 underline-offset-3 hover:decoration-2 active:text-ink",
  icon: "size-11 shrink-0 rounded-pill p-0 text-ink hover:bg-surface-sunken active:scale-[.96] active:bg-surface-sunken",
};
const BTN_DISABLED = "border-2 border-line bg-disabled text-on-disabled shadow-none";
const PRESSABLE: ReadonlySet<ButtonVariant> = new Set(["primary", "paper"]);

export interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width (phones pin the primary full width in a sheet foot). */
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/** The classes of a button, for elements `Button` can't render itself (a `<label>`, `<summary>` or a client component
 * that takes a className, like ConnectButton). Add `data-press` on primary and paper ones for the tap press. */
export function buttonClass({ variant = "secondary", size = "md", block = false, disabled = false, loading = false, className }: ButtonStyle = {}) {
  const sized = variant === "link" ? cx("rounded-md", size === "md" ? "text-button" : "text-button-lg") : variant === "icon" ? "" : BTN_SIZE[size];
  const pressable = PRESSABLE.has(variant);
  return cx(
    BTN_BASE,
    block ? "flex w-full" : "inline-flex",
    sized,
    disabled && !loading ? (variant === "link" ? "min-h-11 min-w-11 px-0.5 font-semibold text-on-disabled underline underline-offset-3" : variant === "icon" ? "size-11 shrink-0 rounded-pill p-0 text-on-disabled" : BTN_DISABLED) : BTN_VARIANT[variant],
    pressable && !disabled && !loading && BTN_PRESS,
    pressable && loading && BTN_LATCHED,
    className,
  );
}

type ButtonOwnProps = ButtonStyle & {
  /** A leading icon, 20 px (`iconSize` 24 for icon buttons in the header and nav); a spinner replaces it while `loading`. */
  icon?: LucideIcon;
  /** `none`: while `loading`, add no spinner because the label brings its own (a `Morph` item with a spinner icon). */
  spinner?: "auto" | "none";
  iconSize?: 16 | 20 | 24;
  /** A trailing icon (e.g. arrow-right on Buy). */
  iconEnd?: LucideIcon;
  children?: ReactNode;
};
type ButtonAsButton = ButtonOwnProps & Omit<ComponentProps<"button">, keyof ButtonOwnProps> & { href?: undefined };
type ButtonAsLink = ButtonOwnProps & Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps | "href"> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * A button, or a Next link that looks like one (`href`).
 * - `disabled` sets `aria-disabled`: the control stays focusable, so put its reason beside it and point
 *   `aria-describedby` at it. A disabled button swallows its `onClick`; a disabled link renders without its href.
 * - `loading` keeps the label and width, swaps the leading icon for a 16 px spinner and sets `aria-busy`; a primary
 *   stays pressed while it is busy (`data-latched`). Change the label to the busy verb yourself ("Giving…").
 * - Primary and paper buttons carry `data-press` (PressFeedback shows the press on a quick tap).
 */
export function Button(props: ButtonProps) {
  const { variant = "secondary", size = "md", block, disabled, loading, className, icon, iconSize = 20, iconEnd, spinner = "auto", children, ...rest } = props;
  const inert = Boolean(disabled || loading);
  const pressable = PRESSABLE.has(variant);
  const cls = buttonClass({ variant, size, block, disabled, loading, className });
  const inner = (
    <>
      {loading && spinner === "auto" ? <Icon icon={LoaderCircle} size={16} spin /> : icon ? <Icon icon={icon} size={iconSize} /> : null}
      {children}
      {iconEnd ? <Icon icon={iconEnd} size={iconSize} /> : null}
    </>
  );
  const state = {
    "aria-disabled": inert || undefined,
    "aria-busy": loading || undefined,
    "data-press": pressable && !inert ? "" : undefined,
    "data-latched": pressable && loading ? "" : undefined,
  };
  if (rest.href !== undefined) {
    const { href, replace, scroll, prefetch, onNavigate, onClick, shallow, passHref, legacyBehavior, locale, ...anchor } = rest as Omit<ButtonAsLink, keyof ButtonOwnProps>;
    if (inert) {
      // a link that can't be followed: no href, still focusable, still named (`aria-disabled` + its reason)
      return (
        <span role="link" tabIndex={0} {...(anchor as ComponentProps<"span">)} {...state} className={cls}>
          {inner}
        </span>
      );
    }
    return (
      <Link
        href={href}
        replace={replace}
        scroll={scroll}
        prefetch={prefetch}
        onNavigate={onNavigate}
        onClick={onClick}
        shallow={shallow}
        passHref={passHref}
        legacyBehavior={legacyBehavior}
        locale={locale}
        {...anchor}
        {...state}
        className={cls}
      >
        {inner}
      </Link>
    );
  }
  const { onClick, type = "button", ...button } = rest as Omit<ButtonAsButton, keyof ButtonOwnProps>;
  // Handlers only exist in client components, so the guard is added only when there is one to guard (a server
  // component can't pass event handlers to a host element).
  const guarded = onClick && inert ? (e: MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick;
  return (
    <button type={type} {...button} {...state} className={cls} onClick={guarded}>
      {inner}
    </button>
  );
}

type IconButtonProps = { icon: LucideIcon; label: string; iconSize?: 20 | 24 } & (
  | Omit<ButtonAsButton, "variant" | "size" | "block" | "icon" | "iconSize" | "iconEnd" | "children" | "aria-label">
  | Omit<ButtonAsLink, "variant" | "size" | "block" | "icon" | "iconSize" | "iconEnd" | "children" | "aria-label">
);

/** A 44 px round icon button; `label` is its accessible name (required). `iconSize={24}` in the header and nav. */
export function IconButton({ icon, label, iconSize = 20, ...rest }: IconButtonProps) {
  return <Button {...(rest as ButtonProps)} variant="icon" icon={icon} iconSize={iconSize} aria-label={label} />;
}

/** A `Morph` label: a word, or a word with its own icon (`spin` for the busy spinner, drawn at 16 px). */
export type MorphLabel = string | { label: string; icon?: LucideIcon; spin?: boolean };

/**
 * A label that rolls when it changes (motion-spec §3, "Roll"; F2). Every label sits in one grid cell, so a button
 * never resizes (CLS 0): the old label leaves 8 px up (140 ms ease-in) and the new one rises from 8 px below (in by
 * 250 ms, ease-out), clipped to the label's own window. The order of `labels` sets the direction: moving forward rolls
 * up, moving back (a cancel) rolls down. Reduced motion: a 200 ms cross-fade. Only the current label is DOM text; the
 * others are drawn from `data-l` and are `aria-hidden`, so the accessible name and `textContent` are just the current
 * label. Pure CSS (globals.css `.morph`): server-safe, and nothing animates on first paint.
 * ```tsx
 * <Button variant="primary" size="lg" block loading={phase !== "idle"} spinner="none">
 *   <Morph value={phase} labels={{ idle: copy.xfer.cta(account), busy: { label: copy.xfer.transferring, icon: LoaderCircle, spin: true }, done: { label: copy.xfer.steps.done, icon: CircleCheck } }} />
 * </Button>
 * ```
 */
export function Morph<K extends string>({ value, labels, className }: { value: K; labels: Readonly<Record<K, MorphLabel>>; className?: string }) {
  const keys = Object.keys(labels) as K[];
  const at = keys.indexOf(value);
  return (
    <span className={cx("morph", className)} data-morph={value}>
      {keys.map((k, i) => {
        const l = labels[k];
        const { label, icon, spin } = typeof l === "string" ? { label: l, icon: undefined, spin: false } : l;
        const glyph = icon ? <Icon icon={icon} size={spin ? 16 : 20} spin={spin} /> : null;
        return i === at ? (
          <span key={k} data-pos="current">
            {glyph}
            {label}
          </span>
        ) : (
          <span key={k} data-pos={i < at ? "before" : "after"} aria-hidden="true">
            {glyph}
            <span data-l={label} />
          </span>
        );
      })}
    </span>
  );
}

/* ── Pills, chips, badges ────────────────────────────────────────────────────────────────────────────────────────── */

const PILL_BASE = "inline-flex items-center gap-1.5 rounded-pill bg-surface-sunken font-sans font-semibold whitespace-nowrap";
const PILL_SIZE = { md: "py-1.25 pr-2.75 pl-2.25 text-caption", sm: "px-2 py-0.75 text-[0.75rem] leading-4" } as const;

/** A state pill: a 14 px icon and one word in the state colour, on sunken (§4.4). Not interactive; never on coral. */
export function Pill({
  tone,
  icon,
  spin = false,
  size = "md",
  className,
  children,
  ...rest
}: { tone: Tone; icon: LucideIcon; spin?: boolean; size?: "md" | "sm"; className?: string; children: ReactNode } & Omit<ComponentProps<"span">, "children">) {
  return (
    <span className={cx(PILL_BASE, PILL_SIZE[size], TONE_TEXT[tone], className)} {...rest}>
      <Icon icon={icon} size={14} spin={spin} />
      {children}
    </span>
  );
}

export type PillKind = SatchelStatus | "sold" | "transferred" | "bought";

const PILL: Record<PillKind, { word: string; icon: LucideIcon; tone: Tone; spin?: boolean }> = {
  active: { word: copy.pill.active, icon: Check, tone: "success" },
  signing: { word: copy.pill.signing, icon: LoaderCircle, tone: "frozen", spin: true },
  listed: { word: copy.pill.listed, icon: Snowflake, tone: "frozen" },
  needs_attention: { word: copy.pill.needs_attention, icon: TriangleAlert, tone: "danger" },
  sold: { word: copy.pill.sold, icon: Handshake, tone: "muted" },
  transferred: { word: copy.pill.transferred, icon: CircleCheck, tone: "success" },
  bought: { word: copy.pill.bought, icon: CircleCheck, tone: "success" },
};

/**
 * The Satchel's own state: icon + word, never colour alone (Active, Signing, Paused for sale, Needs attention, Sold,
 * Given, Bought). `data-status` carries the state for tests.
 */
export function StatusPill({ status, size = "md", className }: { status: PillKind; size?: "md" | "sm"; className?: string }) {
  const p = PILL[status];
  return (
    <Pill tone={p.tone} icon={p.icon} spin={p.spin} size={size} className={className} data-status={status}>
      {p.word}
    </Pill>
  );
}

const ITEM: Record<ItemStatus | "checking", { word: string; icon: LucideIcon; tone: Tone; spin?: boolean }> = {
  spent: { word: copy.clean.item.settled, icon: Check, tone: "success" },
  expired: { word: copy.clean.item.expired, icon: Clock, tone: "success" },
  unfunded: { word: copy.clean.item.unfunded, icon: Info, tone: "muted" },
  foreign: { word: copy.clean.item.foreign, icon: Info, tone: "muted" },
  settling: { word: copy.clean.item.settling, icon: Hourglass, tone: "frozen" },
  unused: { word: copy.clean.item.unused, icon: TriangleAlert, tone: "danger" },
  unknown: { word: copy.clean.item.unknown, icon: CircleQuestionMark, tone: "muted" },
  checking: { word: copy.clean.item.checking, icon: LoaderCircle, tone: "frozen", spin: true },
};

/** A clean-history item: Used, Expired, Unfunded, Not its coin, Confirming, Unused, Can't verify or Checking…
 * (`data-item-status`). */
export function ItemPill({ status, className }: { status: ItemStatus | "checking"; className?: string }) {
  const p = ITEM[status];
  return (
    <Pill tone={p.tone} icon={p.icon} spin={p.spin} className={className} data-item-status={status}>
      {p.word}
    </Pill>
  );
}

const DOT: Record<UiChain, string> = { btc: "bg-chain-btc", evm: "bg-chain-evm", sol: "bg-chain-sol" };

/** A chain's colour dot: 8 px in chips and pills, 12 px in chain rows. Colour never carries meaning alone. */
export function ChainDot({ chain, size = 8 }: { chain: UiChain; size?: 8 | 12 }) {
  return <span aria-hidden="true" className={cx("inline-block shrink-0 rounded-full", size === 8 ? "size-2" : "size-3", DOT[chain])} />;
}

/** A chip: sunken, caption, tabular ("BTC 0.0412"). `chain` leads it with the chain's dot. */
export function Chip({ children, chain, className }: { children: ReactNode; chain?: UiChain; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-sm bg-surface-sunken px-2.5 py-1.5 font-sans text-caption whitespace-nowrap text-ink t-num", className)}>
      {chain ? <ChainDot chain={chain} /> : null}
      {children}
    </span>
  );
}

/** A filter chip (Market): 36 tall inside a 44 target; selected is inverse, with `aria-pressed`. Client usage. */
export function FilterChip({ pressed, className, children, ...rest }: Omit<ComponentProps<"button">, "aria-pressed"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(
        "my-1 inline-flex min-h-9 items-center gap-1.5 rounded-pill border-2 border-transparent bg-surface-sunken px-3.5 font-sans text-caption font-semibold whitespace-nowrap text-ink hover:border-line-strong aria-pressed:bg-inverse aria-pressed:text-on-inverse",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const BADGE_WORD = { new: copy.card.new, yours: copy.card.yours, testnet: copy.app.badge } as const;

/**
 * A badge, the lemon sticker (2 px constant ink outline, no drop; text on lemon is always `on-brand`): **Yours** (the
 * "you own this" mark, tilted −4°, `data-yours`), **New** (+3°) and **Testnet** (the header). The tilt sits on
 * `transform`, so a stick-on motion can animate the individual `rotate` property (motion-spec §3).
 */
export function Badge({
  kind,
  tone = "lemon",
  className,
  children,
  ...rest
}: { kind: keyof typeof BADGE_WORD; tone?: "lemon" | "sky"; className?: string; children?: ReactNode } & Omit<ComponentProps<"span">, "children">) {
  return (
    <span
      data-yours={kind === "yours" ? "" : undefined}
      className={cx(
        "inline-flex flex-none items-center gap-1 rounded-pill border-2 border-on-brand px-2.25 py-px font-sans text-badge whitespace-nowrap text-on-brand",
        tone === "lemon" ? "bg-lemon" : "bg-sky",
        kind === "yours" && "transform-[rotate(-4deg)]",
        kind === "new" && "transform-[rotate(3deg)]",
        className,
      )}
      {...rest}
    >
      {children ?? BADGE_WORD[kind]}
    </span>
  );
}

/* ── Banner ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const BANNER_TONE = { success: "text-success", frozen: "text-frozen", danger: "text-danger", neutral: "text-ink" } as const;

/**
 * An inline banner: flat, sunken, a 20 px icon and a label title in the tone colour, the body in ink, at most one
 * action, no tints (§4.9). `role="status"` only for changes the user caused.
 */
export function Banner({
  icon,
  tone,
  title,
  children,
  action,
  role,
  id,
  titleAs: T = "h3",
  className,
}: {
  icon: LucideIcon;
  tone: keyof typeof BANNER_TONE;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: string;
  id?: string;
  titleAs?: "h2" | "h3" | "p";
  className?: string;
}) {
  const color = BANNER_TONE[tone];
  return (
    <section role={role} aria-labelledby={id ? `${id}-title` : undefined} id={id} className={cx("flex items-start gap-3 rounded-md bg-surface-sunken p-4 text-ink", className)}>
      <Icon icon={icon} size={20} className={cx("mt-0.5", color)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <T id={id ? `${id}-title` : undefined} className={cx("font-sans text-label", color)}>
          {title}
        </T>
        {children ? <div className="text-body text-ink">{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </section>
  );
}

/* ── Segmented control and route tabs ────────────────────────────────────────────────────────────────────────────── */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** A leading graphic instead of an icon (a 20 px ChainCharm in the chain picker). */
  lead?: ReactNode;
}

const SEG_TRACK = "rounded-pill bg-surface-sunken";
/** `block`: equal columns at full width; otherwise as wide as its options (never stretched by a flex column). */
const segTrack = (block: boolean) => cx(SEG_TRACK, block ? "grid w-full auto-cols-fr grid-flow-col" : "inline-flex w-fit max-w-full");
const SEG_OPT =
  "relative isolate inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill font-sans font-semibold whitespace-nowrap transition-colors duration-120 before:absolute before:inset-1 before:-z-10 before:rounded-pill before:content-['']";
const segSize = (size: "md" | "sm") => (size === "sm" ? "px-3 text-[0.875rem] leading-5" : "px-3.5 text-label");
const segState = (on: boolean) => (on ? "text-on-inverse before:bg-inverse" : "text-ink-muted hover:text-ink");

/**
 * A segmented control (§4.5): a radiogroup whose arrow keys move and select (Home and End too), 44 tall, the selected
 * option an inverse pill (never coral). Client usage (it needs `onChange`). `block` makes equal columns at full width.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  labelledBy,
  size = "md",
  block = false,
  className,
  optionAttr,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The group's name, unless `labelledBy` points at a visible label. */
  label?: string;
  labelledBy?: string;
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
  /** Adds `data-<optionAttr>={value}` on each option (tests: `data-theme-option`, `data-chain-select`). */
  optionAttr?: string;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = options.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} className={cx(segTrack(block), className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            {...(optionAttr ? { [`data-${optionAttr}`]: o.value } : {})}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(SEG_OPT, segSize(size), segState(on))}
          >
            {o.icon ? <Icon icon={o.icon} size={16} /> : null}
            {o.lead}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The segmented look for route-driven choices (APP-COMPONENTS #4; e.g. Add coins' chain): links, the current one
 * `aria-current="page"` and inverse. Server-safe.
 */
export function SegmentedLinks({
  label,
  options,
  size = "md",
  block = false,
  className,
}: {
  label: string;
  options: readonly { href: string; label: string; current: boolean; lead?: ReactNode; icon?: LucideIcon; replace?: boolean }[];
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx(segTrack(block), className)}>
      {options.map((o) => (
        <Link key={o.href} href={o.href} replace={o.replace} aria-current={o.current ? "page" : undefined} className={cx(SEG_OPT, "no-underline", segSize(size), segState(o.current))}>
          {o.icon ? <Icon icon={o.icon} size={16} /> : null}
          {o.lead}
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Route tabs (`/s/[id]`: Wallet · Activity · Sale): links with `aria-current="page"`, a 1 px line under the list, the
 * current tab bold with a 3 px `brand-line` underline (§4.5). Server-safe.
 */
export function RouteTabs({
  label,
  tabs,
  className,
}: {
  label: string;
  tabs: readonly { href: string; label: ReactNode; current: boolean; prefetch?: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx("flex gap-5 overflow-x-auto border-b border-line scrollbar-none", className)}>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          prefetch={t.prefetch}
          aria-current={t.current ? "page" : undefined}
          className={cx(
            "inline-flex min-h-11 min-w-11 shrink-0 items-stretch font-sans text-label whitespace-nowrap no-underline focus-visible:-outline-offset-2",
            t.current ? "font-bold text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {/* the 3 px underline stays under the label while the target is at least 44 px wide ("Buy", "Sell") */}
          <span className={cx("inline-flex items-center px-0.5", t.current && "shadow-[inset_0_-3px_0_var(--brand-line)]")}>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ── Inputs (visual primitives; the flows keep their logic) ──────────────────────────────────────────────────────── */

/** The ids a field's input points at with `aria-describedby`. */
export function fieldIds(id: string) {
  return { help: `${id}-help`, error: `${id}-error` };
}

/** `aria-describedby` for an input in a `Field`: its error first, then its help. */
export function describedBy(id: string, { help, error }: { help?: unknown; error?: unknown }) {
  const ids = [error ? `${id}-error` : null, help ? `${id}-help` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/**
 * A labelled field: a 15/20 label, gap 6, the control, then help (ink-muted) and the error (danger, a 16 px
 * triangle-alert, `role="alert"`). Give the control `id`, and `aria-describedby={describedBy(id, { help, error })}`.
 */
export function Field({
  id,
  label,
  help,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ids = fieldIds(id);
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-sans text-label text-ink">
        {label}
      </label>
      {children}
      {help ? (
        <p id={ids.help} className="font-sans text-body-sm text-ink-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
          <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const INPUT =
  "min-h-13 w-full rounded-sm border-2 border-line-strong bg-surface-sunken px-3.5 py-3 text-body text-ink placeholder:text-ink-muted hover:border-ink-muted aria-invalid:border-danger disabled:border-line disabled:bg-disabled disabled:text-on-disabled";

/** A text input, 52 tall, sunken with a 2 px line-strong border; `mono` for NEAR accounts and addresses (16 px). */
export function TextInput({ mono = false, invalid = false, className, ...rest }: ComponentProps<"input"> & { mono?: boolean; invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cx(INPUT, mono ? "font-mono font-[450]" : "font-sans", className)} {...rest} />;
}

/**
 * The amount group (§4.6): the value in Funnel 38/42 tabular with `inputmode="decimal"`, its ticker, an optional Max
 * (`maxButton`: a `Button variant="link"`) and the "Available …" line. `align="center"` is Send's hero amount, with the
 * ticker right after the number.
 */
export function AmountInput({
  ticker,
  available,
  maxButton,
  invalid = false,
  align = "start",
  className,
  ...rest
}: Omit<ComponentProps<"input">, "type"> & { ticker: string; available?: ReactNode; maxButton?: ReactNode; invalid?: boolean; align?: "start" | "center" }) {
  const center = align === "center";
  return (
    <div
      className={cx(
        "relative flex flex-col gap-2 rounded-md border-2 bg-surface-sunken p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        invalid ? "border-danger" : "border-line-strong",
        center && "items-center px-4 pt-5 pb-4 text-center",
        className,
      )}
    >
      {/* the whole box is the input's target (a centred, content-sized input can be 22 px wide while empty): an empty
          label under the content focuses it, adds nothing to its accessible name, and lets taps on the ticker and the
          blank space through to it; only the input and the buttons keep their own pointer events */}
      {rest.id ? <label htmlFor={rest.id} aria-hidden="true" className="absolute inset-0 cursor-text rounded-[inherit]" /> : null}
      <div className={cx("pointer-events-none relative flex w-full items-baseline gap-2.5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto", center && "justify-center gap-2")}>
        <input
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          className={cx(
            "min-h-11 border-0 bg-transparent p-0 font-display text-balance-hero-sm text-ink t-num placeholder:text-ink-muted focus-visible:outline-none",
            center ? "max-w-full min-w-[1ch] flex-none text-right field-sizing-content" : "min-w-0 flex-1",
          )}
          {...rest}
        />
        {/* proto .amount--hero: the hero's ticker is Funnel 800 22/26, right after the number */}
        <span className={cx("text-ink-muted", center ? "font-display text-[1.375rem] leading-[1.625rem] font-extrabold tracking-[-0.02em]" : "font-sans text-label")}>{ticker}</span>
        {maxButton}
      </div>
      {available ? <span className="pointer-events-none relative font-sans text-body-sm text-ink-muted t-num [&_a]:pointer-events-auto [&_button]:pointer-events-auto">{available}</span> : null}
    </div>
  );
}

/* ── Rows ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A list: a flat panel (radius 18, `overflow-hidden`), or `bare` for dividers only. Holds `Row`s. */
export function List({ bare = false, className, children, ...rest }: ComponentProps<"ul"> & { bare?: boolean }) {
  return (
    <ul className={cx(!bare && "overflow-hidden rounded-md border border-line bg-surface", className)} {...rest}>
      {children}
    </ul>
  );
}

const ROW =
  "relative flex w-full items-center gap-3 px-4 py-3 text-left no-underline in-[li+li]:before:absolute in-[li+li]:before:inset-x-4 in-[li+li]:before:top-0 in-[li+li]:before:h-px in-[li+li]:before:bg-line";

/**
 * A row (§4.7): lead (a 12 px dot, 32 charm, avatar or thumb), title and meta, trail amount and sub, a chevron when it
 * navigates. A divider (1 px, inset 16) between rows. `href` or `onClick` make it interactive (hover and press
 * sunken, an inset focus ring); `current` takes the selected fill and `aria-current`.
 */
export function Row({
  lead,
  title,
  meta,
  trail,
  sub,
  href,
  onClick,
  chevron,
  current = false,
  className,
}: {
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trail?: ReactNode;
  sub?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  current?: boolean;
  className?: string;
}) {
  const interactive = Boolean(href || onClick);
  const cls = cx(
    ROW,
    meta ? "min-h-16" : "min-h-14",
    interactive && "cursor-pointer hover:bg-surface-sunken active:bg-surface-sunken focus-visible:-outline-offset-2",
    current && "bg-selected",
    className,
  );
  const inner = (
    <>
      {lead ? <span className="flex flex-none items-center">{lead}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-sans text-body text-ink">{title}</span>
        {meta ? <span className="font-sans text-body-sm text-ink-muted">{meta}</span> : null}
      </span>
      {trail || sub ? (
        <span className="flex flex-none flex-col items-end text-right">
          {trail ? <span className="font-sans text-label font-bold text-ink t-num">{trail}</span> : null}
          {sub ? <span className="font-sans text-body-sm text-ink-muted">{sub}</span> : null}
        </span>
      ) : null}
      {chevron ? <Icon icon={ChevronRight} size={20} className="text-ink-muted" /> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} aria-current={current ? "page" : undefined} className={cls}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-current={current || undefined} className={cls}>
          {inner}
        </button>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}

/* ── Feedback: skeleton, empty state, tracker ────────────────────────────────────────────────────────────────────── */

/**
 * A static placeholder (no shimmer), only for client-only data, never for judge facts. `line` is a 12 px text line;
 * blocks take the radius of what they replace (pass a `rounded-*` class; 6 px otherwise).
 */
export function Skeleton({ line = false, className }: { line?: boolean; className?: string }) {
  return <span aria-hidden="true" className={cx("block bg-skeleton", !/\brounded-/.test(className ?? "") && "rounded-[6px]", line && "h-3", className)} />;
}

/**
 * An empty state (§4.10): the illustration on a sky sticker panel (the charm S for "no Satchels", 404 and errors; the
 * chain charms on their strap for an empty wallet and onboarding), a heading, a muted body and one action (plus an
 * optional link under it).
 */
export function EmptyState({
  art = "charm",
  artSize = 96,
  title,
  body,
  action,
  secondary,
  headingLevel = 2,
  className,
}: {
  art?: "charm" | "charms" | ReactNode;
  /** The charm S's height: 96 for a page's own empty state, 72–80 inside a tab or a list (proto `.empty__art`). */
  artSize?: number;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  headingLevel?: 1 | 2 | 3;
  className?: string;
}) {
  const H = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div className={cx("mx-auto flex max-w-90 flex-col items-center gap-3 text-center", className)}>
      {/* The charm S sits on a wide, flat sky capsule: a square sky sticker tile would read as a recoloured logo tile,
          which the brand forbids (logo rules), and the S is already the sticker. The chain charms keep their panel. */}
      <div aria-hidden="true" className={cx("mb-2 bg-sky", art === "charms" ? "rounded-card sticker px-5.5 pt-4.5 pb-5.5" : "rounded-pill px-12 py-3")}>
        {art === "charm" ? <Charm height={artSize} /> : art === "charms" ? <ChainCharms width={168} layout="strap" /> : art}
      </div>
      <H className="font-display text-heading text-ink">{title}</H>
      {body ? <p className="font-sans text-body text-ink-muted">{body}</p> : null}
      {action}
      {secondary}
    </div>
  );
}

export type TrackerState = "done" | "active" | "future" | "failed" | "unknown";

function TrackerMark({ state }: { state: TrackerState }) {
  if (state === "active")
    return (
      <span className="grid size-6 place-items-center text-frozen">
        <LoaderCircle size={24} strokeWidth={STROKE} aria-hidden="true" className="animate-spin motion-reduce:hidden" />
        <CircleDot size={24} strokeWidth={STROKE} aria-hidden="true" className="hidden motion-reduce:block" />
      </span>
    );
  const [I, color] =
    state === "done" ? [CircleCheck, "text-success"] : state === "failed" ? [CircleX, "text-danger"] : state === "unknown" ? [CircleQuestionMark, "text-ink-muted"] : [CircleDashed, "text-line-strong"];
  return <Icon icon={I} size={24} className={color} />;
}

/**
 * The progress tracker (§4.10; SigningProgress keeps its logic): an `ol` of honest milestones, never a percentage. A
 * 24 px marker column with a 2 px connector (success once done); the active step is `aria-current="step"`, semibold,
 * with a spinner (a static dot under reduced motion). `trail` holds a step's time or m:ss timer.
 */
export function Tracker({
  steps,
  label,
  className,
}: {
  steps: readonly { label: ReactNode; state: TrackerState; meta?: ReactNode; trail?: ReactNode; key?: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cx("flex flex-col", className)}>
      {steps.map((s, i) => (
        <li
          key={s.key ?? i}
          data-state={s.state}
          aria-current={s.state === "active" ? "step" : undefined}
          className={cx(
            "relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0",
            "before:absolute before:top-7 before:bottom-1 before:left-2.75 before:w-0.5 before:content-[''] last:before:hidden",
            s.state === "done" ? "before:bg-success" : "before:bg-line-strong",
          )}
        >
          <TrackerMark state={s.state} />
          <span className={cx("flex items-baseline justify-between gap-3 font-sans text-body", s.state === "active" ? "font-semibold text-ink" : s.state === "done" ? "text-ink" : "text-ink-muted")}>
            <span className="min-w-0">{s.label}</span>
            {s.trail ? <span className="shrink-0 text-body-sm font-normal text-ink-muted t-num">{s.trail}</span> : null}
          </span>
          {s.meta ? <span className="col-start-2 font-sans text-body-sm text-ink-muted">{s.meta}</span> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Text in which every token shortened with an ellipsis ("tb1qaanv…y8sd", "0x53f9…1c2a") moves to the next line whole
 * rather than splitting: browsers may break right after "…". Each token is an inline block no wider than the line, so on
 * a line too narrow even for the token alone it still wraps inside rather than overflowing. The text is unchanged.
 */
export function KeepWhole({ text }: { text: string }) {
  const parts = text.split(/(\S*…\S*)/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="inline-block max-w-full">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

/* ── Links, avatar, chain marks ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * An external link: opens in a new tab, says so to screen readers, and wears a 14 px arrow. The label and the arrow are
 * one inline run, so when a long link wraps the arrow stays after its last word (never stranded at the far edge).
 */
export function ExternalLink({ href, children, className, ...rest }: ComponentProps<"a">) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cx("inline-flex items-center text-link underline decoration-1 underline-offset-3 hover:decoration-2", className)} {...rest}>
      <span className="min-w-0">
        {children}
        <ArrowUpRight size={14} strokeWidth={STROKE} aria-hidden="true" className="ml-1 inline-block align-[-0.125em]" />
      </span>
      <span className="sr-only">{copy.a11y.newTab}</span>
    </a>
  );
}

/** An account's avatar: a sky disc with its initial (Funnel 800, on-brand) and a 2 px ink edge. Decorative. */
export function Avatar({ account, size = 32, className }: { account: string; size?: 20 | 28 | 32 | 40 | 44; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full border-on-brand bg-sky font-display leading-none font-extrabold text-on-brand",
        size <= 20 ? "border-[1.5px]" : "border-2",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {(account.slice(0, 1) || "?").toUpperCase()}
    </span>
  );
}

/**
 * The 40×25 card thumbnail: coral top, ink seam, surface body, a 1.5 px sticker outline. For row
 * leads, the compact header and flow sheet heads. `width` scales it (the height keeps 1.6:1). Decorative.
 */
export function SatchelThumb({ width = 40, className }: { width?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block shrink-0 rounded-[5px] border-[1.5px] border-sticker align-middle", className)}
      style={{
        width,
        height: Math.round(width / 1.6),
        background: "linear-gradient(var(--brand) 0 32%, var(--sticker-line) 32% calc(32% + 1.5px), var(--surface) 0)",
      }}
    />
  );
}

/* ── Overlays: the flow panel and the toast (their behaviour lives in client/FlowShell and client/Toaster) ─────────── */

export interface FlowHead {
  title: string;
  /** Input steps only ("Step 1 of 2"); guards, trackers and outcomes show none. */
  step?: { index: number; count: number };
  /** A short line under the title, before the step: "From Satchel #1". */
  meta?: string;
  /** Shows the 40×25 card thumb beside the title, so the sheet shows the object first when it has no card of its own. */
  thumb?: boolean;
  /** `title` (30/34) for task flows (Send, Give, Sell, Mint); `confirm` (20/26) for confirms and guards. */
  titleSize?: "title" | "confirm";
  closeHref: string;
  minimize?: boolean;
  children: ReactNode;
  /** The pinned foot: the primary, with any second action stacked under it at 390. */
  action?: ReactNode;
  /**
   * Opt-in (F2, for X): below 768 px the sheet takes its full height (`100dvh − 16px`), so a flow whose steps differ
   * in height keeps its top edge still (app-screens §1.2, MOTION-NOTES #5); the body scrolls and the foot stays pinned.
   * The 480 dialog from 768 px is unchanged. Leave it off for short sheets (guards fit their content).
   */
  fill?: boolean;
}

const PANEL_SHAPE = {
  auto: "max-h-[calc(100dvh-16px)] rounded-t-card border-b-0 md:max-h-[calc(100dvh-96px)] md:rounded-card md:border-b",
  sheet: "max-h-[calc(100dvh-16px)] rounded-t-card border-b-0",
  dialog: "max-h-[calc(100dvh-96px)] rounded-card",
} as const;

/**
 * The flow sheet's look (§4.8): the overlay recipe (surface, overlay shadow, a 1 px edge in Night), the decorative
 * grabber, the head (thumb, title, meta and step, a 44 px close), the scrolling body (its children never shrink) and
 * the pinned foot (a top line once content scrolls under it). `layout="auto"` is a bottom sheet below 768 px and a
 * centred 480 px dialog from 768; `sheet` and `dialog` force one look. FlowShell places it (`placement="fixed"`) and
 * gives it behaviour; `placement="static"` draws it in the page flow (the dev gallery).
 */
export function FlowPanel({
  title,
  step,
  meta,
  thumb = false,
  titleSize = "title",
  closeHref,
  minimize = false,
  children,
  action,
  fill = false,
  layout = "auto",
  placement = "fixed",
  titleId = "flow-title",
  scrolled = false,
  onCloseClick,
  panelRef,
  titleRef,
  bodyRef,
  footRef,
}: FlowHead & {
  layout?: keyof typeof PANEL_SHAPE;
  placement?: "fixed" | "static";
  titleId?: string;
  scrolled?: boolean;
  onCloseClick?: (e: MouseEvent) => void;
  panelRef?: Ref<HTMLDivElement>;
  titleRef?: Ref<HTMLHeadingElement>;
  bodyRef?: Ref<HTMLDivElement>;
  footRef?: Ref<HTMLDivElement>;
}) {
  const fixed = placement === "fixed";
  const sheetPad = "pb-[calc(16px+env(safe-area-inset-bottom))]";
  const stepLine = [meta, step ? copy.app.step(step.index, step.count) : null].filter(Boolean).join(" · ");
  return (
    <div
      ref={panelRef}
      role={fixed ? "dialog" : "group"}
      aria-modal={fixed ? "true" : undefined}
      aria-labelledby={titleId}
      data-fill={fill && layout !== "dialog" ? "" : undefined}
      className={cx(
        "flex flex-col border border-overlay-edge bg-surface text-ink shadow-overlay",
        PANEL_SHAPE[layout],
        fixed ? "fixed inset-x-0 bottom-0 z-61" : "relative mx-auto w-full max-w-flow",
        fixed && layout === "auto" && "md:inset-0 md:m-auto md:h-fit md:w-flow",
        // fill: a fixed sheet takes the viewport's height (md:h-fit above keeps the dialog fitted); a static one, its frame's
        fill && layout !== "dialog" && (fixed ? "h-[calc(100dvh-16px)]" : layout === "auto" ? "h-full md:h-auto" : "h-full"),
      )}
    >
      {layout !== "dialog" ? <div aria-hidden="true" className={cx("mx-auto mt-2 h-1.25 w-10 flex-none rounded-[3px] bg-line-strong", layout === "auto" && "md:hidden")} /> : null}
      <header className={cx("flex flex-none items-start gap-2 px-5 pb-2", layout === "dialog" ? "pt-5" : layout === "sheet" ? "pt-4" : "pt-4 md:pt-5")}>
        {thumb ? <SatchelThumb className="mt-3.25" /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1.5">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className={cx("m-0 font-display text-ink outline-none", titleSize === "title" ? "text-title" : "text-heading")}>
            {title}
          </h2>
          {stepLine ? <p className="font-sans text-body-sm text-ink-muted">{stepLine}</p> : null}
        </div>
        <Link
          href={closeHref}
          replace
          aria-label={minimize ? copy.sign.minimize : copy.sign.close}
          onClick={onCloseClick}
          className="inline-grid size-11 flex-none place-items-center rounded-pill text-ink transition-[scale,background-color] duration-120 hover:bg-surface-sunken active:scale-[.96] active:bg-surface-sunken"
          data-testid="flow-close"
        >
          <Icon icon={minimize ? Minimize2 : X} size={20} />
        </Link>
      </header>
      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5 *:shrink-0">
        {children}
      </div>
      {action ? (
        <div
          ref={footRef}
          data-scrolled={scrolled ? "" : undefined}
          className={cx(
            "flex-none border-t border-transparent bg-surface px-5 pt-4 data-scrolled:border-line",
            layout === "dialog" ? "rounded-b-card pb-5" : layout === "sheet" ? sheetPad : `${sheetPad} md:rounded-b-card md:pb-5`,
          )}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** A toast's tone: success (default) · progress (a spinner: "Still signing") · neutral (undo: your own cancel,
 * "Stopped selling") · info · warning · danger. The icon carries the state, never colour alone. */
export type ToastTone = "success" | "progress" | "neutral" | "info" | "warning" | "danger";

const TOAST_TONE: Record<ToastTone, { icon: LucideIcon; color: string; spin?: boolean }> = {
  success: { icon: CircleCheck, color: "text-success" },
  progress: { icon: LoaderCircle, color: "text-frozen", spin: true },
  neutral: { icon: Undo2, color: "text-ink-muted" },
  info: { icon: Info, color: "text-ink-muted" },
  warning: { icon: TriangleAlert, color: "text-danger" },
  danger: { icon: CircleX, color: "text-danger" },
};

/** The toast's look (§4.9): brand-soft, a 2 px sticker, radius 18, a 20 px state icon and five words or fewer. */
export function ToastView({ tone = "success", children, className, ...rest }: { tone?: ToastTone; children: ReactNode; className?: string } & Omit<ComponentProps<"div">, "children">) {
  const t = TOAST_TONE[tone];
  return (
    <div data-tone={tone} className={cx("pointer-events-auto inline-flex items-center gap-2 rounded-md bg-toast px-4 py-3 font-sans text-label text-ink sticker-sm", className)} {...rest}>
      <Icon icon={t.icon} size={20} spin={t.spin} className={t.color} />
      {children}
    </div>
  );
}
