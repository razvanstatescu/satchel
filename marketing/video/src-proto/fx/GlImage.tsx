import React, { useLayoutEffect, useRef, useState } from "react";
import { useDelayRender } from "remotion";
import { type BarrageGl, type BarrageLook, cleanupBarrage, drawBarrage, setupBarrage, uploadBarrage } from "./barrageShader";

/**
 * Raw WebGL2 route: a static image drawn through the barrage pass on its own <canvas>.
 * - The image is decoded once (delayRender until the FIRST draw has happened, not just until decode) and uploaded
 *   once at output size (fit applied on a 2D canvas), so a frame costs one fragment pass only.
 * - One WebGL context per instance: keep at most ~8 mounted at a time (Chrome keeps 16 alive and silently loses the
 *   oldest). For many cards, post-process the composed frame once instead (FramePost / HtmlInCanvas).
 */
export type GlImageProps = {
  src: string;
  width: number;
  height: number;
  look: BarrageLook;
  fit?: "contain" | "cover" | "fill";
  /** Opaque background painted behind the image before upload (full-frame plates); default transparent. */
  background?: string;
  style?: React.CSSProperties;
  className?: string;
};

const fitRect = (fit: "contain" | "cover" | "fill", iw: number, ih: number, w: number, h: number) => {
  if (fit === "fill") return [0, 0, w, h] as const;
  const s = fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  return [(w - dw) / 2, (h - dh) / 2, dw, dh] as const;
};

export const GlImage: React.FC<GlImageProps> = ({ src, width, height, look, fit = "contain", background, style, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<BarrageGl | null>(null);
  const uploadedFor = useRef<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  // Hold the render from the first mount until the first real draw (decode alone is not enough: the draw happens
  // in the next commit, after continueRender would already have released the screenshot).
  const [firstDraw] = useState(() => delayRender(`GlImage ${src.slice(-40)}`));
  const released = useRef(false);

  useLayoutEffect(() => {
    let alive = true;
    const el = new Image();
    el.src = src;
    el.decode()
      .then(() => alive && setImg(el))
      .catch((e) => cancelRender(e));
    return () => {
      alive = false;
    };
  }, [src, cancelRender]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) {
      cancelRender(new Error("GlImage: WebGL2 unavailable (try --gl=angle)"));
      return;
    }
    glRef.current = setupBarrage(gl);
    return () => {
      if (glRef.current) cleanupBarrage(glRef.current);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      glRef.current = null;
      uploadedFor.current = null;
    };
  }, [cancelRender]);

  useLayoutEffect(() => {
    const s = glRef.current;
    if (!s || !img) return;
    const key = `${src}|${width}x${height}|${fit}|${background}`;
    if (uploadedFor.current !== key) {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("GlImage: 2D context unavailable");
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }
      const [x, y, w, h] = fitRect(fit, img.naturalWidth, img.naturalHeight, width, height);
      ctx.drawImage(img, x, y, w, h);
      uploadBarrage(s, c, true);
      uploadedFor.current = key;
    }
    drawBarrage(s, width, height, look);
    if (!released.current) {
      continueRender(firstDraw);
      released.current = true;
    }
  }, [img, look, src, width, height, fit, background, continueRender, firstDraw]);

  return <canvas ref={canvasRef} width={width} height={height} style={style} className={className} />;
};
