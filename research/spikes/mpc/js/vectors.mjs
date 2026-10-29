// THROWAWAY: test vectors (derived keys -> EVM / BTC P2WPKH testnet / SOL addresses) for cross-checking chainsig.js.
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bech32 } from '@scure/base';
import { deriveSecp256k1, deriveEd25519, deriveTweak, view } from './derive.mjs';
const root0 = await view('public_key', { domain_id: 0 });
const root1 = await view('public_key', { domain_id: 1 });
const out = [];
for (const pred of ['satchel.example.testnet', 'spike.satchel-spk-mpc-e9ea1a.testnet']) for (const path of ['satchel/1/evm', 'satchel/1/btc', 'satchel/1/sol']) {
  const s = deriveSecp256k1(root0, pred, path);
  const e = deriveEd25519(root1, pred, path);
  const h160 = ripemd160(sha256(Buffer.from(s.compressedHex, 'hex')));
  const tb1 = bech32.encode('tb', [0, ...bech32.toWords(h160)]);
  out.push({ predecessor: pred, path, tweak: Buffer.from(deriveTweak(pred, path)).toString('hex'), secp256k1_near: s.near, secp256k1_compressed: s.compressedHex, evm: s.evmAddress, btc_p2wpkh_testnet: tb1, ed25519_near: e.near, sol: e.solanaAddress });
}
console.log(JSON.stringify({ root0, root1, vectors: out }, null, 1));
