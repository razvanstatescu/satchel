"use client";

import Link from "next/link";
import { Hourglass, Info, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AddressQr } from "@/components/AddressQr";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { ConnectButton } from "@/components/client/ConnectButton";
import { CopyButton } from "@/components/client/CopyButton";
import { Incoming } from "@/components/client/Incoming";
import { InsideFtActions, InsideNearActions } from "@/components/client/Market";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { ExternalLink, Icon, cx } from "@/components/ui";
import { FAUCETS } from "@/lib/config";
import { CHAIN_NAME, copy } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import { SEPOLIA } from "@/lib/evm-networks";
import { fundChoice, fundPath } from "@/lib/fund";
import type { Coin, Holding, Network } from "@/lib/holdings";
import { readMotionMode } from "@/lib/motion-flag";

/**
 * The public Add coins page's pickers and destination (`/fund/[id]`). The server renders the first view (a shared
 * link's pre-fill included, with its QR); from then on every pick is instant: client state, the URL mirrored with
 * `replaceState` for sharing, and every address's QR drawn in the background on load. The tiles stay real links, so a
 * modified click (new tab) or no JavaScript still works.
 */

const TILE =
  "flex min-h-14 min-w-0 items-center gap-3 rounded-md border-2 px-3.5 py-2.5 text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken focus-visible:outline-offset-2";
const tileState = (current: boolean) => (current ? "border-sticker bg-selected" : "border-line bg-surface");

const COIN_NAME: Record<Coin, string> = { BTC: "Bitcoin", ETH: "Ethereum", USDC: "USD Coin", SOL: "Solana", NEAR: "NEAR", wNEAR: "Wrapped NEAR" };

/** A plain left click becomes an instant pick; anything else (new tab, no JS) follows the link. */
const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function FundPicker({
  snap,
  initial,
  initialQr,
}: {
  snap: SatchelSnapshot;
  initial: { coin: Coin | null; network: Network | null };
  /** the pre-filled destination's QR, drawn on the server */
  initialQr: { address: string; svg: string } | null;
}) {
  const id = snap.token_id;
  const f = copy.fundPage;
  const [pick, setPick] = useState(initial);
  const c = useMemo(() => fundChoice(snap, pick), [snap, pick]);
  const [qrs, setQrs] = useState<Record<string, string>>(() => (initialQr ? { [initialQr.address]: initialQr.svg } : {}));
  const destRef = useRef<HTMLDivElement>(null);
  const picked = useRef(false);

  // every address's QR in the background, so switching coin or network never waits on one
  useEffect(() => {
    let live = true;
    void import("@/lib/qr").then(async ({ qrSvg }) => {
      for (const a of [snap.addresses.btc, snap.addresses.evm, snap.addresses.sol]) {
        const svg = await qrSvg(a);
        if (!live) return;
        setQrs((q) => (q[a] ? q : { ...q, [a]: svg }));
      }
    });
    return () => {
      live = false;
    };
  }, [snap.addresses.btc, snap.addresses.evm, snap.addresses.sol]);

  // a pick that reveals the destination brings it into view (below the fold on a phone)
  useEffect(() => {
    if (!picked.current || !c.place || !destRef.current) return;
    const r = destRef.current.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.6) destRef.current.scrollIntoView({ behavior: readMotionMode() === "reduce" ? "auto" : "smooth", block: "start" });
  }, [c.place]);

  const select = (e: MouseEvent, next: { coin: Coin | null; network: Network | null }) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    picked.current = true;
    setPick(next);
    window.history.replaceState(window.history.state, "", fundPath(id, next));
  };

  return (
    <>
      <section aria-labelledby="fund-coin" className="flex flex-col gap-3">
        <h2 id="fund-coin" className="m-0 font-display text-heading text-ink">
          {f.step(1, f.coin)}
        </h2>
        <nav aria-label={f.coin} data-local-nav="">
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3">
            {c.coins.map((coin) => (
              <li key={coin}>
                <a
                  href={fundPath(id, { coin })}
                  onClick={(e) => select(e, { coin, network: coin === c.coin ? pick.network : null })}
                  aria-current={coin === c.coin ? "true" : undefined}
                  data-fund-coin={coin}
                  className={cx(TILE, tileState(coin === c.coin))}
                >
                  <CoinIcon coin={coin} size={30} className="flex-none" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-sans text-label leading-5">{COIN_NAME[coin]}</span>
                    <span className="font-sans text-caption text-ink-muted">{coin}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {!c.coin ? <p className="m-0 font-sans text-body-sm text-ink-muted">{f.pickCoin}</p> : null}
      </section>

      {c.coin && c.places.length > 1 ? (
        <section aria-labelledby="fund-network" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="fund-network" className="m-0 font-display text-heading text-ink">
              {f.step(2, f.network)}
            </h2>
            {!c.place ? <p className="m-0 font-sans text-body-sm text-ink-muted">{`${f.pickNetwork(c.coin)} ${f.pickNetworkBody}`}</p> : null}
          </div>
          <nav aria-label={f.network} data-local-nav="">
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
              {c.places.map((h) => (
                <li key={h.key}>
                  <a
                    href={fundPath(id, { coin: h.coin, network: h.network })}
                    onClick={(e) => select(e, { coin: h.coin, network: h.network })}
                    aria-current={h.key === c.place?.key ? "true" : undefined}
                    data-fund-network={h.network}
                    className={cx(TILE, tileState(h.key === c.place?.key))}
                  >
                    <CoinIcon coin={h.coin} badge={h.badge} size={30} className="flex-none" />
                    <span className="min-w-0 truncate font-sans text-label">{h.place === "inside" ? f.inside : h.networkName}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      ) : null}

      <div ref={destRef} className="scroll-mt-6 empty:hidden">
        {c.place ? <Destination snap={snap} h={c.place} svg={c.place.chain ? (qrs[snap.addresses[c.place.chain]] ?? null) : null} /> : null}
      </div>

      <footer className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ShareFundLink tokenId={id} prefill={{ coin: c.coin, network: c.place?.network ?? null }} variant="button" className="sm:w-auto" />
        <Link href={`/s/${id}`} className="font-sans text-label text-link underline decoration-1 underline-offset-3 hover:decoration-2">
          {f.see(id)}
        </Link>
      </footer>
    </>
  );
}

/** Where to send: the address (QR, Copy, notes, faucet, Incoming) for a chain place; the add field for a coin inside. */
function Destination({ snap, h, svg }: { snap: SatchelSnapshot; h: Holding; svg: string | null }) {
  const f = copy.fundPage;
  const title = h.place === "inside" ? f.addInside(h.ticker, snap.token_id) : f.sendTo(h.ticker, h.networkName);
  if (h.place === "inside") {
    return (
      <section aria-labelledby="fund-to" className="flex flex-col gap-3" data-fund-destination={h.key}>
        <h2 id="fund-to" className="m-0 font-display text-heading text-ink">
          {title}
        </h2>
        <p className="m-0 font-sans text-body-sm text-ink-muted">{f.insideBody(h.ticker)}</p>
        <ConnectButton variant="secondary" size="lg" block />
        <div className="rounded-md border border-line bg-surface p-4">{h.coin === "NEAR" ? <InsideNearActions snap={snap} /> : <InsideFtActions snap={snap} ft={h.ft!} />}</div>
      </section>
    );
  }
  const chain = h.chain!;
  const address = snap.addresses[chain];
  const evm = chain === "evm";
  const usdc = h.coin === "USDC";
  const faucet = usdc ? FAUCETS.usdc : !evm || h.chainId === SEPOLIA ? FAUCETS[chain] : null;
  return (
    <section aria-labelledby="fund-to" className="flex flex-col gap-4" data-fund-destination={h.key}>
      <h2 id="fund-to" className="m-0 font-display text-heading text-ink">
        {title}
      </h2>
      <AddressQr tokenId={snap.token_id} address={address} svg={svg} network={h.networkName} lead={<CoinIcon coin={h.coin} badge={h.badge} size={20} />} />
      <CopyButton variant="primary" value={address} label={copy.fund.copy} text={copy.fund.copy} toastText={copy.wallet.copiedAria(CHAIN_NAME[chain])} />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={TriangleAlert} size={16} className="mt-0.5 flex-none text-danger" />
          {evm && (usdc || h.chainId !== SEPOLIA) ? copy.nets.addUsdcNote(h.networkName) : copy.fund.only[chain]}
        </li>
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={Hourglass} size={16} className="mt-0.5 flex-none text-ink-muted" />
          {copy.fund.time[chain]}
        </li>
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={Info} size={16} className="mt-0.5 flex-none text-ink-muted" />
          {copy.fund.anyone}
        </li>
      </ul>
      {faucet ? (
        <ExternalLink href={faucet} className="-my-1 min-h-11 self-start font-semibold">
          {usdc ? copy.nets.usdcFaucet : copy.fund.faucet[chain]}
        </ExternalLink>
      ) : null}
      {/* the live line follows the home coins' balances (BTC, Sepolia ETH, SOL) */}
      {h.core ? <Incoming key={chain} snap={snap} chain={chain} /> : null}
    </section>
  );
}
