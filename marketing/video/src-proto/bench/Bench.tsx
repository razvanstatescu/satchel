import React from "react";
import { AbsoluteFill, HtmlInCanvas, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { chromaticAberration } from "@remotion/effects/chromatic-aberration";
import { noise } from "@remotion/effects/noise";
import { scanlines } from "@remotion/effects/scanlines";
import { turbulentDisplace } from "@remotion/effects/turbulent-displace";
import { wave } from "@remotion/effects/wave";
import plate from "../assets/plate.png";
import { Wall } from "../cards/Wall";
import { barrageFx } from "../fx/barrageFx";
import { GlImage } from "../fx/GlImage";
import { mergeLooks, motionLook, rgbLook, screenLook, slicesLook, stepSeed, warpLook, waveLook } from "../fx/looks";
import { ScreenOverlay } from "../fx/ScreenOverlay";
import { SliceGlitch } from "../fx/Slices";
import { SvgCombo, SvgDirBlur, SvgRgbSplit, SvgWarp } from "../fx/SvgFx";

/**
 * Cost benchmark: the same full-frame content (the plate PNG, or the same wall as live DOM) through each route.
 * Intensities are fixed and every frame changes seed/evolution, so nothing can be cached between frames.
 */
export type BenchKind =
  | "img"
  | "dom"
  | "svg-warp"
  | "svg-rgb"
  | "svg-combo"
  | "svg-dirblur"
  | "gl-raw-full"
  | "gl-raw-light"
  | "fx-custom"
  | "fx-builtin5"
  | "hic-none"
  | "hic-img-full"
  | "hic-dom-full"
  | "hic-dom-light"
  | "css-slices"
  | "css-screen"
  | "hic-dom-zero"
  | "fx-img-zero";

/** "full": every distortion on at once, plus a 300 px whip blur (the worst frame of the intro). */
const fullLook = (f: number) => mergeLooks(f, stepSeed(f), screenLook(0.6), waveLook(0.5), rgbLook(0.6, f), slicesLook(0.6), warpLook(0.7, f), motionLook(600, 0, 0));
/** "light": the always-on screen look between hits (scanlines, grain, small split, line wave). */
const lightLook = (f: number) => mergeLooks(f, stepSeed(f), screenLook(0.5), waveLook(0.2), rgbLook(0.3, f));

const PlateImg: React.FC = () => <Img src={plate} style={{ width: "100%", height: "100%" }} />;

export const Bench: React.FC<{ kind: BenchKind }> = ({ kind }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  switch (kind) {
    case "img":
      return <PlateImg />;
    case "dom":
      return <Wall offset={Math.floor(f / 30)} />;
    case "svg-warp":
      return (
        <SvgWarp intensity={0.8} frame={f}>
          <PlateImg />
        </SvgWarp>
      );
    case "svg-rgb":
      return (
        <SvgRgbSplit intensity={0.8} frame={f}>
          <PlateImg />
        </SvgRgbSplit>
      );
    case "svg-combo":
      return (
        <SvgCombo intensity={0.8} frame={f}>
          <PlateImg />
        </SvgCombo>
      );
    case "svg-dirblur":
      return (
        <SvgDirBlur vx={600}>
          <PlateImg />
        </SvgDirBlur>
      );
    case "gl-raw-full":
      return <GlImage src={plate} width={width} height={height} look={fullLook(f)} fit="cover" />;
    case "gl-raw-light":
      return <GlImage src={plate} width={width} height={height} look={lightLook(f)} fit="cover" />;
    case "fx-custom":
      return <Img src={plate} width={width} height={height} effects={[barrageFx(fullLook(f))]} />;
    case "fx-builtin5":
      return (
        <Img
          src={plate}
          width={width}
          height={height}
          effects={[
            wave({ amplitude: 12, wavelength: 300, phase: f * 0.4 }),
            turbulentDisplace({ amount: 80, size: 260, evolution: f * 10, seed: 3, complexity: 2 }),
            chromaticAberration({ amount: 8 }),
            scanlines({ amount: 0.3, spacing: 4, offset: f }),
            noise({ amount: 0.15, seed: f }),
          ]}
        />
      );
    case "hic-none":
      return (
        <HtmlInCanvas width={width} height={height}>
          <Wall offset={Math.floor(f / 30)} />
        </HtmlInCanvas>
      );
    case "hic-img-full":
      return (
        <HtmlInCanvas width={width} height={height} effects={[barrageFx({ ...fullLook(f), clampEdges: true })]}>
          <PlateImg />
        </HtmlInCanvas>
      );
    case "hic-dom-full":
      return (
        <HtmlInCanvas width={width} height={height} effects={[barrageFx({ ...fullLook(f), clampEdges: true })]}>
          <Wall offset={Math.floor(f / 30)} />
        </HtmlInCanvas>
      );
    case "hic-dom-light":
      return (
        <HtmlInCanvas width={width} height={height} effects={[barrageFx({ ...lightLook(f), clampEdges: true })]}>
          <Wall offset={Math.floor(f / 30)} />
        </HtmlInCanvas>
      );
    case "hic-dom-zero":
      // identity check: every amount 0 (premultiply round trip + texture sampling only)
      return (
        <HtmlInCanvas width={width} height={height} effects={[barrageFx({ time: f, seed: 0 })]}>
          <Wall offset={Math.floor(f / 30)} />
        </HtmlInCanvas>
      );
    case "fx-img-zero":
      return <Img src={plate} width={width} height={height} effects={[barrageFx({ time: f, seed: 0 })]} />;
    case "css-slices":
      return (
        <AbsoluteFill>
          <SliceGlitch intensity={0.8} frame={f} width={width} height={height} hold={1}>
            <PlateImg />
          </SliceGlitch>
        </AbsoluteFill>
      );
    case "css-screen":
      return (
        <AbsoluteFill>
          <PlateImg />
          <ScreenOverlay intensity={0.6} frame={f} width={width} height={height} />
        </AbsoluteFill>
      );
  }
};

export const BENCH_KINDS: BenchKind[] = [
  "img",
  "dom",
  "svg-warp",
  "svg-rgb",
  "svg-combo",
  "svg-dirblur",
  "gl-raw-full",
  "gl-raw-light",
  "fx-custom",
  "fx-builtin5",
  "hic-none",
  "hic-img-full",
  "hic-dom-full",
  "hic-dom-light",
  "css-slices",
  "css-screen",
  "hic-dom-zero",
  "fx-img-zero",
];
