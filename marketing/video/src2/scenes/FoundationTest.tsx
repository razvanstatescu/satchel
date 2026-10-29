import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CharmBar, pendulum } from "../brand/Charm";
import { Lockup } from "../brand/Logo";
import { C, display, sans } from "../brand/tokens";
import { Button, Pill, SatchelCard } from "../components/Sticker";
import { EASE, springAt, tween } from "../lib/time";

/** Smoke test for the Satchel 2.0 foundation. Not part of the film. */
export function FoundationTest() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const tile = springAt(f, fps, 0.05, { stiffness: 380, damping: 18, mass: 0.8 });
  const draw = tween(f, 0.25, 0.9, 0, 1, EASE.expoInOut);
  const drop = tween(f, 0.85, 1.05, 0, 1, EASE.expoOut);
  const word = tween(f, 0.9, 1.5);
  const a = pendulum(t - 1.2, 12);
  const blink = Math.max(0, 1 - Math.abs((t - 2.4) * 12));
  const lift = tween(f, 1.6, 2.0) * (1 - tween(f, 2.6, 3.0));
  const press = tween(f, 2.2, 2.3) * (1 - tween(f, 2.4, 2.55));
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <div style={{ position: "absolute", left: 120, top: 90 }}>
        <Lockup height={150} tile={tile} draw={draw} drop={drop} word={word} />
      </div>
      <div style={{ position: "absolute", right: 140, top: 40 }}>
        <CharmBar width={560} angles={[a, -a * 0.8, a * 0.6]} faces={[{ blink }, { blink, smile: 1.4 }, { look: { x: 6, y: -2 } }]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 420 }}>
        <SatchelCard id="7" width={640} lift={lift} pill="sent" />
      </div>
      <div style={{ position: "absolute", left: 860, top: 430, width: 920 }}>
        <div style={{ ...display(800), fontSize: 120, lineHeight: 0.95, letterSpacing: "-0.04em", color: C.ink }}>Stick it on.<br />Hand it over.</div>
        <div style={{ ...sans(400), fontSize: 34, color: C.inkMuted, marginTop: 28, maxWidth: 820 }}>One NFT that holds real Bitcoin, Ethereum and Solana.</div>
        <div style={{ display: "flex", gap: 24, marginTop: 40, alignItems: "center" }}>
          <Button label="Give Satchel #7" k={2.4} press={press} />
          <Button label="Send" k={2.4} kind="secondary" />
          <Pill kind="paused" k={2} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
