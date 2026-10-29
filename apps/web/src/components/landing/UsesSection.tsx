import { Fragment } from "react";
import { Gift, Tag, UsersRound, type LucideIcon } from "lucide-react";
import { CONTAINER, FLOW, H2, HEAD, LEAD, SPLIT, sentences } from "@/components/landing/layout";
import { cx, Icon } from "@/components/ui";
import { copy } from "@/lib/copy";

/** One sticker tile per use, in `uses.items` order: lemon tag (a sale), sky gift (a gift), white people (a hand-over). */
const TILES: readonly { icon: LucideIcon; bg: string }[] = [
  { icon: Tag, bg: "bg-lemon" },
  { icon: Gift, bg: "bg-sky" },
  { icon: UsersRound, bg: "bg-surface" },
];

/**
 * Use cases (`#uses`, design-spec §4.4; 50 words): who it's for. The pain as the H2, one sentence per line ("Sending
 * coins is easy." / "Handing over a wallet isn't."), the lead "One NFT, one step.", then a ruled list of three rows, each
 * a 56 px sticker tile (64 from 768; a Day island, so it keeps its colours in Night), an H3 and its line. From 1024 the
 * head sits left of the list. Static.
 */
export function UsesSection() {
  const u = copy.landing.uses;
  return (
    <section id="uses" aria-labelledby="uses-title" className={FLOW}>
      <div className={cx(CONTAINER, SPLIT)}>
        <div className={HEAD}>
          <h2 id="uses-title" className={H2}>
            {sentences(u.h2).map((s, i) => (
              <Fragment key={s}>
                {i > 0 ? " " : null}
                <span className="block text-balance">{s}</span>
              </Fragment>
            ))}
          </h2>
          <p className={LEAD}>{u.lead}</p>
        </div>
        <ul className="m-0 flex list-none flex-col p-0" data-testid="use-cases">
          {u.items.map((item, i) => {
            const tile = TILES[i];
            return (
              <li
                key={item.title}
                data-use-case={i + 1}
                className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-x-4.5 gap-y-1 border-t border-line py-5 last:border-b md:grid-cols-[64px_minmax(0,1fr)] md:py-6"
              >
                <span
                  data-scheme="day"
                  aria-hidden="true"
                  className={cx(
                    "row-span-2 grid size-14 place-items-center rounded-[18px] border-2 border-on-brand text-on-brand shadow-[0_3px_0_var(--on-brand)] md:size-16 md:rounded-[20px]",
                    tile.bg,
                  )}
                >
                  <Icon icon={tile.icon} size={26} />
                </span>
                <h3 className="text-heading">{item.title}</h3>
                <p className="text-ink-muted">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
