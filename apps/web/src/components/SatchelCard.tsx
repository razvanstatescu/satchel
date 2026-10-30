import Link from "next/link";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { Charm } from "@/components/brand/Charm";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { Badge, StatusPill, cx, type PillKind } from "@/components/ui";
import { CHAIN_NAME, copy } from "@/lib/copy";
import { NBSP } from "@/lib/format";
import type { Coin, Network } from "@/lib/holdings";

export { SatchelThumb } from "@/components/ui";

/**
 * The Satchel card (design-system-impl §4.2; design-spec §6.1–6.3; proto/CARD-HERO.md): a `<figure>` of real text,
 * because judges read the server HTML. A coral band (the name, the lemon **Yours** sticker when the viewer owns it,
 * the charm S) over the **coin ledger**: its top three holdings (`lib/holdings.ts` `cardRows`: what it holds first, on
 * any network or inside; the home coins at zero fill the rest), each a coin with its network sticker, the amount
 * (Funnel 800, tabular) and the ticker; then the state pill and, when it holds more, a stack of the other coins with
 * "+N more". No fiat and no per-token hue: cards differ by what they hold. Actions (Send, Give, Sell) sit outside the
 * card; a figure holds no controls.
 *
 * Sizes follow the card's own width (container queries): lg from 352 px (32/36 amounts), md 251–351 (24/28), sm up to
 * 250 (19/23); with three rows (SOL_UI_ENABLED) the amounts step down. `size` only caps the width: lg 400, md 300,
 * sm 240.
 */

export interface CardChip {
  /** The home chain of a home coin (BTC, Sepolia ETH, SOL): `data-chain`, and its charm when `coin` is absent. */
  chain?: "btc" | "evm" | "sol";
  /** The coin (`lib/holdings.ts`); defaults to the chain's own. */
  coin?: Coin;
  /** Its network sticker (ETH on Base, any USDC, anything inside). */
  badge?: Network | null;
  /** The holding key (`data-holding`: the coin hop, tests). */
  key?: string;
  ticker: string;
  /** The formatted native amount without its ticker; null = unavailable ("— BTC"); an exact zero renders "0". */
  amount: string | null;
  /** A holding past the ledger's three rows: drawn in the "+N more" stack, not as a row. */
  overflow?: boolean;
}

const HOME_COIN: Record<"btc" | "evm" | "sol", Coin> = { btc: "BTC", evm: "ETH", sol: "SOL" };
const chipKey = (c: CardChip) => c.key ?? c.chain ?? c.ticker;

type CardStatus = PillKind | null;

const MAX_W = { lg: "max-w-100", md: "max-w-75", sm: "max-w-60" } as const;

const isZero = (a: string) => /^0(\.0+)?$/.test(a.trim());

function Ledger({ chips, preview }: { chips: CardChip[]; preview: boolean }) {
  const three = chips.length > 2;
  return (
    <ul aria-label={copy.card.listLabel} className="m-0 flex list-none flex-col gap-1 p-0 @min-[352px]/card:gap-1.5 @max-[250px]/card:gap-0.5">
      {chips.map((c) => {
        const unavailable = c.amount === null;
        const zero = !unavailable && isZero(c.amount as string);
        return (
          <li
            key={chipKey(c)}
            data-chain={c.chain}
            data-holding={c.key}
            data-zero={zero ? "" : undefined}
            data-unavailable={unavailable ? "" : undefined}
            title={unavailable ? copy.wallet.unavailable : undefined}
            className="flex min-w-0 items-center gap-2 @min-[352px]/card:gap-2.5"
          >
            {c.coin || c.badge ? (
              <CoinIcon
                coin={c.coin ?? HOME_COIN[c.chain!]}
                badge={c.badge ?? null}
                className={cx(
                  "flex-none @max-[250px]/card:size-4.5",
                  three ? "size-5 @min-[352px]/card:size-6" : "size-5.5 @min-[352px]/card:size-7",
                )}
              />
            ) : (
              <ChainCharm
                chain={c.chain!}
                className={cx(
                  "flex-none @max-[250px]/card:size-4.5",
                  three ? "size-5 @min-[352px]/card:size-6" : "size-5.5 @min-[352px]/card:size-7",
                )}
              />
            )}
            {preview ? (
              <span className="font-sans text-label text-ink @max-[352px]/card:text-[0.875rem]">{copy.card.addressRow(CHAIN_NAME[c.chain!])}</span>
            ) : (
              <>
                <span
                  className={cx(
                    "font-display font-extrabold tracking-[-0.02em] whitespace-nowrap t-num @max-[250px]/card:text-[1.1875rem] @max-[250px]/card:leading-[23px]",
                    three
                      ? "text-[1.25rem] leading-6 @min-[352px]/card:text-[1.625rem] @min-[352px]/card:leading-7.5"
                      : "text-[1.5rem] leading-7 @min-[352px]/card:text-[2rem] @min-[352px]/card:leading-9",
                    unavailable || zero ? "text-ink-muted" : "text-ink",
                  )}
                >
                  {unavailable ? "—" : zero ? "0" : c.amount}
                </span>
                {/* The no-break space keeps "0.0412 BTC" one phrase in the text layer (judges, screen readers, judge.spec);
                    it's out of the flow (sr-only), so the visual gap is the row's own: 8 px, 10 px at lg (the proto). */}
                <span className="sr-only">{NBSP}</span>
                <span className="font-sans text-[0.8125rem] leading-4.5 font-semibold text-ink-muted @min-[352px]/card:text-[0.9375rem] @min-[352px]/card:leading-5 @max-[250px]/card:text-[0.75rem] @max-[250px]/card:leading-4">
                  {c.ticker}
                </span>
                {unavailable ? <span className="sr-only">{` ${copy.wallet.unavailable}`}</span> : null}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The holdings past the ledger: up to three overlapping coins, then "+N more" (Orb's "+N assets"). */
function More({ rest }: { rest: CardChip[] }) {
  if (!rest.length) return null;
  return (
    <p data-card-more={rest.length} className="m-0 flex min-w-0 items-center gap-1.5 font-sans text-[0.8125rem] leading-4.5 font-semibold text-ink-muted @max-[250px]/card:text-[0.75rem]">
      <span aria-hidden="true" className="flex flex-none items-center">
        {rest.slice(0, 3).map((c, i) => (
          <CoinIcon key={chipKey(c)} coin={c.coin ?? HOME_COIN[c.chain!]} className={cx("size-5 flex-none rounded-full bg-surface @max-[250px]/card:size-4", i > 0 && "-ml-2")} />
        ))}
      </span>
      <span className="whitespace-nowrap" aria-hidden="true">
        {copy.coins.cardMore(rest.length)}
      </span>
      <span className="sr-only">{copy.coins.cardMoreAria(rest.length)}</span>
    </p>
  );
}

export function SatchelCard({
  tokenId,
  size = "lg",
  status,
  owned = false,
  showYours,
  chips,
  variant = "app",
  pose = "rest",
  headingLevel = 2,
  id,
  href,
  linkLabel,
  className,
}: {
  /** null on the mint preview ("New Satchel"). */
  tokenId: string | null;
  size?: "lg" | "md" | "sm";
  status: CardStatus;
  /** The viewer owns it: `data-owned`, and the Yours sticker unless `showYours={false}` (the My Satchels grid). */
  owned?: boolean;
  showYours?: boolean;
  chips: CardChip[];
  variant?: "app" | "mint-preview";
  /** `lifted`: picked up while a hand-off waits on the wallet (translate −8 px, −2°, a 6 px drop; motion-spec §2). */
  pose?: "rest" | "lifted";
  headingLevel?: 2 | 3;
  id?: string;
  /** Makes the whole card one link (grids, My Satchels): lifts on hover, presses on tap. Nothing inside is focusable. */
  href?: string;
  /** The link's accessible name, when it should say more than the card (e.g. Market adds the price and the check). */
  linkLabel?: string;
  className?: string;
}) {
  const preview = variant === "mint-preview";
  const name = preview || !tokenId ? copy.card.preview : copy.card.name(tokenId);
  const base = id ?? `card-${tokenId ?? "preview"}`;
  const headingId = `${base}-name`;
  const H = headingLevel === 2 ? "h2" : "h3";
  const yours = owned && !preview && showYours !== false;
  const rows = chips.filter((c) => !c.overflow);
  const rest = preview ? [] : chips.filter((c) => c.overflow);

  const figure = (
    <figure
      aria-labelledby={headingId}
      id={id}
      data-card={tokenId ?? "preview"}
      data-owned={owned || preview ? "true" : "false"}
      data-coins={rows.length + rest.length}
      className={cx(
        "@container/card relative m-0 flex aspect-[1.586/1] w-full flex-col overflow-hidden rounded-card border-3 border-sticker bg-surface text-ink",
        MAX_W[size],
        "transition-[translate,rotate,box-shadow] duration-220 ease-out",
        pose === "lifted" ? "-translate-y-2 -rotate-2 shadow-sticker-lift" : "shadow-sticker",
        href &&
          "group-hover/card-link:-translate-y-0.5 group-hover/card-link:shadow-sticker-lift group-active/card-link:translate-y-1 group-active/card-link:shadow-pressed group-active/card-link:duration-60 group-data-pressed/card-link:translate-y-1 group-data-pressed/card-link:shadow-pressed",
        !href && className,
      )}
    >
      <div className="flex min-w-0 flex-[0_0_28%] items-center gap-2 border-b-3 border-sticker bg-brand pr-3.5 pl-4 @min-[352px]/card:gap-2.5 @min-[352px]/card:pr-4.5 @min-[352px]/card:pl-5 @max-[250px]/card:pr-2.5 @max-[250px]/card:pl-3">
        <H
          id={headingId}
          className="m-0 min-w-0 truncate font-display text-[1.0625rem] leading-5.5 font-extrabold tracking-[-0.01em] text-on-brand @min-[352px]/card:text-[1.25rem] @min-[352px]/card:leading-6.5 @max-[250px]/card:text-[0.875rem] @max-[250px]/card:leading-4.5"
        >
          {name}
        </H>
        {yours ? <Badge kind="yours" /> : preview ? <Badge kind="new" /> : null}
        <Charm height={30} className="ml-auto h-7.5 w-auto flex-none @min-[352px]/card:h-10 @max-[250px]/card:h-6" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 px-4 pt-3 pb-3.5 @min-[352px]/card:px-5 @min-[352px]/card:pt-4 @min-[352px]/card:pb-4.5 @max-[250px]/card:gap-1 @max-[250px]/card:px-3 @max-[250px]/card:pt-2 @max-[250px]/card:pb-2.5">
        <Ledger chips={rows} preview={preview} />
        {(status || rest.length) && !preview ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            {status ? <StatusPill status={status} className="@max-[250px]/card:px-2 @max-[250px]/card:py-0.75 @max-[250px]/card:text-[0.75rem] @max-[250px]/card:leading-4" /> : <span />}
            <More rest={rest} />
          </div>
        ) : null}
      </div>
    </figure>
  );

  if (!href) return figure;
  return (
    <Link
      href={href}
      aria-label={linkLabel}
      data-press=""
      className={cx("group/card-link block w-full rounded-card no-underline focus-visible:outline-offset-4", MAX_W[size], className)}
    >
      {figure}
    </Link>
  );
}
