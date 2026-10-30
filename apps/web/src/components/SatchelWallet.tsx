import type { ComponentProps, ReactNode } from "react";
import { ChainRow } from "@/components/ChainRow";
import { FactsGrid, HowItWorks, SectionHead, VerifyDisclosure } from "@/components/Facts";
import { AllowanceFacts, AllowanceOwnerPanel, DelegateBanner } from "@/components/client/Allowance";
import { Freshness, InsideAddCoins, VisitorOnly, WalletColumn } from "@/components/client/SatchelPage";
import { IncomingOffers, InsideFtRows, InsideNearActions, InsideNearAmount, MakeOfferEntry } from "@/components/client/Market";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import type { OfferView } from "@/lib/near/types";
import { UI_CHAINS } from "@/lib/view";

/**
 * The object page's two grid items (app-screens §1.2): every tab page renders an `ObjCol` (the card and the tab's main
 * block; sticky on the left from 1024) and an `ObjMain` (the tab's content), and the `/s/[id]` layout places them beside
 * its head. Server-safe; shared with C (Sale) so the classes never drift.
 */
export function ObjCol({ lgOnly = false, className, children, ...rest }: { lgOnly?: boolean; className?: string; children: ReactNode } & Omit<ComponentProps<"div">, "children">) {
  return (
    <div data-obj-col className={cx("flex min-w-0 flex-col gap-4 lg:sticky lg:top-10 lg:[grid-area:col]", lgOnly && "max-lg:hidden", className)} {...rest}>
      {children}
    </div>
  );
}

export function ObjMain({ className, children, ...rest }: { className?: string; children: ReactNode } & Omit<ComponentProps<"div">, "children">) {
  return (
    <div data-obj-main className={cx("flex min-w-0 flex-col gap-8 lg:[grid-area:main]", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * The Wallet tab (app-screens §3; proto app-satchel.html): the column (the attention card, the card, the sale block,
 * the owner's actions) and the main block (Inside, the freshness line, Facts, Verify, How it works for visitors). Every
 * judge fact is server-rendered text: the full grouped addresses in the Inside rows (`data-full-address`) and the
 * Facts `dl`, both inside the main block, which is the page's one `[data-judge-facts]` (app-screens §1.3). The flows
 * (send, give, add coins) render it as their inert background.
 */
export function WalletTab({ snap, offers = [] }: { snap: SatchelSnapshot; offers?: OfferView[] }) {
  return (
    <>
      <ObjCol>
        <WalletColumn snap={snap} />
        <DelegateBanner snap={snap} />
        <AllowanceOwnerPanel snap={snap} />
      </ObjCol>
      <ObjMain data-judge-facts="">
        <section aria-labelledby="inside-title">
          <SectionHead id="inside-title" title={copy.page.inside} action={<InsideAddCoins snap={snap} />} />
          <ul aria-label={copy.page.holdings} className="m-0 list-none rounded-md border border-line bg-surface p-0">
            {UI_CHAINS.map((c) => (
              <ChainRow key={c} snap={snap} chain={c} />
            ))}
            {/* C6: NEAR held inside the contract for this token (docs/specs/C4-C6.md), server-rendered next to the
                chain balances, no action required to see it. */}
            <li data-chain-row="near" className="relative flex flex-col gap-2.5 p-4">
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-line" />
              <div className="flex min-w-0 items-center justify-between gap-3">
                <h3 className="m-0 font-sans text-label text-ink">{copy.inside.title}</h3>
                <InsideNearAmount snap={snap} />
              </div>
              <InsideNearActions snap={snap} />
            </li>
            <InsideFtRows snap={snap} />
          </ul>
          <Freshness snap={snap} />
        </section>
        <IncomingOffers snap={snap} offers={offers} />
        <VisitorOnly snap={snap}>
          <div className="flex">
            <MakeOfferEntry snap={snap} />
          </div>
        </VisitorOnly>
        <FactsGrid snap={snap} />
        {/* C5 (docs/specs/C5.md §1.2): a public fact — who else can spend from this Satchel, and under what caps. */}
        <AllowanceFacts snap={snap} />
        <VerifyDisclosure snap={snap} />
        <VisitorOnly snap={snap}>
          <HowItWorks />
        </VisitorOnly>
      </ObjMain>
    </>
  );
}
