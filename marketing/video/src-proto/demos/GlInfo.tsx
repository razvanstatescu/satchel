import React, { useState } from "react";
import { AbsoluteFill } from "remotion";

/** Prints the WebGL2 renderer the headless browser really uses (SwiftShader = CPU, ANGLE Metal = GPU). */
export const GlInfo: React.FC = () => {
  const [info] = useState(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no webgl2";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)} | ${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}` : String(gl.getParameter(gl.RENDERER));
  });
  return <AbsoluteFill style={{ background: "#fff", padding: 60, font: "600 44px Menlo, monospace", color: "#111" }}>{info}</AbsoluteFill>;
};
