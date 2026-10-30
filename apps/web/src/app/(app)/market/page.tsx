import { overview } from "@/lib/overview";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CircleAlert, RefreshCw } from "lucide-react";
import { GateLine, checkedAgo, hintModel, marketOrder } from "@/components/Clean";
import { SatchelCard } from "@/components/SatchelCard";
import { Banner, Button, EmptyState } from "@/components/ui";
import { copy } from "@/lib/copy";
import { getMarket, getUnlistedMarket } from "@/lib/data/server";
import { priceText } from "@/lib/view";
import { MarketCard } from "./MarketCard";

/**
 * /market (judge route, app-screens §9): blocking SSR of every listing with its card, its price and the SERVER's check,
 * labelled as the server's ("Server check 2 min ago: clean"). Only the buyer's browser check on the Buy tab enables Buy;
 * this page never says "checked in your browser". Buyable listings first, the blocked ones last.
 */
export const instant = false;

export const metadata: Metadata = {
  title: copy.market.title,
  description: "Satchels for sale on NEAR testnet. Your browser checks each one's history before you can buy.",
};

/** The request's time: "2 min ago" is measured per request, not when the listings were cached. */
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export default async function MarketPage() {
  const now = await requestTime();
  const [m, unlisted] = await Promise.all([getMarket(), getUnlistedMarket()]);
  const entries = marketOrder(m.entries);
  return (
    <article className="flex flex-col gap-6" data-market>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-title text-ink">{copy.market.title}</h1>
        {!m.error && entries.length ? <p className="font-sans text-[0.9375rem] leading-5.5 text-ink-muted">{copy.market.lead(entries.length)}</p> : null}
      </header>
      {m.error ? (
        <Banner
          icon={CircleAlert}
          tone="danger"
          role="alert"
          title={copy.market.error}
          action={
            <Button href="/market" icon={RefreshCw}>
              {copy.market.tryAgain}
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState
          className="my-8"
          artSize={80}
          title={copy.market.empty}
          body={copy.market.emptyBody}
          action={
            <Button variant="primary" size="lg" href="/mint?from=/market">
              {copy.market.mint}
            </Button>
          }
        />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-7 p-0 md:grid-cols-2 xl:grid-cols-3 xl:gap-8" data-testid="market-grid">
          {entries.map((e) => {
            const price = priceText(e.listing.price, e.listing.currency);
            const cardId = `market-card-${e.token_id}`;
            const t = e.hint ? checkedAgo(e.hint.checked_at, now) : null;
            const hint = e.hint && t ? hintModel(e.hint.aggregate, t) : null;
            return (
              <li key={e.token_id} data-market-item={e.token_id} className="group/mkt relative flex w-full max-w-100 min-w-0 flex-col gap-3">
                {/* the card is real content (its name heading and its ledger for assistive tech); the link below
                    stretches over the whole item, so a tap anywhere opens the listing */}
                <MarketCard id={cardId} tokenId={e.token_id} owner={e.listing.seller} contents={overview(e.snapshot)} />
                <Link
                  href={`/s/${e.token_id}/sale`}
                  data-press=""
                  className="flex flex-col gap-1 px-1 text-ink no-underline after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
                >
                  {/* the link's name: "Satchel #3, 5.00 USDC Listing #3 · 1 signature Server check 2 min ago: clean" */}
                  <span className="sr-only">{`${copy.card.name(e.token_id)}, `}</span>
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="font-display text-[1.375rem] leading-6.5 font-extrabold tracking-[-0.02em] t-num">{price}</span>{" "}
                    <span className="font-sans text-body-sm text-ink-muted t-num">{copy.market.meta(e.listing.id, e.snapshot.sig_count)}</span>
                  </span>{" "}
                  {hint ? <GateLine model={hint} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {/* C4 (docs/specs/C4-C6.md §3): anyone can offer whether or not it's listed, so visitors reach every
          Satchel's offer sheet from here, not just the ones for sale. */}
      {!unlisted.error && unlisted.entries.length ? (
        <section aria-labelledby="unlisted-title" className="flex flex-col gap-4" data-testid="unlisted-market">
          <header className="flex flex-col gap-1">
            <h2 id="unlisted-title" className="m-0 font-display text-[1.375rem] leading-6.5 font-extrabold text-ink">
              {copy.market.unlisted.title}
            </h2>
            <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.market.unlisted.lead}</p>
          </header>
          <ul className="m-0 grid list-none grid-cols-1 gap-7 p-0 md:grid-cols-2 xl:grid-cols-3 xl:gap-8" data-testid="unlisted-grid">
            {unlisted.entries.map((e) => (
              <li key={e.token_id} data-unlisted-item={e.token_id} className="group/mkt relative flex w-full max-w-100 min-w-0 flex-col gap-2.5">
                {/* same split as the listed grid above: the card is real content, the link below it (not around it,
                    so axe's label-content-name-mismatch stays clean) stretches over the whole item. */}
                <SatchelCard id={`unlisted-card-${e.token_id}`} tokenId={e.token_id} size="lg" status={e.snapshot.status} contents={overview(e.snapshot)} headingLevel={2} />
                <Link
                  href={`/s/${e.token_id}/offer`}
                  data-press=""
                  className="flex items-center gap-1.5 px-1 font-sans text-body-sm font-semibold text-link no-underline decoration-1 underline-offset-3 after:absolute after:inset-0 after:rounded-card after:content-[''] hover:decoration-2 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
                >
                  <span className="sr-only">{`${copy.card.name(e.token_id)}, `}</span>
                  {copy.offers.make}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
