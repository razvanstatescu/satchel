import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, Sequence, Series } from "remotion";
import { AudioLayer } from "./AudioLayer";
import { C } from "./brand/tokens";
import { TIMELINE } from "./lib/timeline";
import { FPS } from "./lib/time";
import { SceneStub } from "./scenes/SceneStub";
import { SCENES } from "./scenes/registry";
import H0 from "./scenes/H0";
import { H0Tail } from "./scenes/H0/Sound";
import { H0_FRAMES } from "./scenes/H0/timing";
import { CUTS } from "./transitions";

/** The body's length (everything after the cold open), from the voiced timeline. */
export const BODY_FRAMES = Math.round(TIMELINE.durationSec * FPS);

/**
 * The full film: the cold open H0 (7 s, src2/scenes/H0), then the body exactly as before. The body keeps its own clock:
 * its timeline, voice and score (AudioLayer) start at the body's frame 0, which is H1 frame 0. H0's reveal hit lands 4
 * frames before the join and rings on into the body (H0Tail, audio only).
 */
export function Main() {
  return (
    <Series>
      <Series.Sequence durationInFrames={H0_FRAMES} name="H0">
        <H0 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BODY_FRAMES} name="Body">
        <Body introTail />
      </Series.Sequence>
    </Series>
  );
}

/**
 * The Satchel 2.0 film's body (H1 … E1): every scene at its timeline span on the Day ground, plus the audio layer. No
 * grain, no vignette. Scenes run in a TransitionSeries; a scene listed in transitions.ts gets extra frames that overlap
 * the next scene, so every scene still starts exactly at its timeline time. `introTail` adds the ring-out of H0's reveal
 * hit over the first second (audio only): on in Main and in tools/render-master.sh's body render, off for the body alone.
 */
export function Body({ introTail = false }: { introTail?: boolean }) {
  const scenes = TIMELINE.scenes;
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <TransitionSeries>
        {scenes.flatMap((sc, i) => {
          const Scene = SCENES[sc.id];
          const cut = i < scenes.length - 1 ? CUTS[sc.id] : undefined;
          const span = Math.round(sc.end * FPS) - Math.round(sc.start * FPS);
          const items = [
            <TransitionSeries.Sequence key={sc.id} durationInFrames={span + (cut ? cut.frames : 0)} name={sc.id}>
              <AbsoluteFill style={{ background: C.ground }}>{Scene ? <Scene /> : <SceneStub id={sc.id} />}</AbsoluteFill>
            </TransitionSeries.Sequence>,
          ];
          if (cut) {
            items.push(<TransitionSeries.Transition key={`${sc.id}-cut`} presentation={cut.presentation} timing={linearTiming({ durationInFrames: cut.frames })} />);
          }
          return items;
        })}
      </TransitionSeries>
      <AudioLayer />
      {introTail ? <H0Tail /> : null}
    </AbsoluteFill>
  );
}

/** One scene alone with the matching slice of the film's audio (previews and stills). */
export function ScenePreview({ id }: { id: string }) {
  const sc = TIMELINE.scenes.find((x) => x.id === id)!;
  const Scene = SCENES[id];
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {Scene ? <Scene /> : <SceneStub id={id} />}
      <Sequence from={-Math.round(sc.start * FPS)} layout="none">
        <AudioLayer />
      </Sequence>
    </AbsoluteFill>
  );
}
