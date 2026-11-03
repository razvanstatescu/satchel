import Link from "next/link";
import { CircleQuestionMark, Handshake, Layers, Link as LinkIcon, PackageOpen, UserRoundPlus, type LucideIcon } from "lucide-react";
import { ArtIcon } from "@/components/landing/art";
import { CONTAINER, FLOW, H2, HEAD } from "@/components/landing/layout";
import "@/components/landing/more.css";
import { copy } from "@/lib/copy";

/**
 * "What else it does" (`#more`, site-refresh design notes §1; after Trust and Under the hood, before Questions): a lean coda
 * for the five extras the core story leaves out (offers, give by link, allowances, USDC and L2s, take it all out).
 * strip-refs pattern 1: an icon in a flat sunken disc, a title, one line. No card chrome, no coral: the page keeps
 * one "big" list (Uses, stickers) and one "small" list (this one). Server component; every word is in the HTML and
 * every icon is `aria-hidden`.
 */

/** One icon per `landing.more.items` entry, in order (the app's own icon for each feature where it has one). */
const ICONS: readonly LucideIcon[] = [Handshake, LinkIcon, UserRoundPlus, Layers, PackageOpen];

export function MoreSection() {
  const m = copy.landing.more;
  return (
    <section id="more" aria-labelledby="more-title" className={FLOW}>
      <div className={CONTAINER}>
        <div className={HEAD}>
          <h2 id="more-title" className={H2}>
            {m.h2}
          </h2>
        </div>
        <ul className="lp-more" data-testid="more-features">
          {m.items.map((item, i) => (
            <li key={item.title} className="lp-more__item" data-more={i + 1}>
              <span className="lp-more__icon" aria-hidden="true">
                <ArtIcon icon={ICONS[i]!} />
              </span>
              <div className="lp-more__head">
                <h3 className="lp-more__title">{item.title}</h3>
                {"help" in item && item.help ? (
                  <Link href={`/questions#${item.help.anchor}`} aria-label={item.help.label} className="lp-more__help">
                    <ArtIcon icon={CircleQuestionMark} />
                  </Link>
                ) : null}
              </div>
              <p className="lp-more__body">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
