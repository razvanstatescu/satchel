/**
 * @network: read-only live checks (spec §12.1 "TS derivation (network)", CI non-blocking).
 * Run with `pnpm --filter @satchel/core test:network`. Never the deprecated near.org testnet RPC (CLAUDE.md).
 */
import { describe, expect, it } from 'vitest'
import { deriveEd25519, deriveSecp256k1, MPC_ROOT_KEYS, nearKeyString, tokenPath, type ChainSlug } from '../../src/derive'
import { checkCleanHistory, esploraBtcSource, jsonRpcEvmSource, solRpcSource } from '../../src/clean-history'
import { EMZY_TESTNET4, MEMPOOL_TESTNET4 } from '../../src/chains/btc'
import { btcRecord, snapshot } from '../helpers'

const NEAR_RPCS = ['https://near-testnet.drpc.org', 'https://test.rpc.fastnear.com']
const MPC = 'v1.signer-prod.testnet'

async function view(rpc: string, method: string, args: object): Promise<unknown> {
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'satchel',
      method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: MPC, method_name: method, args_base64: btoa(JSON.stringify(args)) },
    }),
  })
  const j = (await r.json()) as { result?: { result: number[] }; error?: unknown }
  if (!j.result) throw new Error(`${rpc}: ${JSON.stringify(j.error)}`)
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(j.result.result)))
}

describe.each(NEAR_RPCS)('@network MPC derived_public_key on %s', (rpc) => {
  it('root keys (domains 0 and 1) equal the hard-coded testnet roots', async () => {
    expect(await view(rpc, 'public_key', { domain_id: 0 })).toBe(MPC_ROOT_KEYS.testnet.secp256k1)
    expect(await view(rpc, 'public_key', { domain_id: 1 })).toBe(MPC_ROOT_KEYS.testnet.ed25519)
  })

  it.each([
    ['satchel.example.testnet', '1'],
    ['satchel.satchelhq.testnet', '3'],
  ])('%s token %s: btc, evm, sol match our derivation', async (pred, id) => {
    for (const chain of ['btc', 'evm', 'sol'] as ChainSlug[]) {
      const path = tokenPath(id, chain)
      const live = await view(rpc, 'derived_public_key', { path, predecessor: pred, domain_id: chain === 'sol' ? 1 : 0 })
      const local =
        chain === 'sol' ? nearKeyString('ed25519', deriveEd25519('testnet', pred, path)) : nearKeyString('secp256k1', deriveSecp256k1('testnet', pred, path).uncompressed)
      expect(live, `${pred} ${path}`).toBe(local)
    }
  })
})

describe('@network clean-history against the live providers (read-only)', () => {
  it('kb/30 DEAD outpoint efc545…:429 is spent on both testnet4 providers; the fabricated one is unfunded', async () => {
    const recs = [
      btcRecord(0, 0, 0, 'efc545bac36c6f3bddfbb6f727da7366dca008f5cb58e6e009440bd4b525a799', 429),
      btcRecord(1, 1, 0, '37ea6fceca4d4c4068056ab1b0ad3fbb43a1a57a9963525a37dcef5ef6e042a0', 0),
    ]
    const r = await checkCleanHistory(
      { network: 'testnet', contractId: 'satchel-spk-chain-e9ea1a.testnet', tokenId: '1', role: 'dev', near: [snapshot('a', recs), snapshot('b', recs)], now: Date.now() },
      {
        evm: [jsonRpcEvmSource('https://ethereum-sepolia-rpc.publicnode.com'), jsonRpcEvmSource('https://rpc.sepolia.ethpandaops.io')],
        btc: [esploraBtcSource(MEMPOOL_TESTNET4), esploraBtcSource(EMZY_TESTNET4)],
        sol: [solRpcSource('https://api.devnet.solana.com')],
      },
    )
    expect(r.items.map((i) => i.status)).toEqual(['spent', 'unfunded'])
    expect(r.items[0]!.sources).toBe(2)
    expect(r.accounts.map((a) => a.status)).toEqual(['ok', 'ok'])
    expect(r.aggregate).toBe('clean')
  }, 60_000)
})
