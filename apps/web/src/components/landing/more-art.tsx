import { Check, CircleCheck, Copy, Handshake, Link as LinkIcon, Undo2, UserRound, UserRoundPlus } from "lucide-react";
import { Sparkle } from "@/components/brand";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { amountParts, ArtCard, ArtIcon, ArtOverview, ArtPill, Coin, Lbl } from "@/components/landing/art";
import { copy } from "@/lib/copy";

/**
 * "What else it does"'s bento art (site polish round §1.5; server, `aria-hidden`): the product's own UI, boxed in each
 * tile's well (`.lp-tile__art`, `--band`). Every label is drawn from a `data-l` attribute, so the text layer holds only
 * the deck's titles and lines. No third-party logos (Base, Arbitrum, Optimism, USDC are text chips); no names (an
 * avatar is an icon, never "alice"); offers show NEAR only (R1); the spend tile is sending only (R8).
 */
const A = () => copy.landing.more.art;

/** 1 · Make an offer: the card, Active (not for sale), beside the buyer's offer slip, tied by a dashed string. Phones:
 * the slip sits at the well's right edge and the card bleeds off its left edge (its S, pill and "+2" still show). */
export function OfferArt() {
  const d = copy.landing.desk;
  const o = copy.offers;
  const [num, tick] = amountParts(A().offer);
  return (
    <div className="lp-tile__art lp-offer" aria-hidden="true" data-enter="offer">
      <ArtCard name={d.name} className="lp-offer__card">
        <ArtOverview mix={d.mix} usd={d.usd} state={<span className="lp-card__state"><ArtPill tone="success" icon={Check} l={copy.pill.active} /></span>} />
      </ArtCard>
      <div className="lp-slip lp-offer__slip" data-k="offer-slip">
        <p className="lp-slip__head">
          <ArtIcon icon={Handshake} />
          <Lbl l={o.amount} />
        </p>
        <p className="lp-offer__amt">
          <Lbl l={num} className="lp-offer__num" />
          <Lbl l={tick} className="lp-offer__unit" />
        </p>
        <Lbl l={`${o.expiry} ${o.expiry7}`} className="lp-slip__meta lp-offer__exp" />
        <p className="lp-offer__check" data-k="offer-check">
          <span className="lp-offer__tick" data-k="offer-tick">
            <ArtIcon icon={CircleCheck} />
          </span>
          <Lbl l={d.clean} />
        </p>
      </div>
    </div>
  );
}

/** 2 · Give by link: the claim-link slip (path, masked secret, Copy link) and a lemon "Claimed" sticker. */
export function ClaimArt() {
  return (
    <div className="lp-tile__art lp-claim" aria-hidden="true">
      <div className="lp-claim__stack">
        <div className="lp-slip lp-claim__slip">
          <p className="lp-slip__head">
            <ArtIcon icon={LinkIcon} />
            <Lbl l={copy.giveLink.linkLabel} />
          </p>
          <p className="lp-claim__field">
            <Lbl l={A().claimPath} className="lp-claim__path" />
            <Lbl l={A().secret} className="lp-claim__secret" />
          </p>
          <span className="lp-claim__copy">
            <ArtIcon icon={Copy} />
            <Lbl l={copy.giveLink.copy} />
          </span>
        </div>
        <span className="lp-claim__done">
          <ArtIcon icon={CircleCheck} />
          <Lbl l={copy.claim.claimedTitle} />
        </span>
      </div>
    </div>
  );
}

/** 3 · Let someone spend: the owner's Who can spend row: someone (an icon, never a name), their daily cap as a meter
 * (what's left today: 40 %), the cap line and Revoke. Sending only (R8). */
export function AllowArt() {
  const a = copy.allowance;
  return (
    <div className="lp-tile__art lp-allow" aria-hidden="true">
      <div className="lp-slip lp-allow__slip">
        <p className="lp-slip__head">
          <ArtIcon icon={UserRoundPlus} />
          <Lbl l={a.manage.title} />
        </p>
        <div className="lp-allow__row">
          <span className="lp-allow__who">
            <ArtIcon icon={UserRound} />
          </span>
          <Lbl l={a.add.capsTitle} className="lp-allow__caps" />
          <span className="lp-allow__revoke">
            <ArtIcon icon={Undo2} />
            <Lbl l={a.manage.revoke} />
          </span>
        </div>
        <span className="lp-allow__meter">
          <span className="lp-allow__left" />
        </span>
        <p className="lp-allow__line">
          <Coin chain="evm" />
          <Lbl l={a.capRow("ETH", "0.20", "0.50")} />
        </p>
      </div>
    </div>
  );
}

/** 4 · USDC and L2s: ETH and USDC at one address, on four networks (text chips with an ETH-family dot; no logos). */
export function NetsArt() {
  return (
    <div className="lp-tile__art lp-nets" aria-hidden="true">
      <div className="lp-slip lp-nets__slip">
        <p className="lp-nets__head">
          <span className="lp-nets__coins">
            <Coin chain="evm" />
            <span className="lp-coin">
              <CoinIcon coin="USDC" size={28} />
            </span>
          </span>
          <span className="lp-nets__words">
            <Lbl l="ETH" className="lp-nets__tick" />
            <Lbl l="USDC" className="lp-nets__tick" />
          </span>
        </p>
        <Lbl l={A().sameAddress} className="lp-slip__meta lp-nets__meta" />
        <ul className="lp-nets__list">
          {A().networks.map((n) => (
            <li key={n} className="lp-net">
              <Lbl l={n} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 5 · Take it all out: the take-out's done state as a slip (each coin sent) and a sparkle: a celebration. */
export function OutArt() {
  const e = copy.empty;
  return (
    <div className="lp-tile__art lp-out" aria-hidden="true">
      <div className="lp-out__stack">
        <div className="lp-slip lp-out__slip">
          <p className="lp-slip__head lp-slip__head--success">
            <ArtIcon icon={CircleCheck} />
            <Lbl l={e.allDoneTitle} />
          </p>
          <ul className="lp-slip__rows lp-out__rows">
            {([["btc", "Bitcoin"], ["evm", "Ethereum"], ["sol", "Solana"]] as const).map(([c, n]) => (
              <li key={c} className="lp-slip__row lp-out__row">
                <Coin chain={c} />
                <Lbl l={e.chainDone(n)} />
                <span className="lp-slip__state">
                  <ArtIcon icon={Check} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span className="lp-out__spark">
          <Sparkle size={26} />
        </span>
      </div>
    </div>
  );
}

export const MORE_ART = [OfferArt, ClaimArt, AllowArt, NetsArt, OutArt] as const;
