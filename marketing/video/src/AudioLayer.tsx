import { Audio } from "@remotion/media";
import { getStaticFiles, interpolate, Sequence, staticFile } from "remotion";
import { TIMELINE } from "./lib/timeline";
import { FPS } from "./lib/time";

const dB = (d: number) => Math.pow(10, d / 20);

/** Music base level and how far it dips under the voice. Tuned in the final mix pass. */
export const MIX = { musicDb: -4, duckDb: -13, rampSec: 0.18, voDb: 0 };

function musicFile(): string | null {
  const names = getStaticFiles().map((f) => f.name);
  return ["music/score.wav", "music/score.mp3"].find((n) => names.includes(n)) ?? null;
}

/** Linear-in-dB ducking envelope from timeline.duck intervals. */
function musicVolumeAt(frame: number) {
  const t = frame / FPS;
  let duck = 0;
  for (const d of TIMELINE.duck ?? []) {
    const k = interpolate(t, [d.start - MIX.rampSec, d.start, d.end, d.end + MIX.rampSec], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    duck = Math.max(duck, k);
  }
  return dB(MIX.musicDb + duck * MIX.duckDb);
}

export function AudioLayer({ music = true, vo = true }: { music?: boolean; vo?: boolean }) {
  const score = music ? musicFile() : null;
  return (
    <>
      {score ? <Audio src={staticFile(score)} volume={(f) => musicVolumeAt(f)} /> : null}
      {vo
        ? TIMELINE.vo
            .filter((l) => l.file)
            .map((l) => (
              <Sequence key={l.id} from={Math.round(l.start * FPS)} durationInFrames={Math.ceil(l.duration * FPS) + 6} layout="none" name={`vo:${l.id}`}>
                <Audio src={staticFile(l.file as string)} volume={dB(MIX.voDb)} />
              </Sequence>
            ))
        : null}
    </>
  );
}
