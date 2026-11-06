import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section, Sub } from "@/components/marketing/blocks";
import { buyCopy as C } from "@/lib/copy/pages/buy-a-crypto-wallet";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/** /buy-a-crypto-wallet (keyword-research.md #4): a protective explainer. Leads with the scam patterns, never promises a balance. Server HTML only. */
const page = findPage("buy-a-crypto-wallet")!;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function BuyPage() {
  return (
    <ArticleShell page={page} answer={C.answer} faq={C.faq}>
      <Section id="scams" title={C.scams.h2}>
        <P text={C.scams.lead} />
        <BulletList items={C.scams.items} />
        <Paragraphs items={C.scams.after} />
      </Section>
      <Section id="needs" title={C.needs.h2}>
        <P text={C.needs.lead} />
        <BulletList items={C.needs.items} />
        <P text={C.needs.after} />
      </Section>
      <Section id="questions-to-ask" title={C.ask.h2}>
        <BulletList items={C.ask.items} />
        <P text={C.ask.after} />
      </Section>
      <Section id="compare" title={C.compare.h2}>
        <CompareTable {...C.compare.table} />
      </Section>
      <Section id="satchel" title={C.satchel.h2}>
        <P text={C.satchel.lead} />
        <Sub title={C.satchel.keyH3}>
          <Paragraphs items={C.satchel.key} />
        </Sub>
        <Sub title={C.satchel.checkH3}>
          <Paragraphs items={C.satchel.check} />
        </Sub>
        <Sub title={C.satchel.oneH3}>
          <Paragraphs items={C.satchel.one} />
        </Sub>
      </Section>
      <Section id="limits" title={C.limits.h2}>
        <P text={C.limits.lead} />
        <BulletList items={C.limits.items} />
      </Section>
    </ArticleShell>
  );
}
