import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { C, FONT, stroke } from "./brand2/tokens";
import { clamp, EASE2, SPRING2 } from "./brand2/motion";
import { Peel, SlapIn, stickerStyle } from "./brand2/Sticker";
import { CharmBar, PluckedCharm } from "./brand2/Charm";
import { MarkBuild } from "./brand2/StickerS";
import { Counter, LineRise, Marker, TypeOn, WordSlap } from "./brand2/type";
import { PillSwap, PrimaryButton, Toggle } from "./brand2/ui";
import { Confetti, SparkBurst } from "./brand2/fx";
import { inkSwipe, peelOff, tileIris } from "./brand2/transitions";
import { HandOff } from "./brand2/HandOff";
import { PushIn } from "./brand2/camera";

const k = 2.5;
const { outline, shadow } = stroke(k); // 8 px, 10 px

const CardFace: React.FC<{ w: number; h: number; title: string }> = ({ w, h, title }) => (
  <div style={{ ...stickerStyle({ fill: C.surface, outline, rest: shadow, radius: 28 * k }), width: w, height: h, overflow: "hidden" }}>
    <div style={{ background: C.coral, height: h * 0.22, borderBottom: `${outline}px solid ${C.ink}`, display: "flex", alignItems: "center", padding: `0 ${18 * k}px`, fontFamily: FONT.display, fontWeight: 800, fontSize: 20 * k, color: C.ink }}>
      {title}
    </div>
    <div style={{ padding: `${16 * k}px ${18 * k}px`, fontFamily: FONT.sans, fontWeight: 600, fontSize: 15 * k, color: C.ink }}>
      Bitcoin · Ethereum · Solana
    </div>
  </div>
);

export const TestStickers: React.FC = () => {
  const frame = useCurrentFrame();
  const peel = interpolate(frame, [70, 80], [0, 0.3], { ...clamp, easing: EASE2.rip });
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center", gap: 60, flexDirection: "row" }}>
      <Sequence from={10} layout="none">
        <SlapIn w={360} h={220} fill={C.surface} outline={outline} rest={shadow} radius={28 * k * 0.6}>
          <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 64, color: C.ink }}>Give</span>
        </SlapIn>
      </Sequence>
      <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
        <PrimaryButton label="Give it to bob.near" at={40} />
        <Toggle at={50} />
        <PillSwap from={{ label: "Active", color: C.success }} to={{ label: "Paused for sale", color: C.frozen }} at={60} />
      </div>
      <Peel w={480} h={300} progress={peel} corner="br" radius={28 * k * 0.8} outline={outline} rest={shadow}>
        <CardFace w={480} h={300} title="Satchel #7" />
      </Peel>
    </AbsoluteFill>
  );
};

export const TestCharms: React.FC = () => {
  const barX = (f: number) => -1400 + 1400 * spring({ frame: Math.max(0, f), fps: 30, config: SPRING2.carry });
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...stickerStyle({ fill: C.sky, outline, rest: shadow, radius: 28 * k }), width: 1300, height: 640, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="-260 -150 520 260" width={1200} height={600} style={{ overflow: "visible" }}>
          <CharmBar barX={barX} cheerAt={60} />
        </svg>
      </div>
      <svg viewBox="-80 -110 160 190" width={160} height={190} style={{ position: "absolute", right: 80, top: 80, overflow: "visible" }}>
        <PluckedCharm fill={C.btc} at={30} />
      </svg>
    </AbsoluteFill>
  );
};

export const TestMark: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
    <MarkBuild size={480} />
  </AbsoluteFill>
);

export const TestType: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, padding: 160, gap: 40 }}>
    <WordSlap text="Stick it on. Hand it over." every={8} size={150} />
    <Sequence from={40} layout="none">
      <LineRise lines={["Give it to a friend.", "They get everything inside."]} />
    </Sequence>
    <div style={{ display: "flex", gap: 80, alignItems: "baseline" }}>
      <Sequence from={30} layout="none">
        <Counter to={12} dur={30} size={180} />
      </Sequence>
      <Sequence from={50} layout="none">
        <TypeOn text="bob.near" />
      </Sequence>
      <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 96, color: C.ink }}>
        <Marker at={60}>three chains</Marker>
      </span>
    </div>
  </AbsoluteFill>
);

export const TestFx: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground }}>
    <svg width={1920} height={1080}>
      <SparkBurst x={960} y={540} radius={260} count={5} seed="t" size={90} />
      <Sequence from={10} layout="none">
        <Confetti x={960} y={700} seed="c" />
      </Sequence>
    </svg>
  </AbsoluteFill>
);

export const TestHandOff: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground }}>
    <div style={{ position: "absolute", left: 260, top: 760, fontFamily: FONT.mono, fontSize: 56, color: C.ink }}>alice.near</div>
    <div style={{ position: "absolute", left: 1340, top: 760, fontFamily: FONT.mono, fontSize: 56, color: C.ink }}>bob.near</div>
    <Sequence from={10}>
      <HandOff fromX={480} toX={1440} y={480} w={600} h={378} rest={shadow} outline={outline}>
        <div style={{ background: C.coral, height: 84, borderBottom: `${outline}px solid ${C.ink}`, fontFamily: FONT.display, fontWeight: 800, fontSize: 48, color: C.ink, padding: "14px 32px" }}>Satchel #7</div>
      </HandOff>
    </Sequence>
  </AbsoluteFill>
);

const SceneA: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 240, height: 240, borderRadius: 240 * (112 / 512), background: C.coral }} />
  </AbsoluteFill>
);
const SceneB: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
    <CardFace w={900} h={567} title="Satchel #7" />
  </AbsoluteFill>
);
const SceneC: React.FC = () => (
  <AbsoluteFill style={{ background: C.nightGround, alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 140, color: C.nightInk }}>
    The catch.
  </AbsoluteFill>
);

export const TestTransitions: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={30}>
      <SceneA />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={tileIris({ from: { x: 840, y: 420, w: 240, h: 240 }, to: { x: 510, y: 256.5, w: 900, h: 567 * 0.22 + 8, r: 70 } })}
      timing={linearTiming({ durationInFrames: 20 })}
    />
    <TransitionSeries.Sequence durationInFrames={40}>
      <PushIn dur={40} to={1.03}>
        <SceneB />
      </PushIn>
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={peelOff({ corner: "br" })} timing={linearTiming({ durationInFrames: 22 })} />
    <TransitionSeries.Sequence durationInFrames={40}>
      <SceneA />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={inkSwipe()} timing={linearTiming({ durationInFrames: 18 })} />
    <TransitionSeries.Sequence durationInFrames={30}>
      <SceneC />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

import { FrozenIcon, LockupReveal, StickerSheet, SwingingCharm } from "./usage";
export const TestLockup: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center", gap: 80 }}>
    <LockupReveal height={200} wordAt={36} />
    <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
      <SwingingCharm at={10} fill={C.sol} />
      <FrozenIcon at={20} size={160} />
    </div>
  </AbsoluteFill>
);
export const TestSheet: React.FC = () => <StickerSheet labels={["Give", "Sell", "Send Bitcoin", "Paused for sale", "Clean history", "bob.near"]} />;

import { bonkAngle, CaptionSlap, FlipCard, FrostLaminate, NightBlind, RecordOutline, Stamp } from "./brand2/script";
import { CHARM_SWING } from "./brand2/motion";
import { ChainCharm as Charm2 } from "./brand2/Charm";
const Back: React.FC = () => (
  <div style={{ ...stickerStyle({ fill: C.surface, outline, rest: shadow, radius: 70 }), width: 900, height: 567, padding: 40, display: "flex", flexDirection: "column", gap: 24 }}>
    <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 40, color: C.ink }}>History · 3 signatures</div>
    {[0, 1, 2].map((i) => (
      <Sequence key={i} from={30 + i * 6} layout="none">
        <RecordProgress id={`r${i}`} />
      </Sequence>
    ))}
  </div>
);
const RecordProgress: React.FC<{ id: string }> = ({ id }) => {
  const f = useCurrentFrame();
  return <RecordOutline w={800} h={110} k={2.5} id={id} progress={interpolate(f, [0, 16], [0, 1], clamp)} />;
};
export const TestScript: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
      <FlipCard at={8} w={900} h={567} front={<CardFace w={900} h={567} title="Satchel #7" />} back={<Back />} />
      <div style={{ position: "absolute", left: 80, top: 60 }}>
        <CaptionSlap text="Satchel keeps the receipts." size={110} sticker seed="t0" />
      </div>
      <div style={{ position: "absolute", left: 1500, top: 700 }}>
        <svg viewBox="-80 -10 160 200" width={200} height={250} style={{ overflow: "visible" }}>
          <g transform={`rotate(${bonkAngle(frame, 60, CHARM_SWING.eth, 30)} 0 0)`}>
            <g transform="translate(0 96)"><Charm2 fill={C.eth} /></g>
          </g>
        </svg>
        <div style={{ position: "absolute", left: -120, top: -80 }}><Stamp word="Nonce used" contact={60} k={2.5} /></div>
      </div>
    </AbsoluteFill>
  );
};
export const TestFrost: React.FC = () => (
  <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative" }}>
      <CardFace w={900} h={567} title="Satchel #7" />
      <FrostLaminate w={900} h={567} radius={70} inAt={5} meltAt={40} k={2.5} />
    </div>
    <NightBlind at={60} />
  </AbsoluteFill>
);
