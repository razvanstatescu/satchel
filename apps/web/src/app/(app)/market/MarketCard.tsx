"use client";

import { SatchelCard } from "@/components/SatchelCard";
import type { Overview } from "@/lib/overview";
import { useWallet } from "@/lib/near/wallet";

/**
 * A market card (app-screens §9): the Satchel card with its Paused for sale pill, and the lemon Yours sticker on your
 * own listings (known only once the wallet is, so the server HTML shows every card as a visitor sees it). The item's link
 * stretches over it (`group/mkt` on the item): the card lifts on hover and presses on tap with it.
 */
export function MarketCard({ id, tokenId, owner, contents }: { id: string; tokenId: string; owner: string; contents: Overview }) {
  const { accountId } = useWallet();
  return (
    <SatchelCard
      id={id}
      tokenId={tokenId}
      size="lg"
      status="listed"
      owned={!!accountId && accountId === owner}
      contents={contents}
      headingLevel={2}
      className="group-hover/mkt:-translate-y-0.5 group-hover/mkt:shadow-sticker-lift group-active/mkt:translate-y-1 group-active/mkt:shadow-pressed group-active/mkt:duration-60 group-has-data-pressed/mkt:translate-y-1 group-has-data-pressed/mkt:shadow-pressed"
    />
  );
}
