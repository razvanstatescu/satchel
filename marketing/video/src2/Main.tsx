import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, Sequence } from "remotion";
import { AudioLayer } from "./AudioLayer";
import { C } from "./brand/tokens";
import { TIMELINE } from "./lib/timeline";
import { FPS } from "./lib/time";
import { SceneStub } from "./scenes/SceneStub";
import { SCENES } from "./scenes/registry";
import { CUTS } from "./transitions";

/**
 * The Satchel 2.0 film: every scene at its timeline span on the Day ground, plus the audio layer. No grain, no vignette.
 * Scenes run in a TransitionSeries; a scene listed in transitions.ts gets extra frames that overlap the next scene, so
 * every scene still starts exactly at its timeline time.
 */
export function Main() {
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
