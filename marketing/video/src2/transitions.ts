import type { TransitionPresentation } from "@remotion/transitions";
import { peelOff } from "./motion";
import { nightBlindCut } from "./scenes/C1/nightBlindCut";

/**
 * Cross-scene transitions (director-owned). Key = the OUTGOING scene id. Main.tsx extends that scene by `frames` so the
 * next scene still starts exactly on its timeline time (audio sync); the outgoing scene keeps rendering its final pose
 * for those extra frames while the transition plays. Everything else is a hard cut handled inside the scenes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CUTS: Record<string, { presentation: TransitionPresentation<any>; frames: number }> = {
  H2: { presentation: peelOff({ corner: "br" }), frames: 20 }, // H2 → P1: the frame peels away like a sticker
  P6: { presentation: nightBlindCut(), frames: 18 }, // P6 → C1: on the music stop, Night falls as a blind over P6's last frames
  T7: { presentation: peelOff({ corner: "br" }), frames: 20 }, // T7 → E1: the frame peels away to the end card
};
