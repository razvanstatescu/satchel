import { Check, CircleCheck, LoaderCircle, Pause, Play, ScrollText, Snowflake } from "lucide-react";
import { ChainCharm, Sparkle } from "@/components/brand";
import { ArtBadge, ArtCard, ArtIcon, ArtPill, CoinRow, Lbl } from "@/components/landing/art";
import { copy } from "@/lib/copy";

/**
 * The hero's stage, "the shelf" (design-spec §4.2, hero A; LANDING-CONCEPT-READY "The hero loop"): a flat sky field (a
 * Day island) holding the sample card, its 300 NEAR price tag and the buyer's check slip, with the brand's hanging coins
 * at its ends from 1100 px. Simulated and generic: roles, round amounts, no token id.
 *
 * The server HTML is the loop's act 3 at rest (for sale, checked, clean): with no JS and under reduced motion that is
 * the whole picture. With full motion the engine (hero/engine.ts) mounts on exactly this frame (START_AT) and plays the
 * 12 s story in place, every moving piece marked `data-k` (hero/timeline.ts), the layers it needs already laid out
 * (the plate under the card, the unseen Yours, the pill and row stacks, the caption ticker).
 *
 * Text layer: the visually hidden description, then the four captions as a list (the act on show is `aria-current`).
 * The scene and the visible ticker are `aria-hidden`, their labels drawn from attributes. Pause has one name plus
 * `aria-pressed` (WCAG 2.2.2) and shows only while the loop runs.
 */
export function HeroStage() {
  const a = copy.landing.hero.anim;
  const d = copy.landing.desk;
  const p = copy.pill;
  return (
    <figure className="lp-stage" data-scheme="day" data-stage="" data-act="3">
      <p className="sr-only">{a.alt}</p>
      <div className="lp-hang lp-hang--l" data-charm="" aria-hidden="true">
        <ChainCharm chain="btc" size={64} />
      </div>
      <div className="lp-hang lp-hang--r" data-charm="" aria-hidden="true">
        <ChainCharm chain="evm" size={64} />
      </div>
      <div className="lp-hang lp-hang--l2" data-charm="" aria-hidden="true">
        <ChainCharm chain="sol" size={64} />
      </div>
      <div className="lp-stage__scene" data-scene="" aria-hidden="true">
        <div className="lp-stage__card" data-k="card">
          <div className="lp-stage__hanger" data-k="hanger">
            <div className="lp-stage__plate" data-k="plate" />
            <ArtCard
              name={d.name}
              badge={<ArtBadge kind="yours" l={copy.card.yours} data-k="yours" />}
              foot={
                <span className="lp-stack lp-stack--start">
                  <ArtPill tone="frozen" icon={Snowflake} l={p.listed} data-k="pill-paused" />
                  <ArtPill tone="success" icon={Check} l={p.active} data-k="pill-active" data-off="" />
                </span>
              }
            >
              <CoinRow chain="btc" value={d.btc} k="btc" />
              <CoinRow chain="evm" value={d.eth} k="eth" />
            </ArtCard>
          </div>
        </div>
        <span className="lp-hangtag lp-stage__tag" data-k="tag">
          <Lbl l={d.price} />
        </span>
        <div className="lp-slip lp-stage__slip" data-k="slip">
          <p className="lp-slip__head">
            <ArtIcon icon={ScrollText} />
            <Lbl l={d.sigs} />
          </p>
          <Lbl l={d.checkedBy} className="lp-slip__meta" />
          <ol className="lp-slip__rows">
            {([1, 2, 3] as const).map((n) => (
              <li key={n} className="lp-slip__row">
                <Lbl l={d.sig(n)} />
                <span className="lp-stack lp-stack--end">
                  <span className="lp-slip__state" data-k={`sig-${n}-used`}>
                    <ArtIcon icon={Check} />
                    <Lbl l={d.settled} />
                  </span>
                  <span className="lp-slip__state lp-slip__state--checking" data-k={`sig-${n}-checking`} data-off="">
                    <ArtIcon icon={LoaderCircle} />
                    <Lbl l={d.checking} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="lp-slip__verdict" data-k="verdict">
            <ArtIcon icon={CircleCheck} />
            <Lbl l={d.clean} />
          </p>
        </div>
        <span className="lp-stage__spark lp-stage__spark--a" data-k="spark-1">
          <Sparkle size={30} />
        </span>
        <span className="lp-stage__spark lp-stage__spark--b" data-k="spark-2">
          <Sparkle size={16} />
        </span>
      </div>
      <div className="lp-stage__bar">
        <div className="lp-stage__progress">
          <ol className="lp-stage__steps" aria-label={a.stepsLabel}>
            {a.captions.map((c, i) => (
              <li key={c} className="lp-stage__step" data-step={i + 1} data-done={i < 2 ? "" : undefined} aria-current={i === 2 ? "step" : undefined}>
                <b aria-hidden="true" data-k={`bar-${i + 1}`} />
                <span className="sr-only">{c}</span>
              </li>
            ))}
          </ol>
          <p className="lp-stage__ticker" aria-hidden="true">
            {a.captions.map((c, i) => (
              <span key={c} data-cap={i + 1} data-k={`cap-${i + 1}`}>
                <Lbl l={a.count(i + 1, a.captions.length)} className="lp-stage__count" />
                <Lbl l={c} />
              </span>
            ))}
          </p>
        </div>
        <button type="button" className="lp-stage__pause" data-pause="" aria-pressed="false" aria-label={a.pause}>
          <ArtIcon icon={Pause} className="lp-i-pause" />
          <ArtIcon icon={Play} className="lp-i-play" />
        </button>
      </div>
    </figure>
  );
}
