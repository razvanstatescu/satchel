import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F, display } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { MaskUp } from "./bits";
import type { S08T } from "./timing";

/** Act 2: "One transaction." slams in out of the button; the binding line follows on "bound". */
export function TextCard({ T }: { T: S08T }) {
  const frame = useCurrentFrame();
  const a = T.cutText;
  const inP = tween(frame, a, a + 0.38, 0, 1, EASE.expoOut);
  const scale = 1.16 - 0.16 * inP;
  const blur = (1 - inP) * 12;
  // Bricolage width settles from condensed to full as it lands
  const wdth = 78 + 22 * tween(frame, a, a + 0.6, 0, 1, EASE.quintOut);
  const w1 = tween(frame, a, a + 0.32, 0, 1, EASE.expoOut);
  const w2 = tween(frame, a + 0.07, a + 0.4, 0, 1, EASE.expoOut);
  const sub = tween(frame, T.boundAt, T.boundAt + 0.4, 0, 1, EASE.expoOut);
  const out = tween(frame, T.stageCut - 0.2, T.stageCut, 0, 1, EASE.expoIn);

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 65% 55% at 30% 20%, rgba(106,71,48,0.26), rgba(23,16,12,0) 70%)" }} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${-out * 80 - 70}px) scale(${scale})`,
          filter: blur > 0.2 || out > 0 ? `blur(${blur + out * 10}px)` : undefined,
          opacity: 1 - out,
        }}
      >
        <div style={{ ...display(800, 96, wdth), fontSize: 210, lineHeight: 1, letterSpacing: "-0.035em", color: C.ink, whiteSpace: "nowrap" }}>
          <MaskUp p={w1}>One</MaskUp> <MaskUp p={w2}>transaction.</MaskUp>
        </div>
        <div style={{ marginTop: 44, fontFamily: F.sans, fontSize: 64, fontWeight: 500, color: C.inkMuted, whiteSpace: "nowrap" }}>
          <MaskUp p={sub}>Bound to the exact history you checked.</MaskUp>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
