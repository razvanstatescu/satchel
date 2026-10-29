// THROWAWAY SPIKE (chains agent). Question: does a REAL MPC Ed25519 signature (payload_v2.Eddsa = full
// Solana message bytes, domain_id 1) over a chainsig.js-prepared devnet transfer verify and get accepted?
// Run: npx tsx sol_sign.ts [toAddress] [lamports] [gasTgas]
import { chainAdapters, contracts } from 'chainsig.js'
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import bs58 from 'bs58'
import { ACCOUNT_ID, MPC, mpcSign } from './near.ts'

const RPC = process.env.SOL_RPC ?? 'https://api.devnet.solana.com'

async function main() {
  const PATH = 'satchel/1/sol'
  const lamports = BigInt(process.argv[3] ?? '1000000') // 0.001 SOL
  const gasTgas = Number(process.argv[4] ?? '50')
  const connection = new Connection(RPC, 'confirmed')
  const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: MPC })
  const sol = new chainAdapters.solana.Solana({ solanaConnection: connection, contract })
  const { address: from } = await sol.deriveAddressAndPublicKey(ACCOUNT_ID, PATH)
  const { address: defaultTo } = await sol.deriveAddressAndPublicKey(ACCOUNT_ID, 'satchel/2/sol')
  const to = process.argv[2] ?? defaultTo
  const [bal, rentMin0, toInfo] = await Promise.all([
    connection.getBalance(new PublicKey(from)),
    connection.getMinimumBalanceForRentExemption(0),
    connection.getAccountInfo(new PublicKey(to)),
  ])
  console.log(JSON.stringify({ step: 'state', rpc: RPC, from, to, fromBalanceSol: bal / LAMPORTS_PER_SOL, toExists: !!toInfo, rentExemptMin0DataLamports: rentMin0, lamports: lamports.toString() }))

  const tPrep = performance.now()
  const { transaction, hashesToSign } = await sol.prepareTransactionForSigning({ from, to, amount: lamports })
  const message = Uint8Array.from(hashesToSign[0] as number[])
  const sameAsSerializeMessage = Buffer.from(transaction.transaction.serializeMessage()).equals(Buffer.from(message))
  const blockHeightAtPrep = await connection.getBlockHeight('confirmed')
  // chainsig does not expose lastValidBlockHeight; look it up for the same blockhash
  const { lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  console.log(JSON.stringify({ step: 'prepared', recentBlockhash: transaction.recentBlockhash, messageLen: message.length, messageHexPrefix: Buffer.from(message).toString('hex').slice(0, 40), sameAsSerializeMessage, version: 'legacy', blockHeightAtPrep, approxLastValidBlockHeight: lastValidBlockHeight }))

  const r = await mpcSign({ payload_v2: { Eddsa: Buffer.from(message).toString('hex') }, path: PATH, domain_id: 1 }, gasTgas)
  const sig = Uint8Array.from(r.response.signature)
  const verifies = ed25519.verify(sig, message, bs58.decode(from))
  console.log(JSON.stringify({ step: 'mpc', txHash: r.txHash, explorer: `https://testnet.nearblocks.io/txns/${r.txHash}`, ms: r.ms, gasTgasAttached: gasTgas, gasBurntTgas: Number(r.gasBurntTotal) / 1e12, tokensBurntNear: Number(r.tokensBurntTotal) / 1e24, responseScheme: r.response.scheme, sigLen: sig.length, sigBase58: bs58.encode(sig), verifiesAgainstDerivedKey: verifies }))

  // Negative control: tamper one byte -> must fail sigverify at the node
  const bad = Uint8Array.from(sig); bad[0] ^= 0xff
  const txBad = Transaction.from(Buffer.from(sol.serializeTransaction(transaction), 'base64'))
  txBad.addSignature(new PublicKey(from), Buffer.from(bad))
  try { await connection.sendRawTransaction(txBad.serialize({ requireAllSignatures: false, verifySignatures: false })); console.log(JSON.stringify({ step: 'negative-control', unexpected: 'accepted' })) }
  catch (e: any) { console.log(JSON.stringify({ step: 'negative-control (tampered sig)', error: e.message?.slice(0, 300) })) }

  const signedB64 = sol.finalizeTransactionSigning({ transaction: transaction.transaction, rsvSignatures: r.response, senderAddress: from })
  const heightAtSend = await connection.getBlockHeight('confirmed')
  try {
    const t0 = performance.now()
    const txSig = await connection.sendRawTransaction(Buffer.from(signedB64, 'base64'))
    const conf = await connection.confirmTransaction({ signature: txSig, blockhash: transaction.recentBlockhash, lastValidBlockHeight }, 'confirmed')
    console.log(JSON.stringify({ step: 'broadcast', ok: !conf.value.err, txSig, err: conf.value.err, confirmMs: Math.round(performance.now() - t0), heightAtSend, blocksLeft: lastValidBlockHeight - heightAtSend, prepToSendMs: Math.round(performance.now() - tPrep), explorer: `https://explorer.solana.com/tx/${txSig}?cluster=devnet` }))
  } catch (e: any) {
    console.log(JSON.stringify({ step: 'broadcast', ok: false, error: e.message?.slice(0, 400), logs: e.logs, heightAtSend, blocksLeft: lastValidBlockHeight - heightAtSend, prepToSendMs: Math.round(performance.now() - tPrep) }))
  }
}
main().catch((e) => { console.error('FATAL', e?.message ?? e, e?.txHash ?? ''); process.exit(1) })
