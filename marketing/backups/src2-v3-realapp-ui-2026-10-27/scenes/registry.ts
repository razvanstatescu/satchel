import type { ComponentType } from "react";
import H1 from "./H1";
import H2 from "./H2";
import P1 from "./P1";
import P2 from "./P2";
import P3 from "./P3";
import P4 from "./P4";
import P5 from "./P5";
import P6 from "./P6";
import C1 from "./C1";
import T0 from "./T0";
import T1 from "./T1";
import T2 from "./T2";
import T3 from "./T3";
import T4 from "./T4";
import T5 from "./T5";
import T6 from "./T6";
import T7 from "./T7";
import E1 from "./E1";

/**
 * Scene components by id. The ORDER of the film is the order of `scenes` in data/timeline.json; each scene renders
 * inside a Sequence at its span (useCurrentFrame() is local). Script: marketing/script/SCRIPT-v3.md.
 */
export const SCENES: Record<string, ComponentType> = { H1, H2, P1, P2, P3, P4, P5, P6, C1, T0, T1, T2, T3, T4, T5, T6, T7, E1 };
