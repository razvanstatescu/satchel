import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, HtmlInCanvas, Img, staticFile, useCurrentFrame } from "remotion";
import { chromaticAberration } from "@remotion/effects/chromatic-aberration";
import { scanlines } from "@remotion/effects/scanlines";
import { turbulentDisplace } from "@remotion/effects/turbulent-displace";

/** Smoke test: do <Img effects>, <HtmlInCanvas effects> and a raw WebGL2 canvas render in this headless Chrome? */
const RawGl: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const gl = ref.current?.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) return;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.2 + 0.01 * (frame % 60), 0.8, 0.4, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }, [frame, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", left: 60, top: 640 }} />;
};

export const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#202020" }}>
      <Img
        src={staticFile("v2/ui/landing@2x.png")}
        width={880}
        height={550}
        style={{ position: "absolute", left: 60, top: 60 }}
        effects={[chromaticAberration({ amount: 24 }), scanlines({ amount: 0.5, spacing: 6, thickness: 2 })]}
      />
      <div style={{ position: "absolute", left: 980, top: 60 }}>
        <HtmlInCanvas
          width={880}
          height={550}
          effects={[turbulentDisplace({ amount: 60, size: 140, evolution: frame * 8, seed: 3 })]}
        >
          <AbsoluteFill style={{ background: "#fff", padding: 40, fontFamily: "Georgia", fontSize: 72, fontWeight: 700 }}>
            Seed phrase leak empties 4,000 wallets
          </AbsoluteFill>
        </HtmlInCanvas>
      </div>
      <RawGl w={880} h={380} />
    </AbsoluteFill>
  );
};
