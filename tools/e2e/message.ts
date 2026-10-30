/**
 * Message-signing e2e (C7, docs/specs/C1-C2-C3-C7.md §3.3): `sign_for` an `evm_message` (EIP-191 personal_sign) or a
 * `sol_message` (Solana off-chain message v0), then verify the returned signature locally against the Satchel's
 * EVM or SOL address, exactly as a buyer's clean-history checker would (never-blocking `message` status, §7.2).
 * Verification reads the fresh `sig_records` row (never the raw MPC return shape), and checks INV-08
 * (payload == hash(wrapped bytes)) before checking the signature itself.
 *
 *   pnpm --filter @satchel/tools e2e:message --chain evm --token 1                     # dry run
 *   pnpm --filter @satchel/tools e2e:message --chain sol --token 1 --text "hello" --send
 */
import { sha256 } from '@noble/hashes/sha2.js'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { evmMessageSignRequest, solMessageSignRequest } from '@satchel/core/near'
import { verifyEvmMessageSignature } from '@satchel/core/chains/evm'
import { verifySolOffchainSignature } from '@satchel/core/chains/sol'
import { eip191Bytes, solOffchainMessageBytes } from '@satchel/core/policy'
import { toHex, utf8 } from '@satchel/core/bytes'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str } from '../lib/run'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, signaturesFrom, signForPlan } from './common'

const OPTIONS = {
  chain: { type: 'string', default: 'evm' },
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  text: { type: 'string', default: 'Signed in to Satchel' },
} as const

const HELP = `tools/e2e/message.ts: sign_for an evm_message or sol_message (C7), verify the signature locally.
  --chain evm|sol (default evm)   --token <id> (default 1)   --owner <acct> (default: on-chain owner, else alice)
  --text <string>  the message body (default "Signed in to Satchel")
${HELP_COMMON}`

interface EvmSigView {
  r: string
  s: string
  recovery_id: number
}
interface SolSigView {
  signature: string
}
interface SigRecordRow {
  seq: number
  payload: string
  signature: EvmSigView | SolSigView | null
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/message')
  const chain = str(v, 'chain')
  if (chain !== 'evm' && chain !== 'sol') throw new Error('--chain must be evm or sol')
  const token = str(v, 'token')!
  const text = str(v, 'text')!
  const owner = str(v, 'owner') ? str(v, 'owner')! : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  const a = addressesOf(ctx.cfg, token)
  const address = chain === 'evm' ? a.evm : a.sol

  const request = chain === 'evm' ? evmMessageSignRequest(text) : solMessageSignRequest(text)
  const wrapped = chain === 'evm' ? eip191Bytes(utf8(text)) : solOffchainMessageBytes(utf8(text))
  const payloadBytes = chain === 'evm' ? keccak_256(wrapped) : sha256(wrapped)
  ctx.log(`    signer    #${token} ${address} (chain ${chain}); owner ${owner}`)
  ctx.log(`    message   ${JSON.stringify(text)} (${utf8(text).length} bytes)`)
  ctx.log(`    wrapped   ${toHex(wrapped)} (${wrapped.length} bytes, the exact bytes the key signs)`)
  ctx.log(`    payload   ${toHex(payloadBytes)} (${chain === 'evm' ? 'keccak256' : 'sha256'} — the record payload)`)
  describeSignRequest(token, request).forEach((l) => ctx.log(l))

  const sent = await executePlan(ctx, signForPlan(ctx.cfg, owner, token, request, `sign_for #${token} ${chain}_message`))
  if (!sent) return
  signaturesFrom(sent, 1) // throws loudly if on_signed didn't return a signature; the real check reads the record below

  const satchel = await ctx.rpc.view<{ sig_count: number }>(ctx.cfg.contract, 'satchel', { token_id: token })
  const rows = await ctx.rpc.view<SigRecordRow[]>(ctx.cfg.contract, 'sig_records', { token_id: token, from_seq: satchel.sig_count - 1, limit: 1 })
  const row = rows[0]
  if (!row) throw new Error('could not re-read the fresh sig_records row')
  ctx.log(`    record    seq ${row.seq}, payload ${row.payload}`)
  expect(ctx, row.payload === toHex(payloadBytes), 'the record payload matches the locally computed hash (INV-08)')
  if (!row.signature) return void ctx.log('    note      no signature yet on the record (the MPC call may have timed out, §8.7); see sign_resolved')

  if (chain === 'evm') {
    const ok = await verifyEvmMessageSignature(text, row.signature as EvmSigView, address)
    expect(ctx, ok, `EIP-191 personal_sign recovery matches the Satchel's EVM address ${address}`)
  } else {
    const ok = verifySolOffchainSignature(text, (row.signature as SolSigView).signature, address)
    expect(ctx, ok, `Solana off-chain-message ed25519 verify matches the Satchel's SOL address ${address}`)
  }
}

if (isMain(import.meta.url)) runMain(main)
