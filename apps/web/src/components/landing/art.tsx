import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChainCharm, Charm } from "@/components/brand";
import { cx, STROKE } from "@/components/ui";
import { NBSP } from "@/lib/format";

/**
 * The landing's illustration pieces (design-spec §2.3, §4.0): the product's own UI, the Satchel card, its state pill, the
 * lemon stickers and the paper slips, drawn by landing.css (`.lp-*`). Every label is an attribute (`data-l`) that CSS
 * draws, so the server text layer holds only copy, and every illustration sits in an `aria-hidden` box whose meaning a
 * visually hidden description (or the section's own copy) carries. Server components; nothing here is interactive.
 */

/** `data-*` attributes for the motion hooks (`data-k`) and tests. */
export type DataAttrs = { [key: `data-${string}`]: string | undefined };

/** An illustration label: CSS draws `data-l` (`.lp-l::before`), so it never enters the text layer. */
export function Lbl({ l, className, ...rest }: { l: string; className?: string; "aria-hidden"?: "true" } & DataAttrs) {
  return <span className={cx("lp-l", className)} data-l={l} {...rest} />;
}

/** A Lucide icon at the brand's stroke inside an illustration (sized by landing.css). */
export function ArtIcon({ icon: I, className }: { icon: LucideIcon; className?: string }) {
  return <I className={className} strokeWidth={STROKE} aria-hidden="true" focusable="false" />;
}

/** A chain charm (a coin with a face), boxed so the motion can stick it on without touching the SVG. */
export function Coin({ chain, mood = "happy", className, ...data }: { chain: "btc" | "evm" | "sol"; mood?: "happy" | "sad"; className?: string } & DataAttrs) {
  return (
    <span className={cx("lp-coin", className)} {...data}>
      <ChainCharm chain={chain} mood={mood} size={28} />
    </span>
  );
}

/** "0.05 BTC" (a no-break space before the ticker, as the deck writes it) → ["0.05", "BTC"]. */
export function amountParts(s: string): [string, string] {
  const i = s.lastIndexOf(NBSP);
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
}

/**
 * One row of the card's charm ledger: the charm, the amount (Funnel 800, tabular) and the ticker. `zero` greys the
 * amount, as SatchelCard does. `k` names the row's moving pieces for the hero loop (`coin-btc`, `amt-btc`, `tick-btc`).
 */
export function CoinRow({ chain, value, zero, mood, k }: { chain: "btc" | "evm"; value: string; zero?: boolean; mood?: "happy" | "sad"; k?: string }) {
  const [amount, ticker] = amountParts(value);
  return (
    <li className="lp-card__coin" data-zero={zero ? "" : undefined}>
      <Coin chain={chain} mood={mood} data-k={k && `coin-${k}`} />
      <Lbl l={amount} className="lp-card__amt" data-k={k && `amt-${k}`} />
      <Lbl l={ticker} className="lp-card__tick" data-k={k && `tick-${k}`} />
    </li>
  );
}

/**
 * The Satchel card as an illustration (SatchelCard's look: the coral band with the name, a sticker and the charm S; the
 * charm ledger; the state pill), sized by its own width through container queries like the real card.
 */
export function ArtCard({
  name,
  badge,
  children,
  foot,
  className,
  style,
  ...data
}: { name: string; badge?: ReactNode; children: ReactNode; foot?: ReactNode; className?: string; style?: CSSProperties } & DataAttrs) {
  return (
    <div className={cx("lp-card", className)} style={style} {...data}>
      <div className="lp-card__band">
        <Lbl l={name} className="lp-card__name" />
        {badge}
        <Charm height={30} className="lp-card__charm" />
      </div>
      <div className="lp-card__body">
        <ul className="lp-card__inside">{children}</ul>
        {foot ? <div className="lp-card__foot">{foot}</div> : null}
      </div>
    </div>
  );
}

/** A state pill (icon + word; `ui.tsx` Pill's look): success, frozen, danger. */
export function ArtPill({
  tone,
  icon,
  l,
  className,
  ...data
}: { tone: "success" | "frozen" | "danger"; icon: LucideIcon; l: string; className?: string; "aria-hidden"?: "true" } & DataAttrs) {
  return (
    <span className={cx("lp-pill", `lp-pill--${tone}`, className)} {...data}>
      <ArtIcon icon={icon} />
      <Lbl l={l} />
    </span>
  );
}

/** A lemon sticker on the band: Yours (−4°) or New (+3°). */
export function ArtBadge({ kind, l, ...data }: { kind: "yours" | "new"; l: string } & DataAttrs) {
  return <Lbl l={l} className={cx("lp-badge", `lp-badge--${kind}`)} {...data} />;
}

/** A small round avatar with one letter (the owner chips: "B" for Buyer, "N" for New owner). */
export function Initial({ of }: { of: string }) {
  return <Lbl l={of.trim().charAt(0).toUpperCase()} className="lp-avatar" />;
}
