"use client";

import { Segmented } from "@/components/ui";
import { copy } from "@/lib/copy";
import { EVM_IDS, evmPickerName, type EvmChainId } from "@/lib/evm-networks";

/**
 * C3 + C2: the Ethereum send's network picker (Sepolia · Base · Arbitrum · OP) and its coin picker (ETH · USDC), under
 * the chain picker. The address is the same on all four networks; nonces, balances and fees are each network's own.
 */
export function EvmSendOptions({
  chainId,
  asset,
  onChainId,
  onAsset,
}: {
  chainId: EvmChainId;
  asset: "eth" | "usdc";
  onChainId: (c: EvmChainId) => void;
  onAsset: (a: "eth" | "usdc") => void;
}) {
  return (
    <div className="flex flex-col gap-2.5" data-testid="evm-send-options">
      <Segmented
        options={EVM_IDS.map((c) => ({ value: String(c), label: evmPickerName(c) }))}
        value={String(chainId)}
        onChange={(v) => {
          const n = Number(v) as EvmChainId;
          if (n !== chainId) onChainId(n);
        }}
        label={copy.nets.network}
        size="sm"
        block
        optionAttr="network-select"
      />
      <Segmented
        options={[
          { value: "eth", label: "ETH" },
          { value: "usdc", label: "USDC" },
        ]}
        value={asset}
        onChange={(v) => {
          if (v !== asset) onAsset(v as "eth" | "usdc");
        }}
        label={copy.nets.asset}
        size="sm"
        block
        optionAttr="asset-select"
      />
    </div>
  );
}
