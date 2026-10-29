import { CircleCheck } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F, display } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { EASE, FPS, SPRING, springAt, tween } from "../../lib/time";
import { MaskUp } from "./bits";
import { BuyView } from "./BuyView";
import { PhotoInsert } from "./PhotoInsert";
import { Stage } from "./Stage";
import images from "../../data/images.json";

const HAS_MACRO_PLATE = "stitch-macro-straight" in (images as Record<string, unknown>);
import { TextCard } from "./TextCard";
import { s08Timing } from "./timing";

/**
 * S08 — the signature moment: the handoff (L18 + music-only tail).
 * Act 1 buyer's view (GateLine + Buy, pressed on "one") → Act 2 "One transaction." → Act 3 the hero handoff:
 * lift, slide alice → carol, land, macro of the stitch sewing itself onto carol's card, pull back, "Bought",
 * "Satchel #3 is yours.", calm hold. All times come from L18's word timings (timing.ts).
 */
export default function S08() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const T = s08Timing();

  const act = t < T.cutText ? 1 : t < T.stageCut ? 2 : 3;
  // the photographic macro insert (only if the plate exists; otherwise the card macro carries the whole sew)
  const insert = HAS_MACRO_PLATE && t >= T.macroCut && t < T.sewStart + T.sewSlow;

  // the payment line: appears on the text card and stays put across the cut to the stage, until the macro
  const paid = tween(frame, T.paidAt, T.paidAt + 0.4, 0, 1, EASE.expoOut);
  const showPaid = t >= T.paidAt && t < T.macroCut;

  // the sentence
  const y1 = springAt(frame, FPS, T.yours, SPRING.slam);
  const y2 = springAt(frame, FPS, T.yours + 0.08, SPRING.slam);
  const y3 = springAt(frame, FPS, T.yours + 0.16, SPRING.slam);
  const yWdth = 84 + 16 * tween(frame, T.yours, T.yours + 0.7, 0, 1, EASE.quintOut);

  const fade = tween(frame, T.fadeOut, T.D, 0, 1, EASE.standard);

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {act === 1 ? <BuyView T={T} /> : act === 2 ? <TextCard T={T} /> : insert ? <PhotoInsert T={T} available /> : <Stage T={T} afterInsert={HAS_MACRO_PLATE} />}

      {showPaid ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 92, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: F.sans, fontWeight: 500, fontSize: 52, color: C.ink, whiteSpace: "nowrap" }}>
            <MaskUp p={paid}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 18 }}>
                <CircleCheck size={54} strokeWidth={1.75} color={C.success} />
                Paid to alice.near in the same transaction as the sale.
              </span>
            </MaskUp>
          </div>
        </AbsoluteFill>
      ) : null}

      {t >= T.yours ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 92, pointerEvents: "none" }}>
          <div style={{ ...display(760, 96, yWdth), fontSize: 128, lineHeight: 1, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>
            <MaskUp p={Math.min(1, y1)}>Satchel</MaskUp> <MaskUp p={Math.min(1, y2)}>#3 is</MaskUp> <MaskUp p={Math.min(1, y3)}>yours.</MaskUp>
          </div>
        </AbsoluteFill>
      ) : null}

      {fade > 0 ? <AbsoluteFill style={{ background: C.ground, opacity: fade }} /> : null}

      {/* sound: press, punch-through, stage cut, lift, slide, land, the stitch, the hit */}
      <Sfx name="swish-short" at={0.05} align="peak" gainDb={-10} />
      <Sfx name="ui-click" at={T.press} gainDb={-2} />
      <Sfx name="whoosh-fast" at={T.cutText} align="peak" gainDb={-6} />
      <Sfx name="swish-short" at={T.stageCut} align="peak" gainDb={-9} />
      <Sfx name="leather-creak" at={T.t0} gainDb={-6} />
      <Sfx name="whoosh-deep" at={T.slideStart + 0.22} align="peak" gainDb={-6} />
      <Sfx name="impact-soft" at={T.land} gainDb={-6} />
      <Sfx name="stitch-run" at={T.sewStart} rate={0.85} gainDb={-2} />
      <Sfx name="stitch-run" at={T.sewStart + 0.86} rate={1.25} gainDb={-3} />
      <Sfx name="stitch-single" at={T.sewEnd} gainDb={0} />
      <Sfx name="success-brass" at={T.sewEnd} gainDb={-1} />
    </AbsoluteFill>
  );
}
