import type { ReactNode } from "react";
import { C } from "../../brand/tokens";
import { SatchelCard } from "../../components/Sticker";
import { CardBack, type RecordProps } from "../../illustration/characters/CardBack";
import { peelGeometry, polygon } from "../../motion";

/**
 * Satchel #7's front with its top-left corner peeling (H1: alice peels the card off). The stuck part is the shared
 * SatchelCard; the flap is the card's BACK (white backing, ink outline, faint dashed history outlines: the plant paid
 * off at T0), mirrored like a real card (the back is the front flipped about the vertical axis) and then folded over
 * the 45° crease with the kit's peelGeometry. Two reflections make a rotation, so the back reads correctly, turned.
 * The back's sticker S is hidden on the flap (the S never rotates). The flap's hard shadow grows as it lifts.
 */

const BACK_RECORDS: RecordProps[] = [
  { chain: "btc", label: "BTC · coin 7d…e2:1", opacity: 1 }, // the film's canonical record labels (T0, T1, T5, T7)
  { chain: "evm", label: "ETH · nonce 1", opacity: 1 },
  { chain: "sol", label: "SOL · blockhash 9f…", opacity: 1 },
];

/** Where the thumb holding the corner is (card px) for a given peel progress: it rides the flap tip. */
export function peelThumb(w: number, h: number, progress: number, inset = 16) {
  const c = progress * (w + h); // fold line x + y = c (progress·(w+h)/√2 along the diagonal)
  return c > 2 * inset ? { x: c - inset, y: c - inset } : { x: inset, y: inset };
}

/** `between`: drawn over the stuck face but under the flap (the pinching hand's palm and index slide under the flap). */
export function PeelFront({ width, progress, lift, between }: { width: number; progress: number; lift: number; between?: ReactNode }) {
  const k = width / 400;
  const h = (width * 252) / 400;
  const outline = 3 * k;
  const rest = 4 * k;
  const dy = -8 * lift * k; // SatchelCard rises by 8k·lift; the flap rides with it
  if (progress <= 0.002) {
    return (
      <div style={{ position: "relative", width, height: h }}>
        <SatchelCard id="7" width={width} lift={lift} />
        {between}
      </div>
    );
  }
  const g = peelGeometry(width, h, progress, "tl", 80);
  const flapShadow = rest + 12 * Math.min(1, progress * 2.5); // the flap lifts: its hard shadow grows (lighter than the kit's 36 at this size)
  const [a, b] = g.fold;
  return (
    <div style={{ position: "relative", width, height: h }}>
      {/* the stuck part: clipped in the card's (lifted) frame so the crease stays on the fold */}
      <div style={{ position: "absolute", left: 0, top: 0, width, height: h, translate: `0 ${dy}px`, clipPath: polygon(g.stuckClip) }}>
        <div style={{ translate: `0 ${-dy}px` }}>
          <SatchelCard id="7" width={width} lift={lift} />
        </div>
      </div>
      {between}
      <div style={{ position: "absolute", left: 0, top: 0, width, height: h, translate: `0 ${dy}px`, filter: `drop-shadow(0 ${flapShadow.toFixed(1)}px 0 ${C.ink})` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width, height: h, transformOrigin: "0 0", transform: g.matrix, clipPath: polygon(g.peeled) }}>
          {/* the back, as seen through the card: mirrored about the vertical axis */}
          <div style={{ position: "absolute", left: 0, top: 0, width, height: h, transform: "scaleX(-1)", transformOrigin: "50% 50%" }}>
            <CardBack width={width} count={3} records={BACK_RECORDS} showLogo={false} />
          </div>
        </div>
        {a && b ? (
          <svg width={width} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={outline} strokeLinecap="round" />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
