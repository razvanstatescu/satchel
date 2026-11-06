import type { Metadata } from "next";
import { ArticleShell } from "@/components/marketing/ArticleShell";
import { BulletList, CompareTable, P, Paragraphs, Section, Steps, Sub } from "@/components/marketing/blocks";
import { transferCopy as C } from "@/lib/copy/pages/transfer-a-crypto-wallet";
import { findPage, pagePath } from "@/lib/marketing-pages";
import { pageMetadata } from "@/lib/seo";

/** /transfer-a-crypto-wallet (keyword-research.md #5): how to hand over a wallet and keep its addresses. Server HTML only. */
const page = findPage("transfer-a-crypto-wallet")!;

export const metadata: Metadata = pageMetadata({
  path: pagePath(page),
  title: page.metaTitle,
  description: page.description,
  type: "article",
  published: page.published,
  modified: page.updated,
});

export default function TransferPage() {
  return (
    <ArticleShell page={page} answer={C.answer} faq={C.faq}>
      <Section id="today" title={C.today.h2}>
        <P text={C.today.lead} />
        <Sub title={C.today.sharing.h3}>
          <Paragraphs items={C.today.sharing.body} />
        </Sub>
        <Sub title={C.today.moving.h3}>
          <Paragraphs items={C.today.moving.body} />
        </Sub>
        <Sub title={C.today.custodian.h3}>
          <Paragraphs items={C.today.custodian.body} />
        </Sub>
      </Section>
      <Section id="compare" title={C.compare.h2}>
        <CompareTable {...C.compare.table} />
      </Section>
      <Section id="give" title={C.give.h2}>
        <P text={C.give.lead} />
        <Steps items={C.give.steps} />
        <Paragraphs items={C.give.after} />
      </Section>
      <Section id="same-addresses" title={C.same.h2}>
        <Paragraphs items={C.same.body} />
      </Section>
      <Section id="by-link" title={C.link.h2}>
        <Paragraphs items={C.link.body} />
        <BulletList items={C.link.items} />
      </Section>
      <Section id="gifts-unchecked" title={C.trust.h2}>
        <Paragraphs items={C.trust.body} />
      </Section>
      <Section id="limits" title={C.limits.h2}>
        <BulletList items={C.limits.items} />
      </Section>
    </ArticleShell>
  );
}
