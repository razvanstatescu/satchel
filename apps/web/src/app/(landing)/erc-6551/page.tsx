import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section } from "@/components/marketing/blocks";
import { erc6551 } from "@/lib/copy/pages/erc-6551";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/**
 * /erc-6551: ERC-6551 and token bound accounts, compared with Satchel (docs/design/seo/keyword-research.md §2 entry 3).
 * A fair explainer first (the term people search), then the comparison. Satchel is a NEAR NEP-171 contract, not ERC-6551
 * and not on Ethereum; no compatibility claim. Server HTML only.
 */
const page = findPage("erc-6551")!;
const E = erc6551;
const S = E.sections;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function Erc6551Page() {
  return (
    <ArticleShell page={page} answer={E.answer} faq={E.faq}>
      <Section id="what-is-erc-6551" title={S.what.h2}>
        <Paragraphs items={S.what.body} />
      </Section>
      <Section id="prior-art" title={S.credit.h2}>
        <Paragraphs items={S.credit.body} />
      </Section>
      <Section id="chains" title={S.chains.h2}>
        <Paragraphs items={S.chains.body} />
      </Section>
      <Section id="sale-problem" title={S.sale.h2}>
        <Paragraphs items={S.sale.body} />
      </Section>
      <Section id="satchel-sale" title={S.fix.h2}>
        <P text={S.fix.lead} />
        <BulletList items={S.fix.items} />
        <Paragraphs items={S.fix.after} />
      </Section>
      <Section id="compare" title={S.table.h2}>
        <P text={S.table.lead} />
        <CompareTable {...S.table.table} />
      </Section>
      <Section id="which-fits" title={S.choose.h2}>
        <Paragraphs items={S.choose.body} />
      </Section>
    </ArticleShell>
  );
}
