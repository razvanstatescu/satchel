import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Section, Sub } from "@/components/marketing/blocks";
import { CodeBlock, CodeP, CodeParagraphs } from "@/components/marketing/CodeBlock";
import { chainSignatures } from "@/lib/copy/pages/chain-signatures";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/**
 * /chain-signatures: NEAR Chain Signatures in practice (docs/design/seo/keyword-research.md §2 entries 7 and 10). A
 * developer case study of how one NEP-171 contract signs for Bitcoin, Ethereum and Solana: derivation paths per token,
 * a structured payload the contract hashes, the record written before the call, fan-out and the callback, and native
 * versus wrapped bitcoin. The snippets are excerpts of contracts/satchel/src. TechArticle JSON-LD. Server HTML only.
 */
const page = findPage("chain-signatures")!;
const C = chainSignatures;
const S = C.sections;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function ChainSignaturesPage() {
  return (
    <ArticleShell page={page} answer={C.answer} faq={C.faq} schemaType="TechArticle">
      <Section id="what" title={S.what.h2}>
        <CodeParagraphs items={S.what.body} />
      </Section>
      <Section id="derivation-paths" title={S.paths.h2}>
        <P text={S.paths.lead} />
        <CompareTable {...S.paths.table} />
        <CodeParagraphs items={S.paths.afterTable} />
        <CodeBlock {...S.paths.code} />
        <CodeParagraphs items={S.paths.afterCode} />
        <CodeBlock {...S.paths.code2} />
      </Section>
      <Section id="structured-payload" title={S.payload.h2}>
        <CodeParagraphs items={S.payload.body} />
        <CodeBlock {...S.payload.code} />
        <CodeParagraphs items={S.payload.afterCode} />
      </Section>
      <Section id="record-first" title={S.record.h2}>
        <CodeParagraphs items={S.record.body} />
        <CodeBlock {...S.record.code} />
        <CodeParagraphs items={S.record.afterCode} />
      </Section>
      <Section id="fan-out" title={S.fanout.h2}>
        {S.fanout.subs.map((s) => (
          <Sub key={s.h3} title={s.h3}>
            {s.body.map((t) => (
              <CodeP key={t} text={t} />
            ))}
          </Sub>
        ))}
        <CodeBlock {...S.fanout.code} />
        <CodeParagraphs items={S.fanout.afterCode} />
      </Section>
      <Section id="native-bitcoin" title={S.native.h2}>
        <CodeParagraphs items={S.native.body} />
      </Section>
      <Section id="keep-in-mind" title={S.limits.h2}>
        <P text={S.limits.lead} />
        <BulletList items={S.limits.items} />
      </Section>
      <Section id="see-it" title={S.see.h2}>
        <CodeParagraphs items={S.see.body} />
      </Section>
    </ArticleShell>
  );
}
