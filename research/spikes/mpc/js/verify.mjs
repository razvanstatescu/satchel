// THROWAWAY Phase 0 spike: verify MPC sign responses locally.
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { deriveSecp256k1, deriveEd25519 } from './derive.mjs';

const N = secp256k1.Point.CURVE().n;

/**
 * resp = {"scheme":"Secp256k1","big_r":{"affine_point":"02.."},"s":{"scalar":".."},"recovery_id":0|1}
 * payloadHex = 32-byte hash that was passed as payload_v2.Ecdsa (signed as-is, no further hashing)
 */
export function verifySecp(resp, payloadHex, rootPk, predecessor, path) {
  const derived = deriveSecp256k1(rootPk, predecessor, path);
  const bigR = Buffer.from(resp.big_r.affine_point, 'hex');
  const r = BigInt('0x' + bigR.subarray(1).toString('hex'));
  const s = BigInt('0x' + resp.s.scalar);
  const msg = Buffer.from(payloadHex, 'hex');
  const sig = new secp256k1.Signature(r, s);
  const compact = sig.toBytes('compact');
  const verifies = secp256k1.verify(compact, msg, derived.point.toBytes(true), { prehash: false, lowS: true });
  const recovered = sig.addRecoveryBit(resp.recovery_id).recoverPublicKey(msg);
  const recoveredMatches = recovered.equals(derived.point);
  const lowS = s <= N / 2n;
  const bigRParity = bigR[0] === 0x03 ? 1 : 0;
  return { verifies, recoveredMatches, lowS, recovery_id: resp.recovery_id, bigRPrefix: bigR[0].toString(16).padStart(2, '0'),
    bigRParityEqualsRecId: bigRParity === resp.recovery_id, derivedPk: derived.near, evmAddress: derived.evmAddress };
}

/** resp = {"scheme":"Ed25519","signature":[64 numbers]}; payloadHex = the message bytes passed as payload_v2.Eddsa */
export function verifyEd(resp, payloadHex, rootPk, predecessor, path) {
  const derived = deriveEd25519(rootPk, predecessor, path);
  const sig = Uint8Array.from(resp.signature);
  const msg = Buffer.from(payloadHex, 'hex');
  const verifies = ed25519.verify(sig, msg, derived.point.toBytes());
  // strict (non-zip215) check too
  const verifiesStrict = ed25519.verify(sig, msg, derived.point.toBytes(), { zip215: false });
  return { verifies, verifiesStrict, sigLen: sig.length, derivedPk: derived.near };
}
