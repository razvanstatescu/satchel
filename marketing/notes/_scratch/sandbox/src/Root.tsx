import React from "react";
import { Composition } from "remotion";
import { loadBrand2Fonts } from "./brand2/tokens";
import { TestCharms, TestFx, TestHandOff, TestLockup, TestMark, TestSheet, TestStickers, TestTransitions, TestType, TestScript, TestFrost } from "./tests";

loadBrand2Fonts();

const common = { fps: 30, width: 1920, height: 1080 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TestStickers" component={TestStickers} durationInFrames={100} {...common} />
    <Composition id="TestCharms" component={TestCharms} durationInFrames={120} {...common} />
    <Composition id="TestMark" component={TestMark} durationInFrames={60} {...common} />
    <Composition id="TestType" component={TestType} durationInFrames={100} {...common} />
    <Composition id="TestFx" component={TestFx} durationInFrames={50} {...common} />
    <Composition id="TestHandOff" component={TestHandOff} durationInFrames={60} {...common} />
    <Composition id="TestTransitions" component={TestTransitions} durationInFrames={30 + 40 + 40 + 30 - 20 - 22 - 18} {...common} />
    <Composition id="TestLockup" component={TestLockup} durationInFrames={60} {...common} />
    <Composition id="TestSheet" component={TestSheet} durationInFrames={40} {...common} />
    <Composition id="TestScript" component={TestScript} durationInFrames={90} {...common} />
    <Composition id="TestFrost" component={TestFrost} durationInFrames={90} {...common} />
  </>
);
