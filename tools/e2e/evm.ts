/**
 * EVM e2e (kb/90 §12.4): build a Sepolia type-2 transfer from Satchel #N's derived address, `sign_for` it on NEAR
 * (send_tx INCLUDED + long-poll), verify the MPC signature recovers to the Satchel address, broadcast, wait for the
 * receipt. `--fanout` (R-14) splits one balance across Satchel addresses, one sign_for per leg, sequential nonces.
 *
 *   pnpm --filter @satchel/tools e2e:evm                          # dry run, token 1 → itself, 0.0001 ETH
 *   pnpm --filter @satchel/tools e2e:evm --token 1 --to final#2 --value 0.001 --send
 *   pnpm --filter @satchel/tools e2e:evm --fanout --preset funding --sets final,rc   # dry run of the Day-5 fan-out
 */
import type { TransactionSerializableEIP1559 } from 'viem'
import {
  broadcastEvm,
  buildErc20TransferTx,
  buildUnsignedEvmTx,
  createEvmClient,
  createSepoliaClient,
  erc20BalanceOf,
  erc20TransferData,
  evmNetwork,
  evmPayloadHash,
  evmTxUrl,
  finalizeEvmTx,
  isSupportedEvmChain,
  sepoliaTxUrl,
  serializeUnsignedEvmTx,
  usdcOf,
  waitEvmReceipt,
  EVM_TRANSFER_GAS,
  estimateTransferGas,
  SEPOLIA_CHAIN_ID,
} from '@satchel/core/chains/evm'
import { evmSignRequest } from '@satchel/core/near'
import { toHex } from '@satchel/core/bytes'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { formatUnits, parseUnits } from '../lib/units'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, parseTargets, signaturesFrom, signForPlan } from './common'
import { evenLegs, fundingLegs, legsTotal, type FanoutLeg } from './funding'

const OPTIONS = {
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  to: { type: 'string' },
  value: { type: 'string', default: '0.0001' },
  nonce: { type: 'string' },
  'max-fee-gwei': { type: 'string', default: '30' },
  'tip-gwei': { type: 'string', default: '1.5' },
  gas: { type: 'string' },
  fanout: { type: 'boolean', default: false },
  targets: { type: 'string' },
  preset: { type: 'string' },
  sets: { type: 'string' },
  'amount-each': { type: 'string' },
  'no-wait': { type: 'boolean', default: false },
  'sign-only': { type: 'boolean', default: false },
  'chain-id': { type: 'string', default: String(SEPOLIA_CHAIN_ID) },
  usdc: { type: 'boolean', default: false },
  amount: { type: 'string' },
} as const

const HELP = `tools/e2e/evm.ts: an EVM testnet send (C3: any of the 4 Satchel testnets) from a Satchel via sign_for.
  --token <id>          source Satchel (default 1)       --owner <acct>   signer (default: on-chain owner, else alice)
  --to <0x…|set#id>     recipient (default: the Satchel's own address)   --value <ETH> (default 0.0001, native sends)
  --chain-id <id>       11155111 Sepolia (default) | 84532 Base Sepolia | 421614 Arbitrum Sepolia | 11155420 OP Sepolia
  --usdc                send USDC instead of native ETH (C2, prepareErc20Send): --amount <USDC base units> or default max
  --nonce <n>           reuse a nonce (retry rule §8.7)
  --max-fee-gwei / --tip-gwei   fees used only with --offline
  --gas <n>             gas limit per leg (default: eth_estimateGas per recipient; 21000 offline). A transfer that
                        creates the recipient costs 204,600 on Sepolia since its 2026 fork
  --fanout              split across targets: --targets "final#1-7 rc#1+2" --amount-each 0.01, or --preset funding [--sets final,rc,dev1]
  --no-wait             do not wait for each receipt
  --sign-only           sign_for + verify the recovered address, print the raw tx, do not broadcast (works unfunded)
${HELP_COMMON}`

interface Fees {
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

export function buildLegTx(nonce: number, to: `0x${string}`, value: bigint, fees: Fees, gas: bigint = EVM_TRANSFER_GAS, chainId: number = SEPOLIA_CHAIN_ID): { tx: TransactionSerializableEIP1559; unsigned: `0x${string}`; payload: string } {
  const tx = buildUnsignedEvmTx({ chainId, nonce, to, value, gas, ...fees })
  const unsigned = serializeUnsignedEvmTx(tx)
  return { tx, unsigned, payload: toHex(evmPayloadHash(unsigned)) }
}

/** C2: the same shape, but an ERC-20 `transfer(recipient, amount)` to the chain's USDC (value 0). */
export function buildUsdcLegTx(nonce: number, chainId: number, recipient: `0x${string}`, amount: bigint, fees: Fees, gas: bigint): { tx: TransactionSerializableEIP1559; unsigned: `0x${string}`; payload: string } {
  const tx = buildErc20TransferTx({ chainId, nonce, recipient, amount, gas, ...fees })
  const unsigned = serializeUnsignedEvmTx(tx)
  return { tx, unsigned, payload: toHex(evmPayloadHash(unsigned)) }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/evm')
  const token = str(v, 'token')!
  const from = addressesOf(ctx.cfg, token).evm as `0x${string}`
  const owner = str(v, 'owner') ? str(v, 'owner')! : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  const chainId = Number(str(v, 'chain-id'))
  if (!isSupportedEvmChain(chainId)) throw new Error(`ERR_EVM_CHAIN_ID: unsupported chain ${chainId} (C3: 11155111, 84532, 421614, 11155420)`)
  const net = evmNetwork(chainId)
  if (chainId !== SEPOLIA_CHAIN_ID) ctx.log(`    chain     ${net.name} (${chainId}); USDC ${usdcOf(chainId)}`)

  if (bool(v, 'usdc')) {
    if (bool(v, 'fanout')) throw new Error('--usdc and --fanout are mutually exclusive')
    return void (await sendUsdc(ctx, token, from, owner, chainId))
  }

  let legs: FanoutLeg[]
  if (bool(v, 'fanout')) {
    if (str(v, 'preset') === 'funding') legs = fundingLegs(ctx.cfg, 'evm', str(v, 'sets')?.split(','))
    else if (str(v, 'targets') && str(v, 'amount-each')) legs = evenLegs(parseTargets(ctx.cfg, str(v, 'targets')!, 'evm'), parseUnits(str(v, 'amount-each')!, 'eth'))
    else throw new Error('--fanout needs --preset funding or --targets … --amount-each …')
    legs = legs.filter((l) => l.address.toLowerCase() !== from.toLowerCase())
  } else {
    const to = str(v, 'to') ? parseTargets(ctx.cfg, str(v, 'to')!, 'evm')[0]! : { address: from, label: `self (#${token})` }
    legs = [{ ...to, amount: parseUnits(str(v, 'value')!, 'eth') }]
  }
  ctx.log(`    from      #${token} ${from} (path satchel/${token}/evm on ${ctx.cfg.contract}); signer ${owner}`)
  ctx.log(`    legs      ${legs.length}, total ${formatUnits(legsTotal(legs), 'eth')} ETH`)

  const client = ctx.offline ? null : createEvmClient(chainId, chainId === SEPOLIA_CHAIN_ID ? ctx.cfg.sepoliaRpcs : undefined)
  let nonce: number
  let fees: Fees
  let gases: bigint[] = legs.map(() => (str(v, 'gas') ? BigInt(str(v, 'gas')!) : EVM_TRANSFER_GAS))
  if (client) {
    if (!str(v, 'gas')) gases = await Promise.all(legs.map((l) => estimateTransferGas(client, { from, to: l.address as `0x${string}` })))
    const [n, f, bal] = await Promise.all([
      str(v, 'nonce') ? Promise.resolve(Number(str(v, 'nonce'))) : client.getTransactionCount({ address: from, blockTag: 'pending' }),
      client.estimateFeesPerGas(),
      client.getBalance({ address: from }),
    ])
    nonce = n
    fees = { maxFeePerGas: f.maxFeePerGas, maxPriorityFeePerGas: f.maxPriorityFeePerGas }
    const need = legsTotal(legs) + gases.reduce((a, g) => a + g, 0n) * fees.maxFeePerGas
    ctx.log(`    ${net.key}   balance ${formatUnits(bal, 'eth')} ETH, pending nonce ${n}, maxFee ${formatUnits(fees.maxFeePerGas, 'eth')} ETH/gas; worst-case need ${formatUnits(need, 'eth')} ETH${bal < need ? '  ← INSUFFICIENT' : ''}`)
    if (ctx.send && bal < need && !bool(v, 'sign-only')) throw new Error(`insufficient ${net.name} balance for all legs`)
  } else {
    nonce = Number(str(v, 'nonce') ?? '0')
    fees = { maxFeePerGas: parseUnits(str(v, 'max-fee-gwei')!, 'eth') / 10n ** 9n, maxPriorityFeePerGas: parseUnits(str(v, 'tip-gwei')!, 'eth') / 10n ** 9n }
    ctx.log(`    offline   nonce ${nonce} and fees are placeholders (--nonce, --max-fee-gwei, --tip-gwei)`)
  }

  for (const [i, leg] of legs.entries()) {
    const built = buildLegTx(nonce + i, leg.address as `0x${string}`, leg.amount, fees, gases[i]!, chainId)
    ctx.log(`\n-- leg ${i + 1}/${legs.length}: ${formatUnits(leg.amount, 'eth')} ETH → ${leg.label} ${leg.address} (gas limit ${gases[i]})`)
    ctx.log(`    unsigned  ${built.unsigned}\n    keccak    ${built.payload}`)
    const request = evmSignRequest(built.unsigned)
    describeSignRequest(token, request).forEach((l) => ctx.log(l))
    const sent = await executePlan(ctx, signForPlan(ctx.cfg, owner, token, request, `sign_for #${token} EVM (${net.key}) nonce ${nonce + i} → ${leg.label}`))
    if (!sent) continue
    await finishLeg(ctx, client, chainId, built.tx, signaturesFrom(sent, 1)[0]!, from, bool(v, 'no-wait'), bool(v, 'sign-only'))
  }
}

/** C2 + C3: a USDC transfer on `chainId` (`--sign-only` works unfunded: the MPC signs any preimage the contract accepts). */
async function sendUsdc(ctx: Ctx, token: string, from: `0x${string}`, owner: string, chainId: number): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  const net = evmNetwork(chainId)
  const to = str(v, 'to') ? (parseTargets(ctx.cfg, str(v, 'to')!, 'evm')[0]!.address as `0x${string}`) : from
  const client = ctx.offline ? null : createEvmClient(chainId, chainId === SEPOLIA_CHAIN_ID ? ctx.cfg.sepoliaRpcs : undefined)
  let nonce: number
  let fees: Fees
  let amount: bigint
  let gas: bigint
  let ethBalance: bigint | null = null
  let usdcBalance: bigint | null = null
  if (client) {
    const [n, f, eb, ub] = await Promise.all([
      str(v, 'nonce') ? Promise.resolve(Number(str(v, 'nonce'))) : client.getTransactionCount({ address: from, blockTag: 'pending' }),
      client.estimateFeesPerGas(),
      client.getBalance({ address: from }),
      erc20BalanceOf(client, usdcOf(chainId), from).catch(() => 0n),
    ])
    nonce = n
    fees = { maxFeePerGas: f.maxFeePerGas, maxPriorityFeePerGas: f.maxPriorityFeePerGas }
    ethBalance = eb
    usdcBalance = ub
    amount = str(v, 'amount') ? parseUnits(str(v, 'amount')!, 'usdc') : ub
    gas = str(v, 'gas') ? BigInt(str(v, 'gas')!) : await estimateTransferGas(client, { from, to: usdcOf(chainId), data: erc20TransferData(to, amount) })
    ctx.log(`    ${net.key}   ETH ${formatUnits(eb, 'eth')}, USDC ${formatUnits(ub, 'usdc')}, pending nonce ${n}`)
    if (ctx.send && !bool(v, 'sign-only') && (ub < amount || eb < gas * fees.maxFeePerGas)) throw new Error(`insufficient funds on ${net.name} (USDC ${ub}, ETH ${eb})`)
  } else {
    nonce = Number(str(v, 'nonce') ?? '0')
    fees = { maxFeePerGas: parseUnits(str(v, 'max-fee-gwei')!, 'eth') / 10n ** 9n, maxPriorityFeePerGas: parseUnits(str(v, 'tip-gwei')!, 'eth') / 10n ** 9n }
    amount = str(v, 'amount') ? parseUnits(str(v, 'amount')!, 'usdc') : parseUnits('1', 'usdc')
    gas = str(v, 'gas') ? BigInt(str(v, 'gas')!) : 300_000n
    ctx.log(`    offline   nonce ${nonce}, amount, fees and gas are placeholders`)
  }
  ctx.log(`    from      #${token} ${from} USDC ${usdcOf(chainId)} on ${net.name}; signer ${owner}`)
  ctx.log(`    leg       ${formatUnits(amount, 'usdc')} USDC → ${to} (gas limit ${gas})`)
  const built = buildUsdcLegTx(nonce, chainId, to, amount, fees, gas)
  ctx.log(`    unsigned  ${built.unsigned}\n    keccak    ${built.payload}`)
  const request = evmSignRequest(built.unsigned)
  describeSignRequest(token, request).forEach((l) => ctx.log(l))
  const sent = await executePlan(ctx, signForPlan(ctx.cfg, owner, token, request, `sign_for #${token} EVM USDC (${net.key}) nonce ${nonce} → ${to}`))
  if (!sent) return
  await finishLeg(ctx, client, chainId, built.tx, signaturesFrom(sent, 1)[0]!, from, false, bool(v, 'sign-only'))
}

async function finishLeg(ctx: Ctx, client: ReturnType<typeof createSepoliaClient> | null, chainId: number, tx: TransactionSerializableEIP1559, sig: Parameters<typeof finalizeEvmTx>[1], from: string, noWait: boolean, signOnly = false) {
  const fin = await finalizeEvmTx(tx, sig, from) // verify-before-broadcast
  expect(ctx, fin.from.toLowerCase() === from.toLowerCase(), `signature recovers to the Satchel address ${from}`)
  if (signOnly || !client) return void ctx.log(`    signed    ${fin.signed}\n    note      --sign-only: not broadcast (the record stays unused until this nonce is spent)`)
  const b = await broadcastEvm(client, fin.signed)
  ctx.log(`    broadcast ${chainId === SEPOLIA_CHAIN_ID ? sepoliaTxUrl(b.hash) : evmTxUrl(chainId, b.hash)}${b.alreadyKnown ? ' (already known)' : ''}`)
  if (noWait) return
  const r = await waitEvmReceipt(client, b.hash, { confirmations: 1 })
  expect(ctx, r.status === 'success', `receipt status success (block ${r.blockNumber})`)
}

if (isMain(import.meta.url)) runMain(main)
