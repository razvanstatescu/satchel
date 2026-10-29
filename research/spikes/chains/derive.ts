// THROWAWAY SPIKE (chains agent, Phase 0). Question: do chainsig.js derived addresses
// match (a) the live MPC `derived_public_key` view and (b) an independent offline KDF?
// Run: npx tsx derive.ts
import { chainAdapters, contracts } from 'chainsig.js'
import { createPublicClient, http } from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import * as bitcoin from 'bitcoinjs-lib'
import { Connection, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha3_256 } from '@noble/hashes/sha3.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

const RPC = 'https://rpc.testnet.fastnear.com'
const MPC = 'v1.signer-prod.testnet'

async function viewDerived(path: string, predecessor: string, domain_id: number): Promise<string> {
  const args = Buffer.from(JSON.stringify({ path, predecessor, domain_id })).toString('base64')
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: MPC, method_name: 'derived_public_key', args_base64: args },
    }),
  })
  const j: any = await r.json()
  if (!j.result?.result) throw new Error(JSON.stringify(j))
  return JSON.parse(Buffer.from(j.result.result).toString())
}

// ---- independent offline KDF (no chainsig.js), per near/mpc crates/near-mpc-crypto-types/src/kdf.rs
const PREFIX = 'near-mpc-recovery v0.1.0 epsilon derivation:'
const tweak = (pred: string, path: string) => sha3_256(new TextEncoder().encode(`${PREFIX}${pred},${path}`))
const ROOT_SECP = 'secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3'
const ROOT_ED = 'ed25519:6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2'
function offlineSecp(pred: string, path: string): Uint8Array /* 65-byte uncompressed */ {
  const root = secp256k1.Point.fromHex('04' + bytesToHex(bs58.decode(ROOT_SECP.split(':')[1])))
  const t = BigInt('0x' + bytesToHex(tweak(pred, path))) // big-endian, contract rejects t >= n
  return root.add(secp256k1.Point.BASE.multiply(t)).toBytes(false)
}
function offlineEd(pred: string, path: string): Uint8Array /* 32-byte compressed */ {
  const root = ed25519.Point.fromBytes(bs58.decode(ROOT_ED.split(':')[1]))
  const tb = tweak(pred, path)
  let le = 0n
  for (let i = tb.length - 1; i >= 0; i--) le = (le << 8n) + BigInt(tb[i]) // little-endian
  const s = le % ed25519.Point.Fn.ORDER // from_bytes_mod_order
  return root.add(ed25519.Point.BASE.multiply(s)).toBytes()
}

async function main() {
  const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: MPC })
  const evm = new chainAdapters.evm.EVM({ publicClient: createPublicClient({ chain: sepolia, transport: http() }) as any, contract })
  const btc = new chainAdapters.btc.Bitcoin({
    network: 'testnet', contract,
    btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api'),
  })
  const sol = new chainAdapters.solana.Solana({ solanaConnection: new Connection('https://api.devnet.solana.com'), contract })

  const preds = ['satchel-spk-chain-e9ea1a.testnet', 'satchel.example.testnet']
  const paths = ['satchel/1/evm', 'satchel/1/btc', 'satchel/1/sol', 'satchel/42/evm']
  const rows: any[] = []
  let allOk = true
  for (const pred of preds) {
    for (const path of paths) {
      const chain = path.split('/')[2]
      const t0 = performance.now()
      let lib: { address: string; publicKey: string }
      if (chain === 'evm') lib = await evm.deriveAddressAndPublicKey(pred, path)
      else if (chain === 'btc') lib = await btc.deriveAddressAndPublicKey(pred, path)
      else lib = await sol.deriveAddressAndPublicKey(pred, path)
      const tLib = performance.now() - t0

      const t1 = performance.now()
      const naj = await viewDerived(path, pred, chain === 'sol' ? 1 : 0)
      const tRpc = performance.now() - t1

      let rpcAddr: string, offAddr: string
      if (chain === 'sol') {
        const raw = bs58.decode(naj.split(':')[1])
        rpcAddr = new PublicKey(raw).toBase58()
        offAddr = bs58.encode(offlineEd(pred, path))
      } else {
        const unc = '04' + bytesToHex(bs58.decode(naj.split(':')[1]))
        const off = offlineSecp(pred, path)
        if (chain === 'evm') {
          rpcAddr = publicKeyToAddress(`0x${unc}`)
          offAddr = publicKeyToAddress(`0x${bytesToHex(off)}`)
        } else {
          const comp = secp256k1.Point.fromHex(unc).toBytes(true)
          rpcAddr = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(comp), network: bitcoin.networks.testnet }).address!
          const offComp = secp256k1.Point.fromBytes(off).toBytes(true)
          offAddr = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(offComp), network: bitcoin.networks.testnet }).address!
        }
      }
      const ok = lib.address === rpcAddr && rpcAddr === offAddr
      allOk &&= ok
      rows.push({ predecessor: pred, path, domain: chain === 'sol' ? 1 : 0, chainsig: lib.address, rpc_view: rpcAddr, offline_noble: offAddr, match: ok, ms_chainsig: tLib.toFixed(1), ms_rpc: tRpc.toFixed(0), derived_key_naj: naj })
    }
  }
  for (const r of rows) console.log(JSON.stringify(r))
  console.log('ALL MATCH:', allOk)
}
main().catch((e) => { console.error(e); process.exit(1) })
