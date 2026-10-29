import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import sfxJson from "../data/sfx.json";
import { FPS } from "./time";

type SfxEntry = { file: string; duration: number; peakSec?: number; gainDb?: number };
const CATALOG = sfxJson as unknown as Record<string, SfxEntry>;

const dbToGain = (db: number) => Math.pow(10, db / 20);

/**
 * Place a sound effect at `at` seconds (relative to the enclosing Sequence, i.e. the scene).
 * `align="peak"` shifts the sound so its loudest point lands exactly on `at` (use for whooshes into a cut).
 * Unknown names render nothing, so scenes can reference effects before the library exists.
 */
export function Sfx({ name, at, gainDb = 0, align = "start", rate = 1 }: { name: string; at: number; gainDb?: number; align?: "start" | "peak"; rate?: number }) {
  const e = CATALOG[name];
  if (!e) return null;
  const offset = align === "peak" ? (e.peakSec ?? 0) / rate : 0;
  const from = Math.round((at - offset) * FPS);
  const trimBefore = from < 0 ? -from : 0;
  const volume = dbToGain((e.gainDb ?? 0) + gainDb);
  return (
    <Sequence from={Math.max(0, from)} durationInFrames={Math.ceil((e.duration / rate) * FPS) + 2} layout="none" name={`sfx:${name}`}>
      <Audio src={staticFile(e.file)} volume={volume} trimBefore={trimBefore || undefined} playbackRate={rate} />
    </Sequence>
  );
}
