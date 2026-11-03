import { ArrowRight } from "lucide-react";
import { ChainCharm } from "@/components/brand";
import { HeroStage } from "@/components/landing/hero/HeroStage";
import { CONTAINER, sentences } from "@/components/landing/layout";
import { Button } from "@/components/ui";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

/**
 * The hero, option A "the shelf" (design-spec §4.2; R12.2). The 5-second test: what it is (the H1's first sentence and
 * a card holding 0.05 BTC and 0.80 ETH), who it's for ("Sell a wallet…" and the lead) and why it's safe (the H1's second
 * sentence and the slip "Clean history, checked in the buyer's browser").
 *
 * - The H1 is C (R12.1) and two-tone: the first sentence in ink, the second in ink-muted; one sentence per line from
 *   1024, centred from 768. On phones a small charm row sits above it (the first screen's one illustration cluster).
 * - "Look inside a Satchel" is the viewport's one coral fill (→ /s/1); "See Satchels for sale" is the secondary.
 * - Then the shelf: the stage the hero loop plays on (HeroStage), whose server HTML is the loop's act 3 at rest.
 * Every word is in the server HTML; nothing here reads data.
 */
export function HeroSection() {
  const h = copy.landing.hero;
  const [what, why] = sentences(copy.home.h1);
  return (
    <section id="top" aria-labelledby="hero-title" className="pt-4 pb-14 md:pt-8 md:pb-22 lg:pt-10 xl:pb-26">
      <div className={CONTAINER}>
        <div data-hero-text="" className="flex flex-col items-start gap-5.5 md:items-center md:gap-5 md:text-center">
          <div className="lp-charmrow" aria-hidden="true">
            <span className="lp-charmrow__coin" data-charm="">
              <ChainCharm chain="btc" size={40} />
            </span>
            <span className="lp-charmrow__coin" data-charm="">
              <ChainCharm chain="evm" size={40} />
            </span>
            <span className="lp-charmrow__coin" data-charm="">
              <ChainCharm chain="sol" size={40} />
            </span>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-center">
            <p data-hero-who="" className="rounded-pill bg-surface-sunken px-3 py-1 text-body-sm font-semibold text-ink-muted">
              {h.who}
            </p>
            <h1 id="hero-title" className="text-display md:text-display-md lg:text-[3.125rem] lg:leading-[3.25rem] xl:text-[3.875rem] xl:leading-16">
              <span className="lg:block">{what}</span> <span className="text-ink-muted lg:block">{why}</span>
            </h1>
          </div>
          <p className="max-w-[33rem] text-lead text-ink-muted md:max-w-[40rem] md:text-lead-md">{h.lead(LANDING_NAMES_SOL)}</p>
          <div className="mt-1.5 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center md:justify-center">
            <Button variant="primary" size="xl" href="/s/1" iconEnd={ArrowRight}>
              {h.cta.primary}
            </Button>
            <Button variant="secondary" size="xl" href="/market">
              {h.cta.secondary}
            </Button>
          </div>
        </div>
        <HeroStage />
      </div>
    </section>
  );
}
