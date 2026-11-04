import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../brand/tokens";
import { CardBack } from "../../illustration/characters";
import { RecordOutline, type RequestKind, RequestSticker, requestSize, SignSlot, SLOT } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { clamp, EASE2, smear, SPRING2 } from "../../motion";
import { T2_RECORDS } from "../T2";
import { At, beatAfter, Caption, cameraStyle, onBeat, sceneBeats, voF } from "../T2/kit";

/**
 * T3 · Readable requests only (v4: 88.5–96.0 s; V20 "It only signs what it can read, transfers and messages, so each one
 * can be checked later."). T2 whips in. Satchel #7 (its history side) with a "Satchel signs" slot on its top edge.
 * Requests are tossed in from the left on the beat: "Send 0.01 BTC → bc1q…" can be read, so it sits in the slot, gets its
 * dashed outline (the record, first), a check, and is swallowed. "Raw hash 0x8cb1…" bounces off the lip with "Can't read
 * it"; "Approve unlimited tokens" and "Durable nonce" bounce too (three boops on the beats). On "messages", "Sign a
 * message · 'Log in to …'" passes like the send, its record marked "ETH · message". Then the camera tilts down to the
 * three records: each one can be checked later.
 */

// ── the board (world px) ──────────────────────────────────────────────────────────────────────────────────────────
const CB_W = 1000; // the card's back, k 2.5: its top edge sits low in frame
const CB_X = 960 - CB_W / 2;
const CB_Y = 760;
const SS = 2.6; // slot scale
const SLOT_W = 340; // UI
const SS_X = 960 - (SLOT_W * SS) / 2;
const SS_Y = CB_Y + 40 - SLOT.h * SS; // the plate straddles the card's top edge
const MOUTH = SS_Y + SLOT.mouthY * SS; // entry line: below it, a sticker is behind the plate
const RS = 2.6; // request sticker scale (text ≈ 42 px)

type Req = { kind: RequestKind; contact: number; reason?: string; seed: number; hang: number };

export default function T3() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beats = sceneBeats("T3");
  const vo = voF("T3", "V20");

  // ── timing (scene frames) ─────────────────────────────────────────────────────────────────────────────────────
  const sendAt = onBeat(vo.word(0), beats); // the send lands in the slot as the line starts ("It only signs…")
  const readFrom = sendAt + 2; // its record outline draws (recorded first)
  const okAt = sendAt + 11; // the check pops, the light goes green
  const sinkFrom = sendAt + 20; // then it is swallowed
  const sinkAt = beatAfter(sendAt + 28, beats); // fully in on the next beat
  const capAt = vo.wordAt("what") - 0.5; // "Readable requests only." on "what it can read"
  const b1 = onBeat(vo.wordAt("read"), beats); // raw hash bounces under "read," ("Can't read it")
  const reqs: Req[] = [
    { kind: "rawHash", contact: b1, reason: "Can't read it", seed: 1, hang: 6 },
    { kind: "approve", contact: b1 + 15, reason: "Not a transfer", seed: 2, hang: 4 },
    { kind: "durableNonce", contact: b1 + 30, reason: "Doesn't expire", seed: 3, hang: 4 },
  ];
  // the message lands on "messages": recorded (marked "message"), checked, swallowed like the send
  const msgAt = onBeat(vo.wordAt("messages"), beats);
  const msgRead = msgAt + 2;
  const msgOk = msgAt + 11;
  const msgSinkFrom = msgAt + 20;
  const msgSinkAt = beatAfter(msgAt + 28, beats);
  const panFrom = Math.max(msgSinkAt + 2, vo.wordAt("so") - 6); // tilt down to the records on "so each one can be checked later"
  const panTo = panFrom + 24;

  // ── camera: the whip arrives from T2 (content travelling left), then a tilt down to the records ─────────────
  const whip = (u: number) => 640 * Math.pow(1 - interpolate(u, [0, 4], [0, 1], clamp), 2.2);
  const whipX = whip(f);
  const whipSmear = 1 + Math.min(0.25, (whip(f - 1) - whip(f)) / 1000);
  // tight on the slot for the send, out to the full board once the caption has landed, then the tilt to the records
  const wide = interpolate(f, [capAt + 1, capAt + 15], [0, 1], { ...clamp, easing: EASE2.pan });
  const pan = interpolate(f, [panFrom, panTo], [0, 1], { ...clamp, easing: EASE2.pan });
  // a punch-in for the message (the new request type), released into the tilt
  const punch = interpolate(f, [msgAt + 1, msgAt + 13], [0, 1], { ...clamp, easing: EASE2.pan });
  const baseY = 700 - 160 * wide + (640 - 540) * punch;
  const baseZ = 1.3 - 0.3 * wide + 0.22 * punch;
  const camY = baseY + (800 - baseY) * pan;
  const camZ = baseZ + (1.06 - baseZ) * pan;

  // ── the slot: green for the send, red flashes on each bounce, a little gulp when it swallows ─────────────────
  const accept = Math.max(
    interpolate(f, [okAt, okAt + 2, sinkAt + 12, sinkAt + 16], [0, 1, 1, 0], clamp),
    interpolate(f, [msgOk, msgOk + 2, msgSinkAt + 6, msgSinkAt + 10], [0, 1, 1, 0], clamp),
  );
  const reject = Math.max(0, ...reqs.map((r) => interpolate(f, [r.contact, r.contact + 1, r.contact + 8, r.contact + 11], [0, 1, 1, 0], clamp)));
  const gulpAt = (at: number) => interpolate(f, [at - 2, at, at + 3, at + 8], [0, 1, -0.4, 0], clamp);
  const gulp = gulpAt(sinkAt) + gulpAt(msgSinkAt);

  // ── the send: tossed in, held in the mouth (a quarter inside), recorded, checked, swallowed ──────────────────
  const sendSize = requestSize(REQ_TEXT.send);
  const sw = sendSize.w * RS;
  const sh = sendSize.h * RS;
  const sendRestY = MOUTH + 0.24 * sh - sh / 2; // centre while it is read
  const sendFly = flight(f, sendAt, { x: 960, y: sendRestY });
  const sink = interpolate(f, [sinkFrom, sinkAt], [0, 1], { ...clamp, easing: EASE2.fall });
  const sendY = sendFly.y + sink * (sh * 0.85 + 40);
  const outline = interpolate(f, [readFrom, readFrom + 14], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const accepted = f < okAt ? 0 : spring({ frame: f - okAt, fps, config: SPRING2.pop });

  // ── the message: the same path, plus its record tag "ETH · message" (a message can never move coins) ────────
  const msgSize = requestSize(MSG_TEXT);
  const mw = msgSize.w * RS;
  const mh = msgSize.h * RS;
  const msgFly = flight(f, msgAt, { x: 960, y: MOUTH + 0.24 * mh - mh / 2 });
  const msgSink = interpolate(f, [msgSinkFrom, msgSinkAt], [0, 1], { ...clamp, easing: EASE2.fall });
  const msgDown = msgSink * (mh * 0.85 + 40 + TAG_H * TAG_S + 30);
  const msgY = msgFly.y + msgDown;
  const msgOutline = interpolate(f, [msgRead, msgRead + 14], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const msgAccepted = f < msgOk ? 0 : spring({ frame: f - msgOk, fps, config: SPRING2.pop });
  const tagDraw = interpolate(f, [msgRead + 3, msgRead + 15], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const tagType = interpolate(f, [msgRead + 8, msgRead + 16], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, translate: `${whipX}px 0`, scale: `${whipSmear} ${1 / whipSmear}` }}>
        <div style={cameraStyle(960, camY, camZ)}>
          <At x={CB_X} y={CB_Y}>
            <CardBack width={CB_W} records={T2_RECORDS} />
          </At>
          <div style={{ position: "absolute", left: SS_X, top: SS_Y, scale: `${1 + 0.025 * gulp} ${1 - 0.025 * gulp}`, transformOrigin: "50% 100%" }}>
            <SignSlot part="back" width={SLOT_W} scale={SS} />
          </div>
          {/* the stickers sit between the slot's mouth and its plate */}
          {f >= sendAt - FLIGHT_F && sink < 1 ? (
            <Chip x={sendFly.x} y={sendY} w={sw} h={sh} smearK={sendFly.smear}>
              <RequestSticker kind="send" scale={RS} outline={outline} accepted={accepted} drop={sendFly.drop} tilt={sendFly.tilt} />
            </Chip>
          ) : null}
          {f >= msgAt - FLIGHT_F && msgSink < 1 ? (
            <>
              {tagDraw > 0 ? (
                <div style={{ position: "absolute", left: msgFly.x - mw / 2 - 8, top: msgY - mh / 2 - 34 - TAG_H * TAG_S }}>
                  <RecordOutline kind="message" chain="evm" label="ETH · message" w={TAG_W} h={TAG_H} scale={TAG_S} draw={tagDraw} type={tagType} />
                </div>
              ) : null}
              <Chip x={msgFly.x} y={msgY} w={mw} h={mh} smearK={msgFly.smear}>
                <RequestSticker kind="message" scale={RS} outline={msgOutline} accepted={msgAccepted} drop={msgFly.drop} tilt={msgFly.tilt} />
              </Chip>
            </>
          ) : null}
          {reqs.map((r) => {
            const size = requestSize(REQ_TEXT[r.kind]);
            const w = size.w * RS;
            const h = size.h * RS;
            const restY = MOUTH - h / 2 - 2;
            const m = bounce(f, r.contact, { x: 960, y: restY }, r.seed, r.hang);
            if (!m.visible) return null;
            return (
              <Chip key={r.kind} x={m.x} y={m.y} w={w} h={h} smearK={m.smear}>
                <RequestSticker kind={r.kind} scale={RS} bounced={m.bounced} reason={r.reason} drop={m.drop} tilt={m.tilt} />
              </Chip>
            );
          })}
          <div style={{ position: "absolute", left: SS_X, top: SS_Y, scale: `${1 + 0.025 * gulp} ${1 - 0.025 * gulp}`, transformOrigin: "50% 100%" }}>
            <SignSlot part="front" width={SLOT_W} scale={SS} accept={accept} reject={reject} />
          </div>
        </div>
        <Caption text="Readable requests only." contact={capAt} y={150} seed="t3-readable" />
      </div>

      {/* sound: the whip lands, the record draws, the check, the swallow, three boops on the beats, the tilt */}
      <Sfx name="whoosh-zip" at={0} align="peak" gainDb={-2} />
      <Sfx name="pen-scribble" at={readFrom / FPS} gainDb={2} />
      <Sfx name="pop" at={okAt / FPS} gainDb={-3} />
      <Sfx name="paper-slide" at={(sinkAt - 3) / FPS} align="peak" gainDb={-2} />
      <Sfx name="pen-scribble" at={msgRead / FPS} gainDb={0} />
      <Sfx name="pop" at={msgOk / FPS} gainDb={-4} />
      <Sfx name="paper-slide" at={(msgSinkAt - 3) / FPS} align="peak" gainDb={-3} />
      {reqs.map((r) => (
        <Sfx key={r.kind} name="error-boop" at={r.contact / FPS} gainDb={7} />
      ))}
      <Sfx name="whoosh-soft" at={(panFrom + 12) / FPS} align="peak" gainDb={-10} />
    </AbsoluteFill>
  );
}

const REQ_TEXT: Record<RequestKind, string> = {
  send: "Send 0.01 BTC → `bc1q…`",
  rawHash: "Raw hash `0x8cb1…`",
  approve: "Approve unlimited tokens",
  durableNonce: "Durable nonce",
};

const FLIGHT_F = 12; // frames from the left edge to the slot
const MSG_TEXT = "Sign a message · ‘Log in to …’";
const TAG_W = 196; // the message's record tag (UI units)
const TAG_H = 40;
const TAG_S = 2.0;

/** A sticker tossed in from the left on a low arc; it accelerates down into the mouth and lands on `contact`. */
function flight(f: number, contact: number, to: { x: number; y: number }) {
  const t = interpolate(f, [contact - FLIGHT_F, contact], [0, 1], clamp);
  const pos = (u: number) => {
    const x = -760 + (to.x + 760) * (1 - Math.pow(1 - u, 2.2));
    const y = 440 + (to.y - 440) * u * u - 60 * Math.sin(Math.PI * Math.min(1, u * 1.15));
    return { x, y };
  };
  const p = pos(t);
  const q = pos(interpolate(f - 1, [contact - FLIGHT_F, contact], [0, 1], clamp));
  const v = Math.hypot(p.x - q.x, p.y - q.y);
  const landed = f >= contact;
  // the slap at contact: pressed flat for 2 f, then the shadow catches up
  const drop = landed ? interpolate(f - contact, [0, 2, 5], [0, 0, 1], clamp) : 2.4;
  return { x: p.x, y: p.y, tilt: -14 * (1 - t), smear: landed ? 1 : smear(v).along, drop };
}

/** Tossed in like the send, but it hits the lip and bounces up and off to the right: the reason pops at the top. */
function bounce(f: number, contact: number, rest: { x: number; y: number }, seed: number, hangF: number) {
  if (f < contact - FLIGHT_F) return { visible: false, x: 0, y: 0, tilt: 0, smear: 1, drop: 1, bounced: 0 };
  if (f < contact) {
    const m = flight(f, contact, rest);
    return { visible: true, ...m, bounced: 0 };
  }
  const outFrom = 7 + hangF;
  const at = (g: number) => {
    const up = interpolate(g, [0, 7], [0, 1], { ...clamp, easing: EASE2.out }); // off the lip to the apex
    const hang = interpolate(g, [7, outFrom], [0, 1], clamp); // a short readable hang, drifting
    const out = interpolate(g, [outFrom, outFrom + 8], [0, 1], { ...clamp, easing: EASE2.fall }); // then away, down-right
    return { x: rest.x + 520 * up + 30 * hang + 950 * out, y: rest.y - 200 * up - 8 * hang + 860 * out, up, out };
  };
  const g = f - contact;
  const p = at(g);
  const q = at(g - 1);
  const sq = interpolate(g, [0, 2, 4], [1, 1, 0], clamp);
  return {
    visible: g < outFrom + 9,
    x: p.x,
    y: p.y + 6 * sq,
    tilt: (seed % 2 ? 6 : 3) * p.up + 34 * p.out,
    smear: smear(Math.hypot(p.x - q.x, p.y - q.y)).along,
    drop: interpolate(g, [0, 1, 4], [0, 0, 2], clamp),
    bounced: interpolate(g, [0, 4], [0, 1], clamp),
  };
}

/** A request sticker placed by its centre; `smearK` stretches it along its (mostly horizontal) flight. */
function Chip({ x, y, w, h, smearK, children }: { x: number; y: number; w: number; h: number; smearK: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, scale: `${smearK} ${1 / smearK}` }}>{children}</div>;
}
