import React from "react";
import { HtmlInCanvas } from "remotion";
import { barrageFx } from "./barrageFx";
import type { BarrageLook } from "./barrageShader";

/**
 * Recommended architecture: compose the barrage in plain DOM (Img screenshots, 3D transforms, slices, whips) and run
 * ONE barrage pass over the composed frame. One WebGL context for the whole intro instead of one per card.
 *
 * <HtmlInCanvas> renders the subtree into a canvas (Chrome "HTML-in-canvas", enabled in Remotion's bundled Chrome
 * 157 for local renders and Studio since 4.0.455) and holds the frame until the paint and the effect chain finish.
 * Turn the post off (look = null) for the clean brand world: then it is just a canvas copy of the DOM.
 */
export const FramePost: React.FC<{
  look: BarrageLook | null;
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ look, width, height, children }) => (
  <HtmlInCanvas width={width} height={height} effects={look ? [barrageFx({ ...look, clampEdges: look.clampEdges ?? true })] : []}>
    {children}
  </HtmlInCanvas>
);
