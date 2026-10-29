// usage.tsx (C): wiring the brand transitions (total = 120 + 90 + 90 + 120 − 20 − 22 − 18 frames)
import React from "react";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { pushCut } from "@remotion/transitions/push-cut";
import { EASE2, SPRING2 } from "./brand2/motion";
import { inkSwipe, peelOff, tileIris } from "./brand2/transitions";

export const Chapters: React.FC<{ a: React.ReactNode; b: React.ReactNode; c: React.ReactNode; d: React.ReactNode }> = ({ a, b, c, d }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={120}>{a}</TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={tileIris({ from: { x: 840, y: 420, w: 240, h: 240 }, to: { x: 510, y: 256, w: 900, h: 132, r: 70 }, outline: 8 })}
      timing={linearTiming({ durationInFrames: 20 })}
    />
    <TransitionSeries.Sequence durationInFrames={90}>{b}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={peelOff({ corner: "br" })} timing={linearTiming({ durationInFrames: 22 })} />
    <TransitionSeries.Sequence durationInFrames={90}>{c}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={inkSwipe()} timing={linearTiming({ durationInFrames: 18 })} />
    <TransitionSeries.Sequence durationInFrames={120}>{d}</TransitionSeries.Sequence>
  </TransitionSeries>
);

// In phone mocks: a page push on the land spring, and a punch-in cut with the flash switched off.
export const phonePush = { presentation: slide({ direction: "from-right" }), timing: springTiming({ config: SPRING2.land, durationInFrames: 14 }) };
export const punch = { presentation: pushCut({ outgoingScale: 1.08, incomingStartScale: 1.12, incomingEndScale: 1, flashOpacity: 0 }), timing: linearTiming({ durationInFrames: 10, easing: EASE2.out }) };

