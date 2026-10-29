// THROWAWAY SPIKE (chains agent). Question: does a REAL MPC secp256k1 signature over a chainsig.js-prepared
// EIP-1559 Sepolia tx recover to the derived address, and what does the node say on broadcast?
// Run: npx tsx evm_sign.ts [toAddress] [valueWei] [gasTgas]
import { chainAdapters, contracts, utils } from 'chainsig.js'
import {
  createPublicClient, fallback, http, keccak256, serializeTransaction, parseTransaction,
  recoverTransactionAddress, formatEther, type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'
import { ACCOUNT_ID, MPC, mpcSign } from './near.ts'

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http('https://ethereum-sepolia-rpc.publicnode.com'),
    http('https://sepolia.drpc.org'),
    http('https://gateway.tenderly.co/public/sepolia'),
    http('https://1rpc.io/sepolia'),
  ], { rank: false, retryCount: 1 }),
})

async function main() {
  const PATH = 'satchel/1/evm'
  const to = (process.argv[2] ?? '0x61739f33AdbB7F76c1b5B222E4119085257528BE') as Hex // = (ACCOUNT_ID, satchel/42/evm)
  const value = BigInt(process.argv[3] ?? '100000000000000') // 0.0001 ETH
  const gasTgas = Number(process.argv[4] ?? '50')

  const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: MPC })
  const evm = new chainAdapters.evm.EVM({ publicClient: sepoliaClient as any, contract })
  const { address: from } = await evm.deriveAddressAndPublicKey(ACCOUNT_ID, PATH)
  const balance = await sepoliaClient.getBalance({ address: from as Hex })
  const nonce = await sepoliaClient.getTransactionCount({ address: from as Hex })
  const fees = await sepoliaClient.estimateFeesPerGas()
  console.log(JSON.stringify({ step: 'state', from, to, balanceWei: balance.toString(), balanceEth: formatEther(balance), nonce, fees: { maxFeePerGas: fees.maxFeePerGas?.toString(), maxPriorityFeePerGas: fees.maxPriorityFeePerGas?.toString() } }))

  // chainsig.js prepare (gas given → skips estimateGas, which fails for unfunded senders)
  const { transaction, hashesToSign } = await evm.prepareTransactionForSigning({ from: from as Hex, to, value, gas: 21000n })
  const ourHash = keccak256(serializeTransaction(transaction as any))
  const payloadHex = Buffer.from(hashesToSign[0] as number[]).toString('hex')
  console.log(JSON.stringify({ step: 'prepared', transaction: { ...transaction, value: transaction.value?.toString(), gas: transaction.gas?.toString(), maxFeePerGas: transaction.maxFeePerGas?.toString(), maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString() }, hashToSign: '0x' + payloadHex, independentHash: ourHash, hashMatch: ourHash === '0x' + payloadHex }))

  // REAL MPC call, predecessor = ACCOUNT_ID (in Satchel this would be the satchel contract via sign_for)
  const r = await mpcSign({ payload_v2: { Ecdsa: payloadHex }, path: PATH, domain_id: 0 }, gasTgas)
  console.log(JSON.stringify({ step: 'mpc', txHash: r.txHash, explorer: `https://testnet.nearblocks.io/txns/${r.txHash}`, ms: r.ms, gasTgasAttached: gasTgas, gasBurntTgas: Number(r.gasBurntTotal) / 1e12, tokensBurntNear: Number(r.tokensBurntTotal) / 1e24, receipts: r.receipts, response: r.response }))

  // Convert MPC response → RSV with chainsig.js util, then finalize
  const rsv = utils.cryptography.toRSV(r.response)
  const signed = evm.finalizeTransactionSigning({ transaction, rsvSignatures: [rsv] })
  const parsed = parseTransaction(signed)
  const recovered = await recoverTransactionAddress({ serializedTransaction: signed as any })
  const sBig = BigInt('0x' + rsv.s)
  const bigRPrefix = r.response.big_r.affine_point.slice(0, 2)
  console.log(JSON.stringify({
    step: 'finalized', rsv, yParity: parsed.yParity, recovery_id: r.response.recovery_id,
    big_r_prefix: bigRPrefix, big_r_prefix_parity: bigRPrefix === '03' ? 1 : 0,
    lowS: sBig <= N / 2n, recovered, derived: from, recoveredMatches: recovered.toLowerCase() === from.toLowerCase(),
    signedTx: signed, signedTxHash: keccak256(signed),
  }))

  // Broadcast directly with viem to keep the node's error message (chainsig's broadcastTx swallows it)
  try {
    const h = await sepoliaClient.sendRawTransaction({ serializedTransaction: signed })
    console.log(JSON.stringify({ step: 'broadcast', ok: true, hash: h, explorer: `https://sepolia.etherscan.io/tx/${h}` }))
  } catch (e: any) {
    console.log(JSON.stringify({ step: 'broadcast', ok: false, shortMessage: e.shortMessage, details: e.details, name: e.name }))
  }
  // And via chainsig.js to document its error behaviour
  try {
    const { hash } = await evm.broadcastTx(signed)
    console.log(JSON.stringify({ step: 'broadcast-chainsig', ok: true, hash }))
  } catch (e: any) {
    console.log(JSON.stringify({ step: 'broadcast-chainsig', ok: false, message: e.message }))
  }
}
main().catch((e) => { console.error('FATAL', e?.message ?? e, e?.txHash ?? ''); process.exit(1) })
