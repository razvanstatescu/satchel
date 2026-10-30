import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hourglass, Info, TriangleAlert } from "lucide-react";
import { AddressQr } from "@/components/AddressQr";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { SatchelCard } from "@/components/SatchelCard";
import { ConnectButton } from "@/components/client/ConnectButton";
import { CopyButton } from "@/components/client/CopyButton";
import { Incoming } from "@/components/client/Incoming";
import { InsideFtActions, InsideNearActions } from "@/components/client/Market";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { ExternalLink, Icon, cx } from "@/components/ui";
import { FAUCETS } from "@/lib/config";
import { CHAIN_NAME, copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";
import type { SatchelSnapshot } from "@/lib/data/types";
import { SEPOLIA } from "@/lib/evm-networks";
import { fundChoice, fundPath, parseFund } from "@/lib/fund";
import type { Coin, Holding } from "@/lib/holdings";
import { overview } from "@/lib/overview";
import { qrSvg } from "@/lib/qr";

/**
 * /fund/[id]: the public Add coins page (lib/fund.ts). The link a Satchel's owner sends to anyone who should send them
 * coins: pick the coin, then its network, and get that one address (QR, Copy, the network's notes, the live Incoming
 * line), or for a coin held inside, the add field. `?coin=&network=` pre-fills both (every Share link does). Server-
 * rendered with plain links, so it works without JavaScript; the pickers never guess a network.
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/fund/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.fundPage.title(id), description: copy.fundPage.whose(id), robots: { index: false } };
}

const TILE =
  "flex min-h-14 min-w-0 items-center gap-3 rounded-md border-2 px-3.5 py-2.5 text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken focus-visible:outline-offset-2";
const tileState = (current: boolean) => (current ? "border-sticker bg-selected" : "border-line bg-surface");

const COIN_NAME: Record<Coin, string> = { BTC: "Bitcoin", ETH: "Ethereum", USDC: "USD Coin", SOL: "Solana", NEAR: "NEAR", wNEAR: "Wrapped NEAR" };

export default async function FundPage(props: PageProps<"/fund/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  const pick = parseFund(sp.coin, sp.network);
  const c = fundChoice(snap, pick);
  const f = copy.fundPage;

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-7" data-fund-page={id}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-title text-ink">{f.title(id)}</h1>
          <p className="m-0 font-sans text-body text-ink-muted">{f.lead}</p>
        </div>
        <SatchelCard tokenId={id} size="sm" status={null} contents={overview(snap)} headingLevel={2} id={`fund-card-${id}`} />
        <p className="m-0 font-sans text-body-sm text-ink-muted">{f.whose(id)}</p>
      </header>

      <section aria-labelledby="fund-coin" className="flex flex-col gap-3">
        <h2 id="fund-coin" className="m-0 font-display text-heading text-ink">
          {f.step(1, f.coin)}
        </h2>
        <nav aria-label={f.coin}>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3">
            {c.coins.map((coin) => (
              <li key={coin}>
                <Link href={fundPath(id, { coin })} replace scroll={false} aria-current={coin === c.coin ? "true" : undefined} data-fund-coin={coin} className={cx(TILE, tileState(coin === c.coin))}>
                  <CoinIcon coin={coin} size={30} className="flex-none" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-sans text-label leading-5">{COIN_NAME[coin]}</span>
                    <span className="font-sans text-caption text-ink-muted">{coin}</span>
                  </span>
                </Link>
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
          <nav aria-label={f.network}>
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
              {c.places.map((h) => (
                <li key={h.key}>
                  <Link
                    href={fundPath(id, { coin: h.coin, network: h.network })}
                    replace
                    scroll={false}
                    aria-current={h.key === c.place?.key ? "true" : undefined}
                    data-fund-network={h.network}
                    className={cx(TILE, tileState(h.key === c.place?.key))}
                  >
                    <CoinIcon coin={h.coin} badge={h.badge} size={30} className="flex-none" />
                    <span className="min-w-0 truncate font-sans text-label">{h.place === "inside" ? f.inside : h.networkName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      ) : null}

      {c.place ? <Destination snap={snap} h={c.place} /> : null}

      <footer className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ShareFundLink tokenId={id} prefill={{ coin: c.coin, network: c.place?.network ?? null }} variant="button" className="sm:w-auto" />
        <Link href={`/s/${id}`} className="font-sans text-label text-link underline decoration-1 underline-offset-3 hover:decoration-2">
          {f.see(id)}
        </Link>
      </footer>
    </article>
  );
}

/** Where to send: the address (QR, Copy, notes, faucet, Incoming) for a chain place; the add field for a coin inside. */
async function Destination({ snap, h }: { snap: SatchelSnapshot; h: Holding }) {
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
  const svg = await qrSvg(address);
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
      {h.core ? <Incoming snap={snap} chain={chain} /> : null}
    </section>
  );
}
