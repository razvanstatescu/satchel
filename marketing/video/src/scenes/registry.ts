import type { ComponentType } from "react";
import S01 from "./S01";
import S02 from "./S02";
import S04 from "./S04";
import S05 from "./S05";
import S06 from "./S06";
import S07 from "./S07";
import S08 from "./S08";
import S09 from "./S09";
import U1 from "./U1";
import W1 from "./W1";
import W2 from "./W2";
import W3 from "./W3";

/**
 * Each scene is a self-contained component rendered inside a Sequence at its timeline span. The ORDER of the film is
 * the order of `scenes` in data/timeline.json (v2: S01 W1 W2 W3 S04 S02 U1 S05 S06 S07 S08 S09). S03's visuals now
 * open S04 (S03 is no longer a timeline scene).
 */
export const SCENES: Record<string, ComponentType> = { S01, W1, W2, W3, S04, S02, U1, S05, S06, S07, S08, S09 };
