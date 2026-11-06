import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section, Steps, Sub } from "@/components/marketing/blocks";
import { giftCrypto } from "@/lib/copy/pages/gift-crypto";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/**
 * /gift-crypto: how to gift crypto to someone without a wallet (docs/design/seo/keyword-research.md §2 entry 2). A fair
 * look at the usual options first, then Satchel's give by link, with the honesty notes as plain text: testnet today, the
 * receiver connects a NEAR wallet, the link is a bearer secret, gifts skip the buyer's check. Server HTML only.
 */
const page = findPage("gift-crypto")!;
const G = giftCrypto;
const S = G.sections;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function GiftCryptoPage() {
  return (
    <ArticleShell page={page} answer={G.answer} faq={G.faq}>
      <Section id="usual-ways" title={S.usual.h2}>
        <P text={S.usual.lead} />
        {S.usual.subs.map((s) => (
          <Sub key={s.h3} title={s.h3}>
            <P text={s.body} />
          </Sub>
        ))}
      </Section>
      <Section id="compare" title={S.table.h2}>
        <P text={S.table.lead} />
        <CompareTable {...S.table.table} />
        <Paragraphs items={S.table.after} />
      </Section>
      <Section id="by-link" title={S.satchel.h2}>
        <P text={S.satchel.lead} />
        <Steps items={S.satchel.steps} />
        <Paragraphs items={S.satchel.after} />
      </Section>
      <Section id="before-you-send" title={S.know.h2}>
        <P text={S.know.lead} />
        <BulletList items={S.know.items} />
        <Paragraphs items={S.know.after} />
      </Section>
      <Section id="receiver" title={S.seen.h2}>
        <Paragraphs items={S.seen.body} />
      </Section>
    </ArticleShell>
  );
}
