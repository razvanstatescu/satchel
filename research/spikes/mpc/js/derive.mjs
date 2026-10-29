// THROWAWAY Phase 0 spike. Re-implements near/mpc key derivation (tag 3.17.0) in JS
// and compares with the live `derived_public_key` view on v1.signer-prod.testnet.
// Source of truth:
//   crates/near-mpc-crypto-types/src/kdf.rs   (derive_tweak)
//   crates/contract/src/crypto_shared/kdf.rs  (derive_key_secp256k1, derive_public_key_edwards_point_ed25519)
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha3_256, keccak_256 } from '@noble/hashes/sha3.js';
import bs58 from 'bs58';

export const TWEAK_PREFIX = 'near-mpc-recovery v0.1.0 epsilon derivation:';

const hex = (u8) => Buffer.from(u8).toString('hex');

/** tweak = sha3_256(PREFIX + predecessor + "," + path)  (32 bytes) */
export function deriveTweak(predecessor, path) {
  return sha3_256(new TextEncoder().encode(`${TWEAK_PREFIX}${predecessor},${path}`));
}

/** NEAR "secp256k1:<base58(64-byte x||y)>" -> noble Point */
function parseSecpNear(s) {
  const raw = bs58.decode(s.replace(/^secp256k1:/, ''));
  if (raw.length !== 64) throw new Error('expected 64-byte secp256k1 key');
  return secp256k1.Point.fromBytes(Uint8Array.from([0x04, ...raw]));
}
const secpToNear = (P) => 'secp256k1:' + bs58.encode(P.toBytes(false).slice(1));

/** secp256k1: derived = G * t + PK, t = big-endian(tweak), must be < n (else contract errors TweakNotOnCurve) */
export function deriveSecp256k1(rootNearPk, predecessor, path) {
  const t = BigInt('0x' + hex(deriveTweak(predecessor, path)));
  const n = secp256k1.Point.CURVE().n;
  if (t === 0n || t >= n) throw new Error('TweakNotOnCurve');
  const P = secp256k1.Point.BASE.multiply(t).add(parseSecpNear(rootNearPk));
  return {
    near: secpToNear(P),
    uncompressedHex: hex(P.toBytes(false)),        // 04||x||y
    compressedHex: hex(P.toBytes(true)),           // 02/03||x
    evmAddress: '0x' + hex(keccak_256(P.toBytes(false).slice(1)).slice(-20)),
    point: P,
  };
}

/** ed25519: derived = PK + B * t, t = little-endian(tweak) mod l  (curve25519_dalek::Scalar::from_bytes_mod_order) */
export function deriveEd25519(rootNearPk, predecessor, path) {
  const tw = deriveTweak(predecessor, path);
  const l = ed25519.Point.CURVE().n;
  const t = BigInt('0x' + hex(Uint8Array.from(tw).reverse())) % l;
  const root = ed25519.Point.fromBytes(bs58.decode(rootNearPk.replace(/^ed25519:/, '')));
  const P = root.add(ed25519.Point.BASE.multiply(t));
  const bytes = P.toBytes();
  return { near: 'ed25519:' + bs58.encode(bytes), hex: hex(bytes), solanaAddress: bs58.encode(bytes), point: P };
}

// ---------- live comparison ----------
const RPC = process.env.RPC ?? 'https://rpc.testnet.fastnear.com';
const MPC = process.env.MPC ?? 'v1.signer-prod.testnet';

export async function view(method, args, contract = MPC) {
  const { rpc } = await import('./nearlib.mjs');
  const j = await rpc('query', { request_type: 'call_function', finality: 'final', account_id: contract, method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64') });
  if (j.error || j.result?.error) throw new Error(JSON.stringify(j.error ?? j.result.error));
  return JSON.parse(Buffer.from(j.result.result).toString());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root0 = await view('public_key', { domain_id: 0 });
  const root1 = await view('public_key', { domain_id: 1 });
  console.log('root domain0:', root0);
  console.log('root domain1:', root1);
  const preds = ['satchel-spk-mpc-e9ea1a.testnet', 'satchel.example.testnet', 'spike.satchel-spk-mpc-e9ea1a.testnet', 'a.near', 'x'.repeat(64)];
  const paths = ['satchel/1/evm', 'satchel/1/btc', 'satchel/1/sol', '', 'ethereum-1', 'm/44\'/60\'/0\'/0/0', 'satchel/123456789/evm', 'ü,comma/unicode'];
  let ok = 0, bad = 0;
  for (const p of preds) for (const path of paths) for (const d of [0, 1]) {
    const live = await view('derived_public_key', { path, predecessor: p, domain_id: d });
    const mine = d === 0 ? deriveSecp256k1(root0, p, path).near : deriveEd25519(root1, p, path).near;
    const match = live === mine;
    match ? ok++ : bad++;
    if (!match || p.startsWith('satchel')) console.log(match ? 'MATCH' : 'MISMATCH', `d=${d}`, JSON.stringify(p), JSON.stringify(path), live, match ? '' : `mine=${mine}`);
  }
  // default domain_id (omitted) == domain 0
  const live = await view('derived_public_key', { path: 'satchel/1/evm', predecessor: 'satchel.example.testnet' });
  console.log('omitted domain_id ->', live, live === deriveSecp256k1(root0, 'satchel.example.testnet', 'satchel/1/evm').near ? 'MATCH(domain0)' : 'MISMATCH');
  console.log(`\nderived_public_key cross-check: ${ok} match, ${bad} mismatch`);
  const e = deriveSecp256k1(root0, 'satchel.example.testnet', 'satchel/1/evm');
  console.log('example EVM address for satchel.example.testnet satchel/1/evm:', e.evmAddress);
  console.log('example SOL address for satchel.example.testnet satchel/1/sol:', deriveEd25519(root1, 'satchel.example.testnet', 'satchel/1/sol').solanaAddress);
}
