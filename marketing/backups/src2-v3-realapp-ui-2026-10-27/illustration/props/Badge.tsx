import type { CSSProperties } from "react";
import { C } from "../../brand/tokens";
import { clamp, display, DROP, Dropped, dropColor, easeOut, K, keys, lerp, n2, OUT, PropSvg, rng, sans, textWidth, Txt, useBrandFonts, useUid } from "./kit";

/**
 * Badge: the lemon "New" badge (P1), as a sticker. shape "pill" (the product badge) or "burst" (a scalloped seal for
 * hero moments). Sparkles: a burst of lemon four-point stars (P1 New badge, T5 verdict, T7 landing).
 *
 * Badge props
 *   text    string  default "New"
 *   shape   "pill" | "burst"  default "pill" (pill 34 UI tall, width from text; burst 84 UI)
 *   pop     0..1+   default 1: scale (feed a spring)
 *   tilt    deg     default 0 (pill) / -10 (burst); drop stays vertical
 *   scale   number  default 2; drop number default 1; night boolean; style on the root <svg>
 *
 * Sparkles props
 *   progress  0..1   default 0.5: 0 = gathered at the centre (invisible) → out and gone at 1
 *   radius    px     default 160: how far the stars fly
 *   size      px     default 44: star size (outer diameter)
 *   count     number default 6; seed number default 3; k number default 2 (outline weight)
 *   style     CSSProperties on the root <svg> (a 1×1 px box at the burst origin: put its left/top on the centre)
 * `Star4` draws one star (props x, y, r, k, fill, rot) inside any SVG.
 */
const PILL = sans(15, 800);

export function Badge({ text = "New", shape = "pill", pop = 1, tilt, scale = K, drop = 1, night = false, style }: { text?: string; shape?: "pill" | "burst"; pop?: number; tilt?: number; scale?: number; drop?: number; night?: boolean; style?: CSSProperties }) {
  useBrandFonts();
  const uid = useUid("badge");
  const s = Math.max(0, pop);
  if (shape === "burst") {
    const D = 84;
    const n = 14;
    const ro = D / 2 - 3;
    const ri = ro - 6;
    let d = "";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const p0 = [D / 2 + Math.cos(a0) * ri, D / 2 + Math.sin(a0) * ri];
      const c1 = [D / 2 + Math.cos(a1) * (ro + 5), D / 2 + Math.sin(a1) * (ro + 5)];
      const p2 = [D / 2 + Math.cos(a2) * ri, D / 2 + Math.sin(a2) * ri];
      d += `${i === 0 ? `M${n2(p0[0])} ${n2(p0[1])}` : ""} Q${n2(c1[0])} ${n2(c1[1])} ${n2(p2[0])} ${n2(p2[1])}`;
    }
    d += " Z";
    const t = tilt ?? -10;
    return (
      <PropSvg w={D} h={D} scale={scale} style={style}>
        <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
          <g transform={`translate(${D / 2} ${D / 2}) scale(${n2(s * 1000) / 1000}) rotate(${t}) translate(${-D / 2} ${-D / 2})`}>
            <path d={d} fill={C.lemon} stroke={C.ink} strokeWidth={OUT} strokeLinejoin="round" />
            <Txt x={D / 2} cy={D / 2} spec={display(24)} anchor="middle">
              {text}
            </Txt>
          </g>
        </Dropped>
      </PropSvg>
    );
  }
  const H = 34;
  const W = textWidth(text, PILL) + 30;
  const t = tilt ?? 0;
  return (
    <PropSvg w={W} h={H} scale={scale} style={style}>
      <Dropped id={uid} dy={DROP * drop} color={dropColor(night)}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${n2(s * 1000) / 1000}) rotate(${t}) translate(${-W / 2} ${-H / 2})`}>
          <rect x={OUT / 2} y={OUT / 2} width={W - OUT} height={H - OUT} rx={(H - OUT) / 2} fill={C.lemon} stroke={C.ink} strokeWidth={OUT} />
          <Txt x={W / 2} cy={H / 2} spec={PILL} anchor="middle">
            {text}
          </Txt>
        </g>
      </Dropped>
    </PropSvg>
  );
}

/** One plump four-point star centred on (x, y), outer radius r. */
export function Star4({ x, y, r, k = 1, fill = C.lemon, rot = 0, outline = true }: { x: number; y: number; r: number; k?: number; fill?: string; rot?: number; outline?: boolean }) {
  const a = r * 0.2;
  const d = `M0 ${-r} Q${a} ${-a} ${r} 0 Q${a} ${a} 0 ${r} Q${-a} ${a} ${-r} 0 Q${-a} ${-a} 0 ${-r} Z`;
  return <path d={d} transform={`translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})`} fill={fill} stroke={outline ? C.ink : "none"} strokeWidth={2.5 * k} strokeLinejoin="round" />;
}

export function Sparkles({ progress = 0.5, radius = 160, size = 44, count = 6, seed = 3, k = 2, style }: { progress?: number; radius?: number; size?: number; count?: number; seed?: number; k?: number; style?: CSSProperties }) {
  const p = clamp(progress);
  const r = rng(seed);
  const items = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + r() * 0.5 - Math.PI / 2;
    const reach = radius * (0.7 + r() * 0.3);
    const sz = (size / 2) * (0.7 + r() * 0.45);
    const delay = r() * 0.12;
    return { a, reach, sz, delay, spin: (r() - 0.5) * 60 };
  });
  return (
    <svg width={1} height={1} viewBox="0 0 1 1" style={{ display: "block", overflow: "visible", ...style }}>
      {items.map((it, i) => {
        const q = clamp((p - it.delay) / (1 - it.delay));
        const dist = lerp(radius * 0.18, it.reach, easeOut(q));
        const sc = keys(q, [0, 0.2, 0.65, 1], [0, 1.15, 0.95, 0]);
        if (sc <= 0.001) return null;
        const x = Math.cos(it.a) * dist;
        const y = Math.sin(it.a) * dist;
        const dot = keys(q, [0.1, 0.3, 0.8, 1], [0, 1, 1, 0]);
        const da = it.a + 0.45;
        const dd = dist * 0.72;
        return (
          <g key={i}>
            <Star4 x={x} y={y} r={it.sz * sc} k={k / 2} rot={it.spin * q} />
            {dot > 0 ? <circle cx={n2(Math.cos(da) * dd)} cy={n2(Math.sin(da) * dd)} r={n2(3 * k * dot)} fill={C.lemon} stroke={C.ink} strokeWidth={1.5 * (k / 2)} /> : null}
          </g>
        );
      })}
    </svg>
  );
}
