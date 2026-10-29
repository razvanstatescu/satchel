// sfxUsage.tsx: sound on the contact frame with the project's helper (typechecked against video/src2/lib/Sfx.tsx).
// `at` is in seconds, scene-local; place it beside the moving element in your scene.
import React from "react";
import { Sfx } from "../../../../video/src2/lib/Sfx";
import { SLAP_CONTACT } from "./brand2/motion";

const FPS = 30;
export const SlapSounds: React.FC<{ slapStartSec: number }> = ({ slapStartSec }) => (
  <>
    <Sfx name="sticker-slap" at={slapStartSec + SLAP_CONTACT / FPS} />
    <Sfx name="charm-jingle" at={slapStartSec + 0.5} align="peak" gainDb={-4} />
  </>
);

