import { Fragment } from "react";
import { ArrowRight, Info } from "lucide-react";
import { ART, S_PATH } from "@/components/brand/art";
import { CONTAINER, sentences } from "@/components/landing/layout";
import { Button, Icon } from "@/components/ui";
import { copy } from "@/lib/copy";

/**
 * The final call (`#try-it`, design-spec §4.9; 34 words): the page signs off on the brand cover itself. A full-bleed
 * coral band (a Day island, constant in both themes) with the brand line "Stick it on. Hand it over." in ink at
 * clamp(48–104)/0.95, the body, **Look inside a Satchel** (the paper button: the primary on coral) and **Mint a Satchel**
 * (ghost on coral), and the testnet note. The charm S (never the tiled mark on coral) sits right from 1024 (330 px) and
 * above the H2 on phones (132 px); once on enter its face stamps into its own drop. It never rotates.
 */
export function FinaleSection() {
  const c = copy.landing.cta;
  return (
    <section id="try-it" aria-labelledby="cta-title" data-scheme="day" data-enter="finale" className="overflow-hidden bg-brand text-on-brand">
      <div className={`${CONTAINER} grid items-center gap-6 pt-16 pb-18 md:py-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:py-28`}>
        <div className="min-w-0">
          <h2 id="cta-title" className="text-[clamp(3rem,7.6vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-on-brand">
            {sentences(c.h2).map((s, i) => (
              <Fragment key={s}>
                {i > 0 ? " " : null}
                <span className="block">{s}</span>
              </Fragment>
            ))}
          </h2>
          <p className="mt-5 max-w-[30rem] text-lead font-medium md:text-lead-md">{c.body}</p>
          <div className="mt-7.5 flex flex-col items-stretch gap-3.5 sm:flex-row sm:flex-wrap sm:items-center">
            <Button variant="paper" size="xl" href="/s/1" iconEnd={ArrowRight}>
              {copy.landing.hero.cta.primary}
            </Button>
            <Button variant="ghost-on-brand" size="xl" href="/mint?from=/">
              {copy.mint.cta}
            </Button>
          </div>
          <p className="mt-5.5 inline-flex items-center gap-2 text-[0.875rem] leading-5 font-semibold">
            <Icon icon={Info} size={16} />
            {copy.home.note}
          </p>
        </div>
        <FinaleS />
      </div>
    </section>
  );
}

/**
 * The charm S, inline (logo/satchel-charm.svg): its hard drop, then the face (the ink outline and the white stroke) in
 * its own group, so the finale's stick-on can stamp the face into the drop. Decorative.
 */
function FinaleS() {
  return (
    <svg viewBox="120 80 272 356" width={330} height={432} className="lp-finale-s order-first lg:order-none lg:justify-self-end" aria-hidden="true" focusable="false">
      <path d={S_PATH} transform="translate(0 10)" fill="none" stroke={ART.ink} strokeWidth={92} strokeLinecap="round" data-k="s-drop" />
      <g className="lp-s-face" data-k="s-face">
        <path d={S_PATH} fill="none" stroke={ART.ink} strokeWidth={92} strokeLinecap="round" />
        <path d={S_PATH} fill="none" stroke={ART.white} strokeWidth={56} strokeLinecap="round" />
      </g>
    </svg>
  );
}
