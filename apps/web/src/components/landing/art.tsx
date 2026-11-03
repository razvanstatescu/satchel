import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChainCharm, Charm } from "@/components/brand";
import { cx, STROKE } from "@/components/ui";
import { NBSP, shareText, usdText } from "@/lib/format";
import { copy, TICKER } from "@/lib/copy";

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

/** A coin's share of the mix (D-50): `copy.landing.desk.mix`'s shape. */
export type MixEntry = { ticker: string; share: number };

/** A mix ticker's chain code (the chip's charm and the bar segment's colour, `data-coin`; `ChainCharm`'s "evm", never
 * "eth"). `USDC` has no chain charm at these widths (it never gets a chip, only "+N"), but it still fills a bar
 * segment in `--sky` (`COIN_FILL.USDC`, app-true). */
const CHAIN: Record<string, "btc" | "evm" | "sol" | "usdc"> = { BTC: "btc", ETH: "evm", SOL: "sol", USDC: "usdc" };
/** The same ticker as the hero loop's `data-k` suffix (`timeline.ts`'s `Coin`/`Seg` types: "btc" | "eth" | "sol" |
 * "usdc", never "evm"). */
const KEY: Record<string, "btc" | "eth" | "sol" | "usdc"> = { BTC: "btc", ETH: "eth", SOL: "sol", USDC: "usdc" };
const CHARM: Record<string, "btc" | "evm" | "sol"> = { BTC: "btc", ETH: "evm", SOL: "sol" };

/**
 * The Satchel card as an illustration (SatchelCard's look: the coral band with the name, a sticker and the charm S;
 * the overview body), sized by its own width through container queries like the real card.
 */
export function ArtCard({
  name,
  badge,
  children,
  className,
  style,
  ...data
}: { name: string; badge?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties } & DataAttrs) {
  return (
    <div className={cx("lp-card", className)} style={style} {...data}>
      <div className="lp-card__band">
        <Lbl l={name} className="lp-card__name" />
        {badge}
        <Charm height={30} className="lp-card__charm" />
      </div>
      <div className="lp-card__body">{children}</div>
    </div>
  );
}

/**
 * The card's body (D-50, SatchelCard's `Contents`): "≈ $X" alone (site polish round, D-52: the landing presents the
 * product in mainnet terms, so no "at mainnet prices" label) beside the state pill, then the value bar and the coin
 * chips ("BTC 50%" · "ETH 25%" · "SOL 15%" · "+1", folding to "+2" below 352 px of card). Every label is drawn from an
 * attribute. `moving` adds the hero loop's `data-k` hooks (design-spec notes §2.3, §3.3); every other scene renders
 * the same markup still, so the loop's keys are the only difference.
 */
export function ArtOverview({ mix, usd, state, moving }: { mix: readonly MixEntry[]; usd: number; state?: ReactNode; moving?: boolean }) {
  const o = copy.overview;
  const k = (name: string) => (moving ? name : undefined);
  return (
    <>
      <div className="lp-card__head">
        <span className="lp-card__est" data-k={k("est")}>
          <Lbl l={o.estimate(usdText(usd))} className="lp-card__total" />
        </span>
        {state}
      </div>
      <div className="lp-card__ov">
        <span className="lp-bar">
          {mix.map((m) => (
            <span key={m.ticker} className="lp-bar__seg" data-coin={CHAIN[m.ticker]} style={{ flexGrow: m.share }} data-k={k(`seg-${KEY[m.ticker]}`)} />
          ))}
        </span>
        <ul className="lp-chips">
          {mix.slice(0, 3).map((m, i) => (
            <li key={m.ticker} className={cx("lp-chip", i === 2 && "lp-chip--3")}>
              <Coin chain={CHARM[m.ticker]} data-k={k(`coin-${KEY[m.ticker]}`)} />
              <span className="lp-chip__words" data-k={k(`tick-${KEY[m.ticker]}`)}>
                <Lbl l={m.ticker} className="lp-chip__tick" />
                <Lbl l={shareText(m.share)} className="lp-chip__share" />
              </span>
            </li>
          ))}
          <li className="lp-chips__more" data-k={k("more")}>
            <Lbl l={o.plus(mix.length - 3)} className="lp-chips__more-lg" />
            <Lbl l={o.plus(mix.length - 2)} className="lp-chips__more-md" />
          </li>
        </ul>
      </div>
    </>
  );
}

/** The empty card (How it works step 1, a fresh Satchel): "Nothing inside yet" and the three home coins (BTC, ETH,
 * SOL) as dimmed chips with no shares, no bar and no "+N". Unlike `ArtOverview`'s chips, none is marked `lp-chip--3`,
 * so all three show at every width (the app's layout hides the third below 352 px of card; §7 of the design notes). */
export function ArtEmpty() {
  return (
    <>
      <div className="lp-card__head">
        <Lbl l={copy.overview.empty} className="lp-card__empty" />
      </div>
      <ul className="lp-chips lp-chips--home">
        {(["btc", "evm", "sol"] as const).map((chain) => (
          <li key={chain} className="lp-chip">
            <Coin chain={chain} />
            <Lbl l={TICKER[chain]} className="lp-chip__tick" />
          </li>
        ))}
      </ul>
    </>
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
