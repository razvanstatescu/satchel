import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ChainCharm } from "@/components/brand";
import { JsonLd } from "@/components/JsonLd";
import { Faq } from "@/components/marketing/blocks";
import { Rich } from "@/components/marketing/Rich";
import { GUTTER } from "@/components/NavShell";
import { Button, cx } from "@/components/ui";
import { formatDate, marketing, type FaqEntry } from "@/lib/copy/marketing";
import { pagePath, relatedPages, type MarketingPage } from "@/lib/marketing-pages";
import { articleLd, breadcrumbLd, faqLd, jsonLdGraph, organizationLd, stripLinks } from "@/lib/seo";
import { APP_URL } from "@/lib/config";

/**
 * The article template for every marketing page (docs/design/seo/technical-audit.md §5; geo-research.md §5). Pure server
 * components: no client JS of its own, text LCP, explicit sizes on the art, no layout shift. It renders inside the
 * `(landing)` layout, so it shares the landing's top bar and footer. Order: breadcrumb, H1, the answer block (the first
 * 30% of a page is where citations come from), the updated date, the sections (children), the FAQ, the CTA band, then
 * related guides. Product framing, like the landing (D-52): the header badge is the only network signal. JSON-LD (Article, BreadcrumbList and, with a FAQ, FAQPage) mirrors the visible text.
 */

const T = marketing.template;

export const ARTICLE_COLUMN = cx(GUTTER, "mx-auto w-full max-w-[50rem]");

export function Breadcrumb({ trail }: { trail: readonly { name: string; href?: string }[] }) {
  return (
    <nav aria-label={T.breadcrumbLabel}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 p-0 font-sans text-body-sm text-ink-muted">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.name} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className="inline-flex min-h-11 items-center text-ink-muted underline-offset-3 hover:text-ink hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cx("inline-flex min-h-11 items-center", last && "text-ink")}>
                  {c.name}
                </span>
              )}
              {last ? null : <ChevronRight size={14} aria-hidden="true" className="flex-none" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The CTA band: a Day-island coral panel (constant in both themes). */
export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" data-scheme="day" className="mt-12 flex flex-col gap-4 rounded-card bg-brand p-6 text-on-brand md:mt-14 md:p-8">
      <h2 id="cta-title" className="m-0 text-[1.5rem]/[1.875rem] font-extrabold tracking-[-0.02em] text-on-brand md:text-title">
        {T.cta.title}
      </h2>
      <p className="m-0 max-w-[34rem] text-body font-medium">{T.cta.body}</p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="paper" size="lg" href="/s/1" iconEnd={ArrowRight}>
          {T.cta.primary}
        </Button>
        <Button variant="ghost-on-brand" size="lg" href="/market">
          {T.cta.secondary}
        </Button>
      </div>
    </section>
  );
}

/** Related guides: the other ready guides from the registry, then the two reference pages (never a dead end). */
export function RelatedGuides({ slug }: { slug: string }) {
  const items: { href: string; title: string; body: string }[] = [
    ...relatedPages(slug).map((p) => ({ href: pagePath(p), title: p.title, body: p.description })),
    ...marketing.learn.more.map((m) => ({ href: m.href, title: m.label, body: m.body })),
  ];
  return (
    <section aria-labelledby="related-title" className="mt-12 md:mt-14">
      <h2 id="related-title" className="m-0 text-[1.5rem]/[1.875rem] font-extrabold tracking-[-0.02em] text-ink md:text-title">
        {T.related}
      </h2>
      <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex h-full min-h-11 flex-col gap-1 rounded-md border border-line bg-surface p-4 text-ink no-underline transition-colors duration-120 hover:border-line-strong">
              <span className="font-display text-heading">{it.title}</span>
              <span className="text-body-sm text-ink-muted">{it.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface ArticleShellProps {
  page: MarketingPage;
  /** The 1 to 2 sentence definition or answer, first on the page (`[label](/path)` links allowed). */
  answer: string;
  /** The FAQ block, rendered as visible HTML and mirrored in FAQPage JSON-LD. */
  faq?: readonly FaqEntry[];
  schemaType?: "Article" | "TechArticle";
  children: ReactNode;
}

export function ArticleShell({ page, answer, faq, schemaType = "Article", children }: ArticleShellProps) {
  const path = pagePath(page);
  const crumb = page.short ?? page.title;
  const trail = [
    { name: T.home, href: "/" },
    { name: T.learn, href: "/learn" },
    { name: crumb },
  ];
  const nodes = [
    organizationLd(APP_URL),
    articleLd({ path, headline: page.title, description: page.description, published: page.published ?? page.updated, modified: page.updated, type: schemaType }, APP_URL),
    breadcrumbLd(
      [
        { name: T.home, path: "/" },
        { name: T.learn, path: "/learn" },
        { name: crumb, path },
      ],
      APP_URL,
    ),
    ...(faq?.length ? [faqLd(faq.map((f) => ({ q: f.q, a: stripLinks(f.a) })))] : []),
  ];
  return (
    <article className={cx(ARTICLE_COLUMN, "pt-2 pb-16 md:pt-4 md:pb-24")} data-page={page.slug}>
      <JsonLd data={jsonLdGraph(...nodes)} />
      <Breadcrumb trail={trail} />
      <header className="mt-4 flex flex-col gap-5 md:mt-6">
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="flex items-center gap-1">
            <ChainCharm chain="btc" size={28} />
            <ChainCharm chain="evm" size={28} />
            <ChainCharm chain="sol" size={28} />
          </div>
          <p className="m-0 rounded-pill bg-surface-sunken px-3 py-1 font-sans text-body-sm font-semibold text-ink-muted">{T.guide}</p>
        </div>
        <h1 className="m-0 text-section md:text-section-md">{page.title}</h1>
        <div className="max-w-[42rem] rounded-card border-3 border-sticker bg-surface p-5 shadow-sticker md:p-6" data-testid="answer">
          <p className="m-0 text-lead text-ink md:text-lead-md">
            <Rich text={answer} />
          </p>
        </div>
        <p className="m-0 font-sans text-body-sm text-ink-muted">
          <time dateTime={page.updated}>{T.updated(formatDate(page.updated))}</time>
        </p>
      </header>
      {children}
      {faq?.length ? <Faq title={T.faq} items={faq} /> : null}
      <CtaBand />
      <RelatedGuides slug={page.slug} />
    </article>
  );
}
