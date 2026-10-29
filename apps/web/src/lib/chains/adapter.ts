import type { MpcSignature } from "@satchel/core/near";
import { attachBtcSignatures, btcTxFromPreimages, MempoolClient } from "@satchel/core/chains/btc";
import { broadcastEvm, createEvmClient, finalizeEvmTx, parseUnsignedEvmTx } from "@satchel/core/chains/evm";
import { attachSolSignature, broadcastSol, createSolConnection, isSolConfirmed, isSolExpired, solTransferFromMessage, SolSignatureError, type SignedSolTx } from "@satchel/core/chains/sol";
import { hexToBytesStrict } from "@satchel/core/bytes";
import { BTC_APIS, IS_FIXTURE, SOL_RPCS } from "@/lib/config";
import { evmRpcs } from "@/lib/evm-networks";
import { simBroadcast, simSolHeight } from "@/lib/data/sim";
import { satchelAddresses } from "@/lib/derive";
import type { ChainAdapter } from "@/lib/signing/runner";
import type { PendingIntent, StoredSignature } from "@/lib/signing/types";

/**
 * Chain adapters for the signing runner: verify-before-broadcast, broadcast, confirmation polling (kb/90 §8.6).
 * Live = @satchel/core (viem / bitcoinjs-lib 7); fixture = the in-browser simulation (no network).
 */

export function toMpcSignature(s: StoredSignature): MpcSignature {
  if ("ed25519" in s) return { scheme: "Ed25519", signature: (s.ed25519.match(/../g) ?? []).map((b) => parseInt(b, 16)) };
  // The record view drops big_r's 02/03 prefix; EVM uses recovery_id as yParity and BTC uses (r, s), so it doesn't matter.
  return { scheme: "Secp256k1", big_r: { affine_point: "02" + s.r }, s: { scalar: s.s }, recovery_id: s.recoveryId };
}

const fixtureAdapter: ChainAdapter = {
  async verify() {
    return true;
  },
  async broadcast(intent) {
    await new Promise((r) => setTimeout(r, 400));
    // SOL: the same expiry rule as live (getBlockHeight > lastValidBlockHeight ⇒ expired), on the fixture devnet clock.
    if (intent.chain === "sol" && intent.unsigned.sol && isSolExpired(simSolHeight(), intent.unsigned.sol.lastValidBlockHeight)) {
      return { ok: false, reason: "blockhash expired", expired: true };
    }
    return simBroadcast(intent.id);
  },
  async isConfirmed(intent) {
    return intent.sentAt != null && Date.now() - intent.sentAt > 3000;
  },
};

/** C3: one adapter per EVM chain id (each with its own client on that chain's RPCs). */
function evmLive(chainId: number): ChainAdapter {
  const client = createEvmClient(chainId, evmRpcs(chainId));
  const signedCache = new Map<string, `0x${string}`>();
  return {
    async verify(intent, sigs) {
      try {
        const tx = parseUnsignedEvmTx(intent.unsigned.evmTx!, intent.payloadHashes[0]);
        const out = await finalizeEvmTx(tx, toMpcSignature(sigs[0]), satchelAddresses(intent.tokenId, intent.contract).evm);
        signedCache.set(intent.id, out.signed);
        return true;
      } catch {
        return false;
      }
    },
    async broadcast(intent, sigs) {
      try {
        let signed = signedCache.get(intent.id);
        if (!signed) {
          const tx = parseUnsignedEvmTx(intent.unsigned.evmTx!, intent.payloadHashes[0]);
          signed = (await finalizeEvmTx(tx, toMpcSignature(sigs[0]), satchelAddresses(intent.tokenId, intent.contract).evm)).signed;
        }
        const r = await broadcastEvm(client, signed);
        return { ok: true, chainTxId: r.hash };
      } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message.split("\n")[0] : "Sepolia isn't responding." };
      }
    },
    async isConfirmed(intent) {
      if (!intent.chainTxId) return false;
      const r = await client.getTransactionReceipt({ hash: intent.chainTxId as `0x${string}` }).catch(() => null);
      return !!r;
    },
  };
}

function btcLive(): ChainAdapter {
  const client = new MempoolClient({ primary: BTC_APIS[0], fallbacks: BTC_APIS.slice(1) });
  const signedCache = new Map<string, string>();
  const sign = (intent: PendingIntent, sigs: StoredSignature[]) => {
    const b = intent.unsigned.btc!;
    const { tx } = btcTxFromPreimages(b.preimages, b.outputs);
    return attachBtcSignatures(tx, sigs.map(toMpcSignature), satchelAddresses(intent.tokenId, intent.contract).btcPubkey);
  };
  return {
    async verify(intent, sigs) {
      try {
        signedCache.set(intent.id, sign(intent, sigs).hex);
        return true;
      } catch {
        return false;
      }
    },
    async broadcast(intent, sigs) {
      const hex = signedCache.get(intent.id) ?? sign(intent, sigs).hex;
      try {
        // primary, then the fallbacks on a provider failure only (a 400 rejection is final)
        return { ok: true, chainTxId: await client.broadcast(hex) };
      } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : "mempool.space isn't responding." };
      }
    },
    async isConfirmed(intent) {
      if (!intent.chainTxId) return false;
      const s = await client.txStatus(intent.chainTxId).catch(() => null);
      return !!s?.confirmed;
    },
  };
}

/** "Blockhash not found" / "block height exceeded" (kb/80 E24) mean the same thing as our own expiry check. */
export const SOL_EXPIRED_RE = /expired|blockhash not found|block height exceeded/i;

function solLive(): ChainAdapter {
  const conn = createSolConnection(SOL_RPCS[0]);
  const signedCache = new Map<string, SignedSolTx>();
  const sign = (intent: PendingIntent, sigs: StoredSignature[]) => {
    const u = intent.unsigned.sol!;
    const built = solTransferFromMessage(hexToBytesStrict(u.message), u.lastValidBlockHeight);
    // ed25519-verified against the Satchel's derived Solana key before anything is broadcast (E22).
    return attachSolSignature(built, toMpcSignature(sigs[0]), satchelAddresses(intent.tokenId, intent.contract).sol);
  };
  return {
    async verify(intent, sigs) {
      try {
        signedCache.set(intent.id, sign(intent, sigs));
        return true;
      } catch {
        return false;
      }
    },
    async broadcast(intent, sigs) {
      let signed: SignedSolTx;
      try {
        signed = signedCache.get(intent.id) ?? sign(intent, sigs);
      } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : "The signature didn't verify." };
      }
      try {
        return { ok: true, chainTxId: await broadcastSol(conn, signed, intent.unsigned.sol!.lastValidBlockHeight) };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        // the tx id is the signature: a re-broadcast of a landed tx is a success
        if (/already been processed/i.test(m)) return { ok: true, chainTxId: signed.signature };
        if (e instanceof SolSignatureError || SOL_EXPIRED_RE.test(m)) return { ok: false, reason: m, expired: true };
        return { ok: false, reason: m.split("\n")[0] || "Solana devnet isn't responding." };
      }
    },
    async isConfirmed(intent) {
      if (!intent.chainTxId) return false;
      return isSolConfirmed(conn, intent.chainTxId).catch(() => false);
    },
  };
}

/**
 * C7: a signed message is never broadcast. `verify` checks the signature the way any verifier would (EIP-191 with
 * v = 27 + recovery_id, or ed25519 over the Solana off-chain v0 bytes) against the Satchel's own address; then the
 * intent ends at once (`broadcast` is a no-op, `isConfirmed` is true). Fixture mode verifies nothing (fake signatures).
 */
export function messageAdapter(live: boolean): ChainAdapter {
  return {
    async verify(intent, sigs) {
      if (!live) return true;
      const m = intent.message;
      const s = sigs[0];
      if (!m || !s) return false;
      const addr = satchelAddresses(intent.tokenId, intent.contract);
      try {
        if (m.kind === "evm_message") {
          if (!("r" in s)) return false;
          const { verifyEvmMessageSignature } = await import("@satchel/core/chains/evm");
          return await verifyEvmMessageSignature(m.text, { r: s.r, s: s.s, recovery_id: s.recoveryId }, addr.evm);
        }
        if (!("ed25519" in s)) return false;
        const { verifySolOffchainSignature } = await import("@satchel/core/chains/sol");
        return verifySolOffchainSignature(m.text, s.ed25519, addr.sol);
      } catch {
        return false;
      }
    },
    async broadcast(intent) {
      return { ok: true, chainTxId: `message:${intent.payloadHashes[0] ?? ""}` };
    },
    async isConfirmed() {
      return true;
    },
  };
}

const evm = new Map<number, ChainAdapter>();
let btc: ChainAdapter | null = null;
let sol: ChainAdapter | null = null;
let msg: ChainAdapter | null = null;

export function chainAdapterFor(intent: PendingIntent): ChainAdapter {
  if (intent.message) return (msg ??= messageAdapter(!IS_FIXTURE));
  if (IS_FIXTURE) return fixtureAdapter;
  if (intent.chain === "evm") {
    const id = intent.evmChainId ?? 11155111;
    let a = evm.get(id);
    if (!a) evm.set(id, (a = evmLive(id)));
    return a;
  }
  if (intent.chain === "btc") return (btc ??= btcLive());
  return (sol ??= solLive());
}
