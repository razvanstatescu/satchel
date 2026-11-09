import { describe, expect, it } from 'vitest'
import { contractForRole, isForbiddenRpc, loadConfig, resolveAccount, roleOfContract } from '../lib/config'
import { confirmSend } from '../lib/confirm'
import { credentialFiles, loadKey, MissingCredentialsError, parseKeyFile, peekPublicKey } from '../lib/credentials'
import { errorCodes, events, failureMessages, hasError, interpretFtTransferCall, txSuccessValue } from '../lib/outcome'
import type { ExecutionOutcome } from '../lib/near-rpc'
import { formatNear, formatTgas, formatUnits, parseNear, parseUnits, TGAS } from '../lib/units'
import { b64, tempCredentials } from './helpers'

const NEAR_ORG = ['rpc', 'testnet', 'near', 'org'].join('.')

describe('config', () => {
  it('defaults to the satchelhq team (D-38) and the dev role', () => {
    const c = loadConfig({}, {})
    expect(c.team).toBe('satchelhq')
    expect(c.teamAccount).toBe('satchelhq.testnet')
    expect(c.contract).toBe('dev1.satchelhq.testnet')
    expect(c.personas).toEqual({ alice: 'alice.satchelhq.testnet', bob: 'bob.satchelhq.testnet', carol: 'carol.satchelhq.testnet' })
    expect(c.mpc).toBe('v1.signer-prod.testnet')
    expect(c.nearRpcs).toEqual(['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'])
    expect(c.nearTxApi).toBe('https://tx.test.fastnear.com')
  })
  it('maps roles to the spec §5.1 accounts and back', () => {
    expect(contractForRole('rc', 'satchelhq')).toBe('rc.satchelhq.testnet')
    expect(contractForRole('final', 'satchelhq')).toBe('satchel.satchelhq.testnet')
    expect(contractForRole('dev', 'satchelhq', 2)).toBe('dev2.satchelhq.testnet')
    expect(roleOfContract('satchel.satchelhq.testnet', 'satchelhq')).toBe('final')
    expect(roleOfContract('rc2.satchelhq.testnet', 'satchelhq')).toBe('rc')
    expect(roleOfContract('dev1.satchelhq.testnet', 'satchelhq')).toBe('dev')
    expect(roleOfContract('other.testnet', 'satchelhq')).toBeNull()
  })
  it('flags beat env, env beats defaults', () => {
    const env = { SATCHEL_TEAM: 'acme', SATCHEL_ROLE: 'rc', SATCHEL_CAROL: 'buyer.testnet', FASTNEAR_API_KEY: ' k ' }
    const c = loadConfig({ contract: 'x.acme.testnet' }, env)
    expect(c.contract).toBe('x.acme.testnet')
    expect(c.role).toBe('rc')
    expect(c.personas.carol).toBe('buyer.testnet')
    expect(c.personas.alice).toBe('alice.acme.testnet')
    expect(c.fastnearApiKey).toBe('k')
    expect(resolveAccount(c, 'carol')).toBe('buyer.testnet')
    expect(resolveAccount(c, 'team')).toBe('acme.testnet')
    expect(loadConfig({ role: 'final' }, env).contract).toBe('satchel.acme.testnet')
  })
  it('without a role, a final or rc contract id brings its role; an explicit role still wins', () => {
    expect(loadConfig({ contract: 'satchel.satchelhq.testnet' }, {}).role).toBe('final')
    expect(loadConfig({}, { SATCHEL_CONTRACT: 'rc.satchelhq.testnet' }).role).toBe('rc')
    expect(loadConfig({ contract: 'dev2.satchelhq.testnet' }, {}).role).toBe('dev')
    expect(loadConfig({ contract: 'other.testnet' }, {}).role).toBe('dev')
    expect(loadConfig({ contract: 'satchel.satchelhq.testnet', role: 'dev' }, {}).role).toBe('dev')
    expect(loadConfig({ contract: 'satchel.satchelhq.testnet' }, { NEXT_PUBLIC_CONTRACT_ROLE: 'rc' }).role).toBe('rc')
  })
  it('refuses the deprecated near.org RPC anywhere', () => {
    expect(isForbiddenRpc(`https://${NEAR_ORG}`)).toBe(true)
    expect(isForbiddenRpc('https://near-testnet.drpc.org')).toBe(false)
    expect(() => loadConfig({}, { SATCHEL_NEAR_RPCS: `https://${NEAR_ORG}` })).toThrow(/deprecated/)
    expect(() => loadConfig({}, { NEXT_PUBLIC_NEAR_RPCS: `https://test.rpc.fastnear.com,https://${NEAR_ORG}` })).toThrow(/deprecated/)
  })
  it('validates account ids, role and code hash', () => {
    expect(() => loadConfig({ role: 'prod' }, {})).toThrow(/--role/)
    expect(() => loadConfig({ contract: 'Bad..Id' }, {})).toThrow(/invalid contract/)
    expect(() => loadConfig({}, { SATCHEL_EXPECTED_CODE_HASH: 'abc' })).toThrow(/64 hex/)
    expect(loadConfig({}, { NEXT_PUBLIC_EXPECTED_CODE_HASH: 'AB'.repeat(32) }).expectedCodeHash).toBe('ab'.repeat(32))
  })
})

describe('units', () => {
  it('parses exactly and never rounds', () => {
    expect(parseNear('0.02')).toBe(20_000_000_000_000_000_000_000n)
    expect(parseNear('10')).toBe(10n * 10n ** 24n)
    expect(parseUnits('5', 'usdc')).toBe(5_000_000n)
    expect(parseUnits('0.0001', 'eth')).toBe(100_000_000_000_000n)
    expect(() => parseUnits('0.0000001', 'usdc')).toThrow(/invalid USDC/)
    expect(() => parseNear('1e3')).toThrow()
  })
  it('formats', () => {
    expect(formatUnits(1n, 'near')).toBe('0.000000000000000000000001')
    expect(formatNear(5_140_000_000_000_000_000_000_000n)).toBe('5.14 NEAR')
    expect(formatUnits(-1_500_000n, 'usdc')).toBe('-1.5')
    expect(formatTgas(170n * TGAS)).toBe('170 Tgas')
    expect(formatTgas(12_500_000_000_000n)).toBe('12.5 Tgas')
  })
})

describe('confirm', () => {
  it('dry run never asks', async () => {
    let asked = false
    expect(await confirmSend({ send: false, ask: async () => ((asked = true), 'yes') })).toBe('dry-run')
    expect(asked).toBe(false)
  })
  it('only an exact "yes" confirms', async () => {
    expect(await confirmSend({ send: true, isTty: true, ask: async () => 'yes' })).toBe('confirmed')
    expect(await confirmSend({ send: true, isTty: true, ask: async () => ' yes \n' })).toBe('confirmed')
    expect(await confirmSend({ send: true, isTty: true, ask: async () => 'y' })).toBe('declined')
    expect(await confirmSend({ send: true, isTty: true, ask: async () => 'YES' })).toBe('declined')
  })
  it('--yes skips the prompt, except where a TTY is required', async () => {
    expect(await confirmSend({ send: true, yes: true, ask: async () => 'no' })).toBe('confirmed')
    expect(await confirmSend({ send: true, yes: true, requireTty: true, isTty: true, ask: async () => 'no' })).toBe('declined')
    await expect(confirmSend({ send: true, requireTty: true, isTty: false, ask: async () => 'yes' })).rejects.toThrow(/non-interactive/)
  })
})

describe('credentials', () => {
  it('loads the legacy single-file layout and the per-key folder layout', () => {
    const a = tempCredentials(['alice.x.testnet'])
    const k = loadKey(a.dir, 'testnet', 'alice.x.testnet')
    expect(k.publicKey).toBe(a.keys['alice.x.testnet']!.getPublicKey().toString())
    const b = tempCredentials(['bob.x.testnet'], 'folder')
    expect(credentialFiles(b.dir, 'testnet', 'bob.x.testnet')).toHaveLength(1)
    expect(loadKey(b.dir, 'testnet', 'bob.x.testnet').publicKey).toBe(b.keys['bob.x.testnet']!.getPublicKey().toString())
    expect(peekPublicKey(b.dir, 'testnet', 'bob.x.testnet')).toBe(b.keys['bob.x.testnet']!.getPublicKey().toString())
  })
  it('missing keys are a typed error; peek returns null', () => {
    const a = tempCredentials([])
    expect(() => loadKey(a.dir, 'testnet', 'nobody.testnet')).toThrow(MissingCredentialsError)
    expect(peekPublicKey(a.dir, 'testnet', 'nobody.testnet')).toBeNull()
  })
  it('rejects a file for another account or with a mismatched public key, without echoing the secret', () => {
    const a = tempCredentials(['alice.x.testnet'])
    const secret = a.keys['alice.x.testnet']!.toString()
    const body = JSON.stringify({ account_id: 'alice.x.testnet', private_key: secret, public_key: 'ed25519:11111111111111111111111111111111' })
    let msg = ''
    try {
      parseKeyFile(body, 'alice.x.testnet', 'f.json')
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/does not match/)
    expect(msg).not.toContain(secret.slice(8))
    expect(() => parseKeyFile(JSON.stringify({ account_id: 'eve.testnet', private_key: secret }), 'alice.x.testnet', 'f.json')).toThrow(/belongs to eve/)
    expect(() => parseKeyFile('{}', 'alice.x.testnet', 'f.json')).toThrow(/no private_key/)
    expect(() => parseKeyFile('nope', 'alice.x.testnet', 'f.json')).toThrow(/malformed/)
  })
})

// A FinalExecutionOutcome shaped like testnet's, for a buy that failed in the contract receipt.
const failed: ExecutionOutcome = {
  final_execution_status: 'EXECUTED_OPTIMISTIC',
  status: { Failure: { ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: 'Smart contract panicked: ERR_LISTING_CHANGED: listing 7 is gone' } } } } },
  transaction_outcome: { id: 't', block_hash: 'b', outcome: { status: { SuccessReceiptId: 'r' }, logs: [] } },
  receipts_outcome: [
    { id: 'r', block_hash: 'b', outcome: { executor_id: 'c', logs: [], status: { Failure: { ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: 'Smart contract panicked: ERR_LISTING_CHANGED: listing 7 is gone' } } } } } } },
  ],
}

describe('outcome', () => {
  it('extracts failures and ERR_ codes', () => {
    expect(failureMessages(failed)[0]).toContain('ERR_LISTING_CHANGED')
    expect(hasError(failed, 'ERR_LISTING_CHANGED')).toBe(true)
    expect(hasError(failed, 'ERR_SELF_BUY')).toBe(false)
    expect(errorCodes(failed)).toEqual(['ERR_LISTING_CHANGED'])
    expect(txSuccessValue(failed).ok).toBe(false)
  })
  it('reads the success value and NEP-297 events', () => {
    const o: ExecutionOutcome = {
      status: { SuccessValue: b64([{ scheme: 'Ed25519', signature: [1, 2] }]) },
      receipts_outcome: [
        {
          id: 'r',
          block_hash: 'b',
          outcome: {
            executor_id: 'c',
            status: { SuccessValue: '' },
            logs: ['EVENT_JSON:{"standard":"nep171","version":"1.0.0","event":"nft_mint","data":[{"owner_id":"a","token_ids":["8"]}]}', 'plain log', 'EVENT_JSON:{bad'],
          },
        },
      ],
    }
    const v = txSuccessValue(o)
    expect(v.ok && Array.isArray(v.value)).toBe(true)
    const e = events(o, 'nep171', 'nft_mint')
    expect(e).toHaveLength(1)
    expect((e[0]!.data as { token_ids: string[] }[])[0]!.token_ids).toEqual(['8'])
    expect(events(o, 'satchel')).toHaveLength(0)
  })
  it('interprets ft_transfer_call: used amount, not tx success (kb/51 §Gotchas 1)', () => {
    const val = (s: string): ExecutionOutcome => ({ status: { SuccessValue: b64(s) } })
    expect(interpretFtTransferCall(val('5000000'), 5_000_000n)).toBe('bought')
    expect(interpretFtTransferCall(val('0'), 5_000_000n)).toBe('refunded')
    expect(interpretFtTransferCall(val('1'), 5_000_000n)).toBe('partial')
    expect(interpretFtTransferCall(failed, 5_000_000n)).toBe('failed')
  })
})
