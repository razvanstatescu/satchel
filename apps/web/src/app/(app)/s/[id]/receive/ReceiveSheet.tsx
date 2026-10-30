import type { ReactNode } from "react";
import { Hourglass, Info, TriangleAlert } from "lucide-react";
import { AddressDisplay } from "@/components/AddressDisplay";
import { ChainCharm, Charm } from "@/components/brand";
import { FlowShell } from "@/components/client/FlowShell";
import { Incoming, ReceiveActions } from "@/components/client/Incoming";
import { RequestLinkActions } from "@/components/client/RequestAmount";
import { AmountInput, Button, ExternalLink, Field, Icon, SegmentedLinks } from "@/components/ui";
import { CHAIN_NAME, copy, NETWORK_LABEL, TICKER } from "@/lib/copy";
import { APP_URL, FAUCETS } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { buildPaymentUri, validateChainAmount } from "@/lib/payment-uri";
import { qrSvg } from "@/lib/qr";
import { UI_CHAINS, type UiChain } from "@/lib/view";
import { EVM_IDS, evmNetworkName, evmPickerName, SEPOLIA, usdcAddress } from "@/lib/evm-networks";

export { qrSvg };

/**
 * Add coins (app-screens §8; proto app-receive.html): the sheet over the Wallet tab. The chain switch (links), the QR
 * card (the Satchel's band, the network, the QR on a white plate, the full grouped address), the notes and the faucet,
 * then the live Incoming line (`incoming` replaces it, for previews); Copy address (+ Share) is pinned in the foot.
 *
 * A4 (Request coins): an optional amount, read from `?amount=` (GET-form submit or a shared app link — both are
 * ordinary navigations, so the request works with JavaScript off too). A valid amount renders a second QR, this one
 * of the chain's payment URI (BIP-21 / EIP-681 / Solana Pay), with its own copy-and-share actions. The amount is
 * never trusted for anything but display: this sheet signs nothing.
 */
export async function ReceiveSheet({
  snap,
  chain,
  amount,
  incoming,
  network = SEPOLIA,
  asset = "eth",
}: {
  snap: SatchelSnapshot;
  chain: UiChain;
  amount?: string;
  incoming?: ReactNode;
  /** C3: the EVM testnet (same address on all four; the payment URI names it with `@<chainId>`) */
  network?: number;
  /** C2: ETH or USDC (EVM only) */
  asset?: "eth" | "usdc";
}) {
  const id = snap.token_id;
  const address = snap.addresses[chain];
  const svg = await qrSvg(address);
  const evm = chain === "evm";
  const usdc = evm && asset === "usdc";
  const net = evm ? evmNetworkName(network) : NETWORK_LABEL[chain];
  const ticker = usdc ? "USDC" : TICKER[chain];
  const chains: UiChain[] = UI_CHAINS.includes(chain) ? UI_CHAINS : [...UI_CHAINS, chain];
  // the EVM query keeps the picked network and coin when the request form or a picker link reloads the sheet
  const evmQuery = (n: number, a: "eth" | "usdc") => `chain=evm&network=${n}&asset=${a}`;

  const validation = amount ? validateChainAmount(amount, chain, usdc ? "usdc" : "native") : null;
  const requestError = amount !== undefined && validation?.ok !== true;
  const evmOpts = evm ? { chainId: network, ...(usdc ? { usdc: usdcAddress(network) } : {}) } : undefined;
  const request =
    validation?.ok === true
      ? {
          decimal: validation.decimal,
          uri: buildPaymentUri(chain, address, validation.base, evmOpts),
          svg: await qrSvg(buildPaymentUri(chain, address, validation.base, evmOpts)),
          appLink: `${APP_URL}/s/${id}/receive?${evm ? evmQuery(network, asset) : `chain=${chain}`}&amount=${encodeURIComponent(validation.decimal)}`,
        }
      : null;

  return (
    <FlowShell title={copy.fund.title(id)} closeHref={`/s/${id}`} testId="receive-flow" action={<ReceiveActions address={address} chain={chain} tokenId={id} />}>
      <SegmentedLinks
        label={copy.fund.chain}
        block
        options={chains.map((c) => ({ href: `/s/${id}/receive?chain=${c}`, label: CHAIN_NAME[c], current: c === chain, replace: true, lead: <ChainCharm chain={c} size={20} /> }))}
      />
      {evm ? (
        <div className="flex flex-col gap-2" data-testid="receive-network">
          <SegmentedLinks
            label={copy.nets.addNetwork}
            block
            size="sm"
            options={EVM_IDS.map((n) => ({ href: `/s/${id}/receive?${evmQuery(n, asset)}`, label: evmPickerName(n), current: n === network, replace: true }))}
          />
          <SegmentedLinks
            label={copy.nets.asset}
            block
            size="sm"
            options={(["eth", "usdc"] as const).map((a) => ({ href: `/s/${id}/receive?${evmQuery(network, a)}`, label: a === "eth" ? "ETH" : "USDC", current: a === asset, replace: true }))}
          />
        </div>
      ) : null}
      <section aria-labelledby="qr-title" className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex h-13 items-center gap-2.5 border-b-2 border-sticker bg-brand px-4 text-on-brand">
          <p id="qr-title" className="m-0 font-display text-[1.125rem]/6 font-extrabold tracking-[-0.01em]">
            {copy.card.name(id)}
          </p>
          <Charm height={30} className="ml-auto h-7.5 w-auto flex-none" />
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-5">
          <p className="m-0 inline-flex items-center gap-2 font-sans text-body-sm font-semibold text-ink-muted">
            <ChainCharm chain={chain} size={20} />
            {net}
          </p>
          <div
            data-scheme="day"
            role="img"
            aria-label={copy.fund.qr(address)}
            className="size-55 rounded-[16px] border border-line-strong bg-surface p-2.5 text-ink *:block *:size-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.fund.label(net)}</p>
          <p className="m-0 w-full text-center">
            <AddressDisplay address={address} fullAttr={chain} size="lg" align="center" />
          </p>
        </div>
      </section>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={TriangleAlert} size={16} className="mt-0.5 text-danger" />
          {evm && (usdc || network !== SEPOLIA) ? copy.nets.addUsdcNote(net) : copy.fund.only[chain]}
        </li>
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={Hourglass} size={16} className="mt-0.5 text-ink-muted" />
          {copy.fund.time[chain]}
        </li>
        <li className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <Icon icon={Info} size={16} className="mt-0.5 text-ink-muted" />
          {copy.fund.anyone}
        </li>
      </ul>
      {usdc ? (
        <ExternalLink href={FAUCETS.usdc} className="-my-1 min-h-11 self-start font-semibold">
          {copy.nets.usdcFaucet}
        </ExternalLink>
      ) : !evm || network === SEPOLIA ? (
        <ExternalLink href={FAUCETS[chain]} className="-my-1 min-h-11 self-start font-semibold">
          {copy.fund.faucet[chain]}
        </ExternalLink>
      ) : null}
      <section aria-labelledby="request-title" className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 id="request-title" className="m-0 font-sans text-label text-ink-muted">
          {copy.fund.request.title}
        </h3>
        {/* A GET form: submitting navigates to ?chain=&amount=, so the server renders the payment URI and its QR —
            works with JavaScript off, and a shared link lands on exactly the same markup. */}
        <form method="get" action={`/s/${id}/receive`} className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <input type="hidden" name="chain" value={chain} />
          {evm ? (
            <>
              <input type="hidden" name="network" value={network} />
              <input type="hidden" name="asset" value={asset} />
            </>
          ) : null}
          <Field id="request-amount" label={copy.fund.request.label} error={requestError ? copy.fund.request.invalid : undefined} className="min-w-0 sm:flex-1">
            <AmountInput id="request-amount" name="amount" ticker={ticker} defaultValue={amount ?? ""} invalid={requestError} inputMode="decimal" placeholder="0.00" />
          </Field>
          <Button type="submit" size="lg" className="max-sm:w-full">
            {request ? copy.fund.request.update : copy.fund.request.create}
          </Button>
        </form>
        {request ? (
          <>
            <div
              data-scheme="day"
              role="img"
              aria-label={copy.fund.qr(request.uri)}
              className="size-44 self-center rounded-[16px] border border-line-strong bg-surface p-2.5 text-ink *:block *:size-full"
              dangerouslySetInnerHTML={{ __html: request.svg }}
            />
            <p className="m-0 self-center font-sans text-body-sm text-ink-muted t-num">
              {request.decimal}
              {" "}
              {ticker}
              {evm ? ` · ${net}` : null}
            </p>
            <div className="flex flex-col gap-1.5 rounded-md bg-surface-sunken p-3.5">
              <p className="m-0 font-sans text-[0.9375rem]/5 font-semibold text-ink">{copy.fund.request.linkTitle}</p>
              <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.fund.request.linkBody}</p>
            </div>
            <RequestLinkActions paymentUri={request.uri} appLink={request.appLink} shareTitle={copy.fund.request.shareTitle(id, request.decimal, ticker)} />
          </>
        ) : null}
      </section>
      {incoming ?? <Incoming snap={snap} chain={chain} />}
    </FlowShell>
  );
}
