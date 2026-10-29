// Audio pipeline config: the ONE place to swap the narrator. Re-run everything with:
//   node tools/audio/run.mjs            (VO -> QA -> trim -> align -> timeline)
//   node tools/audio/run.mjs --music    (also re-compose the score; costs a music generation)
// Changing VOICE.id / VOICE.model / settings invalidates the take cache, so the next run re-voices every line.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VOICE = {
  id: 'n8kTUi6dVrplENT9Un56', // Brian (professional): warm, confident narrator
  model: 'eleven_v4',
  format: 'mp3_44100_128', // mp3_44100_192 is refused for TTS on payg (403 subscription_required, Creator+); shipped files are re-encoded at 192k
  // eleven_v4 takes stability / similarity_boost / speed only (no style / speaker_boost).
  settings: { stability: 0.55, similarity_boost: 0.8, speed: 1.0 },
};

export const MUSIC = { model: 'music_v1', formats: ['mp3_44100_192', 'mp3_44100_128'], seed: 777 }; // v2 take 1: music_v2_5 seed 4130; v1 score: music_v1 seeds 1213, 2026

// v1 used 1,054 of its 3,500-character VO budget. v2 (script v2, re-voice of new/changed lines) has its own cap.
export const BUDGET = { phase: 'v2', voChars: 1500, retakesPerLine: 2 };

const here = dirname(fileURLToPath(import.meta.url));
export const PATHS = {
  marketing: resolve(here, '../..'),
  work: resolve(here, 'work'), // raw takes + QA reports (never shipped)
  publicDir: resolve(here, '../../video/public'),
  voDir: resolve(here, '../../video/public/vo'),
  musicDir: resolve(here, '../../video/public/music'),
  dataDir: resolve(here, '../../video/src/data'),
  timelineMd: resolve(here, '../../script/timeline.md'),
};

/**
 * Locked script v2 (marketing/script/SCRIPT.md), in FILM order (previous_text/next_text come from these neighbours).
 * `text` is the exact script wording (goes into timeline.json); `say` is what the TTS engine reads
 * (pronunciation-only respellings, never wording changes):
 *   - "NEAR" -> "Near" so it is read as the word, not spelled N-E-A-R. "NFT" stays upper-case (read as letters).
 * `keep: true` = unchanged from v1: the existing take and public/vo file are reused as-is (never re-voiced).
 * `settings` overrides VOICE.settings per line (direction). v1-only lines (L06, old L05/L07/L12/L17/L19) are archived
 * in tools/audio/_v1/.
 */
export const LINES = [
  { id: 'L01', scene: 'S01', keep: true, text: 'A Bitcoin wallet.' },
  { id: 'L02', scene: 'S01', keep: true, text: 'An Ethereum wallet.' },
  { id: 'L03', scene: 'S01', keep: true, text: 'A Solana wallet.' },
  { id: 'L04', scene: 'S01', keep: true, text: "It's all one NFT." },
  { id: 'L20', scene: 'W1', text: 'Mint a Satchel, and it comes with its own Bitcoin, Ethereum and Solana addresses.' },
  { id: 'L21', scene: 'W2', text: 'Fund it from any wallet or exchange. Native coins, straight to its addresses.' },
  { id: 'L22', scene: 'W3', text: 'Then spend it like any wallet.' },
  { id: 'L23', scene: 'W3', text: 'Approve in your NEAR wallet, and NEAR Chain Signatures signs a native Bitcoin, Ethereum or Solana transaction.' },
  { id: 'L07', scene: 'S04', text: "There's no seed phrase to copy. The contract signs only for whoever owns the NFT." },
  { id: 'L05', scene: 'S02', text: 'Transfer the NFT, and the whole wallet goes with it. No bridge. No wrapped tokens.', settings: { speed: 1.08 }, tighten: { maxPause: 0.2 } }, // 5.84 s overflowed S02's 6 s; eleven_v4 ignored speed (same 5.84 s), so the two sentence pauses are tightened instead
  { id: 'L24', scene: 'U1', text: 'Sell a whole position in one trade.', settings: { stability: 0.5 } }, // warm, inviting
  { id: 'L25', scene: 'U1', text: 'Gift a funded wallet.', settings: { stability: 0.5 } },
  { id: 'L26', scene: 'U1', text: 'Hand a treasury to the next team.', settings: { stability: 0.5 } },
  { id: 'L08', scene: 'S05', keep: true, text: 'But a signature made before the sale…', settings: { stability: 0.45, speed: 0.95 } }, // trails off, suspense
  { id: 'L09', scene: 'S05', keep: true, text: '…can still be used after it.', settings: { stability: 0.5 } }, // lands it
  { id: 'L10', scene: 'S05', keep: true, text: 'Sign it. Sell it. Broadcast it later. The coins are gone.', settings: { stability: 0.75 } }, // staccato, cold
  { id: 'L11', scene: 'S05', keep: true, text: "So how does a buyer know it's clean?" },
  { id: 'L12', scene: 'S07', part: 'S07a', text: "Satchel signs only plain transfers it can read, and records each one before NEAR's signer network signs it." },
  { id: 'L13', scene: 'S07', part: 'S07b', keep: true, text: 'List it, and signing pauses. The history stops growing.' },
  { id: 'L14', scene: 'S07', part: 'S07c', keep: true, text: "Then the buyer's browser checks every record against each chain." },
  // three crisp beats; the pipeline re-spaced the three phrases onto the beat grid (see vo.mjs respace)
  { id: 'L15', scene: 'S07', part: 'S07c', keep: true, text: 'Nonce used. Coin spent. Blockhash expired.', settings: { stability: 0.7 }, respace: { phrases: 3, everyBeats: 2 } },
  { id: 'L16', scene: 'S07', part: 'S07d', keep: true, text: 'If one old signature could still move coins, Buy stays disabled.' },
  { id: 'L17', scene: 'S07', part: 'S07e', text: 'And the contract has no admin key. Not even ours.', settings: { stability: 0.5 } }, // quiet confidence on "Not even ours."
  { id: 'L18', scene: 'S08', keep: true, text: "If it's clean, one transaction, bound to that exact history, pays the seller." },
  { id: 'L19', scene: 'S09', text: 'Satchel. One NFT. A wallet on every chain, safe to hand over.', settings: { stability: 0.5, speed: 0.95 } }, // warm, resolved
].map((l) => ({ ...l, say: l.say ?? l.text.replace(/\bNEAR\b/g, 'Near') }));
