import { Fragment } from "react";
import { Rich } from "@/components/marketing/Rich";
import { PROSE } from "@/components/marketing/blocks";
import { cx } from "@/components/ui";

/**
 * Developer-page blocks (the /chain-signatures case study). Pure server components, like the rest of the article
 * template: the code is plain text in the first HTML response, with no highlighter and no client JS.
 */

/**
 * A code sample in a figure. The box scrolls sideways inside itself (a focusable, named region), so a long line never
 * widens the page at 320 px. The caption names the figure; the language shows in a small tag for readers.
 */
export function CodeBlock({ caption, lang, code }: { caption: string; lang: string; code: string }) {
  return (
    <figure className="m-0 flex w-full min-w-0 flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-2 font-sans text-body-sm text-ink-muted">
        <span className="rounded-pill bg-surface-sunken px-2 py-0.5 font-mono text-[0.75rem]/[1.125rem] text-ink">{lang}</span>
        <span>{caption}</span>
      </figcaption>
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-md border border-line bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <pre className="m-0 w-max min-w-full p-4 font-mono text-[0.8125rem]/[1.375rem] text-ink">
          <code>{code}</code>
        </pre>
      </div>
    </figure>
  );
}

/**
 * A paragraph where `backticks` mark inline code and `[label](/path)` marks a link (the copy files' two bits of
 * markup). Everything outside the backticks goes through `<Rich>`.
 */
export function CodeP({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <p className={cx("m-0", PROSE, className)}>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-sm bg-surface-sunken px-1 py-0.5 font-mono text-[0.875em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>
            <Rich text={part} />
          </Fragment>
        ),
      )}
    </p>
  );
}

export function CodeParagraphs({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((t) => (
        <CodeP key={t} text={t} />
      ))}
    </>
  );
}
