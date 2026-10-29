import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletTab } from "@/components/SatchelWallet";
import { copy } from "@/lib/copy";
import { SOL_SEND_ENABLED, SOL_UI_ENABLED } from "@/lib/config";
import { getSatchelSnapshot } from "@/lib/data/server";
import type { UiChain } from "@/lib/view";
import { ReceiveSheet } from "./ReceiveSheet";

/**
 * /s/[id]/receive?chain= : Add coins (app-screens §8), anyone can open it: a sheet over the Wallet tab. The addresses
 * are derived, so everything but the Incoming line is in the server HTML (no loading state).
 */
export const instant = false;

export async function generateMetadata(props: PageProps<"/s/[id]/receive">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: copy.fund.title(id) };
}

/** BTC by default; ETH; SOL with the Solana UI or the Solana send flag (Send's zero guard links here). */
function pickChain(raw: string | string[] | undefined): UiChain {
  if (raw === "evm") return "evm";
  if (raw === "sol" && (SOL_UI_ENABLED || SOL_SEND_ENABLED)) return "sol";
  return "btc";
}

/** A4: `?amount=` on a shared request link (display only; validated again, chain-side, in ReceiveSheet). */
function pickAmount(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.trim() ? v.trim() : undefined;
}

export default async function ReceivePage(props: PageProps<"/s/[id]/receive">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const snap = await getSatchelSnapshot(id);
  if (!snap) notFound();
  return (
    <>
      <WalletTab snap={snap} />
      <ReceiveSheet snap={snap} chain={pickChain(sp.chain)} amount={pickAmount(sp.amount)} />
    </>
  );
}
