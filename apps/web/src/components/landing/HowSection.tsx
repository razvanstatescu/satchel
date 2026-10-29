import type { ReactNode } from "react";
import { CircleCheck, CircleDashed, LoaderCircle } from "lucide-react";
import { Sparkle } from "@/components/brand";
import { ArtBadge, ArtCard, ArtIcon, CoinRow, Initial, Lbl } from "@/components/landing/art";
import { CONTAINER, FLOW, H2, HEAD_CENTER } from "@/components/landing/layout";
import { cx } from "@/components/ui";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy, TICKER } from "@/lib/copy";
import { NBSP } from "@/lib/format";

/**
 * How it works (`#how`, design-spec §4.5; 47 words, 48 with Solana): the three verbs, "Stick it on. Hand it over." in
 * practice. A centred H2, then three flat panels (3 columns from 1024; a row each, scene beside text, from 640 to 1023;
 * stacked below), each a 206/232 px scene of real UI on top, then a number disc, an H3 and its line:
 * 1. on lemon, the New Satchel card with its New sticker (it drops into its shadow once on enter);
 * 2. on sunken, a mini signing tracker: approved, signing ("Usually about 10 seconds."), sent;
 * 3. on sky, the card hanging from a pin over a "New owner" chip, drawn mid-swing at −8° (it swings to rest once on
 *    enter).
 * The scenes are `aria-hidden` and their labels are attributes; the step text is the copy.
 */
export function HowSection() {
  const h = copy.landing.how;
  const steps = h.steps(LANDING_NAMES_SOL);
  const scenes = [<MintScene key="mint" />, <SignScene key="sign" />, <GiveScene key="give" />];
  return (
    <section id="how" aria-labelledby="how-title" className={FLOW}>
      <div className={CONTAINER}>
        <div className={HEAD_CENTER}>
          <h2 id="how-title" className={H2}>
            {h.h2}
          </h2>
        </div>
        <ol className="m-0 mt-9 grid list-none gap-4 p-0 md:mt-13 md:gap-5 lg:grid-cols-3 lg:gap-6" data-testid="how-steps">
          {steps.map((s, i) => (
            <li key={s.title} data-how-step={i + 1} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface min-[640px]:max-lg:flex-row">
              {scenes[i]}
              <div className="flex flex-col gap-1.5 px-5.5 pt-5 pb-6 md:px-6.5 md:pt-6 md:pb-7 min-[640px]:max-lg:self-center">
                <Lbl
                  l={String(i + 1)}
                  aria-hidden="true"
                  className="mb-2 inline-grid size-8 place-items-center rounded-full bg-inverse font-display text-[1rem] leading-none font-extrabold text-on-inverse"
                />
                <h3 className="text-heading">{s.title}</h3>
                <p className="text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** A step's scene box: 206 px tall (232 from 1024), beside the text from 640 to 1023 (46 %), a flat field. */
function Scene({ tone, children }: { tone: "lemon" | "sunken" | "sky"; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      data-scheme={tone === "sunken" ? undefined : "day"}
      className={cx(
        "relative grid h-[206px] shrink-0 place-items-center overflow-hidden border-b border-line lg:h-[232px] min-[640px]:max-lg:h-auto min-[640px]:max-lg:min-h-[206px] min-[640px]:max-lg:w-[46%] min-[640px]:max-lg:border-r min-[640px]:max-lg:border-b-0",
        tone === "lemon" ? "bg-lemon" : tone === "sky" ? "bg-sky" : "bg-surface-sunken",
      )}
    >
      {children}
    </div>
  );
}

function MintScene() {
  const zero = (t: string) => `0${NBSP}${t}`;
  return (
    <Scene tone="lemon">
      <span className="lp-spark lp-spark--a" data-k="mint-spark-1">
        <Sparkle size={24} />
      </span>
      <span className="lp-spark lp-spark--b" data-k="mint-spark-2">
        <Sparkle size={16} />
      </span>
      <ArtCard name={copy.card.preview} badge={<ArtBadge kind="new" l={copy.card.new} data-k="mint-new" />} className="lp-how-card" data-k="mint-card">
        <CoinRow chain="btc" value={zero(TICKER.btc)} zero />
        <CoinRow chain="evm" value={zero(TICKER.evm)} zero />
      </ArtCard>
    </Scene>
  );
}

function SignScene() {
  return (
    <Scene tone="sunken">
      <div className="lp-slip lp-tracker">
        <ol className="lp-tracker__list">
          <li className="lp-tracker__step" data-state="done">
            <ArtIcon icon={CircleCheck} className="lp-tracker__mark" />
            <Lbl l={copy.sign.steps.wallet.done} className="lp-tracker__label" />
          </li>
          <li className="lp-tracker__step" data-state="active">
            <ArtIcon icon={LoaderCircle} className="lp-tracker__mark" />
            <Lbl l={copy.pill.signing} className="lp-tracker__label" />
            <Lbl l={copy.sign.mpc[0]} className="lp-tracker__meta" />
          </li>
          <li className="lp-tracker__step" data-state="future">
            <ArtIcon icon={CircleDashed} className="lp-tracker__mark" />
            <Lbl l={copy.landing.clean.labels.sent} className="lp-tracker__label" />
          </li>
        </ol>
      </div>
    </Scene>
  );
}

function GiveScene() {
  const d = copy.landing.desk;
  const newOwner = copy.landing.uses.tags[2];
  return (
    <Scene tone="sky">
      <div className="-mt-1.5 flex flex-col items-center gap-3.5">
        <div className="lp-pin">
          <div className="lp-pose" data-k="give-pose">
            <ArtCard name={d.name} className="lp-card--sm">
              <CoinRow chain="btc" value={d.btc} />
              <CoinRow chain="evm" value={d.eth} />
            </ArtCard>
          </div>
        </div>
        <span className="lp-owner">
          <Initial of={newOwner} />
          <Lbl l={newOwner} />
        </span>
      </div>
    </Scene>
  );
}
