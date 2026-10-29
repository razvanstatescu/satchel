import { Snowflake } from "lucide-react";
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, sans } from "../../brand/tokens";
import { ListSheet, PHONE } from "../../components/ui";
import { CardBack, type CharmFace, charmBlink, charmKick, CardWithCharms, Hand, type HandProps } from "../../illustration/characters";
import { FrostLaminate, PriceTag, priceTagSize, RequestSticker, requestSize, textWidth } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { clamp, EASE2, slapAt, SPRING2 } from "../../motion";
import { T2_RECORDS } from "../T2";
import { At, Caption, onBeat, sceneBeats, voF } from "../T2/kit";

/**
 * T4 · Paused for sale (94.5–99.5 s; V21 "List it, and signing pauses. The history stops growing.")
 * Satchel #7, still showing its history. A tiny list sheet says "Ready to list ✓" while bob's hand slaps the lemon
 * price tag "4,750.00 USDC" onto the card's corner. A frost laminate squeegees across with the "Paused for sale" pill
 * (snowflake turns 60°). bob tries to stick a new "Send" onto the history: it skids on the frost and drops away (the
 * film's one deliberate glide). The history header frosts over at "3 signatures". No countdown, no timer, ever.
 */

// ── the board (scene px) ──────────────────────────────────────────────────────────────────────────────────────────
const CARD_W = 680; // k 1.7
const CARD_H = (CARD_W * 252) / 400;
const CARD_X = 960 - CARD_W / 2;
const CARD_Y = 338;
const KC = CARD_W / 400;
const CHARM_SIZE = 0.19;
const TAG_S = 2.0; // price tag scale: the amount is ≈ 52 px
const TAG_TILT = 15;
const HOLE = { x: CARD_X + CARD_W - 30, y: CARD_Y + 128 }; // the tag's hole: just inside the top-right corner, below the S
const SHEET_S = 1.34; // the tiny list sheet
const SHEET_TOP = 330; // where the ListSheet's sheet starts inside its 390 × 844 phone box (measured)
const SHEET_H = 272; // UI px shown: title, "Ready to list ✓", the price
const SHEET_X = 58;
const SHEET_Y = 420;

export default function T4() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beats = sceneBeats("T4");
  const vo = voF("T4", "V21");

  // ── timing (scene frames) ─────────────────────────────────────────────────────────────────────────────────────
  const sheetIn = 0; // the list sheet slaps in on the cut (contact f4)
  const tagAt = onBeat(vo.word(1), beats); // bob slaps the tag on "it,"
  const sheetOut = tagAt + 12; // the sheet drops away once it's listed
  const frostAt = onBeat(vo.word(3), beats); // the frost squeegees across under "signing"
  const pillAt = frostAt + 10;
  const capAt = vo.word(4) - 0.5; // "Paused for sale." on "pauses."
  const tryAt = onBeat(vo.word(4, "end") - 2, beats); // bob tries a Send in the gap after "pauses."
  const histAt = vo.sentence(1) + 4; // "The history stops growing.": the header frosts over at "3 signatures"

  // ── the tiny list sheet ───────────────────────────────────────────────────────────────────────────────────────
  const sheetSlap = slapAt(f - sheetIn, fps, 0, { from: 1.18, squash: 0.05, drop: 0 });
  const sheetFall = interpolate(f, [sheetOut, sheetOut + 9], [0, 1], { ...clamp, easing: EASE2.fall });

  // ── bob's hand brings the price tag and slaps it on ───────────────────────────────────────────────────────────
  const tagSize = priceTagSize();
  const tagW = tagSize.w * TAG_S;
  const tagH = tagSize.h * TAG_S;
  // the tag's root box is the body; the hole is at (17, h/2) UI. Place the box so the hole lands on HOLE.
  const tagRest = { x: HOLE.x - 17 * TAG_S, y: HOLE.y - tagH / 2 };
  const carry = spring({ frame: f - (tagAt - 15), fps, config: SPRING2.land }); // brought in from the top right
  const slap = slapAt(f - (tagAt - 4), fps, 0, { from: 1.22, squash: 0.06, drop: 0 });
  const tagFromX = 1240;
  const tagFromY = -560;
  const tagX = tagRest.x + tagFromX * (1 - carry);
  const tagY = tagRest.y + tagFromY * (1 - carry);
  const tagDrop = f < tagAt ? 2.6 : interpolate(f - tagAt, [0, 2, 5], [0, 0, 1], clamp);
  const tagScale = f < tagAt - 4 ? 1.22 : slap.sx;
  // the string trails during the carry, then drapes down-left over the corner (clear of the captions above)
  const tagSwing = f < tagAt ? -30 + 20 * (1 - carry) : -72 + 14 * Math.exp(-(f - tagAt) / 7) * Math.cos((f - tagAt) * 0.7);
  // grip point on the tag (its right end, upper edge) in px, after the tilt about the hole
  const gripLocal = rot({ x: tagW - 30 - 17 * TAG_S, y: -tagH / 2 + 14 }, TAG_TILT);
  const grip = { x: HOLE.x + (tagX - tagRest.x) + gripLocal.x, y: HOLE.y + (tagY - tagRest.y) + gripLocal.y };
  const release = interpolate(f, [tagAt + 1, tagAt + 4], [1, 0], clamp);
  const handAway = interpolate(f, [tagAt + 4, tagAt + 13], [0, 1], { ...clamp, easing: EASE2.fall });
  const bob1: HandProps = { pose: "pinch", k: 2, size: 1.25, angle: -138, sleeve: "bob" };
  const bob1Visible = f >= tagAt - 16 && handAway < 1;

  // ── the frost ─────────────────────────────────────────────────────────────────────────────────────────────────
  const frost = interpolate(f, [frostAt, frostAt + 10], [0, 1], { ...clamp, easing: EASE2.out });
  const pill = f < pillAt ? 0 : spring({ frame: f - pillAt, fps, config: SPRING2.pop });

  // ── bob tries to stick a new Send onto the history: it skids on the frost and drops away ─────────────────────
  const reqS = 1.55;
  const req = requestSize("Send 0.01 BTC → `bc1q…`");
  const reqW = req.w * reqS;
  const reqH = req.h * reqS;
  const press = { x: CARD_X + CARD_W * 0.74, y: CARD_Y + CARD_H * 0.83 }; // where he presses it: below the pill
  const tryIn = spring({ frame: f - (tryAt - 12), fps, config: SPRING2.land });
  const skid = interpolate(f, [tryAt, tryAt + 10], [0, 1], { ...clamp, easing: EASE2.out }); // 80 px with a 5° roll
  const slip = interpolate(f, [tryAt + 7, tryAt + 20], [0, 1], clamp); // the sticker slides off the edge, then drops
  const recoil = interpolate(f, [tryAt + 9, tryAt + 18], [0, 1], { ...clamp, easing: EASE2.fall });
  // it squirts out from under his fingers: 80 px sideways with a 5° roll, then slides off the edge and drops
  const reqX = press.x + 700 * (1 - tryIn) + 80 * skid + 320 * (1 - (1 - slip) * (1 - slip));
  const reqY = press.y + 150 * (1 - tryIn) + 640 * slip * slip;
  const reqTilt = 5 * skid + 12 * slip;
  const reqDrop = f < tryAt ? 2.2 : interpolate(f - tryAt, [0, 2, 5], [0, 0, 0.6], clamp);
  const reqGrip = { x: reqX + reqW / 2 - 24, y: reqY + reqH / 2 - 12 };
  const bob2: HandProps = { pose: "pinch", k: 2, size: 1.25, angle: -46, sleeve: "bob" };
  const bob2Pinch = interpolate(f, [tryAt + 6, tryAt + 9], [1, 0], clamp);
  const bob2X = reqGrip.x - 320 * (1 - (1 - slip) * (1 - slip)) + 520 * recoil; // skids with it, then lets go
  const bob2Y = reqGrip.y - 640 * slip * slip + 120 * recoil;
  const tryVisible = f >= tryAt - 13 && slip < 1;
  const bob2Visible = f >= tryAt - 13 && recoil < 1;

  // ── camera: a punch-in toward the history header as it frosts over (captions stay put) ───────────────────────
  const push = interpolate(f, [histAt - 6, histAt + 8], [0, 1], { ...clamp, easing: EASE2.out });
  const zoom = 1 + 0.16 * push;
  const focus = { x: 990, y: 400 };

  // ── the history header frosts over at "3 signatures" ──────────────────────────────────────────────────────────
  const ice = f < histAt ? 0 : spring({ frame: f - histAt, fps, config: SPRING2.pop });
  const iceTurn = 60 * spring({ frame: f - histAt - 2, fps, config: SPRING2.quick });

  // ── charms: watch the tag, follow the frost, shiver once, follow the falling sticker ──────────────────────────
  const lag = { btc: 4, evm: 2, sol: 0 } as const;
  const chains = ["btc", "evm", "sol"] as const;
  const charms = chains.map((c, i) => {
    const L = lag[c];
    const lookTag = interpolate(f, [tagAt - 10 + L, tagAt - 7 + L, frostAt - 3, frostAt], [0, 1, 1, 0], clamp);
    const sweep = interpolate(f, [frostAt + L, frostAt + 10 + L], [-1, 1], clamp) * interpolate(f, [frostAt, frostAt + 2, pillAt + 6, pillAt + 9], [0, 1, 1, 0], clamp);
    const lookTry = interpolate(f, [tryAt - 6 + L, tryAt - 3 + L, tryAt + 22, tryAt + 25], [0, 1, 1, 0], clamp);
    const fallLook = interpolate(f, [tryAt + 8, tryAt + 16], [0, 1], clamp);
    const look = {
      x: 7 * lookTag + 7 * sweep + lookTry * (6 - 4 * fallLook),
      y: -4 * lookTag - 3 * Math.abs(sweep) + lookTry * (-1 + 6 * fallLook),
    };
    const shiver = f >= pillAt - 2 && f < pillAt + 6 ? 2.2 * Math.sin((f - pillAt) * 2.6 + i) : 0;
    const blink = charmBlink(f / FPS, [(frostAt - 4 + L) / FPS, (histAt + 8 + 2 * i) / FPS, (126 + 9 * i) / FPS]);
    const wide = interpolate(f - tryAt - L, [6, 8, 13, 16], [0, 1, 1, 0], clamp);
    const face: CharmFace = { look, blink, wide, smile: 1 - 0.5 * wide, o: 0.6 * wide };
    const angle = charmKick(c, (f - tagAt - L) / FPS, 4) + charmKick(c, (f - frostAt - 2 - L) / FPS, -3);
    return { angle, face, dx: shiver };
  });

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${focus.x}px ${focus.y}px`, scale: `${zoom}` }}>
        {/* the card (its back: the history) with its charms */}
        <At x={CARD_X} y={CARD_Y}>
          <CardWithCharms
            width={CARD_W}
            charmSize={CHARM_SIZE}
            front={<CardBack width={CARD_W} records={T2_RECORDS} />}
            charms={charms}
          />
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <FrostLaminate width={CARD_W} height={CARD_H} progress={frost} pill={pill} pillY={0.6} />
          </div>
          {/* the header's count, frozen on top of the laminate (card UI units × k) */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 400, height: 252, transform: `scale(${KC})`, transformOrigin: "0 0" }}>
            <IceSeal show={ice} turn={iceTurn} />
          </div>
        </At>

        {/* bob tries to stick a Send on: it skids on the frost and drops */}
        {tryVisible ? (
          <div style={{ position: "absolute", left: reqX - reqW / 2, top: reqY - reqH / 2 }}>
            <RequestSticker kind="send" scale={reqS} tilt={reqTilt} drop={reqDrop} />
          </div>
        ) : null}
        {bob2Visible ? <Hand {...bob2} x={bob2X} y={bob2Y} pinch={bob2Pinch} squash={interpolate(f, [tryAt, tryAt + 1, tryAt + 4], [1, 1, 0], clamp)} tagTilt={2} /> : null}

        {/* the price tag, slapped on by bob */}
        {f >= tagAt - 16 ? (
          <div style={{ position: "absolute", left: tagX, top: tagY, scale: `${tagScale} ${f < tagAt - 4 ? tagScale : slap.sy}`, transformOrigin: `${17 * TAG_S}px 50%` }}>
            <PriceTag scale={TAG_S} tilt={TAG_TILT} drop={tagDrop} swing={tagSwing} />
          </div>
        ) : null}
        {bob1Visible ? <Hand {...bob1} x={grip.x + 260 * handAway} y={grip.y - 420 * handAway} pinch={release} squash={interpolate(f, [tagAt, tagAt + 1, tagAt + 4], [1, 1, 0], clamp)} tagTilt={-2} /> : null}

      </div>

      {/* the tiny list sheet: "Ready to list ✓" */}
      {sheetFall < 1 ? (
        <div
          style={{
            position: "absolute",
            left: SHEET_X,
            top: SHEET_Y + 560 * sheetFall,
            rotate: `${-3 - 10 * sheetFall}deg`,
            scale: `${sheetSlap.sx} ${sheetSlap.sy}`,
            opacity: sheetSlap.opacity,
          }}
        >
          <MiniSheet scale={SHEET_S} />
        </div>
      ) : null}

      <Caption text="Paused for sale." contact={capAt} y={134} seed="t4-paused" />
      <SmallLine text="The history stops growing." contact={histAt} y={214} />

      {/* sound */}
      <Sfx name="sticker-slap" at={(sheetIn + 4) / FPS} gainDb={-9} />
      <Sfx name="sticker-slap" at={tagAt / FPS} gainDb={-4} />
      <Sfx name="freeze-chime" at={frostAt / FPS} gainDb={8} />
      <Sfx name="pop" at={pillAt / FPS} gainDb={-3} />
      <Sfx name="whoosh-soft" at={(tryAt + 4) / FPS} align="peak" gainDb={-1} />
      <Sfx name="swoop-down" at={(tryAt + 10) / FPS} gainDb={-5} />
      <Sfx name="freeze-chime" at={histAt / FPS} gainDb={3} />
    </AbsoluteFill>
  );
}

const rot = (p: { x: number; y: number }, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) };
};

/** The top of the List sheet (title, "Ready to list ✓", the price) as a small sticker: no coral button in frame. */
function MiniSheet({ scale }: { scale: number }) {
  const w = PHONE.w;
  return (
    <div style={{ position: "relative", width: w * scale, height: SHEET_H * scale }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: SHEET_H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: `0 4px 0 ${C.ink}`,
          background: C.surface,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: -SHEET_TOP, width: w, height: PHONE.h }}>
          <ListSheet state="ready" />
        </div>
        <div style={{ position: "absolute", inset: 0, borderRadius: 28, border: `3px solid ${C.ink}`, boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

/** The ice that seals the header's "3 signatures" (card UI units, drawn inside CardBack). */
function IceSeal({ show, turn }: { show: number; turn: number }) {
  if (show <= 0.001) return null;
  const head = { family: F.sans, weight: 700, size: 18 };
  const tail = { family: F.sans, weight: 600, size: 18 };
  const x0 = 18 + textWidth("History", head) + textWidth(" · ", tail) - 6;
  const x1 = 18 + textWidth("History", head) + textWidth(" · 3 signatures", tail) + 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x0,
        top: 18,
        width: x1 - x0 + 22,
        height: 30,
        borderRadius: 10,
        background: "#eef4ff",
        border: `2px solid ${C.frozen}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 0 0 5px",
        scale: `${show}`,
        transformOrigin: "30% 50%",
      }}
    >
      <span style={{ ...sans(600), fontSize: 18, color: C.frozen, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>3 signatures</span>
      <Snowflake size={15} strokeWidth={2.4} color={C.frozen} style={{ rotate: `${turn}deg`, flexShrink: 0 }} />
    </div>
  );
}

/** A must-read secondary line (Onest 600): rises out of its mask on `contact` (16 f, no bounce). */
function SmallLine({ text, contact, y }: { text: string; contact: number; y: number }): ReactNode {
  const f = useCurrentFrame();
  const t = interpolate(f, [contact - 2, contact + 12], [110, 0], { ...clamp, easing: EASE2.out });
  if (f < contact - 2) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center" }}>
      <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
        <div style={{ ...sans(600), fontSize: 58, lineHeight: 1.1, color: C.ink, translate: `0 ${t}%`, whiteSpace: "nowrap" }}>{text}</div>
      </div>
    </div>
  );
}

