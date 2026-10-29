import { describe, expect, it } from 'vitest'
import { PublicKey, SignedTransaction, Transaction } from 'near-api-js'
import { base58 } from '@scure/base'
import { createHash } from 'node:crypto'
import { classifyRpcResponse, NearRpc, reached, RpcError, trackTx } from '../lib/near-rpc'
import { executePlan, makeCtx, parseCli } from '../lib/run'
import { actionKinds, assertSafeActions, buildTransaction, formatPlan, functionCall, transactionHash, type TxPlan } from '../lib/tx'
import { TGAS } from '../lib/units'
import { BLOCK_HASH, b64, mockFetch, ok, rpcErr, tempCredentials, viewResult } from './helpers'

const noSleep = { sleep: async () => {} }

describe('classifyRpcResponse', () => {
  it('handles results, handler errors, both timeout shapes, dRPC code 30 and HTTP statuses', () => {
    expect(classifyRpcResponse(200, JSON.stringify({ result: 1 }))).toEqual({ ok: true, result: 1 })
    const unknown = classifyRpcResponse(200, JSON.stringify(rpcErr('HANDLER_ERROR', 'UNKNOWN_ACCOUNT').body))
    expect(!unknown.ok && unknown.error.kind).toBe('UNKNOWN_ACCOUNT')
    expect(!unknown.ok && unknown.error.retryable).toBe(false)
    const t1 = classifyRpcResponse(408, JSON.stringify(rpcErr('HANDLER_ERROR', 'TIMEOUT_ERROR').body))
    expect(!t1.ok && t1.error.retryable).toBe(true)
    const t2 = classifyRpcResponse(200, JSON.stringify({ error: { code: -32000, message: 'Server error', data: 'Timeout' } }))
    expect(!t2.ok && t2.error.kind).toBe('TIMEOUT_ERROR')
    const d = classifyRpcResponse(200, JSON.stringify({ error: { code: 30, message: 'timeout' } }))
    expect(!d.ok && d.error.kind === 'DRPC_TIMEOUT' && d.error.retryable).toBe(true)
    for (const s of [408, 429, 502]) {
      const r = classifyRpcResponse(s, 'gateway says no')
      expect(!r.ok && r.error.retryable).toBe(true)
    }
    const inv = classifyRpcResponse(200, JSON.stringify(rpcErr('HANDLER_ERROR', 'INVALID_TRANSACTION').body))
    expect(!inv.ok && inv.error.retryable).toBe(false)
  })
  it('reached() orders wait levels', () => {
    expect(reached('EXECUTED_OPTIMISTIC', 'EXECUTED_OPTIMISTIC')).toBe(true)
    expect(reached('FINAL', 'EXECUTED_OPTIMISTIC')).toBe(true)
    expect(reached('INCLUDED', 'EXECUTED_OPTIMISTIC')).toBe(false)
    expect(reached('INCLUDED_FINAL', 'EXECUTED_OPTIMISTIC')).toBe(false)
    expect(reached('EXECUTED', 'FINAL')).toBe(false)
    expect(reached('EXECUTED_OPTIMISTIC', 'INCLUDED')).toBe(true)
    expect(reached(undefined, 'INCLUDED')).toBe(false)
  })
})

describe('NearRpc', () => {
  it('rotates FastNEAR → dRPC on 429 and sends the API key to fastnear only', async () => {
    const m = mockFetch((_m, _p, url) => (url.includes('fastnear') ? { status: 429, body: 'Rate limits exceeded' } : ok({ header: { hash: 'h', height: 5 } })))
    const rpc = new NearRpc(['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'], { fetch: m.fetch, apiKey: 'sekret', ...noSleep })
    expect(await rpc.finalBlock()).toEqual({ hash: 'h', height: 5 })
    expect(m.calls.map((c) => c.url)).toEqual(['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'])
    expect(m.calls[0]!.headers.authorization).toBe('Bearer sekret')
    expect(m.calls[1]!.headers.authorization).toBeUndefined()
  })
  it('throws definite errors at once; viewAccount maps UNKNOWN_ACCOUNT to null', async () => {
    const m = mockFetch(() => rpcErr('HANDLER_ERROR', 'UNKNOWN_ACCOUNT'))
    const rpc = new NearRpc(['https://a.example', 'https://b.example'], { fetch: m.fetch, ...noSleep })
    expect(await rpc.viewAccount('nobody.testnet')).toBeNull()
    expect(m.calls).toHaveLength(1)
  })
  it('decodes views and the legacy in-result error shapes', async () => {
    const m = mockFetch((method, p) => {
      if (p.request_type === 'call_function' && p.method_name === 'config') return viewResult({ cooldown_blocks: 250 })
      if (p.request_type === 'call_function') return ok({ error: 'wasm execution failed with error: MethodNotFound', logs: [] })
      if (p.request_type === 'view_access_key') return ok({ error: 'access key ed25519:x does not exist while viewing', block_height: 1, block_hash: 'x', logs: [] })
      return undefined
    })
    const rpc = new NearRpc(['https://a.example'], { fetch: m.fetch, ...noSleep })
    expect(await rpc.view('c.testnet', 'config')).toEqual({ cooldown_blocks: 250 })
    await expect(rpc.view('c.testnet', 'nope')).rejects.toMatchObject({ kind: 'VIEW_ERROR' })
    await expect(rpc.viewAccessKey('a.testnet', 'ed25519:x')).rejects.toMatchObject({ kind: 'UNKNOWN_ACCESS_KEY' })
  })
  it('refuses the near.org RPC', () => {
    expect(() => new NearRpc([`https://${['rpc', 'testnet', 'near', 'org'].join('.')}`])).toThrow(/deprecated/)
  })
  it('gives up after its rounds with the last transient error', async () => {
    const m = mockFetch(() => ({ status: 503, body: 'down' }))
    const rpc = new NearRpc(['https://a.example', 'https://b.example'], { fetch: m.fetch, rounds: 2, ...noSleep })
    await expect(rpc.finalBlock()).rejects.toMatchObject({ kind: 'HTTP_5XX' })
    expect(m.calls).toHaveLength(4)
  })
})

describe('trackTx (long-poll)', () => {
  it('asks again on 408 / TIMEOUT / UNKNOWN_TRANSACTION / pending status until the target is reached', async () => {
    let n = 0
    const m = mockFetch((method) => {
      if (method !== 'tx') return undefined
      n++
      if (n === 1) return rpcErr('HANDLER_ERROR', 'UNKNOWN_TRANSACTION')
      if (n === 2) return rpcErr('HANDLER_ERROR', 'TIMEOUT_ERROR', 408)
      if (n === 3) return ok({ final_execution_status: 'INCLUDED' })
      return ok({ final_execution_status: 'EXECUTED_OPTIMISTIC', status: { SuccessValue: '' } })
    })
    const rpc = new NearRpc(['https://a.example'], { fetch: m.fetch, rounds: 1, ...noSleep })
    const notes: string[] = []
    const o = await trackTx(rpc, 'H', 'a.testnet', { onPoll: (_i, s) => notes.push(s) })
    expect(o.final_execution_status).toBe('EXECUTED_OPTIMISTIC')
    expect(notes).toEqual(['UNKNOWN_TRANSACTION', 'TIMEOUT_ERROR', 'status INCLUDED'])
    expect(m.calls.every((c) => (c.params as { wait_until: string }).wait_until === 'EXECUTED_OPTIMISTIC')).toBe(true)
  })
  it('stops at the deadline and throws on definite errors', async () => {
    let t = 0
    const pending = mockFetch(() => ok({ final_execution_status: 'INCLUDED' }))
    const rpc = new NearRpc(['https://a.example'], { fetch: pending.fetch, ...noSleep })
    await expect(trackTx(rpc, 'H', 'a', { deadlineMs: 10, now: () => (t += 6) })).rejects.toMatchObject({ kind: 'TRACK_DEADLINE' })
    const invalid = mockFetch(() => rpcErr('HANDLER_ERROR', 'INVALID_TRANSACTION'))
    await expect(trackTx(new NearRpc(['https://a.example'], { fetch: invalid.fetch, ...noSleep }), 'H', 'a')).rejects.toBeInstanceOf(RpcError)
  })
})

const plan = (): TxPlan => ({
  title: 'test',
  signerId: 'alice.x.testnet',
  receiverId: 'dev1.x.testnet',
  actions: [functionCall('nft_transfer', { receiver_id: 'bob.x.testnet', token_id: '2' }, 30n * TGAS, 1n)],
})

describe('tx plans', () => {
  it('prints every action, arg, gas and deposit', () => {
    const s = formatPlan(plan())
    expect(s).toContain('signer    alice.x.testnet')
    expect(s).toContain('FunctionCall nft_transfer  gas 30 Tgas  deposit 0.000000000000000000000001 NEAR (1 yocto)')
    expect(s).toContain('args {"receiver_id":"bob.x.testnet","token_id":"2"}')
  })
  it('refuses key, account and code actions outside the birth tool', () => {
    const p = plan()
    expect(() => assertSafeActions({ ...p, actions: [{ type: 'AddKey' } as never] })).toThrow(/AddKey/)
    expect(() => assertSafeActions({ ...p, actions: [{ type: 'DeleteAccount' } as never] })).toThrow(/DeleteAccount/)
    expect(() => assertSafeActions({ ...p, actions: [{ type: 'DeployContract', code: new Uint8Array(1), sha256: '' }] })).toThrow(/DeployContract/)
    expect(() => assertSafeActions({ ...p, actions: [{ type: 'CreateAccount' }] })).toThrow(/CreateAccount/)
    expect(() => assertSafeActions({ ...p, actions: [{ type: 'CreateAccount' }] }, { createAccount: true })).not.toThrow()
  })
  it('builds the near-api-js tx: borsh round-trip keeps the actions; hash = base58(sha256(borsh))', () => {
    const { keys } = tempCredentials(['alice.x.testnet'])
    const pk = keys['alice.x.testnet']!.getPublicKey().toString()
    const tx = buildTransaction(plan(), pk, 42n, BLOCK_HASH)
    const back = Transaction.decode(tx.encode())
    expect(back.signerId).toBe('alice.x.testnet')
    expect(back.receiverId).toBe('dev1.x.testnet')
    expect(back.nonce).toBe(42n)
    expect(back.actions).toHaveLength(1)
    expect(back.actions[0]!.functionCall!.methodName).toBe('nft_transfer')
    expect(Buffer.from(back.actions[0]!.functionCall!.args).toString()).toBe('{"receiver_id":"bob.x.testnet","token_id":"2"}')
    expect(back.actions[0]!.functionCall!.deposit).toBe(1n)
    expect(transactionHash(tx)).toBe(base58.encode(createHash('sha256').update(tx.encode()).digest()))
    expect(actionKinds(plan())).toEqual(['FunctionCall'])
  })
})

describe('executePlan against an in-memory RPC (no network)', () => {
  function world() {
    const creds = tempCredentials(['alice.x.testnet'])
    let txCalls = 0
    const m = mockFetch((method, p) => {
      if (method === 'query' && p.request_type === 'view_access_key') return ok({ nonce: 41, permission: 'FullAccess', block_hash: BLOCK_HASH, block_height: 9 })
      if (method === 'block') return ok({ header: { hash: BLOCK_HASH, height: 100 } })
      if (method === 'send_tx') return ok({ final_execution_status: 'INCLUDED' })
      if (method === 'tx') {
        txCalls++
        if (txCalls === 1) return rpcErr('HANDLER_ERROR', 'TIMEOUT_ERROR', 408)
        return ok({ final_execution_status: 'EXECUTED_OPTIMISTIC', status: { SuccessValue: b64('done') }, transaction_outcome: { id: 'x', block_hash: BLOCK_HASH, outcome: { status: {}, logs: [] } }, receipts_outcome: [] })
      }
      return undefined
    })
    const env = { NEAR_CREDENTIALS_DIR: creds.dir, SATCHEL_NEAR_RPCS: 'https://a.example' }
    return { creds, m, env }
  }
  const logs: string[] = []
  const log = (s: string) => logs.push(s)

  it('dry run prints the plan and never calls send_tx', async () => {
    const w = world()
    const ctx = makeCtx(parseCli([], {}), { fetch: w.m.fetch, env: w.env, log })
    expect(await executePlan(ctx, plan())).toBeNull()
    expect(w.m.calls.map((c) => c.method)).not.toContain('send_tx')
    expect(logs.join('\n')).toContain('would be 42')
    expect(logs.join('\n')).toContain('DRY RUN')
  })
  it('a declined prompt signs nothing', async () => {
    const w = world()
    const ctx = makeCtx(parseCli(['--send'], {}), { fetch: w.m.fetch, env: w.env, log, ask: async () => 'no' })
    await expect(executePlan(ctx, plan())).rejects.toThrow(/not confirmed/)
    expect(w.m.calls.map((c) => c.method)).not.toContain('send_tx')
  })
  it('--send + "yes": signs exactly the printed tx, send_tx INCLUDED, then tracks by hash', async () => {
    const w = world()
    const ctx = makeCtx(parseCli(['--send'], {}), { fetch: w.m.fetch, env: w.env, log, ask: async () => 'yes' })
    const sent = await executePlan(ctx, plan())
    expect(sent?.ok).toBe(true)
    const send = w.m.calls.find((c) => c.method === 'send_tx')!
    expect((send.params as { wait_until: string }).wait_until).toBe('INCLUDED')
    const signed = SignedTransaction.decode(Buffer.from((send.params as { signed_tx_base64: string }).signed_tx_base64, 'base64'))
    expect(signed.transaction.nonce).toBe(42n)
    const msgHash = createHash('sha256').update(signed.transaction.encode()).digest()
    expect(base58.encode(msgHash)).toBe(sent!.hash)
    const pub = PublicKey.fromString(w.creds.keys['alice.x.testnet']!.getPublicKey().toString())
    const raw = signed.signature.ed25519Signature!.data as unknown
    const sigBytes = Uint8Array.from(Array.isArray(raw) || ArrayBuffer.isView(raw) ? (raw as ArrayLike<number>) : Object.values(raw as object))
    expect(sigBytes).toHaveLength(64)
    expect(pub.verify(new Uint8Array(msgHash), sigBytes)).toBe(true)
    const tracked = w.m.calls.filter((c) => c.method === 'tx')
    expect(tracked).toHaveLength(2)
    expect((tracked[0]!.params as { tx_hash: string }).tx_hash).toBe(sent!.hash)
  })
  it('--send and --offline are exclusive', () => {
    expect(() => makeCtx(parseCli(['--send', '--offline'], {}), { env: {} })).toThrow(/exclusive/)
  })
})

describe('waitForFinalViews (2026-10-27 testnet smoke: final views trail EXECUTED_OPTIMISTIC)', () => {
  it('polls until the final head reaches the optimistic head seen after the tx', async () => {
    const { waitForFinalViews } = await import('../lib/run')
    let finalH = 10
    const logs: string[] = []
    const rpc = { optimisticHeight: async () => 13, finalBlock: async () => ({ hash: 'h', height: finalH++ }) }
    await waitForFinalViews({ rpc, log: (s: string) => logs.push(s) } as never, 5_000, 1)
    expect(finalH).toBe(14)
    expect(logs).toEqual([])
  })

  it('gives up with a note instead of throwing', async () => {
    const { waitForFinalViews } = await import('../lib/run')
    const logs: string[] = []
    const rpc = { optimisticHeight: async () => { throw new Error('boom') }, finalBlock: async () => ({ hash: 'h', height: 0 }) }
    await waitForFinalViews({ rpc, log: (s: string) => logs.push(s) } as never, 5, 1)
    expect(logs[0]).toMatch(/could not wait for finality/)
  })
})
