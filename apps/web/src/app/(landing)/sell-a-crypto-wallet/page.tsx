import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section, Steps } from "@/components/marketing/blocks";
import { sellCopy as C } from "@/lib/copy/pages/sell-a-crypto-wallet";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/** /sell-a-crypto-wallet (keyword-research.md #1): why a wallet can't be sold by sharing a seed phrase, and how a Satchel sale works. Server HTML only. */
const page = findPage("sell-a-crypto-wallet")!;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function SellPage() {
  return (
    <ArticleShell page={page} answer={C.answer} faq={C.faq}>
      <Section id="seed" title={C.seed.h2}>
        <Paragraphs items={C.seed.body} />
      </Section>
      <Section id="signatures" title={C.hole.h2}>
        <Paragraphs items={C.hole.body} />
      </Section>
      <Section id="needs" title={C.needs.h2}>
        <P text={C.needs.lead} />
        <BulletList items={C.needs.items} />
        <P text={C.needs.after} />
      </Section>
      <Section id="compare" title={C.compare.h2}>
        <P text={C.compare.lead} />
        <CompareTable {...C.compare.table} />
        <P text={C.compare.after} />
      </Section>
      <Section id="how" title={C.how.h2}>
        <P text={C.how.lead} />
        <Steps items={C.how.steps} />
        <Paragraphs items={C.how.after} />
      </Section>
      <Section id="seller" title={C.gets.h2}>
        <Paragraphs items={C.gets.body} />
      </Section>
      <Section id="limits" title={C.limits.h2}>
        <P text={C.limits.lead} />
        <BulletList items={C.limits.items} />
      </Section>
    </ArticleShell>
  );
}
