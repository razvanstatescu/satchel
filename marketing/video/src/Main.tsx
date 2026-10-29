import { AbsoluteFill, Sequence } from "remotion";
import { AudioLayer } from "./AudioLayer";
import { C } from "./brand/tokens";
import { Finish } from "./components/Atmosphere";
import { Sfx } from "./lib/Sfx";
import { TIMELINE } from "./lib/timeline";
import { FPS } from "./lib/time";
import { SCENES } from "./scenes/registry";

/** The film: every scene at its timeline span, one shared finish (vignette + grain), the audio layer. */
export function Main() {
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {TIMELINE.scenes.map((sc) => {
        const Scene = SCENES[sc.id];
        if (!Scene) return null;
        return (
          <Sequence key={sc.id} from={Math.round(sc.start * FPS)} durationInFrames={Math.round((sc.end - sc.start) * FPS)} name={sc.id}>
            <Scene />
          </Sequence>
        );
      })}
      <Finish />
      <AudioLayer />
      {/* Film-level cues that straddle scene boundaries (a scene's Sequence would cut their tails). */}
      <Sfx name="impact-brass" at={TIMELINE.scenes.find((x) => x.id === "S07")!.start - 2 / 30} gainDb={-2} />
    </AbsoluteFill>
  );
}

/** One scene alone, with the matching slice of the film's audio (for previews and stills). */
export function ScenePreview({ id }: { id: string }) {
  const sc = TIMELINE.scenes.find((x) => x.id === id)!;
  const Scene = SCENES[id];
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <Scene />
      <Finish />
      <Sequence from={-Math.round(sc.start * FPS)} layout="none">
        <AudioLayer />
      </Sequence>
    </AbsoluteFill>
  );
}
