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

export const BUDGET = { phase: 'v3', voChars: 3000, retakesPerLine: 2, musicGenerations: 2 };

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
  timelineMd: resolve(here, '../../script/timeline-v3.md'),
  probeDir: resolve(here, '../../notes/probe'),
};

/**
 * Locked script v3 (marketing/script/SCRIPT-v3.md), in film order (previous_text/next_text come from these neighbours).
 * `text` is the exact script wording (goes into timeline.json); `say` is what the TTS engine reads (pronunciation-only
 * respellings): "NEAR" -> "Near" so it is read as the word. "NFT" stays upper-case (letters).
 */
export const LINES = [
  { id: 'V01', scene: 'H1', text: 'Stick it on.' },
  { id: 'V02', scene: 'H1', text: 'Hand it over.' },
  { id: 'V03', scene: 'H2', text: 'Native Bitcoin, Ethereum and Solana, in one NFT.' },
  { id: 'V04', scene: 'H2', text: 'Whoever holds the Satchel holds everything inside.' },
  { id: 'V05', scene: 'P1', text: 'Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses.' },
  { id: 'V06', scene: 'P2', text: 'Fill it from any wallet or exchange, straight to its addresses.' },
  { id: 'V07', scene: 'P3', text: 'Then send from it, on all three chains.' },
  { id: 'V08', scene: 'P3', text: 'Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction.' },
  { id: 'V09', scene: 'P4', text: "There's no seed phrase to copy. The contract signs only for the holder." },
  { id: 'V10', scene: 'P5', text: 'Give it to a friend, and everything inside goes with it. No bridge. No wrapped tokens.' },
  { id: 'V11', scene: 'P6', text: 'Gift a funded wallet.' },
  { id: 'V12', scene: 'P6', text: 'Sell a whole position in one trade.' },
  { id: 'V13', scene: 'P6', text: 'Hand a treasury to the next team.' },
  { id: 'V14', scene: 'C1', text: "But there's a catch." },
  { id: 'V15', scene: 'C1', text: 'A signature made before the sale can still be used after it.' },
  { id: 'V16', scene: 'C1', text: "So how does a buyer know it's clean?" },
  { id: 'V17', scene: 'T0', text: 'Satchel keeps the receipts.' },
  { id: 'V18', scene: 'T1', text: "Every signature goes on the record, on NEAR, before NEAR's signer network makes it." },
  { id: 'V19', scene: 'T2', text: "And there's no admin key. Not even ours. So it can't sign anything off the record." },
  { id: 'V20', scene: 'T3', text: 'It only signs plain transfers it can read, so each one can be checked later.' },
  { id: 'V21', scene: 'T4', text: 'List it, and signing pauses. The history stops growing.' },
  { id: 'V22', scene: 'T5', text: "Then the buyer's browser checks every record against each chain." },
  // three crisp beats: the pipeline cuts the three phrases apart and re-spaces them onto the beat grid
  { id: 'V23', scene: 'T5', text: 'Nonce used. Coin spent. Blockhash expired.', respace: { phrases: 3, everyBeats: 2 } },
  { id: 'V24', scene: 'T6', text: 'If one old signature could still move coins, Buy stays off.' },
  { id: 'V25', scene: 'T7', text: "When it's clean, one transaction, bound to that exact history, pays the seller," },
  { id: 'V26', scene: 'T7', text: 'and the buyer gets everything inside.' },
  { id: 'V27', scene: 'E1', text: 'Satchel. Stick it on. Hand it over.' },
].map((l) => ({ ...l, say: l.say ?? l.text.replace(/\bNEAR\b/g, 'Near') }));
