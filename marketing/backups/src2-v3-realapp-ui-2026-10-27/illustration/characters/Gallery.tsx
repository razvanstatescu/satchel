import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Charm, type CharmFace, type CharmShapeProps, charmBlink, charmFollow, charmSwing } from "../../brand/Charm";
import { C, type Chain, mono, NIGHT, OUTLINE, sans } from "../../brand/tokens";
import { Button, SatchelCard } from "../../components/Sticker";
import { CardBack, type RecordProps } from "./CardBack";
import { CardFlip } from "./CardFlip";
import { CardWithCharms } from "./CardWithCharms";
import { BrowserFrame, PhoneFrame } from "./Devices";
import { Hand, type HandProps } from "./Hand";

/**
 * QA gallery for src2/illustration/characters (composition `CharactersGallery`, 6 s). Every component and state in one
 * frame, labelled in Onest 22px, with a few live bits: the three personality swings (released at 0.4 s and 3.4 s),
 * a blink, the reach wiggle, the wave, the tap press, the card flip (front → back at 0.8 s, → front at 3.6 s) and
 * the charms following a card nudge. QA input props (no defaults needed):
 *   focus "hero"    an H1-like frame at film scale (Satchel #7 at 800 px, alice's pinch, bob's open palm); add
 *                   heroFlip (0..2) to see the card-with-charms flip in 3D.
 *   focus "devices" the Night phone and the browser at film scale.
 *   focus "charms" | "hands" | "cards" one band alone. Zoom with --scale=2 and crop for close inspection.
 * e.g. npx remotion still src2/index.ts CharactersGallery out.png --props='{"focus":"hero","heroFlip":0.3}' 
 */

type Focus = "all" | "charms" | "hands" | "cards" | "hero" | "devices";

const LABEL: CSSProperties = { ...sans(500), fontSize: 22, color: C.inkMuted, whiteSpace: "nowrap" };

function Label({ x, y, children, center = false, color }: { x: number; y: number; children: ReactNode; center?: boolean; color?: string }) {
  return <div style={{ position: "absolute", left: x, top: y, ...LABEL, color: color ?? C.inkMuted, transform: center ? "translateX(-50%)" : undefined }}>{children}</div>;
}

function Title({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: x, top: y, ...sans(700), fontSize: 22, color: C.ink, letterSpacing: "-0.01em" }}>{children}</div>;
}

// ── band A: charms ──────────────────────────────────────────────────────────────────────────────────────────────
function CharmsBand({ t }: { t: number }) {
  const size = 84;
  const step = 115;
  const x0 = 70;
  const y0 = 64;
  const blink = charmBlink(t, [0.8, 1.1, 2.92, 4.6]);
  const rel = (s: number) => (t < s ? 0 : t - s);
  const release = t < 3.4 ? rel(0.4) : rel(3.4);
  const items: { label: string; chain: Chain; face?: CharmFace; extra?: Partial<CharmShapeProps>; angle?: number }[] = [
    { label: "open", chain: "btc" },
    { label: "blink", chain: "evm", face: { blink } },
    { label: "joy ∩", chain: "sol", face: { joy: 1, smile: 1.4 } },
    { label: "wide · o", chain: "btc", face: { wide: 1, o: 1 } },
    { label: "look", chain: "evm", face: { look: { x: 8, y: -4 } } },
    { label: "flat", chain: "sol", face: { smile: 0, look: { x: -7, y: 1 } } },
    { label: "grin", chain: "btc", face: { grin: 1, joy: 1 } },
    { label: "grey", chain: "evm", face: { o: 0.85, wide: 0.4 }, extra: { grey: 1 } },
    { label: "squash", chain: "sol", extra: { squash: 1.25, squashAnchor: "bottom" } },
    { label: "stretch", chain: "btc", face: { blink: 1 }, extra: { squash: -0.5, squashAnchor: "top" } },
    { label: "hat", chain: "evm", face: { joy: 1, grin: 0.55 }, extra: { hat: 1 } },
    { label: "tilt", chain: "evm", face: { tilt: 6, look: { x: -6, y: -2 } } },
    { label: "puff", chain: "sol", face: { smile: 0.5 }, extra: { puff: 1 } },
    { label: "BTC 0.9 s", chain: "btc", angle: charmSwing("btc", release, 12), face: { blink: release > 0 && release < 0.6 ? 0 : 0 } },
    { label: "ETH 0.7 s", chain: "evm", angle: charmSwing("evm", release, 12), face: { tilt: 6 * Math.min(1, release * 4) * (release < 1.6 ? 1 : 0) } },
    { label: "SOL 0.45 s", chain: "sol", angle: charmSwing("sol", release, 12), face: { joy: release > 0.05 && release < 0.9 ? 1 : 0, smile: 1.3 } },
  ];
  return (
    <>
      <Title x={40} y={14}>Charms · faces, body and personality swings (live)</Title>
      <div style={{ position: "absolute", left: x0 + 13 * step - 52, top: 56, width: 3 * step + 8, height: 30, borderTop: `3px solid ${C.ink}`, borderRadius: 2 }} />
      {items.map((it, i) => {
        const cx = x0 + i * step;
        return (
          <div key={it.label}>
            <div style={{ position: "absolute", left: cx - 64, top: y0 }}>
              <Charm chain={it.chain} size={size} face={it.face} angle={it.angle ?? 0} {...it.extra} />
            </div>
            <Label x={cx - 6} y={y0 + 150} center>
              {it.label}
            </Label>
          </div>
        );
      })}
    </>
  );
}

// ── band B: hands ───────────────────────────────────────────────────────────────────────────────────────────────
function Tile({ x, y, w, h, night = false, children }: { x: number; y: number; w: number; h: number; night?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 28,
        background: night ? NIGHT.ground : C.surface,
        border: `2px solid ${night ? NIGHT.ground : C.line}`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function HandsBand({ t }: { t: number }) {
  const k = 1.15;
  const w = 290;
  const h = 336;
  const gap = 17;
  const x0 = 40;
  const y0 = 290;
  const tapCycle = (t % 1.5) / 1.5;
  const press = interpolate(tapCycle, [0.3, 0.42, 0.55, 0.75], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const wave = -6 + 12 * Math.sin(2 * Math.PI * 1.6 * t);
  const tiles: { label: string; sub: string; night?: boolean; render: (cx: number) => ReactNode }[] = [
    {
      label: "pinch",
      sub: "alice · lemon",
      render: (cx) => <Hand pose="pinch" x={cx + 6} y={92} k={k} sleeve="alice" angle={6} pinch={0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t) ** 2} />,
    },
    {
      label: "hold",
      sub: "bob · sky · palm under",
      render: (cx) => {
        const hp: HandProps = { pose: "hold", x: cx + 34, y: 196, k, sleeve: "bob", grip: 0.5 + 0.5 * Math.min(1, Math.max(0, Math.sin(2 * Math.PI * 0.4 * t) * 2)) };
        return (
          <>
            <Hand {...hp} layer="back" />
            <div style={{ position: "absolute", left: cx - 104, top: 196 - 118, width: 190, height: 118, borderRadius: 22, background: C.white, border: `${OUTLINE * k}px solid ${C.ink}`, boxShadow: `0 ${4 * k}px 0 ${C.ink}`, boxSizing: "border-box" }} />
            <Hand {...hp} layer="front" />
          </>
        );
      },
    },
    {
      label: "tap",
      sub: "carol · stripes",
      render: (cx) => (
        <>
          <div style={{ position: "absolute", left: cx - 64, top: 46 }}>
            <Button label="Send" k={1.15} press={press} width={128} />
          </div>
          <Hand pose="tap" x={cx + 2} y={72 + 4.6 * press} k={k} sleeve="carol" press={press} angle={-4} />
        </>
      ),
    },
    {
      label: "reach",
      sub: "satchelhq · left hand",
      render: (cx) => <Hand pose="reach" x={cx - 4} y={44} k={k} sleeve="team" mirror wiggle={1} phase={2 * Math.PI * 2.2 * t} />,
    },
    {
      label: "wave",
      sub: "stranger · grey",
      render: (cx) => <Hand pose="wave" x={cx} y={250} k={k} sleeve="stranger" angle={wave} anchor="wrist" />,
    },
    {
      label: "grab",
      sub: "seller · ink, Night",
      night: true,
      render: (cx) => <Hand pose="grab" x={cx + 6} y={128} k={k} sleeve="seller" night tag="seller" />,
    },
  ];
  return (
    <>
      <Title x={40} y={254}>Sticker hands · six poses, six sleeves (tags stay upright)</Title>
      {tiles.map((tl, i) => {
        const x = x0 + i * (w + gap);
        return (
          <div key={tl.label}>
            <Tile x={x} y={y0} w={w} h={h} night={tl.night}>
              {tl.render(w / 2)}
            </Tile>
            <Label x={x + 16} y={y0 + h + 6}>
              <span style={{ color: C.ink, fontWeight: 600 }}>{tl.label}</span> · {tl.sub}
            </Label>
          </div>
        );
      })}
    </>
  );
}

// ── band C: card back, flip, card with charms, devices ─────────────────────────────────────────────────────────
const HISTORY3: RecordProps[] = [
  { chain: "btc", label: "BTC · coin 3f9a…:0" },
  { chain: "evm", label: "ETH · nonce 1" },
  { chain: "sol", label: "SOL · blockhash 9xQe…" },
];

function CardsBand({ t, fps, frame }: { t: number; fps: number; frame: number }) {
  const y0 = 700;
  // record row draw-on loop and a stamp slapping in (phase chosen so frame 90 shows every state)
  const ph = (t + 1.2) % 3;
  const clampO = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const draw = interpolate(ph, [0.3, 1.4], [0, 1], clampO);
  const typed = interpolate(ph, [1.4, 2.2], [0, 1], clampO);
  const stampIn = interpolate(ph, [0.2, 0.45], [0, 1], clampO);
  // flip: front → back at 0.8 s, back → front at 3.6 s (SPRING2.quick, as the kit's flipAt)
  const quick = { mass: 1, stiffness: 800, damping: 34 };
  const flip = spring({ frame: frame - Math.round(0.8 * fps), fps, config: quick }) + spring({ frame: frame - Math.round(3.6 * fps), fps, config: quick });
  // card nudge: slides 60 px left at 1.0 s and back at 3.2 s; the charms follow with their personalities
  const nudge = (s: number) =>
    -interpolate(s, [1.0, 1.5], [0, 60], { ...clampO, easing: Easing.inOut(Easing.cubic) }) +
    interpolate(s, [3.2, 3.7], [0, 60], { ...clampO, easing: Easing.inOut(Easing.cubic) });
  const dx = nudge(t);
  const chains: Chain[] = ["btc", "evm", "sol"];
  const angles = chains.map((c) => charmFollow(c, t, nudge, { lengthPx: 60 }));
  // the held card lives in its own tile so alice's sleeve leaves through the tile's edge (the H1 pinch)
  const tile = { x: 786, y: y0 - 6, w: 560, h: 352 };
  const cwW = 300;
  const cwX = 200 + dx;
  const cwY = 40;
  const hk = cwW / 400;
  const pinchProps: HandProps = { pose: "pinch", x: cwX + 16, y: cwY + 16, k: hk, sleeve: "alice", angle: 140, arm: -10 };
  return (
    <>
      <Title x={40} y={664}>Card back · flip · card with charms · devices</Title>
      <div style={{ position: "absolute", left: 40, top: y0 }}>
        <CardBack
          width={400}
          count={4}
          records={[
            { chain: "btc", label: "BTC · coin 3f9a…:0", state: "stamped", stamp: "Coin spent", stampIn },
            { chain: "evm", label: "ETH · nonce 1", state: "signed" },
            { chain: "sol", label: "SOL · blockhash 9xQe…", draw, typed, note: typed >= 1 ? "Recorded" : undefined },
            { chain: "evm", label: "ETH · nonce 12 · Unused", state: "unused" },
          ]}
        />
      </div>
      <Label x={40} y={y0 + 270}>
        <span style={{ color: C.ink, fontWeight: 600 }}>CardBack</span> · 4 states
      </Label>
      <div style={{ position: "absolute", left: 470, top: y0 + 10 }}>
        <CardFlip flip={flip} width={290} height={(290 * 252) / 400} front={<SatchelCard width={290} />} back={<CardBack width={290} records={HISTORY3} />} />
      </div>
      <Label x={470} y={y0 + 270}>
        <span style={{ color: C.ink, fontWeight: 600 }}>CardFlip</span> · live 3D
      </Label>
      <Tile x={tile.x} y={tile.y} w={tile.w} h={tile.h}>
        <Hand {...pinchProps} layer="back" />
        <div style={{ position: "absolute", left: cwX, top: cwY }}>
          <CardWithCharms
            width={cwW}
            charms={[
              { angle: angles[0], face: { blink: charmBlink(t, [2.1]) } },
              { angle: angles[1], face: { tilt: Math.abs(dx) > 1 ? -6 : 0, look: { x: dx < -1 ? -6 : 0, y: 0 } } },
              { angle: angles[2], face: { joy: Math.abs(angles[2]) > 4 ? 1 : 0, smile: 1.3 } },
            ]}
          />
        </div>
        <Hand {...pinchProps} layer="front" />
      </Tile>
      <Label x={tile.x + 16} y={tile.y + tile.h + 6}>
        <span style={{ color: C.ink, fontWeight: 600 }}>CardWithCharms</span> · alice's pinch (H1)
      </Label>
      <div style={{ position: "absolute", left: 1372, top: y0 - 6 }}>
        <PhoneFrame k={0.42} statusBar>
          <div style={{ padding: "58px 22px 0", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ ...sans(800), fontFamily: '"Funnel Display", Onest, sans-serif', fontSize: 30, color: C.ink }}>Satchel #7</div>
            <SatchelCard width={300} />
            <div style={{ ...mono(450), fontSize: 15, color: C.inkMuted }}>bc1q9h…x4d7</div>
          </div>
        </PhoneFrame>
      </div>
      <Label x={1372} y={y0 + 330}>
        <span style={{ color: C.ink, fontWeight: 600 }}>Phone</span>
      </Label>
      <div style={{ position: "absolute", left: 1548, top: y0 + 4 }}>
        <BrowserFrame k={0.26}>
          <div style={{ padding: "48px 64px", display: "flex", gap: 56, alignItems: "flex-start" }}>
            <CardBack width={520} records={HISTORY3.map((r, i) => ({ ...r, state: "stamped" as const, stamp: ["Coin spent", "Nonce used", "Blockhash expired"][i] }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...sans(800), fontFamily: '"Funnel Display", Onest, sans-serif', fontSize: 52, color: C.ink, lineHeight: 1 }}>Clean history</div>
              <div style={{ ...sans(500), fontSize: 24, color: C.inkMuted }}>Checked in your browser</div>
            </div>
          </div>
        </BrowserFrame>
      </div>
      <Label x={1548} y={y0 + 222}>
        <span style={{ color: C.ink, fontWeight: 600 }}>Browser</span>
      </Label>
    </>
  );
}

/** Film-scale check (not part of the grid): an H1-like frame, Satchel #7 at 800 px with its charms, alice pinching
 * the top-left corner and bob's palm waiting on the right. */
function HeroCheck({ t, flip }: { t: number; flip?: number }) {
  const W = 800;
  const k = W / 400;
  const x = 560;
  const y = 250;
  const chains: Chain[] = ["btc", "evm", "sol"];
  const rel = Math.max(0, t - 0.3);
  const pinch: HandProps = { pose: "pinch", x: x + 26, y: y + 26, k, sleeve: "alice", angle: 140, arm: -12 };
  const hold: HandProps = { pose: "hold", x: 1650, y: 560, k, sleeve: "bob", grip: 0 };
  return (
    <>
      {flip === undefined ? <Hand {...pinch} layer="back" /> : null}
      <div style={{ position: "absolute", left: x, top: y }}>
        <CardWithCharms
          width={W}
          flip={flip ?? 0}
          back={flip === undefined ? undefined : <CardBack width={W} records={HISTORY3} />}
          charms={chains.map((c, i) => ({ angle: charmSwing(c, rel, [8, -6, 10][i]), face: i === 2 ? { joy: 1, grin: 0.4 } : i === 1 ? { tilt: 6, look: { x: -6, y: -3 } } : {} }))}
        />
      </div>
      {flip === undefined ? <Hand {...pinch} layer="front" /> : null}
      {flip === undefined ? <Hand {...hold} /> : null}
    </>
  );
}

export function Gallery({ focus = "all", heroFlip }: { focus?: Focus; heroFlip?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (focus === "devices")
    return (
      <AbsoluteFill style={{ background: C.ground }}>
        <div style={{ position: "absolute", left: 60, top: 60 }}>
          <PhoneFrame k={1.25} statusBar night>
            <div style={{ padding: "60px 22px 0", ...sans(800), fontFamily: '"Funnel Display", Onest, sans-serif', fontSize: 30, color: NIGHT.ink }}>Give Satchel #7</div>
          </PhoneFrame>
        </div>
        <div style={{ position: "absolute", left: 560, top: 120 }}>
          <BrowserFrame k={1} width={1280} height={800}>
            <div style={{ padding: "48px 64px", display: "flex", gap: 56, alignItems: "flex-start" }}>
              <CardBack width={520} records={HISTORY3.map((r, i) => ({ ...r, state: "stamped" as const, stamp: ["Coin spent", "Nonce used", "Blockhash expired"][i] }))} />
            </div>
          </BrowserFrame>
        </div>
      </AbsoluteFill>
    );
  if (focus === "hero")
    return (
      <AbsoluteFill style={{ background: C.ground }}>
        <HeroCheck t={t} flip={heroFlip} />
      </AbsoluteFill>
    );
  const bands = (
    <>
      {focus === "all" || focus === "charms" ? <CharmsBand t={t} /> : null}
      {focus === "all" || focus === "hands" ? <HandsBand t={t} /> : null}
      {focus === "all" || focus === "cards" ? <CardsBand t={t} fps={fps} frame={frame} /> : null}
    </>
  );
  if (focus === "all") return <AbsoluteFill style={{ background: C.ground }}>{bands}</AbsoluteFill>;
  // zoomed QA: scale the band about its own box so it fills the frame
  const box = focus === "charms" ? { x: 0, y: 0, w: 1920, h: 250 } : focus === "hands" ? { x: 0, y: 245, w: 1920, h: 420 } : { x: 0, y: 655, w: 1920, h: 425 };
  const s = Math.min(1920 / box.w, 1080 / box.h, 2);
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s}) translate(${-box.x}px, ${-box.y}px)`, transformOrigin: "0 0" }}>{bands}</div>
    </AbsoluteFill>
  );
}
