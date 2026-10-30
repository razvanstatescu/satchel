import type { ComponentProps, ReactNode } from "react";
import { Addresses } from "@/components/Addresses";
import { FactsGrid, HowItWorks, SectionHead, VerifyDisclosure } from "@/components/Facts";
import { AllowanceFacts, AllowanceOwnerPanel, DelegateBanner } from "@/components/client/Allowance";
import { HoldingsList, InsideOverview } from "@/components/client/Holdings";
import { ShareFundLink } from "@/components/client/ShareFundLink";
import { Freshness, VisitorOnly, WalletColumn } from "@/components/client/SatchelPage";
import { IncomingOffers } from "@/components/client/Market";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import type { SatchelSnapshot } from "@/lib/data/types";
import type { OfferView } from "@/lib/near/types";

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
    <div data-obj-main className={cx("flex min-w-0 flex-col gap-8 lg:[grid-area:main] group-data-[pending-tab]/obj:hidden", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * The Wallet tab (app-screens §3; proto app-satchel.html): the column (the attention card, the card, the sale block,
 * the owner's actions) and the main block (Inside: every coin in one list; the offers; the addresses; Facts, Verify,
 * How it works for visitors). Every judge fact is server-rendered text: the amounts, the full grouped addresses
 * (`data-full-address`) and the Facts `dl`, all inside the main block, which is the page's one `[data-judge-facts]`
 * (app-screens §1.3). The flows (send, give, add coins, a coin's sheet) render it as their inert background.
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
          {/* the public Add coins page (lib/fund.ts), for anyone: one tap from the top of the coins */}
          <SectionHead id="inside-title" title={copy.page.inside} action={<ShareFundLink tokenId={snap.token_id} />} />
          {/* every coin, on every network and inside (C2, C3, C6), in one list; a row opens its sheet */}
          <div className="flex flex-col gap-3">
            <InsideOverview snap={snap} />
            <HoldingsList snap={snap} />
          </div>
          <Freshness snap={snap} />
        </section>
        <IncomingOffers snap={snap} offers={offers} />
        <Addresses snap={snap} />
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
