import { CoinIcon, COIN_FILL } from "@/components/brand/CoinIcon";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import { NBSP } from "@/lib/format";
import { coinTotalText, shareText, usdText, type Overview } from "@/lib/overview";

/**
 * A Satchel at a glance (D-50; Mobbin: OKX's allocation bar, Crypto.com's shares, Family and Phantom's total-first
 * header): the labelled estimate, the value bar, the top coins. Server-safe and pure (it renders an `Overview`); the
 * callers pass the live one. Fiat appears here and nowhere else, always "≈" and "at mainnet prices".
 */

/** One bar, one segment per coin, in the coins' own artwork colours, sized by value; a sticker-outlined pill. */
export function ValueBar({ ov, className }: { ov: Overview; className?: string }) {
  if (ov.usd === null || ov.usd <= 0) return null;
  const label = copy.overview.barLabel(ov.coins.map((c) => `${c.ticker} ${shareText(c.share ?? 0)}`).join(", "));
  return (
    <div role="img" aria-label={label} data-value-bar="" className={cx("flex h-3 w-full overflow-hidden rounded-pill border-2 border-sticker bg-surface-sunken", className)}>
      {ov.coins.map((c, i) => (
        <span
          key={c.coin}
          data-share={c.coin}
          className={cx("h-full min-w-1.5", i > 0 && "border-l-2 border-sticker")}
          style={{ flexGrow: c.share ?? 0, flexBasis: 0, background: COIN_FILL[c.coin] }}
        />
      ))}
    </div>
  );
}

/** "≈ $1,148.72" with "at mainnet prices"; "6 coins on 5 networks" without prices; "Nothing inside yet" when empty. */
export function OverviewHeadline({ ov, size = "lg", className }: { ov: Overview; size?: "lg" | "md"; className?: string }) {
  const big = size === "lg" ? "text-balance-hero-sm" : "text-[1.375rem] leading-6.5 tracking-[-0.02em]";
  if (!ov.coins.length)
    return (
      <p data-overview-total="empty" className={cx("m-0 font-display font-extrabold text-ink-muted", big, className)}>
        {copy.overview.empty}
      </p>
    );
  if (ov.usd === null)
    return (
      <p data-overview-total="none" className={cx("m-0 font-display font-extrabold text-ink", big, className)}>
        {copy.overview.coinsOn(ov.coins.length, ov.networks)}
      </p>
    );
  return (
    <p data-overview-total={ov.usd.toFixed(2)} className={cx("m-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cx("font-display font-extrabold text-ink t-num", big)}>{copy.overview.estimate(usdText(ov.usd))}</span>
      <span className="font-sans text-body-sm text-ink-muted">{copy.overview.atPrices}</span>
    </p>
  );
}

/**
 * The Wallet tab's overview, above the holdings list: the estimate, the bar, then the top five coins (each summed over
 * every network and inside) with their amount and share, and "+N more" down to the full list.
 */
export function OverviewPanel({ ov, max = 5 }: { ov: Overview; max?: number }) {
  const top = ov.coins.slice(0, max);
  const more = ov.coins.length - top.length;
  const priced = ov.usd !== null;
  return (
    <section aria-label={priced ? copy.overview.listLabel : copy.overview.listLabelNoPrices} data-overview="" className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <OverviewHeadline ov={ov} />
        {!ov.coins.length ? (
          <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.overview.emptyBody}</p>
        ) : priced || ov.partial ? (
          <p className="m-0 font-sans text-body-sm text-ink-muted">
            {[priced ? copy.overview.coinsOn(ov.coins.length, ov.networks) : null, ov.partial ? copy.overview.partial : null].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <ValueBar ov={ov} />
      {top.length ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-x-5 gap-y-2.5 p-0 sm:grid-cols-2">
          {top.map((c) => (
            <li key={c.coin} data-overview-coin={c.coin} className="flex min-w-0 items-center gap-2.5">
              <CoinIcon coin={c.coin} size={28} className="flex-none" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-sans text-[0.9375rem]/5 font-bold text-ink t-num">
                  {coinTotalText(c, false)}
                  {NBSP}
                  <span className="font-semibold text-ink-muted">{c.ticker}</span>
                </span>
                <span className="truncate font-sans text-caption text-ink-muted">{c.coinName}</span>
              </span>
              {c.share !== null ? <span className="flex-none font-sans text-body-sm font-semibold text-ink-muted t-num">{shareText(c.share)}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {more > 0 ? <p className="m-0 font-sans text-body-sm font-semibold text-ink-muted">{copy.overview.more(more)}</p> : null}
      {priced && ov.coins.length ? <p className="m-0 font-sans text-caption text-ink-muted">{copy.overview.note}</p> : null}
    </section>
  );
}
