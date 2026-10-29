import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../../brand/tokens";
import { EASE, FPS, tween } from "../../lib/time";
import { BuyButton, Cursor, GateLine } from "./bits";
import type { S08T } from "./timing";

/**
 * Act 1, the buyer's view: GateLine over the brass Buy button, pressed on "one", "Buying…", then the camera punches
 * through the button into the text card (on "transaction").
 */
const BTN_W = 1240;
const BTN_H = 176;

export function BuyView({ T }: { T: S08T }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // entrance (frame 0 already moving): panel rises and sharpens
  const enter = tween(frame, -0.12, 0.42, 0, 1, EASE.expoOut);
  // camera: settle from 0.92, slow push toward the button, then the punch-through
  const settle = tween(frame, 0, 0.6, 0.92, 1, EASE.expoOut);
  const push = tween(frame, 0.6, T.press, 0, 1, EASE.standard);
  const punch = tween(frame, T.cutText - 0.24, T.cutText, 0, 1, EASE.expoIn);
  const z = settle * (1 + 0.07 * push) * (1 + 1.6 * punch);
  const fy = 40 * push + 90 * punch; // focus drifts down to the button
  const blur = (1 - enter) * 10 + punch * 14;

  // the button lights on "clean": a single sheen sweep
  const sheen = t >= T.clean - 0.05 && t <= T.clean + 0.55 ? tween(frame, T.clean - 0.05, T.clean + 0.55, 0, 1, EASE.standard) : -1;
  // press on "one"
  const pressIn = tween(frame, T.press - 0.06, T.press, 0, 1, EASE.expoOut);
  const pressOut = tween(frame, T.press + 0.08, T.press + 0.3, 0, 1, EASE.expoOut);
  const pressed = pressIn * (1 - 0.6 * pressOut);
  const busy = t >= T.buying;
  const labelSwap = tween(frame, T.buying - 0.03, T.buying + 0.08, 0, 1, EASE.expoOut);

  // cursor glides in from the lower right and clicks
  const cur = tween(frame, 0.35, T.press - 0.12, 0, 1, EASE.expoOut);
  const cx = 1560 + (1345 - 1560) * cur;
  const cy = 1030 + (650 - 1030) * cur;
  const curOpacity = tween(frame, 0.35, 0.6, 0, 1) * (1 - tween(frame, T.buying + 0.05, T.buying + 0.25, 0, 1));

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {/* warm key light from the upper left */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 28% 18%, rgba(106,71,48,0.30), rgba(23,16,12,0) 70%)" }} />
      <AbsoluteFill
        style={{
          transform: `translateY(${-fy * z}px) scale(${z})`,
          transformOrigin: "50% 58%",
          filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
          opacity: enter,
        }}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: BTN_W + 128,
              padding: 64,
              borderRadius: 40,
              background: C.surface,
              boxShadow: "0 40px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(235,203,122,0.06)",
              transform: `translateY(${(1 - enter) * 70}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 30,
            }}
          >
            <div style={{ fontFamily: F.sans, fontSize: 44, color: C.inkMuted, fontWeight: 500 }}>Satchel #3 · listed by alice.near</div>
            <GateLine t="8 s ago" size={60} />
            <BuyButton
              width={BTN_W}
              height={BTN_H}
              pressed={pressed}
              sheen={sheen}
              spinner={busy ? (t - T.buying) * 540 : undefined}
              label={
                <span style={{ display: "inline-block", opacity: busy ? labelSwap : 1, transform: busy ? `translateY(${(1 - labelSwap) * 30}px)` : undefined }}>
                  {busy ? "Buying…" : "Buy for 5.00 USDC"}
                </span>
              }
            />
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: cx, top: cy, opacity: curOpacity }}>
          <Cursor size={64} press={pressIn * (1 - pressOut)} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
