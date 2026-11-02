import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { CONTAINER, FLOW, H2, HEAD_CENTER } from "@/components/landing/layout";
import { Icon } from "@/components/ui";
import { CONTRACT_ROLE } from "@/lib/config";
import { copy, type SolVariant } from "@/lib/copy";
import { faqItems, LANDING_SOL, splitLead } from "@/lib/faq";
import type { ContractRole } from "@/lib/lock-facts";

/**
 * Questions (`#questions`, design-spec §4.8; 39 words while closed): the honest limits, fast to scan. Centred, 820 px at
 * most: seven closed native `<details name="faq">` (one open at a time where supported; no JS either way), each with its
 * anchor id, a summary in Funnel 18/24 (20/26 from 768) at least 64 px tall (72 from 768) and a plus that turns 45°.
 * Every answer is in the server HTML, its first sentence the bold lead. `q-proves` carries the landing's one disclosure
 * (D-42): the buyer's browser, not the contract, runs the check. The chains answer takes the same `SolVariant` as Under
 * the hood's rules; `role` adds the dev line to the custody answer.
 */
export function QuestionsSection({ role = CONTRACT_ROLE, sol = LANDING_SOL }: { role?: ContractRole; sol?: SolVariant }) {
  const items = faqItems({ role, sol });
  return (
    <section id="questions" aria-labelledby="questions-title" className={FLOW}>
      <div className={CONTAINER}>
        <div className="mx-auto max-w-[51.25rem]">
          <div className={HEAD_CENTER}>
            <h2 id="questions-title" className={H2}>
              {copy.landing.questions.h2}
            </h2>
          </div>
          <div className="mt-7 border-t border-line md:mt-10" data-testid="questions">
            {items.map((it) => {
              const { lead, rest } = splitLead(it.a);
              return (
                <details key={it.id} id={it.id} name="faq" data-question={it.id} className="group scroll-mt-24 border-b border-line">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 rounded-sm px-1 py-4 font-display text-[1.125rem]/6 font-bold tracking-[-0.01em] md:min-h-18 md:text-[1.25rem]/6.5 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">{it.q}</span>
                    <Icon
                      icon={Plus}
                      size={22}
                      className="ml-auto text-ink-muted transition-transform duration-220 ease-out group-open:rotate-45 group-open:text-ink motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="max-w-[42.5rem] pr-11 pb-5.5 pl-1 text-ink-muted">
                    <strong className="font-semibold text-ink">{lead}</strong>
                    {rest ? ` ${rest}` : null}
                  </p>
                </details>
              );
            })}
          </div>
          <p className="mt-6 text-center">
            <Link
              href="/questions"
              className="inline-flex min-h-11 items-center gap-1 font-sans text-label font-semibold text-link underline-offset-3 hover:underline"
            >
              {copy.landing.questions.all}
              <Icon icon={ChevronRight} size={16} />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
