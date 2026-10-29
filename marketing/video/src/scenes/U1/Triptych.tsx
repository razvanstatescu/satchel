import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F } from "../../brand/tokens";
import { EASE, SPRING, s, tween } from "../../lib/time";
import { bric, clamp01, landingFrame, lerp, plate } from "./kit";
import { TagInk } from "./Gift";
import type { U1T } from "./timing";

/**
 * The recap: three panels (one per use case) wipe up across the frame, each LANDING on its own beat, left to right.
 * Each is a crop centred on its plate's subject, with the use case and its counterparty. Holds into the cut to S05.
 */
const PANEL_W = 632;
const GUTTER = 12;

export const PANELS = [
  { plate: "uc-sell", cx: 1290, label: "Sell.", data: "25,000.00 USDC", mono: false },
  { plate: "uc-gift", cx: 1150, label: "Gift.", data: "sam.near", mono: true },
  { plate: "uc-treasury", cx: 1330, label: "Hand over.", data: "ops-lead.near", mono: true },
] as const;

const SLAM_LAND = landingFrame(SPRING.slam) / 30;

export function Triptych({ T }: { T: U1T }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {PANELS.map((pn, i) => {
        const at = T.hits[i];
        const wipe = tween(f, at - 0.2, at + 0.12, 0, 1, EASE.expoOut);
        if (wipe <= 0) return null;
        const left = i * (PANEL_W + GUTTER);
        const src = plate(pn.plate);
        const drift = tween(f, at - 0.2, T.D, 0, 1, EASE.standard);
        const slam = spring({ frame: f - s(at - SLAM_LAND), fps, config: SPRING.slam });
        const data = tween(f, at + 0.08, at + 0.4, 0, 1, EASE.expoOut);
        return (
          <div
            key={pn.plate}
            style={{
              position: "absolute",
              left: left - (i > 0 ? GUTTER : 0),
              top: 0,
              width: PANEL_W + (i > 0 ? GUTTER : 0),
              height: 1080,
              clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)`,
            }}
          >
            {/* the gutter is ground; the panel sits right of it */}
            <div style={{ position: "absolute", inset: 0, background: C.ground }} />
            <div
              style={{
                position: "absolute",
                left: i > 0 ? GUTTER : 0,
                top: 0,
                width: PANEL_W,
                height: 1080,
                overflow: "hidden",
                background: C.ground,
              }}
            >
              {src ? (
                <div
                  style={{
                    position: "absolute",
                    left: PANEL_W / 2 - pn.cx,
                    top: 0,
                    width: 1920,
                    height: 1080,
                    transform: `translateY(${(1 - wipe) * 60}px) scale(${lerp(1.1, 1.05, drift)})`,
                    transformOrigin: `${pn.cx}px 50%`,
                  }}
                >
                  <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} />
                  {pn.plate === "uc-gift" ? <TagInk p={1} /> : null}
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(14,9,6,0.92) 0%, rgba(14,9,6,0.55) 26%, rgba(14,9,6,0) 52%)",
                }}
              />
              <div style={{ position: "absolute", left: 48, bottom: 104, right: 24 }}>
                <div
                  style={{
                    ...bric(lerp(800, 740, clamp01(slam)), lerp(84, 96, clamp01(slam))),
                    fontSize: 112,
                    lineHeight: 1,
                    letterSpacing: "-0.035em",
                    color: C.ink,
                    whiteSpace: "nowrap",
                    transformOrigin: "0% 80%",
                    transform: `scale(${lerp(1.3, 1, slam)})`,
                    opacity: clamp01((f - s(at - SLAM_LAND)) / 2),
                    textShadow: "0 6px 34px rgba(0,0,0,0.6)",
                  }}
                >
                  {pn.label}
                </div>
                <div
                  style={{
                    marginTop: 22,
                    fontFamily: pn.mono ? F.mono : F.sans,
                    fontWeight: pn.mono ? 500 : 600,
                    fontSize: 40,
                    color: C.ink,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    opacity: data,
                    transform: `translateY(${(1 - data) * 12}px)`,
                  }}
                >
                  {pn.data}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
