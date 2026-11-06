import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section } from "@/components/marketing/blocks";
import { marketing } from "@/lib/copy/marketing";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/**
 * /clean-history: the reference page for Satchel's headline concept (written from docs/security-model.md,
 * docs/selling.md, docs/how-it-works.md and the SEO claims register). Pure server HTML through the article template.
 * It states what the check does and, as plainly, what it does not: the buyer's browser runs it, the contract does not
 * enforce it, and it is not a guarantee.
 */
const page = findPage("clean-history")!;
const C = marketing.cleanHistory;
const S = C.sections;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function CleanHistoryPage() {
  return (
    <ArticleShell page={page} answer={C.answer} faq={C.faq}>
      <Section id="problem" title={S.problem.h2}>
        <Paragraphs items={S.problem.body} />
      </Section>
      <Section id="record" title={S.record.h2}>
        <Paragraphs items={S.record.body} />
      </Section>
      <Section id="checks" title={S.checks.h2}>
        <P text={S.checks.lead} />
        <CompareTable {...S.checks.table} />
        <Paragraphs items={S.checks.after} />
      </Section>
      <Section id="quiet-period" title={S.quiet.h2}>
        <Paragraphs items={S.quiet.body} />
      </Section>
      <Section id="who-runs-it" title={S.who.h2}>
        <Paragraphs items={S.who.body} />
      </Section>
      <Section id="limits" title={S.limits.h2}>
        <P text={S.limits.lead} />
        <BulletList items={S.limits.items} />
      </Section>
      <Section id="see-it" title={S.see.h2}>
        <Paragraphs items={S.see.body} />
      </Section>
    </ArticleShell>
  );
}
