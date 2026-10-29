/**
 * End to end, local, no network writes (brief: "builds a full EVM and BTC send for a derived address, encodes the
 * SignRequest, decodes a KB-recorded MPC response, attaches it and verifies it").
 *
 *   derive → build unsigned → SignRequest + sign_for call → contract policy mirror (records + MPC args) →
 *   on_signed SuccessValue (base64 JSON array, recorded real MPC answers) → decode → attach → verify → raw tx
 *   → the record the contract would store → clean-history verdict (recorded chain answers)
 */
import { describe, expect, it } from 'vitest'
import * as bitcoin from 'bitcoinjs-lib'
import { base58 } from '@scure/base'
import type { PublicClient } from 'viem'
import fanout from './fixtures/kb30-btc-fanout.json' with { type: 'json' }
import { deriveSatchelAddresses } from '../src/derive'
import { decodeOnSignedResult, mpcSignArgs, signForCall, evmSignRequest, solSignRequest } from '../src/near'
import { classifySignRequest } from '../src/policy'
import { finalizeEvmTx, prepareEvmSend } from '../src/chains/evm'
import { attachBtcSignatures, btcTxFromPreimages, buildBtcSend, seededRng, type Utxo } from '../src/chains/btc'
import { attachSolSignature, buildSolTransfer } from '../src/chains/sol'
import { checkCleanHistory } from '../src/clean-history'
import { bytesToBase64, toHex, utf8 } from '../src/bytes'
import { evmRecord, recordedBtcSources, recordedEvmSource, recordedSolSource, snapshot } from './helpers'

/** What the NEAR tx outcome's SuccessValue looks like: on_signed returns the raw MPC JSON per request (spec §5.8). */
const successValue = (responses: unknown[]) => bytesToBase64(utf8(JSON.stringify(responses)))

describe('e2e local: EVM send from a derived Satchel address (real MPC signature, kb/31)', () => {
  it('derive → build → sign_for args → policy → MPC args → decode on_signed → attach → recover → record → checker', async () => {
    // 1. derive (the spike contract is the MPC predecessor that actually got this signature)
    const contract = 'satchel-spk-chain-e9ea1a.testnet'
    const a = deriveSatchelAddresses('testnet', contract, '1')
    expect(a.evm).toBe('0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d')

    // 2. build: nonce/fees/balance from a client (the kb/31 values), send 1e14 wei to 0x6173…28BE
    const client = {
      getTransactionCount: async () => 0,
      estimateFeesPerGas: async () => ({ maxFeePerGas: 200_028n, maxPriorityFeePerGas: 200_008n }),
      getBalance: async () => 10n ** 16n,
      // the kb/31 vector is a transfer to an existing account: the node estimates the classic 21,000
      estimateGas: async () => 21_000n,
    } as unknown as PublicClient
    const prep = await prepareEvmSend(client, { from: a.evm, to: '0x61739f33AdbB7F76c1b5B222E4119085257528BE', value: 10n ** 14n })
    expect(prep.unsigned).toBe('0x02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0')

    // 3. the wallet call
    const call = signForCall('1', evmSignRequest(prep.unsigned))
    expect(JSON.stringify(call.args)).toBe(`{"token_id":"1","request":{"evm":{"unsigned_tx":"${prep.unsigned.slice(2)}"}}}`)
    expect([call.gas, call.deposit]).toEqual(['80000000000000', '5000000000000000000000'])

    // 4. what the contract does with it (TS mirror of §5.9 + §5.8)
    const c = classifySignRequest(call.args.request as never)
    expect(c.ok).toBe(true)
    if (!c.ok) return
    expect(toHex(c.recordPayloads[0]!)).toBe(toHex(prep.payload))
    expect(JSON.stringify(mpcSignArgs('1', 'evm', c.mpcPayloads[0]!))).toBe(
      '{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377"},"domain_id":0}}',
    )

    // 5. the tx outcome: on_signed's SuccessValue with the real MPC response (NEAR tx Dcc3gktA…)
    const outcome = successValue([
      { scheme: 'Secp256k1', big_r: { affine_point: '02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c' }, s: { scalar: '549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1' }, recovery_id: 1 },
    ])
    const { signatures, invalid } = decodeOnSignedResult(outcome)
    expect(invalid).toEqual([])

    // 6. attach + verify before broadcast
    const fin = await finalizeEvmTx(prep.tx, signatures[0]!, a.evm)
    expect(fin.from).toBe(a.evm)
    expect(fin.signed.slice(0, 16)).toBe('0x02f87183aa36a7')

    // 7. the record the contract stores, then the buyer's checker against the recorded Sepolia answers
    const rec = evmRecord(0, prep.unsigned)
    const report = await checkCleanHistory(
      { network: 'testnet', contractId: contract, tokenId: '1', role: 'dev', near: [snapshot('f', [rec]), snapshot('d', [rec])], now: Date.parse('2026-10-21T21:32:30Z') },
      { evm: [recordedEvmSource('publicnode'), recordedEvmSource('drpc')], btc: [], sol: [recordedSolSource()] },
    )
    expect(report.items[0]).toMatchObject({ status: 'unused', nonce: '0' }) // signed, never broadcast: still live
    expect(report.aggregate).toBe('blocked')
  })
})

describe('e2e local: BTC 2-input send (real MPC fan-out signatures, research/spikes/btc §8)', () => {
  const run = fanout.runs[0]!
  const contract = 'fanout.satchel-spk-btc-e9ea1a.testnet'
  const utxos: Utxo[] = run.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: BigInt(i.value), confirmed: true }))
  const recipient = bitcoin.address.fromOutputScript(
    bitcoin.Transaction.fromBuffer(bitcoin.Psbt.fromBase64(run.psbt_base64).data.globalMap.unsignedTx.toBuffer()).outs[0]!.script,
    bitcoin.networks.testnet,
  )

  it('derive → select → preimages + outputs → sign_for args → policy → MPC args → decode → attach → strict verify', () => {
    const a = deriveSatchelAddresses('testnet', contract, '1')
    expect(a.btc).toBe(run.address)
    expect(a.btcPubkey).toBe(run.pubkey)

    const built = buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to: recipient, amount: 40_000n, utxos, feeRate: 2, fixedOrder: true })
    expect(built.txid).toBe(run.unsigned_txid)

    const call = signForCall('1', built.signRequest)
    expect(call.gas).toBe('100000000000000') // n = 2 → 100 Tgas
    expect(call.deposit).toBe('10000000000000000000000') // 0.01 NEAR

    const c = classifySignRequest(built.signRequest)
    expect(c.ok).toBe(true)
    if (!c.ok || c.chain !== 'btc') return
    expect(c.fields.inputs.map((i) => `${i.txid}:${i.vout}`)).toEqual(built.inputOutpoints) // one record per input, display-order txid
    expect(c.mpcPayloads).toEqual(run.mpc_hashes.map((h) => ({ Ecdsa: h }))) // exactly what the real MPC signed
    expect(mpcSignArgs('1', 'btc', c.mpcPayloads[1]!).request).toEqual({ path: 'satchel/1/btc', payload_v2: { Ecdsa: run.mpc_hashes[1] }, domain_id: 0 })

    const { signatures } = decodeOnSignedResult(successValue(run.mpc_responses))
    const signed = attachBtcSignatures(built.tx, signatures, a.btcPubkey)
    expect(signed.txid).toBe(run.unsigned_txid)
    expect(signed.vsize).toBe(208)

    // "Broadcast now" from another device: rebuild from the sign_requested event's preimages + outputs alone
    const ev = built.signRequest as { btc: { preimages: string[]; outputs: string } }
    const again = btcTxFromPreimages(ev.btc.preimages, ev.btc.outputs)
    expect(attachBtcSignatures(again.tx, signatures, a.btcPubkey).hex).toBe(signed.hex)
  })

  it('a partial fan-out failure (null at one index) cannot be attached: retry with the same inputs', () => {
    const a = deriveSatchelAddresses('testnet', contract, '1')
    const built = buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to: recipient, amount: 40_000n, utxos, feeRate: 2, fixedOrder: true })
    const { signatures } = decodeOnSignedResult(successValue([run.mpc_responses[0], null]))
    expect(() => attachBtcSignatures(built.tx, signatures, a.btcPubkey)).toThrow(/not signed: 1/)
    const retry = buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to: recipient, amount: 39_000n, utxos, inputs: built.tx.inputs.map((i) => ({ txid: i.txid, vout: i.vout, value: i.value, confirmed: true })), feeRate: 2, rng: seededRng(5) })
    expect(retry.inputOutpoints).toEqual(built.inputOutpoints)
  })

  it('the inputs it spends are judged by the checker from the recorded testnet4 answers (fabricated outpoints ⇒ unfunded)', async () => {
    const recs = run.inputs.map((i, k) => ({
      seq: k,
      request_id: 0,
      input_index: k,
      chain: 'btc' as const,
      height: 1,
      timestamp_ms: 1,
      requester: 'alice.testnet',
      payload: run.mpc_hashes[k]!,
      status: 'signed' as const,
      signature: null,
      detail: { btc: { txid: i.txid, vout: i.vout, amount_sats: String(i.value) } },
    }))
    const btc = recordedBtcSources()
    // only 37ea6fce… is in the recorded fixture; the second fabricated txid is answered like it (404) by a stub
    const stub = btc.map((s) => ({ ...s, name: s.name, assertTestnet4: () => s.assertTestnet4(), tipHeight: () => s.tipHeight(), outspends: (t: string) => (t === run.inputs[1]!.txid ? Promise.resolve(null) : s.outspends(t)) }))
    const r = await checkCleanHistory(
      { network: 'testnet', contractId: contract, tokenId: '1', role: 'dev', near: [snapshot('f', recs), snapshot('d', recs)], now: Date.now() },
      { evm: [recordedEvmSource('publicnode'), recordedEvmSource('drpc')].map((s) => ({ ...s, getCode: async () => '0x', getTransactionCount: async () => 0n })), btc: stub, sol: [recordedSolSource()] },
    )
    expect(r.items.map((i) => i.status)).toEqual(['unfunded', 'unfunded'])
    expect(r.encumbered_outpoints.length).toBe(2)
  })
})

describe('e2e local: SOL transfer (real MPC Ed25519 signature, kb/32)', () => {
  it('derive → legacy message → sign_for args → policy (Eddsa = the message) → decode → attach → verify', () => {
    const a = deriveSatchelAddresses('testnet', 'satchel-spk-chain-e9ea1a.testnet', '1')
    const to = deriveSatchelAddresses('testnet', 'satchel-spk-chain-e9ea1a.testnet', '2').sol
    const b = buildSolTransfer({ from: a.sol, to, lamports: 1_000_000n, recentBlockhash: '2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW', lastValidBlockHeight: 500_719_657 })
    const req = solSignRequest(b.message)
    const c = classifySignRequest(req)
    expect(c.ok).toBe(true)
    if (!c.ok) return
    expect(c.mpcPayloads).toEqual([{ Eddsa: toHex(b.message) }])
    expect(mpcSignArgs('1', 'sol', c.mpcPayloads[0]!).request.domain_id).toBe(1)
    const sig = Array.from(base58.decode('3HeVZAwBwvAGAbjnVtEZ88wQQn7j2bsfrvJhvtAVzWdkD8ie2hiMapApoYG3QaBUGRhP8bTBXTcZpEiW72AMMCYt'))
    const { signatures } = decodeOnSignedResult(successValue([{ scheme: 'Ed25519', signature: sig }]))
    const signed = attachSolSignature(b, signatures[0]!, a.sol)
    expect(signed.signature).toBe('3HeVZAwBwvAGAbjnVtEZ88wQQn7j2bsfrvJhvtAVzWdkD8ie2hiMapApoYG3QaBUGRhP8bTBXTcZpEiW72AMMCYt')
  })
})
