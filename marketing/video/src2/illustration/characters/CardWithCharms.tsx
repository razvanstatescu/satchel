import type { CSSProperties, ReactNode } from "react";
import { type CharmFace, CharmShape, type CharmShapeProps, charmFill } from "../../brand/Charm";
import type { Chain } from "../../brand/tokens";
import { C } from "../../brand/tokens";
import { type PillKind, SatchelCard } from "../../components/Sticker";
import { CardFlip } from "./CardFlip";
import { r2 } from "./geometry";

/**
 * Satchel #7 with its charms: the SatchelCard front (or any front / back pair, flippable) with the charm bar along
 * its bottom edge and the three chain charms hanging from short stems on jump rings (concepts-v2 §4.1). The bar hangs
 * just under the card's hard shadow on two short ink posts. Bar, rings and charms keep the brand illustration's
 * proportions (bar 22 units thick, stems 12 wide, outline 12/140 of the coin) at the scale set by `charmSize`.
 * Charm faces and angles are all props; drive them with charmSwing / charmFollow / charmBlink.
 *
 * <CardWithCharms width={800} charms={[{ angle: a0, face: { blink } }, { angle: a1 }, { angle: a2, show: s }]} />
 *
 * Props
 *   width        card width px (default 640). Height = width / 1.586; the charms hang below (see cardWithCharmsHeight).
 *   id, total, label, chips, pill, name   passed to the default SatchelCard front.
 *   front, back  custom faces (ReactNode). back + flip turn it into a <CardFlip>.
 *   flip         0 front … 1 back (CSS 3D via <CardFlip>, perspective 2400). The bar and posts are projected exactly like
 *                the card, so the rig turns with it; the charms stay face-on characters hanging from the projected pivots.
 *   keepOrder    true (default): BTC · ETH · SOL stay left to right on the back too; false: the physical mirror.
 *   lift         card lift 0..1+ (the card, bar and charms rise together; the card's drop grows). With custom
 *                front / back faces, pass the same lift to them.
 *   bar          0..1 the bar draws in from its centre (H1 starts with an empty bar: bar 1, charms show 0).
 *   hooks        show the jump rings (default true): the hooks the charms snap onto.
 *   charmSize    coin diameter as a fraction of the card width (default 0.18).
 *   spacing      charm spacing vs the brand illustration's 160 units (default 1.3). mount "posts" (default) | "rings" |
 *                "rail" (the bar sits on the card's bottom edge: most compact).
 *   stemLen      charm stem length in charm units (default 30: short stems).
 *   charms       three slots [BTC, ETH, SOL]; each { angle, face, squash, squashAnchor, show (0..1 scale-in),
 *                dx, dy (px offsets, e.g. falling onto the hook), grey, hat, hatSide, puff, drop, hidden }.
 *   night        #000 for any charm drop (charms hang without one by default). For a Night card, pass Night faces.
 *   children     drawn over everything, in card px (e.g. a hand's front layer, sparkles).
 */

export interface CharmSlot extends Partial<Omit<CharmShapeProps, "fill" | "face">> {
  face?: CharmFace;
  /** 0..1 scale-in about the pivot (snap-on). Default 1. */
  show?: number;
  /** px offsets (falling in, overshooting the hook). */
  dx?: number;
  dy?: number;
  hidden?: boolean;
  /** fill override (else the chain colour). */
  fill?: string;
}

const CARD_RATIO = 252 / 400;
const CHAINS: Chain[] = ["btc", "evm", "sol"];

/** Total height (card + hanging charms) for layout, px. */
export function cardWithCharmsHeight(width: number, charmSize = 0.18, stemLen = 30) {
  const u = (width * charmSize) / 140;
  return width * CARD_RATIO + (4 * width) / 400 + u * (16 + 22 + 12 + stemLen + 56 + 64 + 6);
}

export function CardWithCharms({
  width = 640,
  id = "7",
  total,
  label,
  chips,
  pill,
  name,
  front,
  back,
  flip = 0,
  lift = 0,
  bar = 1,
  hooks = true,
  charmSize = 0.18,
  stemLen = 30,
  charms = [{}, {}, {}],
  night = false,
  icons = "charm",
  yours = false,
  mount = "posts",
  spacing = 1.3,
  keepOrder = true,
  style,
  children,
}: {
  width?: number;
  id?: string;
  total?: ReactNode;
  label?: string;
  chips?: { chain: Chain; amount?: string }[];
  pill?: PillKind;
  name?: string;
  front?: ReactNode;
  back?: ReactNode;
  flip?: number;
  lift?: number;
  bar?: number;
  hooks?: boolean;
  charmSize?: number;
  stemLen?: number;
  charms?: CharmSlot[];
  night?: boolean;
  /** ledger row icons on the default front: "charm" (default, as in the app) or "dot" */
  icons?: "charm" | "dot";
  /** the lemon "Yours" sticker on the default front */
  yours?: boolean;
  /** how the bar attaches: "posts" (hangs below the card on two short posts), "rings", or "rail" (on the edge) */
  mount?: "posts" | "rings" | "rail";
  /** charm spacing relative to the brand illustration's 160 units (default 1.3) */
  spacing?: number;
  /** while flipped, keep BTC · ETH · SOL left to right (default true); false = the physical mirror seen from behind */
  keepOrder?: boolean;
  style?: CSSProperties;
  /** drawn over everything, in card px coordinates */
  children?: ReactNode;
}) {
  const H = width * CARD_RATIO;
  const k = width / 400;
  const u = (width * charmSize) / 140; // px per charm unit
  const flipping = !!back;
  const theta = flipping ? flip * Math.PI : 0;
  const pop = flipping ? 1 + 0.06 * Math.abs(Math.sin(theta)) : 1; // CardFlip's edge-on pop
  const P = 2400; // CardFlip's perspective
  const rise = -8 * lift * k;
  const frontNode = front ?? <SatchelCard id={id} width={width} total={total} label={label} chips={chips} pill={pill} name={name} lift={lift} icons={icons} yours={yours} night={night} />;
  const card = flipping ? <CardFlip flip={flip} width={width} height={H} front={frontNode} back={back} perspective={P} /> : frontNode;

  /** A point on the card's plane (card px from its top-left) projected exactly as CSS does for <CardFlip>. */
  const proj = (lx: number, ly: number) => {
    const x0 = lx - width / 2;
    const y0 = ly - H / 2;
    const c = Math.cos(theta);
    const X = keepOrder ? x0 * Math.abs(c) : x0 * c;
    // depth of the card at that screen position (with keepOrder the back face's mirror point is the one there)
    const Z = -x0 * Math.sin(theta) * (keepOrder && c < 0 ? -1 : 1);
    const f = P / (P - Z);
    return { x: width / 2 + X * pop * f, y: H / 2 + y0 * pop * f, f: f * pop };
  };

  // the rig in card-plane coordinates: bar 22 units thick, hanging 16 units under the card's shadow on two posts
  const gapU = 160 * spacing;
  const barLenFull = 2 * gapU + 120;
  const barHalf = (barLenFull * u * Math.max(0, Math.min(1, bar))) / 2;
  const barH = 22 * u;
  const edgeY = H + rise;
  const barY = mount === "rail" ? H - barH * 0.5 + rise : H + rise + 4 * k + 16 * u + barH / 2;
  const pivotY = barY + barH / 2;
  const cx = width / 2;
  const shadow = night ? "#000" : C.ink;
  const postX = (barLenFull / 2 - 46) * u;
  const barA = proj(cx - barHalf, barY);
  const barB = proj(cx + barHalf, barY);
  const thick = barH * (barA.f + barB.f) * 0.5;
  return (
    <div style={{ position: "relative", width, height: H, ...style }}>
      {card}
      <svg width={width} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        {hooks && bar > 0
          ? CHAINS.map((c, i) => {
              const q = proj(cx + (i - 1) * gapU * u, pivotY + 5 * u);
              return <circle key={`r${c}`} cx={r2(q.x)} cy={r2(q.y)} r={r2(7.5 * u * q.f)} fill="none" stroke={C.ink} strokeWidth={r2(5 * u * q.f)} />;
            })
          : null}
        {mount !== "rail" && bar > 0
          ? [-1, 1].map((sd) => {
              const top = proj(cx + sd * postX, edgeY - 6 * u);
              const bot = proj(cx + sd * postX, barY);
              if (mount === "posts") {
                return <line key={`p${sd}`} x1={r2(top.x)} y1={r2(top.y)} x2={r2(bot.x)} y2={r2(bot.y)} stroke={C.ink} strokeWidth={r2(12 * u * (top.f + bot.f) * 0.5)} strokeLinecap="round" />;
              }
              const mid = proj(cx + sd * postX, (edgeY + barY) / 2);
              return <circle key={`p${sd}`} cx={r2(mid.x)} cy={r2(mid.y)} r={r2(((barY - edgeY) / 2 + 2 * u) * mid.f)} fill="none" stroke={C.ink} strokeWidth={r2(5 * u * mid.f)} />;
            })
          : null}
        {barHalf > 0.25 ? <line x1={r2(barA.x)} y1={r2(barA.y)} x2={r2(barB.x)} y2={r2(barB.y)} stroke={C.ink} strokeWidth={r2(thick)} strokeLinecap="round" /> : null}
        {CHAINS.map((c, i) => {
          const s = charms[i] ?? {};
          const show = s.show ?? 1;
          if (s.hidden || show <= 0.001) return null;
          const q = proj(cx + (i - 1) * gapU * u, pivotY);
          const x = q.x + (s.dx ?? 0);
          const y = q.y + (s.dy ?? 0);
          const { face, show: _show, dx: _dx, dy: _dy, hidden: _h, fill, ...shape } = s;
          return (
            <g key={c} transform={`translate(${r2(x)} ${r2(y)}) scale(${r2(u * q.f * show * 1000) / 1000})`}>
              <CharmShape fill={fill ?? charmFill(c)} face={face} stemLen={stemLen} shadowColor={shadow} {...shape} />
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}
