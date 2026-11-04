// Audio pipeline v3 (Satchel 2.0 film, video/src2). The ONE place to swap the narrator. Re-run everything with:
//   node tools/audio-v3/run.mjs            (VO -> QA -> trim -> align -> timeline)
//   node tools/audio-v3/run.mjs --music    (also re-compose the score; costs a music generation)
// Changing VOICE.id / VOICE.model / settings invalidates the take cache, so the next run re-voices every line.
// Auditions: node tools/audio-v3/audition.mjs (samples in notes/probe/v3-voice-<name>.mp3).
// The v5 film's pipeline (tools/audio/, video/src) is untouched.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VOICE = {
  // Chosen from the audition (tools/audio-v3/work/audition.json; samples notes/probe/v3-voice-*.mp3), unheard by anyone:
  // Sarah ("Mature, Reassuring, Confident": warm, adult, not cutesy) read the audition at exactly 155 wpm, Scribe heard
  // it word-perfect with "Stick it on." / "Hand it over." as two separate sentences (Bella ran them together), and she
  // leaves a natural 0.24 s beat before "Not even ours." Chris read at 170 wpm with almost no beat there; Angela at
  // 159 wpm overall but 182 wpm within phrases. To swap: change id + name here and run node tools/audio-v3/run.mjs.
  id: 'EXAVITQu4vr4xnSDxMaL',
  name: 'Sarah',
  model: 'eleven_v4',
  format: 'mp3_44100_128', // mp3_44100_192 is refused for TTS on payg (Creator+); shipped files are re-encoded at 192k
  // eleven_v4 takes stability / similarity_boost / speed only; speed had no measurable effect in v2.
  settings: { stability: 0.45, similarity_boost: 0.8 },
};

/** Narrator auditions: same three lines (V01+V02, V17, V19) on eleven_v4. */
export const AUDITION = {
  text: "Stick it on. Hand it over.\n\nSatchel keeps the receipts.\n\nAnd there's no admin key. Not even ours. So it can't sign anything off the record.",
  voices: [
    { name: 'sarah', id: 'EXAVITQu4vr4xnSDxMaL', why: 'premade; "Mature, Reassuring, Confident": young adult, warm and mature, professional' },
    { name: 'bella', id: 'hpp4J3VqNfWAUOO0d1Us', why: 'premade; "Professional, Bright, Warm": polished narrative quality' },
    { name: 'angela', id: 'PT4nqlKZfc06VW1BuClj', why: 'professional; "Friendly and warm", middle-aged, made for apps and explainers' },
    { name: 'chris', id: 'iP95p4xoKVk53GoZ742B', why: 'premade; "Charming, Down-to-Earth": the male option with a natural wry warmth' },
  ],
  targetWpm: 155,
};

export const MUSIC = { model: 'music_v1', formats: ['mp3_44100_192', 'mp3_44100_128'], seed: 3313 }; // take 1: seed 2212

// v3 used 2,101 of its 3,000 VO characters and 2 music generations. v4 (script v4: six changed lines, V11 cut) has its own caps.
export const BUDGET = { phase: 'v4', voChars: 1500, retakesPerLine: 2, musicGenerations: 1 };

const here = dirname(fileURLToPath(import.meta.url));
export const PATHS = {
  marketing: resolve(here, '../..'),
  work: resolve(here, 'work'), // raw takes, QA, usage ledger (never shipped)
  publicDir: resolve(here, '../../video/public'),
  voDir: resolve(here, '../../video/public/v2/vo'),
  voPrefix: 'v2/vo', // catalog path prefix in timeline.json (relative to video/public)
  musicDir: resolve(here, '../../video/public/v2/music'),
  musicPrefix: 'v2/music',
  dataDir: resolve(here, '../../video/src2/data'),
  timelineMd: resolve(here, '../../script/timeline-v4.md'),
  probeDir: resolve(here, '../../notes/probe'),
};

/**
 * Locked script v4 (marketing/script/SCRIPT-v4.md), in film order (previous_text/next_text come from these neighbours).
 * `text` is the exact script wording (goes into timeline.json); `say` is what the TTS engine reads (pronunciation-only
 * respellings): "NEAR" -> "Near" so it is read as the word. "NFT" stays upper-case (letters).
 * `keep: true` = unchanged since v3: the existing take and public/v2/vo file are reused as-is (never re-voiced).
 * V11 was cut in v4; the replaced v3 takes and files are archived in tools/audio-v3/_v3/.
 */
export const LINES = [
  { id: 'V01', scene: 'H1', keep: true, text: 'Stick it on.' },
  { id: 'V02', scene: 'H1', keep: true, text: 'Hand it over.' },
  { id: 'V03', scene: 'H2', keep: true, text: 'Native Bitcoin, Ethereum and Solana, in one NFT.' },
  { id: 'V04', scene: 'H2', keep: true, text: 'Whoever holds the Satchel holds everything inside.' },
  { id: 'V05', scene: 'P1', keep: true, text: 'Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses.' },
  { id: 'V06', scene: 'P2', text: 'Fill it from any wallet or exchange. USDC too, on Ethereum, Base, Arbitrum or Optimism.' },
  { id: 'V07', scene: 'P3', keep: true, text: 'Then send from it, on all three chains.' },
  { id: 'V08', scene: 'P3', keep: true, text: 'Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction.' },
  { id: 'V09', scene: 'P4', text: "There's no seed phrase to copy. Only the holder can send, or someone they allow, within daily limits." },
  { id: 'V10', scene: 'P5', text: "Give it to a friend, even one who isn't on NEAR yet. Everything inside goes with it. No bridge. No wrapped tokens." },
  { id: 'V12', scene: 'P6', text: 'Sell a whole position in one trade, or take an offer.' }, // 3.93 s: V13 follows a beat after the next 4 s downbeat
  { id: 'V13', scene: 'P6', keep: true, text: 'Hand a treasury to the next team.' },
  { id: 'V14', scene: 'C1', keep: true, text: "But there's a catch." },
  { id: 'V15', scene: 'C1', keep: true, text: 'A signature made before the sale can still be used after it.' },
  { id: 'V16', scene: 'C1', keep: true, text: "So how does a buyer know it's clean?" },
  { id: 'V17', scene: 'T0', keep: true, text: 'Satchel keeps the receipts.' },
  { id: 'V18', scene: 'T1', keep: true, text: "Every signature goes on the record, on NEAR, before NEAR's signer network makes it." },
  { id: 'V19', scene: 'T2', keep: true, text: "And there's no admin key. Not even ours. So it can't sign anything off the record." },
  { id: 'V20', scene: 'T3', text: 'It only signs what it can read, transfers and messages, so each one can be checked later.' },
  { id: 'V21', scene: 'T4', keep: true, text: 'List it, and signing pauses. The history stops growing.' },
  { id: 'V22', scene: 'T5', keep: true, text: "Then the buyer's browser checks every record against each chain." },
  // three crisp beats: the pipeline cut the three phrases apart and re-spaced them onto the beat grid
  { id: 'V23', scene: 'T5', keep: true, text: 'Nonce used. Coin spent. Blockhash expired.', respace: { phrases: 3, everyBeats: 2 } },
  { id: 'V24', scene: 'T6', text: 'If one old signature could still move coins, Buy and offers stay off.' },
  { id: 'V25', scene: 'T7', keep: true, text: "When it's clean, one transaction, bound to that exact history, pays the seller," },
  { id: 'V26', scene: 'T7', keep: true, text: 'and the buyer gets everything inside.' },
  { id: 'V27', scene: 'E1', keep: true, text: 'Satchel. Stick it on. Hand it over.' },
].map((l) => ({ ...l, say: l.say ?? l.text.replace(/\bNEAR\b/g, 'Near') }));
