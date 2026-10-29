import { Check } from "lucide-react";
import { ArtCard, ArtPill, Coin, CoinRow, Lbl } from "@/components/landing/art";
import { CONTAINER, FLOW, H2, HEAD, LEAD, SPLIT, sentences } from "@/components/landing/layout";
import { cx } from "@/components/ui";
import { LANDING_NAMES_SOL } from "@/lib/faq";
import { copy } from "@/lib/copy";

/**
 * What it is (`#what`, design-spec §4.3; 41 words, 42 with Solana): it answers "real or wrapped, and who can move it?".
 * The art (left from 1024, after the text on phones) is a flat sunken panel holding the card, with its Bitcoin,
 * Ethereum and Solana address tags (D-45) hanging from its bottom edge on strings: the addresses are attached to the card, so they go
 * with it without a word. The tags swing in once on enter (motion/enter.ts); they hang still with no JS and under
 * reduced motion.
 */
export function WhatSection() {
  const w = copy.landing.what;
  const d = copy.landing.desk;
  const [first, ...rest] = sentences(w.h2);
  return (
    <section id="what" aria-labelledby="what-title" className={FLOW}>
      <div className={cx(CONTAINER, SPLIT)}>
        <div className={HEAD}>
          <h2 id="what-title" className={H2}>
            {first} <span className="whitespace-nowrap">{rest.join(" ")}</span>
          </h2>
          <p className={LEAD}>{w.body(LANDING_NAMES_SOL)}</p>
        </div>
        <div className="lp-what lg:order-first" aria-hidden="true" data-enter="what">
          <ArtCard name={d.name} className="lp-card--md" foot={<ArtPill tone="success" icon={Check} l={copy.pill.active} />}>
            <CoinRow chain="btc" value={d.btc} />
            <CoinRow chain="evm" value={d.eth} />
          </ArtCard>
          <div className="lp-what__tags">
            <AddressTag chain="btc" k="addr-btc" label={w.tags.btc} short={w.tags.btcShort} address={w.tags.btcAddr} />
            <AddressTag chain="evm" k="addr-eth" label={w.tags.evm} short={w.tags.evmShort} address={w.tags.evmAddr} />
            <AddressTag chain="sol" k="addr-sol" label={w.tags.sol} short={w.tags.solShort} address={w.tags.solAddr} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A tag on a string: the chain charm, "Bitcoin address" ("Bitcoin" below 480 px) and a generic, shortened address. */
function AddressTag({ chain, k, label, short, address }: { chain: "btc" | "evm" | "sol"; k: string; label: string; short: string; address: string }) {
  return (
    <div className="lp-addr" data-k={k}>
      <Coin chain={chain} />
      <span className="lp-addr__text">
        <span className="lp-addr__label" data-l={label} data-short={short} />
        <Lbl l={address} className="lp-addr__addr" />
      </span>
    </div>
  );
}
