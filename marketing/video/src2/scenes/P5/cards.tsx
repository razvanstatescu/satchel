import type { CSSProperties } from "react";
import { AllowanceCard, ClaimLinkCard, OfferCard } from "../../components/ui";

/**
 * v4 feature stickers for P4–P6 (scene builder 3): thin adapters over the shared app-art cards
 * (src2/components/ui/feature-cards.tsx), sized in the scenes' units (`k` × the landing art's width).
 *   AllowanceSticker  "Who can spend" · Daily caps · Revoke · "0.20 of 0.50 ETH left today"   (P4)
 *   ClaimLinkSticker  "The claim link" · /claim#•••• · Copy link · lemon "Claimed"              (P5)
 *   OfferSticker      "Your offer" · 42,000 NEAR · Expires in 7 days · ✓ Clean history → ✓ Accepted (P6)
 */

/** Rendered heights (px) per unit of width, from the kit's authored 300-wide boxes. */
export const CARD_H = { allowance: 168 / 300, claim: 164 / 300, offer: 182 / 300 } as const;

/** "Who can spend" (P4): `left` ETH left today of 0.50; `pulse` 0..1 breathes it on "within daily limits". */
export function AllowanceSticker({ k = 2, left = 0.2, who = "sam.near", pulse = 0, style }: { k?: number; left?: number; who?: string; pulse?: number; style?: CSSProperties }) {
  return (
    <div style={{ scale: `${1 + 0.04 * pulse}`, transformOrigin: "50% 50%", ...style }}>
      <AllowanceCard width={250 * k} left={left} cap={0.5} account={who} />
    </div>
  );
}

/** "The claim link" (P5): `claimed` 0..1 pops the lemon "Claimed" badge. */
export function ClaimLinkSticker({ k = 2, claimed = 0, style }: { k?: number; claimed?: number; style?: CSSProperties }) {
  return <ClaimLinkCard width={236 * k} claimed={claimed > 0.001} claimedPop={Math.min(1, claimed)} style={style} />;
}

/** "Your offer" (P6): 42,000 NEAR; `accepted` 0..1 punches in "✓ Accepted". */
export function OfferSticker({ k = 2, accepted = 0, style }: { k?: number; accepted?: number; style?: CSSProperties }) {
  return <OfferCard width={230 * k} amount="42,000" accepted={accepted > 0.001} acceptPop={Math.min(1, accepted)} style={style} />;
}
