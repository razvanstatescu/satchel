"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, Plus, RefreshCw, Tag, TriangleAlert } from "lucide-react";
import { SatchelCard } from "@/components/SatchelCard";
import { Banner, Button, EmptyState, Icon, Skeleton, cx } from "@/components/ui";
import { ConnectButton } from "@/components/client/ConnectButton";
import { MyOfferRow, StorageCreditRow } from "@/components/client/Market";
import { useCharmSwing } from "@/components/client/MintFlow";
import { EscrowPanel, useProceeds } from "@/components/client/SoldReceipt";
import { copy } from "@/lib/copy";
import { IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { fixtureCleanReport } from "@/lib/data/clean";
import { buildSnapshot } from "@/lib/data/snapshot";
import { dataSource } from "@/lib/data/source";
import type { Aggregate, CleanReport, SatchelSnapshot } from "@/lib/data/types";
import { contractViews } from "@/lib/near/contract";
import type { OfferView } from "@/lib/near/types";
import { useWallet } from "@/lib/near/wallet";
import { cardChips, priceText } from "@/lib/view";

/**
 * My Satchels, the app home `/satchels` (app-screens §2; proto/app-misc.html `satchels*`). Client-only: it reads the
 * connected wallet's Satchels (`nft_tokens_for_owner`) and never carries judge facts.
 * - Signed in: h1 + count + **Mint a Satchel** (secondary), the escrow banner when proceeds are owed (C's EscrowPanel,
 *   Withdraw is the page's primary), then the cards (1 / 2 / 3 columns), each one link to `/s/[id]`, no Yours sticker
 *   (every card here is yours). Under a listed card: "For sale at 5.00 USDC", or the danger line when its server hint
 *   is blocked ("…so nobody can buy it yet.").
 * - Loading: two static card skeletons. Error: a danger banner with **Try again**. Empty: the charm S, **Mint a
 *   Satchel** (primary), "Look inside Satchel #1".
 * - Signed out (and the server HTML, until the wallet's state is known): the charms on their strap, "Your Satchels live
 *   in your NEAR wallet", **Connect NEAR wallet** (primary), "Look inside Satchel #1".
 * Test id: `my-satchels` (the section).
 */

type Hint = { aggregate: Aggregate; unused: number };
type Loaded = { for: string | null; error: boolean; items: SatchelSnapshot[]; hints: Record<string, Hint> };

const MINT_HREF = "/mint?from=/satchels";

/** The server's clean-history hint for a listed Satchel (fixture: the same report, built in the browser). */
async function hintFor(s: SatchelSnapshot): Promise<Hint | null> {
  try {
    let r: Pick<CleanReport, "aggregate" | "items">;
    if (IS_FIXTURE) {
      const views = contractViews(dataSource().view, SATCHEL_CONTRACT);
      const records = await views.allSigRecords(s.token_id, s.sig_count);
      r = fixtureCleanReport(s.token_id, records, s.lock, s.listing?.id ?? null, "server-hint");
    } else {
      const res = await fetch(`/api/clean-history/${s.token_id}`);
      if (!res.ok) return null;
      r = (await res.json()) as CleanReport;
    }
    return { aggregate: r.aggregate, unused: r.items.filter((i) => i.status === "unused").length };
  } catch {
    return null;
  }
}

async function loadMine(accountId: string): Promise<Pick<Loaded, "items" | "hints">> {
  const src = dataSource();
  const views = contractViews(src.view, SATCHEL_CONTRACT);
  const tokens = await views.nftTokensForOwner(accountId, "0", 50);
  const ids = tokens.map((t) => t.token_id).sort((a, b) => Number(a) - Number(b));
  let items: SatchelSnapshot[];
  if (IS_FIXTURE) {
    const [config, lock] = await Promise.all([views.config(), src.lock()]);
    items = (await Promise.all(ids.map((id) => buildSnapshot(id, src, { config, lock }, Date.now())))).filter((s): s is SatchelSnapshot => !!s);
  } else {
    items = (await Promise.all(ids.map((id) => fetch(`/api/satchels/${id}`).then((r) => (r.ok ? (r.json() as Promise<SatchelSnapshot>) : null))))).filter(
      (s): s is SatchelSnapshot => !!s,
    );
  }
  const listed = items.filter((s) => s.listing);
  const hints = Object.fromEntries((await Promise.all(listed.map(async (s) => [s.token_id, await hintFor(s)] as const))).filter((e): e is [string, Hint] => !!e[1]));
  return { items, hints };
}

/** C4: "My offers" — the offers this account has made on other Satchels (docs/specs/C4-C6.md §3). Client-only,
 * wallet-driven, same lane as My Satchels itself; the per-token offers an owner receives are server-rendered on
 * `/s/[id]` instead (IncomingOffers in Market.tsx), since those are that page's judge fact. */
async function loadMyOffers(accountId: string): Promise<OfferView[]> {
  const views = contractViews(dataSource().view, SATCHEL_CONTRACT);
  try {
    return await views.offersBy(accountId, 0, 50);
  } catch {
    return [];
  }
}

function useMyOffers(accountId: string | null) {
  const [state, setState] = useState<{ for: string | null; offers: OfferView[] }>({ for: null, offers: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    void loadMyOffers(accountId).then((offers) => {
      if (alive) setState({ for: accountId, offers });
    });
    return () => {
      alive = false;
    };
  }, [accountId, attempt]);
  const loading = !!accountId && state.for !== accountId;
  return { offers: loading ? null : state.offers, reload: () => setAttempt((n) => n + 1) };
}

/** "My offers" + the storage credit line (docs/specs/C4-C6.md §1): the account's offers made elsewhere, and any
 * unused `prepay_storage` credit sitting idle, with a Withdraw button. Either half can be empty on its own (a
 * credit can outlive every offer it paid storage for), so the section renders if either has something to show. */
function MyOffers({ accountId }: { accountId: string }) {
  const { offers, reload } = useMyOffers(accountId);
  if (!offers?.length) return <StorageCreditRow accountId={accountId} />;
  return (
    <section aria-labelledby="my-offers-title" data-testid="my-offers" className="mb-6 flex flex-col gap-2.5">
      <h2 id="my-offers-title" className="m-0 font-sans text-label text-ink">
        {copy.offers.mine.title}
      </h2>
      <StorageCreditRow accountId={accountId} />
      <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">
        {offers.map((o) => (
          <MyOfferRow key={o.id} offer={o} onChanged={reload} />
        ))}
      </ul>
    </section>
  );
}

function useMySatchels(accountId: string | null) {
  const [state, setState] = useState<Loaded>({ for: null, error: false, items: [], hints: {} });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    loadMine(accountId)
      .then((r) => alive && setState({ for: accountId, error: false, ...r }))
      .catch(() => alive && setState({ for: accountId, error: true, items: [], hints: {} }));
    return () => {
      alive = false;
    };
  }, [accountId, attempt]);
  // `for` names the account the items belong to, so loading is derived (no synchronous setState in the effect)
  const loading = !!accountId && state.for !== accountId;
  const retry = () => {
    setState((s) => ({ ...s, for: null }));
    setAttempt((n) => n + 1);
  };
  return { state, loading, retry };
}

/** The one line under a listed card: its price, or why nobody can buy it yet. */
function UnderCard({ snap, hint }: { snap: SatchelSnapshot; hint: Hint | undefined }) {
  if (!snap.listing) return null;
  const price = priceText(snap.listing.price, snap.listing.currency);
  const unused = hint?.aggregate === "blocked" ? hint.unused : 0;
  const blocked = unused > 0;
  return (
    <p className={cx("m-0 flex items-start gap-2 px-1 font-sans text-body-sm t-num", blocked ? "text-danger" : "text-ink-muted")}>
      <Icon icon={blocked ? TriangleAlert : Tag} size={16} className={cx("mt-0.5", blocked ? "text-danger" : "text-frozen")} />
      <span>{blocked ? copy.home.list.blocked(price, unused) : copy.home.list.forSale(price)}</span>
    </p>
  );
}

function CardGrid({ items, hints }: { items: SatchelSnapshot[]; hints: Record<string, Hint> }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-7 p-0 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
      {items.map((s) => (
        <li key={s.token_id} className="flex min-w-0 flex-col gap-2.5">
          <SatchelCard tokenId={s.token_id} size="lg" status={s.status} owned showYours={false} chips={cardChips(s)} href={`/s/${s.token_id}`} headingLevel={2} />
          <UnderCard snap={s} hint={hints[s.token_id]} />
        </li>
      ))}
    </ul>
  );
}

function LoadingGrid() {
  return (
    <ul aria-hidden="true" className="m-0 grid list-none grid-cols-1 gap-7 p-0 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
      {[0, 1].map((i) => (
        <li key={i}>
          <Skeleton className="aspect-[1.586/1] w-full max-w-100 rounded-card" />
        </li>
      ))}
    </ul>
  );
}

const lookInside = (
  <Button variant="link" href="/s/1">
    {copy.home.empty.link}
  </Button>
);

/** Signed out: the chain charms on their strap (they swing once on view), the line, Connect NEAR wallet. */
function SignedOut() {
  const art = useRef<HTMLDivElement>(null);
  useCharmSwing(art);
  return (
    <div ref={art} className="pb-6">
      <EmptyState
        art="charms"
        title={copy.home.signedOut.title}
        body={copy.home.signedOut.body}
        action={<ConnectButton variant="primary" size="lg" />}
        secondary={lookInside}
      />
    </div>
  );
}

/** `/satchels`. */
export function SatchelsHome() {
  const { accountId } = useWallet();
  const { state, loading, retry } = useMySatchels(accountId);
  const { owed, reload } = useProceeds(accountId);
  const ready = !!accountId && !loading && !state.error;
  const count = ready ? state.items.length : 0;
  return (
    <section aria-labelledby="mine-title" aria-busy={loading || undefined} data-testid="my-satchels">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <h1 id="mine-title" className="m-0 font-display text-title text-ink">
            {copy.home.list.title}
          </h1>
          {ready && count > 0 ? <p className="m-0 font-sans text-[0.9375rem] leading-5.5 text-ink-muted">{copy.home.list.count(count)}</p> : null}
        </div>
        {ready && count > 0 ? (
          <Button size="lg" icon={Plus} href={MINT_HREF}>
            {copy.home.empty.cta}
          </Button>
        ) : null}
      </div>
      {accountId && owed?.length ? (
        <div className="mb-6">
          <EscrowPanel owed={owed} accountId={accountId} onChange={reload} />
        </div>
      ) : null}
      {accountId ? <MyOffers accountId={accountId} /> : null}
      {!accountId ? (
        <SignedOut />
      ) : loading ? (
        <LoadingGrid />
      ) : state.error ? (
        <Banner
          icon={CircleAlert}
          tone="danger"
          role="alert"
          titleAs="p"
          title={copy.home.error}
          action={
            <Button icon={RefreshCw} onClick={retry}>
              {copy.home.tryAgain}
            </Button>
          }
        />
      ) : count === 0 ? (
        <div className="pb-6">
          <EmptyState
            art="charm"
            title={copy.home.empty.title}
            body={copy.home.empty.body}
            action={
              <Button variant="primary" size="lg" href={MINT_HREF}>
                {copy.home.empty.cta}
              </Button>
            }
            secondary={lookInside}
          />
        </div>
      ) : (
        <CardGrid items={state.items} hints={state.hints} />
      )}
    </section>
  );
}
