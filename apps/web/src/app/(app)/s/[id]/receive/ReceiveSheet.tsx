import type { ReactNode } from "react";
import { Hourglass, Info, TriangleAlert } from "lucide-react";
import { AddressQr } from "@/components/AddressQr";
import { ChainCharm } from "@/components/brand";
import { FlowShell } from "@/components/client/FlowShell";
import { Incoming, ReceiveActions } from "@/components/client/Incoming";
import { ExternalLink, Icon, SegmentedLinks } from "@/components/ui";
import { CHAIN_NAME, copy, NETWORK_LABEL } from "@/lib/copy";
import { FAUCETS } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { qrSvg } from "@/lib/qr";
import { UI_CHAINS, type UiChain } from "@/lib/view";
import { EVM_IDS, evmNetworkName, evmPickerName, SEPOLIA } from "@/lib/evm-networks";
import type { Network } from "@/lib/holdings";

const EVM_NETWORK: Record<number, Network> = { 11155111: "sepolia", 84532: "base", 421614: "arbitrum", 11155420: "optimism" };

export { qrSvg };

/**
 * Add coins (app-screens §8; proto app-receive.html): the sheet over the Wallet tab. The chain switch (links), the QR
 * card (the Satchel's band, the network, the QR on a white plate, the full grouped address), the notes and the faucet,
 * then the live Incoming line (`incoming` replaces it, for previews); Copy address (+ Share) is pinned in the foot.
 */
export async function ReceiveSheet({
  snap,
  chain,
  incoming,
  network = SEPOLIA,
  asset = "eth",
}: {
  snap: SatchelSnapshot;
  chain: UiChain;
  incoming?: ReactNode;
  /** C3: the EVM testnet (same address on all four) */
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
  const chains: UiChain[] = UI_CHAINS.includes(chain) ? UI_CHAINS : [...UI_CHAINS, chain];
  // the EVM query keeps the picked network and coin when a picker link reloads the sheet
  const evmQuery = (n: number, a: "eth" | "usdc") => `chain=evm&network=${n}&asset=${a}`;

  return (
    <FlowShell title={copy.fund.title(id)} closeHref={`/s/${id}`} testId="receive-flow" action={<ReceiveActions address={address} chain={chain} tokenId={id} prefill={{ coin: usdc ? "USDC" : evm ? "ETH" : chain === "btc" ? "BTC" : "SOL", network: evm ? EVM_NETWORK[network] : chain === "btc" ? "bitcoin" : "solana" }} />}>
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
      <AddressQr tokenId={id} address={address} svg={svg} network={net} lead={<ChainCharm chain={chain} size={20} />} fullAttr={chain} />
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
      {incoming ?? <Incoming snap={snap} chain={chain} />}
    </FlowShell>
  );
}
