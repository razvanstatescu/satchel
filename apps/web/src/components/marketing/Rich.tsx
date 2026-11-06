import Link from "next/link";
import { Fragment } from "react";

const LINK = "text-link underline underline-offset-3 decoration-1 hover:decoration-2";

/**
 * Inline text with `[label](/path)` links (the copy files' only markup). Internal paths use `next/link`; anything
 * else is a plain anchor. Server component. `stripLinks` (seo.ts) gives the same text without the markup.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const label = m[1]!;
        const href = m[2]!;
        return href.startsWith("/") ? (
          <Link key={i} href={href} className={LINK}>
            {label}
          </Link>
        ) : (
          <a key={i} href={href} className={LINK} rel="noreferrer">
            {label}
          </a>
        );
      })}
    </>
  );
}
