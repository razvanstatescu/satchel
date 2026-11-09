import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { KeyPair, Transaction } from 'near-api-js'
import {
  assertBirthShape,
  BIRTH_DEFAULTS,
  buildBirthPlan,
  buildInfoProblem,
  configProblems,
  defaultTransfer,
  initArgs,
  isReleaseChild,
  sourceMetadataFromWasm,
  proofCommands,
  requiredParentBalance,
  usdcMetadataProblem,
  validateBirth,
  type BirthOptions,
} from '../deploy/keyless-birth'
import { actionKinds, buildTransaction, sha256Hex, totalDeposit, totalGas } from '../lib/tx'
import { parseNear, TGAS } from '../lib/units'
import { BLOCK_HASH, reproMeta, wasmWith } from './helpers'

/** A tiny valid-looking wasm (magic + version); the real artifact is checked below when it exists. */
const FAKE_WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])

const opts = (o: Partial<BirthOptions> = {}): BirthOptions => ({
  parent: 'satchelhq.testnet',
  child: 'rc.satchelhq.testnet',
  wasm: FAKE_WASM,
  expectedSha256: sha256Hex(FAKE_WASM),
  mpc: 'v1.signer-prod.testnet',
  usdc: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
  baseUri: 'https://usesatchel.xyz/api/card/',
  mintTo: 'alice.satchelhq.testnet',
  mints: BIRTH_DEFAULTS.mints,
  transfer: defaultTransfer('rc.satchelhq.testnet', 'satchelhq.testnet')!,
  newGas: BIRTH_DEFAULTS.newGas,
  mintGas: BIRTH_DEFAULTS.mintGas,
  mintDeposit: BIRTH_DEFAULTS.mintDeposit,
  ...o,
})

describe('keyless birth batch (spec §5.16)', () => {
  it('is exactly CreateAccount · Transfer · DeployContract · new · nft_mint ×7, with no AddKey', () => {
    const { plan, sha256 } = buildBirthPlan(opts())
    expect(actionKinds(plan)).toEqual(['CreateAccount', 'Transfer', 'DeployContract', ...Array(8).fill('FunctionCall')])
    expect(plan.signerId).toBe('satchelhq.testnet')
    expect(plan.receiverId).toBe('rc.satchelhq.testnet')
    expect(sha256).toBe(sha256Hex(FAKE_WASM))
    const fc = plan.actions.filter((a) => a.type === 'FunctionCall')
    expect(fc.map((a) => a.type === 'FunctionCall' && a.method)).toEqual(['new', ...Array(7).fill('nft_mint')])
    expect(fc[0]!.type === 'FunctionCall' && fc[0]!.args).toEqual({
      mpc: 'v1.signer-prod.testnet',
      usdc: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
      base_uri: 'https://usesatchel.xyz/api/card/',
    })
    expect(fc.slice(1).every((a) => a.type === 'FunctionCall' && a.args.receiver_id === 'alice.satchelhq.testnet' && a.gas === 20n * TGAS && a.deposit === parseNear('0.02'))).toBe(true)
    expect(totalGas(plan)).toBe(170n * TGAS)
    expect(totalDeposit(plan)).toBe(parseNear('10') + 7n * parseNear('0.02'))
  })
  it('the near-api-js transaction decodes to the same 11 actions and carries the wasm byte-for-byte', () => {
    const { plan } = buildBirthPlan(opts())
    const pk = KeyPair.fromRandom('ed25519').getPublicKey().toString() // throwaway, never sent
    const back = Transaction.decode(buildTransaction(plan, pk, 1n, BLOCK_HASH).encode())
    const kind = (a: object) => Object.entries(a).find(([k, v]) => k !== 'enum' && v !== undefined)?.[0]
    expect(back.actions.map(kind)).toEqual(['createAccount', 'transfer', 'deployContract', ...Array(8).fill('functionCall')])
    expect(back.actions.some((a) => a.addKey !== undefined)).toBe(false)
    expect(Buffer.from(back.actions[2]!.deployContract!.code)).toEqual(Buffer.from(FAKE_WASM))
    expect(back.actions[1]!.transfer!.deposit).toBe(parseNear('10'))
    expect(JSON.parse(Buffer.from(back.actions[3]!.functionCall!.args).toString())).toEqual(initArgs(opts()))
  })
  it('funding defaults: 10 NEAR for rc, 20 NEAR for the final (D-34, review S-02), none otherwise', () => {
    expect(defaultTransfer('rc.satchelhq.testnet', 'satchelhq.testnet')).toBe(parseNear('10'))
    expect(defaultTransfer('rc2.satchelhq.testnet', 'satchelhq.testnet')).toBe(parseNear('10'))
    expect(defaultTransfer('satchel.satchelhq.testnet', 'satchelhq.testnet')).toBe(parseNear('20'))
    expect(defaultTransfer('dev1.satchelhq.testnet', 'satchelhq.testnet')).toBeNull()
  })
  it('usdc: null when H-26 disables USDC', () => {
    const { plan } = buildBirthPlan(opts({ usdc: null }))
    const n = plan.actions[3]!
    expect(n.type === 'FunctionCall' && n.args.usdc).toBeNull()
  })
  it('refuses bad inputs before anything is printed for signing', () => {
    expect(() => validateBirth(opts({ child: 'satchel.other.testnet' }))).toThrow(/direct sub-account/)
    expect(() => validateBirth(opts({ child: 'a.rc.satchelhq.testnet' }))).toThrow(/direct sub-account/)
    expect(() => validateBirth(opts({ baseUri: 'http://usesatchel.xyz/api/card/' }))).toThrow(/base_uri/)
    expect(() => validateBirth(opts({ baseUri: 'https://usesatchel.xyz/api/card' }))).toThrow(/base_uri/)
    expect(() => validateBirth(opts({ wasm: new Uint8Array([1, 2, 3, 4]) }))).toThrow(/magic/)
    expect(() => validateBirth(opts({ expectedSha256: '00'.repeat(32) }))).toThrow(/!= --expected-sha256/)
    expect(() => validateBirth(opts({ mintTo: 'rc.satchelhq.testnet' }))).toThrow(/persona/)
    expect(() => validateBirth(opts({ mints: 0 }))).toThrow(/mints/)
    expect(() => validateBirth(opts({ transfer: 0n }))).toThrow(/transfer/)
    // the final contract needs the recorded reproducible hash
    const { expectedSha256: _h, ...noHash } = opts()
    expect(() => validateBirth(noHash)).toThrow(/rc birth requires --expected-sha256/)
    expect(() => validateBirth({ ...noHash, child: 'rc2.satchelhq.testnet' })).toThrow(/rc birth requires --expected-sha256/)
    const final = { ...noHash, child: 'satchel.satchelhq.testnet', transfer: parseNear('20') }
    expect(() => validateBirth(final)).toThrow(/final birth requires --expected-sha256/)
    expect(validateBirth({ ...final, expectedSha256: sha256Hex(FAKE_WASM).toUpperCase() })).toBe(sha256Hex(FAKE_WASM))
  })
  it('refuses accounts that would collide in the contract, which are immutable after birth (review R3-D-1)', () => {
    expect(() => validateBirth(opts({ usdc: 'wrap.testnet' }))).toThrow(/--usdc and wNEAR are the same account/)
    expect(() => validateBirth(opts({ usdc: 'v1.signer-prod.testnet' }))).toThrow(/--mpc and --usdc are the same account/)
    expect(() => validateBirth(opts({ mpc: 'rc.satchelhq.testnet' }))).toThrow(/the contract and --mpc are the same account/)
    expect(() => validateBirth(opts({ usdc: 'rc.satchelhq.testnet' }))).toThrow(/the contract and --usdc are the same account/)
    expect(() => validateBirth(opts({ mpc: 'wrap.testnet' }))).toThrow(/--mpc and wNEAR are the same account/)
    expect(() => validateBirth(opts({ mintTo: opts().usdc! }))).toThrow(/persona/)
    expect(validateBirth(opts({ usdc: null }))).toBe(sha256Hex(FAKE_WASM))
  })
  it('the USDC pre-check accepts only USDC with 6 decimals (review R3-D-1)', () => {
    expect(usdcMetadataProblem({ spec: 'ft-1.0.0', name: 'USDC', symbol: 'USDC', decimals: 6 })).toBeNull()
    expect(usdcMetadataProblem({ spec: 'ft-1.0.0', name: 'Wrapped NEAR fungible token', symbol: 'wNEAR', decimals: 24 })).toMatch(/symbol "wNEAR"/)
    expect(usdcMetadataProblem({ symbol: 'USDC', decimals: 18 })).toMatch(/decimals 18, expected 6/)
    expect(usdcMetadataProblem({ symbol: 'USDC' })).toMatch(/decimals undefined/)
    expect(usdcMetadataProblem(null)).toMatch(/unreadable/)
    expect(usdcMetadataProblem('USDC')).toMatch(/unreadable/)
  })
  it('shape assertion catches a tampered batch', () => {
    const { plan } = buildBirthPlan(opts())
    expect(() => assertBirthShape({ ...plan, actions: [...plan.actions, { type: 'AddKey' } as never] }, 7)).toThrow(/unexpected action list/)
    expect(() => assertBirthShape({ ...plan, actions: plan.actions.slice(0, -1) }, 7)).toThrow(/unexpected action list/)
    const swapped = plan.actions.slice()
    ;[swapped[3], swapped[4]] = [swapped[4]!, swapped[3]!]
    expect(() => assertBirthShape({ ...plan, actions: swapped }, 7)).toThrow(/new, then nft_mint/)
  })
  it('parent balance: deposits + 10× gas hold (RESULTS 3a: NotEnoughBalance otherwise)', () => {
    const { plan } = buildBirthPlan(opts())
    const r = requiredParentBalance(plan, 100_000_000n)
    expect(r.deposits).toBe(parseNear('10.14')) // rc: 10 NEAR Transfer + 7 × 0.02 NEAR mints
    expect(r.gasHold).toBe(170n * TGAS * 100_000_000n * 10n) // 0.17 NEAR
    expect(r.total).toBe(parseNear('10.31'))
  })
  it('prints the four judge proofs with the hash filled in', () => {
    const p = proofCommands('rc.satchelhq.testnet', 'HASH')
    expect(p).toHaveLength(4)
    expect(p[0]).toContain('"tx_hashes":["HASH"]')
    expect(p[1]).toContain('view-account-summary rc.satchelhq.testnet network-config testnet-fastnear now')
    expect(p[2]).toContain('"is_any_signer":true')
    expect(p[3]).toContain('"desc":false,"limit":1')
    expect(p.join(' ')).not.toMatch(/rpc[.]testnet[.]near[.]org/)
  })
  it('accepts the real contract artifact when it has been built', () => {
    const path = resolve(import.meta.dirname, '../../target/near/satchel/satchel.wasm')
    if (!existsSync(path)) return
    const wasm = new Uint8Array(readFileSync(path))
    const { plan, sha256 } = buildBirthPlan(opts({ wasm, expectedSha256: sha256Hex(wasm) }))
    expect(sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(plan.actions[2]!.type === 'DeployContract' && plan.actions[2]!.code.length).toBe(wasm.length)
  })
})

const REV = '843d35334f7fc7a88644fc39424bb137e7460094'
const DIGEST = 'sha256:c9655eaf7436b90c87ea8b25739f91063032c5c30ba24cfeafe72c142943b5bb'

describe('reproducible-build binding (D-01: rc and final are the CI wasm of the rc1 commit)', () => {
  it('reads the NEP-330 JSON out of the wasm bytes, skipping decoys', () => {
    expect(sourceMetadataFromWasm(FAKE_WASM)).toBeNull()
    const m = sourceMetadataFromWasm(wasmWith(`junk{"version":"x"}more{"version":"1.0.0","link":"a}b","standards":[],"build_info":null}tail`))
    expect(m).toEqual({ version: '1.0.0', link: 'a}b', standards: [], build_info: null })
    expect(sourceMetadataFromWasm(wasmWith(reproMeta()))?.build_info?.source_code_snapshot).toContain(`rev=${REV}`)
  })
  it('the placeholder (non-reproducible) wasm has build_info null and is refused for rc/final', () => {
    const local = resolve(import.meta.dirname, '../../target/near/satchel/satchel.wasm')
    const meta = existsSync(local) ? sourceMetadataFromWasm(new Uint8Array(readFileSync(local))) : { version: '1.0.0', standards: [], build_info: null }
    if (meta?.build_info) return // a reproducible artifact sits there: nothing to assert about the placeholder
    expect(buildInfoProblem(meta, { rev: REV })).toMatch(/build_info is null/)
  })
  it('accepts only the release rev and the pinned image digest', () => {
    const meta = sourceMetadataFromWasm(wasmWith(reproMeta()))
    expect(buildInfoProblem(meta, { rev: REV, imageDigest: DIGEST })).toBeNull()
    expect(buildInfoProblem(meta, { rev: REV.toUpperCase(), imageDigest: DIGEST })).toBeNull()
    expect(buildInfoProblem(meta, { rev: 'f'.repeat(40), imageDigest: DIGEST })).toMatch(/rev 843d3533.* != f{40}/)
    expect(buildInfoProblem(meta, { rev: REV, imageDigest: 'sha256:00' })).toMatch(/not the pinned image/)
    expect(buildInfoProblem(sourceMetadataFromWasm(wasmWith(reproMeta('843d353'))), { rev: REV })).toMatch(/no full commit rev/)
    expect(buildInfoProblem(null, { rev: REV })).toMatch(/no NEP-330/)
  })
  it('rc and final are release children; dev is not', () => {
    expect(isReleaseChild('rc.satchelhq.testnet', 'satchelhq.testnet')).toBe(true)
    expect(isReleaseChild('rc2.satchelhq.testnet', 'satchelhq.testnet')).toBe(true)
    expect(isReleaseChild('satchel.satchelhq.testnet', 'satchelhq.testnet')).toBe(true)
    expect(isReleaseChild('dev3.satchelhq.testnet', 'satchelhq.testnet')).toBe(false)
  })
})

describe('post-birth config check (verifyBirth and the Day 10 rc-twin pre-check)', () => {
  // the shape of dev2's live `config` view, trimmed
  const live = { version: '1.0.0', mpc_contract_id: 'v1.signer-prod.testnet', usdc_contract_id: opts().usdc, cooldown_blocks: 250, base_uri: 'https://usesatchel.xyz/api/card/', next_token_id: 8 }
  it('passes the contract exactly as born', () => {
    expect(configProblems(live, opts())).toEqual([])
  })
  it('names each field that differs from the init args, the cooldown or the minted count', () => {
    expect(configProblems({ ...live, base_uri: 'https://other.xyz/api/card/' }, opts())).toEqual(['base_uri "https://other.xyz/api/card/" != "https://usesatchel.xyz/api/card/"'])
    expect(configProblems({ ...live, usdc_contract_id: null }, opts())).toEqual([`usdc_contract_id null != "${opts().usdc}"`])
    expect(configProblems(live, opts({ usdc: null }))).toEqual([`usdc_contract_id "${opts().usdc}" != null`])
    expect(configProblems({ ...live, cooldown_blocks: 10 }, opts())).toEqual(['cooldown_blocks 10 != 250'])
    expect(configProblems({ ...live, next_token_id: 3 }, opts())).toEqual(['next_token_id 3 != 8'])
    expect(configProblems(null, opts())).toEqual(['config unreadable'])
  })
  it('the rc twin is compared without next_token_id (rc may have minted since)', () => {
    const { mints: _m, ...noMints } = opts()
    expect(configProblems({ ...live, next_token_id: 12 }, noMints)).toEqual([])
    expect(configProblems({ ...live, mpc_contract_id: 'v1.signer.testnet' }, noMints)).toHaveLength(1)
  })
})
