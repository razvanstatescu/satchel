import { ObjCol, ObjMain } from "@/components/SatchelWallet";
import { OwnerActions, ViewerCard } from "@/components/client/SatchelPage";
import { TxList } from "@/components/client/TxList";
import type { TxFilter, TxSourceKey } from "@/lib/chain-txs";
import type { SatchelSnapshot } from "@/lib/data/types";

/**
 * The Transactions tab's two grid items: the card and the owner's actions in the column (from 1024), and in the main
 * block the list (TxList), which reads every source in parallel from the browser and fills in as each one answers.
 * The page itself never waits on a chain. Its lead explaining Transactions vs. Activity is gone (less-labels):
 * /questions#q-txs-vs-activity covers it once.
 */
export function TransactionsView({ snap, sources, filter }: { snap: SatchelSnapshot; sources: readonly TxSourceKey[]; filter: TxFilter }) {
  return (
    <>
      <ObjCol lgOnly>
        <ViewerCard snap={snap} />
        <OwnerActions snap={snap} />
      </ObjCol>
      <ObjMain data-transactions="">
        <TxList tokenId={snap.token_id} sources={sources} initialFilter={filter} evmAddress={snap.addresses.evm} />
      </ObjMain>
    </>
  );
}
