import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { type CharmFace, charmKick } from "../../brand/Charm";
import { C, type Chain, NIGHT } from "../../brand/tokens";
import { HISTORY_7 } from "../../components/ui";
import { CardBack, CardWithCharms, Hand } from "../../illustration/characters";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { getScene, marker } from "../../lib/timeline";
import { blinkSchedule, CaptionSlap, clamp, EASE2, eyeOpen, flipAt, slapAt, SPRING2 } from "../../motion";
import { SatchelCard } from "../../components/Sticker";
import { nightOutline, NightRig, type Theme, WHIP_IN, whipSmear } from "../C1/parts";

/**
 * T0 · The flip (72–76 s). The whip from the catch lands on Satchel #7, listed ("Paused for sale"), in bob's hand, still
 * in Night. bob gives it a flick: it lifts, winds back, and FLIPS (the film's one 3D move, kit flipAt on SPRING2.quick)
 * while Day sweeps back in with the rotation (the wipe's edge x = θ/180 · width, left → right). The back holds the three
 * P3 records under "History · 3 signatures" (the H1 plant paid off); it slaps down, the charms swing and smile again.
 * "Satchel keeps the receipts." Then the camera falls toward the ETH record on the riser; T1 cuts in on the drop.
 */

const sc = getScene("T0");
const F = (sec: number) => Math.round(sec * FPS);
const T = {
  flip: F(marker("flip") - sc.start), // 30: the flip starts on the marker
  satchel: F(sc.wordAt("V17", "Satchel")), // ≈ 49
  receipts: F(sc.wordAt("V17", "receipts")), // ≈ 76
  end: F(sc.duration), // 120
};
const WIND = T.flip - 6; // the flick: lift and wind back
const LAND = T.flip + 12; // it slaps down (contact)
const PUSH = T.end - 17; // the camera falls toward the ETH record on the riser (after the caption's 1.8 s read)

// ── layout ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const CW = 620;
const KC = CW / 400;
const CH = CW * (252 / 400);
const U = (CW * 0.18) / 140;
const GAP = 160 * 1.3 * U;
const PIVOT_Y = CH + 4 * KC + 38 * U;
const COIN_Y = PIVOT_Y + 98 * U;
const CARD = { x: 960 - CW / 2, y: 372 };
const GRIP = { x: CARD.x + 30, y: CARD.y + 24 };
const ETH_ROW = { x: CARD.x + KC * 198.5, y: CARD.y + KC * 138 }; // CardBack: the 2nd record's centre
const RECORDS = HISTORY_7.map((r) => ({ chain: r.chain, label: r.label, state: "recorded" as const }));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (f: number, a: number, b: number, ease: (t: number) => number = EASE2.swing) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
const sp = (f: number, cfg: { mass: number; stiffness: number; damping: number }) => (f <= 0 ? 0 : spring({ frame: f, fps: FPS, config: cfg }));

/** Card angle (deg): a wind-back of −12° on the flick, then the kit's flip (0 → 180 on quick, overshooting to ~196). */
export function t0Deg(f: number) {
  if (f < WIND) return 0;
  if (f < T.flip) return -12 * prog(f, WIND, T.flip, EASE2.out);
  const p = flipAt(f, T.flip, FPS).deg / 180;
  return -12 * (1 - p) + 180 * p;
}
/** Lift (sticker units): up on the flick, airborne through the flip, slapped down on LAND. */
function cardLift(f: number) {
  if (f < LAND - 4) return 1.1 * prog(f, WIND, T.flip, EASE2.out);
  const s = slapAt(f - LAND + 4, FPS, 1, { from: 1, squash: 0, drop: 1.1 });
  return s.lift;
}

const CHAINS: Chain[] = ["btc", "evm", "sol"];
const REACT = { sol: 0, evm: 2, btc: 4 } as const;
const BLINKS: Record<Chain, number[]> = {
  btc: blinkSchedule("t0-btc", 6, 120, [LAND + 5]),
  evm: blinkSchedule("t0-eth", 20, 120, [LAND + 3]),
  sol: blinkSchedule("t0-sol", 2, 120, [LAND + 1]),
};
function charm(chain: Chain, f: number, theme: Theme): { angle: number; face: CharmFace; outlineColor: string } {
  const r = REACT[chain];
  // the flick and the turn throw them, the landing bumps them (personality springs, SOL first)
  const angle =
    charmKick(chain, (f - WIND - r) / FPS, chain === "sol" ? -7 : -5) +
    charmKick(chain, (f - T.flip - 1 - r) / FPS, chain === "sol" ? 11 : chain === "evm" ? 9 : 7) +
    charmKick(chain, (f - LAND - r) / FPS, chain === "btc" ? -4 : -3);
  // Night: still worried from the catch; Day comes back with the flip and the smiles return (joy as it lands)
  const worried = theme === "night" ? 1 : 1 - prog(f, LAND - 4, LAND + 8, EASE2.out);
  const smile = 0.35 + 0.85 * (1 - worried) + 0.35 * Math.sin(Math.PI * prog(f, LAND + 2 + r, LAND + 26 + r));
  const joy = interpolate(f - LAND - r, [2, 5, 14, 18], [0, 1, 1, 0], clamp);
  const lookDown = theme === "night" ? 1 : 1 - prog(f, LAND - 6, LAND + 4);
  const look = { x: chain === "btc" ? 2 : chain === "sol" ? -2 : 0, y: 3 * lookDown };
  const tilt = chain === "evm" ? 6 * (sp(f - LAND - 12, SPRING2.quick) - sp(f - LAND - 40, SPRING2.land)) : 0;
  const blink = Math.max(1 - eyeOpen(f, BLINKS[chain]), 0);
  return {
    angle,
    face: { smile, joy, look, blink, tilt, wide: interpolate(f - T.flip - r, [0, 2, 6, 9], [0, 1, 1, 0], clamp) },
    outlineColor: theme === "night" ? NIGHT.lineStrong : C.ink,
  };
}

/** bob's hand: holds the top-left corner, flicks the card over (lets go), catches it again as it lands. */
function bob(f: number) {
  const flick = prog(f, WIND - 2, WIND + 3, EASE2.out);
  const back = prog(f, LAND - 2, LAND + 4, EASE2.out);
  const pinch = 1 - 0.85 * flick + 0.85 * back;
  const dip = f >= LAND ? 7 * (1 - sp(f - LAND, SPRING2.rebound)) * Math.min(1, (f - LAND) / 1.5) : 0;
  return { x: GRIP.x - 6 * flick * (1 - back), y: GRIP.y - 12 * flick * (1 - back) + dip, pinch };
}

function World({ f, theme }: { f: number; theme: Theme }) {
  const night = theme === "night";
  const deg = t0Deg(f);
  const lift = cardLift(f);
  const h = bob(f);
  const charms = CHAINS.map((c) => charm(c, f, theme));
  const front = <SatchelCard width={CW} night={night} id="7" pill="paused" icons="dot" lift={Math.max(0, lift)} />;
  const back = <CardBack width={CW} records={RECORDS} count={3} lift={Math.max(0, lift)} night={night} countPop={prog(f, LAND + 4, LAND + 14)} />;
  const hand = (layer: "back" | "front") => (
    <Hand pose="pinch" x={h.x} y={h.y} k={KC} angle={92} sleeve="bob" pinch={h.pinch} armLength={700} layer={layer} night={night} drop={night ? 0 : 1} style={night ? { filter: nightOutline() } : undefined} />
  );
  return (
    <AbsoluteFill>
      {hand("back")}
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y + (lift < 0 ? -lift * 4 * KC : 0) }}>
        {night ? <NightRig width={CW} lift={Math.max(0, lift)} flip={deg / 180} angles={[charms[0].angle, charms[1].angle, charms[2].angle]} /> : null}
        <CardWithCharms width={CW} night={night} lift={Math.max(0, lift)} front={front} back={back} flip={deg / 180} charms={charms} />
      </div>
      {hand("front")}
    </AbsoluteFill>
  );
}

/** The fall toward the ETH record on the riser (ease-in: it accelerates into the drop). */
function pushAt(f: number) {
  const fall = prog(f, PUSH, T.end, EASE2.fall);
  return { x: lerp(960, ETH_ROW.x, fall), y: lerp(540, ETH_ROW.y, fall), s: lerp(1, 1.62, fall) };
}
function camera(f: number) {
  // a held frame with a 1% drift, then the fall
  const drift = 0.01 * prog(f, LAND, PUSH, (t) => t);
  const p = pushAt(f);
  return { x: p.x, y: p.y + 20 * (1 - prog(f, PUSH, T.end, EASE2.fall)), s: p.s * (1 + drift) };
}

export default function T0() {
  const f = useCurrentFrame();
  const deg = t0Deg(f);
  const wipe = Math.max(0, Math.min(1, deg / 180)); // Day sweeps back with the rotation (left → right)
  const dayAll = f > T.flip && wipe >= 1;
  const dx = f < WHIP_IN.length ? WHIP_IN[f] : 0;
  const cam = camera(f);
  const push = pushAt(f);
  const view = (theme: Theme) => (
    <AbsoluteFill style={{ translate: `${dx}px 0`, scale: `${whipSmear(dx)} 1` }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`, transformOrigin: "0 0" }}>
        <World f={f} theme={theme} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: dayAll ? C.ground : NIGHT.ground, overflow: "hidden" }}>
      {!dayAll ? view("night") : null}
      {wipe > 0 ? (
        <AbsoluteFill style={{ background: C.ground, clipPath: dayAll ? undefined : `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>{view("day")}</AbsoluteFill>
      ) : null}
      {/* the wipe's leading edge: a hard 10 px ink line, like the Night blind's edge */}
      {wipe > 0 && wipe < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 10, background: C.ink }} /> : null}
      {/* the caption holds still while it is read; on the riser it rides the camera's fall (no text over the card) */}
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${push.s}) translate(${-push.x}px, ${-push.y}px)`, transformOrigin: "0 0" }}>
        <Sequence from={T.satchel - 4} layout="none">
          <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center", whiteSpace: "pre-line", textAlign: "center" }}>
            <CaptionSlap text={"Satchel keeps\nthe receipts."} size={120} seed="t0-receipts" />
          </div>
        </Sequence>
      </AbsoluteFill>
      <Sfx name="whoosh-zip" at={0} align="peak" gainDb={0} />
      <Sfx name="whoosh-soft" at={(T.flip + 1.5) / FPS} align="peak" gainDb={2} />
      <Sfx name="charm-jingle" at={(T.flip + 6) / FPS} align="peak" gainDb={-8} />
      <Sfx name="sticker-slap" at={LAND / FPS} gainDb={-3} />
      <Sfx name="sticker-slap" at={T.satchel / FPS} gainDb={-13} />
    </AbsoluteFill>
  );
}
