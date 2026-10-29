import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Lockup } from "../brand/Logo";
import { C, display, F } from "../brand/tokens";
import { Finish, Ground } from "../components/Atmosphere";
import { SatchelCard } from "../components/SatchelCard";
import { EASE, springAt, tween } from "../lib/time";

/** Smoke test for the shared foundation: logo build, card with stitch, type. Not part of the film. */
export function FoundationTest() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = springAt(frame, fps, 0.1);
  const strap = tween(frame, 0.3, 1.2, 0, 1, EASE.expoInOut);
  const stitch = tween(frame, 1.0, 1.8, 0, 1, EASE.standard);
  const word = tween(frame, 1.4, 2.0);
  const cardIn = springAt(frame, fps, 0.6);
  return (
    <Ground>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70, flexDirection: "column" }}>
        <Lockup height={150} tile={tile} strap={strap} stitch={stitch} word={word} />
        <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
          <SatchelCard width={560} stitch={tween(frame, 1.8, 2.4)} style={{ transform: `translateY(${(1 - cardIn) * 200}px)`, opacity: cardIn }} />
          <div style={{ color: C.ink, width: 640 }}>
            <div style={{ ...display(800, 96), fontSize: 120, lineHeight: 0.95, letterSpacing: "-0.03em" }}>This NFT is a wallet.</div>
            <div style={{ fontFamily: F.mono, fontSize: 22, color: C.inkMuted, marginTop: 24 }}>bc1qtf95…cwy5 · 0xD0Cd…d5ad</div>
          </div>
        </div>
      </AbsoluteFill>
      <Finish />
    </Ground>
  );
}
