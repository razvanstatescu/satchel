import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Rich } from "@/components/marketing/Rich";
import { Icon, cx } from "@/components/ui";
import { CONTRACT_ROLE } from "@/lib/config";
import { marketing, type FaqEntry, type TableCopy } from "@/lib/copy/marketing";

/**
 * The article template's building blocks (docs/design/seo/technical-audit.md §5). Pure server components: no client JS,
 * no state, no effects. Headings are real headings with a clean H1 > H2 > H3 order (the shell owns the H1); every
 * sentence is in the server HTML. Reading width is capped near 66 characters.
 */

export const PROSE = "max-w-[42rem] text-body text-ink";
const H2_CLASS = "m-0 text-[1.5rem]/[1.875rem] font-extrabold tracking-[-0.02em] text-ink md:text-title";
const H3_CLASS = "m-0 text-heading text-ink";

/** An H2 section: a stable anchor id, the heading, then its content with an even rhythm. */
export function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className={cx("mt-10 flex flex-col gap-4 md:mt-12", className)}>
      <h2 id={`${id}-title`} className={H2_CLASS}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** An H3 inside a Section. */
export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={H3_CLASS}>{title}</h3>
      {children}
    </div>
  );
}

/** One paragraph, with `[label](/path)` links. */
/** The no-admin-key line, only where it is true: the release and final contracts (the landing's #trust rule). */
export function KeylessNote() {
  return CONTRACT_ROLE === "dev" ? null : <P text={marketing.template.keyless} />;
}

export function P({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cx("m-0", PROSE, className)}>
      <Rich text={text} />
    </p>
  );
}

export function Paragraphs({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((t) => (
        <P key={t} text={t} />
      ))}
    </>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className={cx("m-0 flex list-disc flex-col gap-2 pl-6 marker:text-ink-muted", PROSE)}>
      {items.map((t) => (
        <li key={t} className="pl-1">
          <Rich text={t} />
        </li>
      ))}
    </ul>
  );
}

/** A numbered list of steps. */
export function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className={cx("m-0 flex list-decimal flex-col gap-3 pl-6 marker:font-bold marker:text-ink", PROSE)}>
      {items.map((t) => (
        <li key={t} className="pl-1">
          <Rich text={t} />
        </li>
      ))}
    </ol>
  );
}

/**
 * A real table: caption, column headers with `scope="col"`, the first cell of each row a row header. It scrolls
 * sideways inside its own focusable region on a narrow screen, so the page never does.
 */
export function CompareTable({ caption, head, rows }: TableCopy) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-md border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <table className="w-full min-w-[34rem] border-collapse text-left text-body-sm text-ink">
        <caption className="border-b border-line bg-surface-sunken px-4 py-3 text-left font-sans text-label text-ink">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 align-bottom font-sans text-label text-ink-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-line last:border-b-0">
              {r.map((cell, i) =>
                i === 0 ? (
                  <th key={cell} scope="row" className="px-4 py-3 align-top font-sans text-label text-ink">
                    {cell}
                  </th>
                ) : (
                  <td key={cell} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A highlighted note: a sunken panel with an icon. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="flex max-w-[42rem] items-start gap-3 rounded-md bg-surface-sunken p-4 text-ink">
      <Icon icon={Info} size={20} className="mt-0.5 flex-none text-ink-muted" />
      <div className="flex min-w-0 flex-col gap-1 text-body-sm">
        {title ? <p className="m-0 font-sans text-label">{title}</p> : null}
        {children}
      </div>
    </aside>
  );
}

/** The FAQ: visible server HTML (a heading and a paragraph per question), never hidden behind a disclosure. */
export function Faq({ id = "faq", title, items }: { id?: string; title: string; items: readonly FaqEntry[] }) {
  return (
    <Section id={id} title={title}>
      <div className="flex max-w-[42rem] flex-col divide-y divide-line border-y border-line" data-testid="faq">
        {items.map((it) => (
          <div key={it.q} className="flex flex-col gap-2 py-5">
            <h3 className={H3_CLASS}>{it.q}</h3>
            <p className="m-0 text-body text-ink">{it.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
