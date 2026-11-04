import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { QuestionsSearch } from "@/components/client/QuestionsSearch";
import { Icon } from "@/components/ui";
import { CONTRACT_ROLE } from "@/lib/config";
import { copy } from "@/lib/copy";
import { allFaqGroups, LANDING_SOL, splitLead } from "@/lib/faq";

/**
 * /questions: the long version of the homepage's Questions section, every answer in the server HTML
 * with no Suspense fallback (kb/90 §8.1: judges see only server HTML). Reads the same grouped data as the unit
 * tests (`allFaqGroups`), so the homepage's seven and this page's many more never drift apart. A jump list of groups
 * sits above the list; the one client island (`QuestionsSearch`) only filters what's already rendered, so it never
 * changes what JS-off or a judge's crawler sees.
 */
export const instant = false;

export const metadata: Metadata = { title: copy.questionsPage.title, description: copy.questionsPage.meta };

export default function QuestionsPage() {
  const groups = allFaqGroups({ role: CONTRACT_ROLE, sol: LANDING_SOL });
  return (
    <article className="mx-auto flex w-full max-w-180 flex-col gap-7" data-page="questions">
      <header className="flex flex-col gap-2.5">
        <h1 className="m-0 font-display text-title text-ink">{copy.questionsPage.title}</h1>
        <p className="m-0 max-w-[60ch] font-sans text-body text-ink-muted">{copy.questionsPage.lead}</p>
      </header>

      <nav aria-label={copy.questionsPage.jumpLabel} className="flex flex-wrap gap-2">
        {groups.map(({ group }) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 font-sans text-body-sm text-ink-muted no-underline transition-colors duration-120 hover:border-line-strong hover:text-ink"
          >
            {group.title}
          </a>
        ))}
      </nav>

      <QuestionsSearch>
        <p data-faq-empty hidden className="m-0 font-sans text-body-sm text-ink-muted">
          {copy.questionsPage.noMatches}
        </p>
        <div className="flex flex-col gap-9">
          {groups.map(({ group, items }) => (
            <section key={group.id} id={group.id} data-faq-group className="scroll-mt-20">
              <h2 className="m-0 mb-2 font-display text-heading text-ink">{group.title}</h2>
              <div className="border-t border-line">
                {items.map((it) => {
                  const { lead, rest } = splitLead(it.a);
                  return (
                    <details key={it.id} id={it.id} data-faq-q={it.q} className="group scroll-mt-20 border-b border-line">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-sm py-3.5 font-sans text-[1rem] font-bold tracking-[-0.01em] text-ink [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0">{it.q}</span>
                        <Icon
                          icon={Plus}
                          size={18}
                          className="ml-auto flex-none text-ink-muted transition-transform duration-220 ease-out group-open:rotate-45 group-open:text-ink motion-reduce:transition-none"
                        />
                      </summary>
                      <p className="max-w-[60ch] pr-9 pb-5 pl-0.5 font-sans text-body-sm text-ink-muted">
                        <strong className="font-semibold text-ink">{lead}</strong>
                        {rest ? ` ${rest}` : null}
                      </p>
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </QuestionsSearch>
    </article>
  );
}
