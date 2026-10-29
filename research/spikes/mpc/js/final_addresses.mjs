// THROWAWAY Phase 0 research script (orchestrator, 2026-10-21). Never import into the product.
// Computes the derived addresses for the chosen team account (P0-A1) and cross-checks against the live MPC view.
import { deriveSecp256k1, deriveEd25519, view } from './derive.mjs';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bech32 } from '@scure/base';

const TEAM = process.argv[2] || 'satchelhq';
const sets = [
  { label: 'final', pred: `satchel.${TEAM}.testnet`, ids: [1, 2, 3, 4, 5, 6, 7] },
  { label: 'dev1', pred: `dev1.${TEAM}.testnet`, ids: [1, 2, 3] },
  { label: 'rc', pred: `rc.${TEAM}.testnet`, ids: [1, 2] },
];
const root0 = await view('public_key', { domain_id: 0 });
const root1 = await view('public_key', { domain_id: 1 });
const hex2u8 = (h) => Uint8Array.from(h.match(/../g).map((b) => parseInt(b, 16)));
const p2wpkh = (compressedHex) => {
  const h160 = ripemd160(sha256(hex2u8(compressedHex)));
  return bech32.encode('tb', [0, ...bech32.toWords(h160)]);
};

const rows = [];
for (const s of sets) for (const id of s.ids) {
  const btc = deriveSecp256k1(root0, s.pred, `satchel/${id}/btc`);
  const evm = deriveSecp256k1(root0, s.pred, `satchel/${id}/evm`);
  const sol = deriveEd25519(root1, s.pred, `satchel/${id}/sol`);
  rows.push({ set: s.label, pred: s.pred, id, btc: p2wpkh(btc.compressedHex), evm: evm.evmAddress, sol: sol.solanaAddress, _btcKey: btc.near, _solKey: sol.near });
}

// Cross-check two paths against the live `derived_public_key` view (domain 0 and 1).
const chk0 = await view('derived_public_key', { path: 'satchel/1/btc', predecessor: rows[0].pred, domain_id: 0 });
const chk1 = await view('derived_public_key', { path: 'satchel/1/sol', predecessor: rows[0].pred, domain_id: 1 });
console.error('live check domain0:', chk0 === rows[0]._btcKey ? 'MATCH' : 'MISMATCH', '| domain1:', chk1 === rows[0]._solKey ? 'MATCH' : 'MISMATCH');
console.log(JSON.stringify(rows.map(({ _btcKey, _solKey, ...r }) => r), null, 1));
