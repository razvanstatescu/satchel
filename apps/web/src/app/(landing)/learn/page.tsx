import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChainCharm } from "@/components/brand";
import { JsonLd } from "@/components/JsonLd";
import { ARTICLE_COLUMN, Breadcrumb } from "@/components/marketing/ArticleShell";
import { cx } from "@/components/ui";
import { formatDate, marketing } from "@/lib/copy/marketing";
import { pagePath, readyPages } from "@/lib/marketing-pages";
import { breadcrumbLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

/**
 * /learn: the hub of the marketing guides. Every ready page in the registry gets a card; nothing here is fetched, so the
 * page is fully prerendered. Plain on purpose: a definition, the cards, two reference links.
 */
const L = marketing.learn;
const T = marketing.template;

export const metadata: Metadata = pageMetadata({ path: "/learn", title: L.metaTitle, description: L.description });

const CARD = "flex h-full min-h-11 flex-col gap-2 rounded-card border-3 border-sticker bg-surface p-5 text-ink no-underline shadow-sticker transition-transform duration-120 hover:-translate-y-0.5";

export default function LearnPage() {
  const guides = readyPages();
  return (
    <div className={cx(ARTICLE_COLUMN, "pt-2 pb-16 md:pt-4 md:pb-24")} data-page="learn">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbLd([
            { name: T.home, path: "/" },
            { name: T.learn, path: "/learn" },
          ]),
        )}
      />
      <Breadcrumb trail={[{ name: T.home, href: "/" }, { name: T.learn }]} />
      <header className="mt-4 flex flex-col gap-4 md:mt-6">
        <div aria-hidden="true" className="flex items-center gap-1">
          <ChainCharm chain="btc" size={32} />
          <ChainCharm chain="evm" size={32} />
          <ChainCharm chain="sol" size={32} />
        </div>
        <h1 className="m-0 text-section md:text-section-md">{L.h1}</h1>
        <p className="m-0 max-w-[38rem] text-lead text-ink-muted md:text-lead-md">{L.intro}</p>
      </header>

      <section aria-labelledby="guides-title" className="mt-10 md:mt-12">
        <h2 id="guides-title" className="m-0 text-[1.5rem]/[1.875rem] font-extrabold tracking-[-0.02em] text-ink md:text-title">
          {L.guidesHeading}
        </h2>
        {guides.length ? (
          <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2" data-testid="guides">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={pagePath(g)} className={CARD} data-press="">
                  <span className="font-display text-heading">{g.title}</span>
                  <span className="text-body-sm text-ink-muted">{g.description}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 font-sans text-label text-link">
                    {L.read}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                  <span className="text-caption text-ink-muted">{T.updated(formatDate(g.updated))}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-body text-ink-muted">{L.empty}</p>
        )}
      </section>

      <section aria-labelledby="more-title" className="mt-10 md:mt-12">
        <h2 id="more-title" className="m-0 text-[1.5rem]/[1.875rem] font-extrabold tracking-[-0.02em] text-ink md:text-title">
          {L.moreHeading}
        </h2>
        <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {L.more.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="flex h-full min-h-11 flex-col gap-1 rounded-md border border-line bg-surface p-4 text-ink no-underline transition-colors duration-120 hover:border-line-strong">
                <span className="font-display text-heading">{m.label}</span>
                <span className="text-body-sm text-ink-muted">{m.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
