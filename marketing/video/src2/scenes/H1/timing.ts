import { getScene, marker } from "../../lib/timeline";
import { FPS } from "../../lib/time";

/**
 * The hook (H1 + H2) is ONE continuous shot. Everything is choreographed on a single "global" clock g (frames from the
 * start of H1); H1 renders g = frame, H2 renders g = H2_OFFSET + frame. Every cue is derived from the voiced timeline
 * (getScene / marker), so a re-voice re-times the hook. Music: the glockenspiel pickup plays on every beat (15 f) and
 * the groove kicks in on hookLand; the three snap-ons sit on the 8th-note grid around beat 2 (f8, f15, f23).
 */
const h1 = getScene("H1");
const h2 = getScene("H2");
const fr = (sec: number) => Math.round(sec * FPS);

export const H2_OFFSET = fr(h2.start - h1.start); // 90
export const H2_LAST = H2_OFFSET + Math.round(h2.duration * FPS) - 1; // last frame of H2's own span (the peel holds it)
const g1 = (sec: number) => Math.round(sec * FPS); // H1 seconds → g
const g2 = (sec: number) => H2_OFFSET + Math.round(sec * FPS); // H2 seconds → g

const hookLand = fr(marker("hookLand") - h1.start); // 75: bob catches the card, the groove kicks in
const v02 = g1(h1.line("V02").start); // 60

/** The hand-off clock (motion kit HANDOFF): lift 0–6, slide 6–24 (apex 15), set-down 24–27, contact 27. */
const HANDOFF_CONTACT = 27;

export const T = {
  // ── H1 ───────────────────────────────────────────────────────────────────────────────────────────────────────
  cardSettle: 5, // the card slides up (85% there on frame 0) and settles
  btcSnap: 8, // 8th note before beat 2
  ethSnap: 15, // beat 2 (the glockenspiel note)
  solSnap: 23, // 8th note after beat 2
  stickIn: 15 - 4, // "Stick it on." slap starts (contact = ethSnap: one hit with ETH on the beat)
  v01: g1(h1.line("V01").start), // 30
  aliceIn: 27, // alice's hand enters (12 f, land)
  pinch: 39, // her thumb closes on the corner
  peelStart: 40, // the corner peels 0 → max in 8 f (rip)
  handoff: hookLand - HANDOFF_CONTACT, // 48: the swing starts (lift)
  stickOut: 47, // "Stick it on." peels off on "on." (V01's last word), as the card's corner comes up
  handIn: v02 - 4, // "Hand it over." contact on V02's start (beat 4)
  bobIn: hookLand - 11, // bob's hand reaches in
  hookLand, // 75: contact (sticker-slap + chain-clink), the groove
  aliceOut: hookLand + 2, // alice lets go and leaves
  // ── H2 (global) ──────────────────────────────────────────────────────────────────────────────────────────────
  h2: H2_OFFSET,
  // the punch-in toward the charms: one continuous in-out move (no 1-frame snap) that has settled when "Bitcoin." lands
  // on its word (beat 8, 3.5 s); "Hand it over." flies off the top as it starts
  punchIn: g2(h2.wordAt("V03", "Bitcoin")) - 9,
  punchDur: 10,
  handOut: g2(h2.wordAt("V03", "Bitcoin")) - 17, // "Hand it over." peels away and is off the top before the zoom's fast frames
  wBtc: g2(h2.wordAt("V03", "Bitcoin")), // word onsets: the word sticker lands on it, its charm reacts
  wEth: g2(h2.wordAt("V03", "Ethereum")),
  wSol: g2(h2.wordAt("V03", "Solana")),
  solanaEnd: g2(h2.wordAt("V03", "Solana", "end")),
  wOne: g2(h2.wordAt("V03", "one")),
  wNft: g2(h2.wordAt("V03", "NFT")),
  v03End: g2(h2.line("V03").end),
  v04: g2(h2.line("V04").start),
  wWhoever: g2(h2.wordAt("V04", "Whoever")),
  wSatchel: g2(h2.wordAt("V04", "Satchel")),
  wHolds2: g2(h2.word("V04", 4)), // the second "holds"
  wInside: g2(h2.wordAt("V04", "inside")),
  h2Last: H2_LAST,
} as const;

/** Derived beats of the H2 camera. */
export const CAM = {
  wordsOut: T.wSol + 29, // "Solana." has been read (≈1 s): the three name stickers come unstuck and drop away
  pullBack: T.wSol + 27, // the camera pulls back to the whole card (16 f, pan) for "One NFT." (lands on "NFT.")
  pullDur: 16,
  // V04 follows "NFT." by ≈1.1 s (v4): the frame makes room first (16 f, pan) so the card has cleared the line's place
  // before "Whoever"; "One NFT." stays up through the reframe (it doesn't overlap the line) and peels off once the
  // line has landed, gone before the lockup slaps on "Satchel".
  reframe: T.wWhoever - 20,
  reframeDur: 16,
  oneOut: T.wWhoever + 10,
} as const;
