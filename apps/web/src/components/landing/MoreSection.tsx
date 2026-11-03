import Link from "next/link";
import { CircleQuestionMark } from "lucide-react";
import { ArtIcon } from "@/components/landing/art";
import { CONTAINER, H2, HEAD, SECTION_Y } from "@/components/landing/layout";
import { MORE_ART } from "@/components/landing/more-art";
import "@/components/landing/more.css";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";

/**
 * "What else it does" (`#more`; site polish round §1; after Trust and Under the hood, before Questions): a bento grid
 * for the five extras the core story leaves out (offers, give by link, allowances, USDC and L2s, take it all out). Its
 * own band (`--band`, kb/81 R4) separates it from the page ground above and below (Clean's `border-block` recipe).
 * Each tile is a flat panel: a well holding one piece of Satchel's own UI (`more-art.tsx`, `aria-hidden`), then the
 * title, its "?" and the line. Server component; every word is in the HTML and every illustration is `aria-hidden`.
 */
export function MoreSection() {
  const m = copy.landing.more;
  return (
    <section id="more" aria-labelledby="more-title" className={cx(SECTION_Y, "lp-band")}>
      <div className={CONTAINER}>
        <div className={HEAD}>
          <h2 id="more-title" className={H2}>
            {m.h2}
          </h2>
        </div>
        <ul className="lp-bento" data-testid="more-features">
          {m.items.map((item, i) => {
            const Art = MORE_ART[i]!;
            return (
              <li key={item.title} className="lp-tile" data-more={i + 1}>
                <Art />
                <div className="lp-tile__text">
                  <div className="lp-tile__head">
                    <h3 className="lp-tile__title">{item.title}</h3>
                    {"help" in item && item.help ? (
                      <Link href={`/questions#${item.help.anchor}`} aria-label={item.help.label} className="lp-tile__help">
                        <ArtIcon icon={CircleQuestionMark} />
                      </Link>
                    ) : null}
                  </div>
                  <p className="lp-tile__body">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
