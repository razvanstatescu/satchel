/**
 * vectors/derive.json (SAT-204): MPC key derivation vectors. Every address is asserted against a recorded oracle:
 * kb/11 §Derivation cross-check (chainsig.js = live view = @noble), kb/10 §Key derivation, kb/30 §2, kb/32, and
 * research/final-addresses.md (live derived_public_key cross-check, 2026-10-21) for the satchelhq accounts.
 */
import { toHex } from '@satchel/core/bytes'
import {
  DOMAIN_ID,
  MPC_ROOT_KEYS,
  deriveEd25519,
  deriveSecp256k1,
  derivationTweak,
  btcP2wpkhAddress,
  evmAddress,
  nearKeyString,
  solAddress,
  type ChainSlug,
} from '@satchel/core/derive'
import { assert } from './lib'

type Row = [predecessor: string, path: string, address: string, source: string]

const KB: Row[] = [
  ['satchel.example.testnet', 'satchel/1/evm', '0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A', 'kb/11'],
  ['satchel.example.testnet', 'satchel/1/btc', 'tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd', 'kb/11'],
  ['satchel.example.testnet', 'satchel/1/sol', 'DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB', 'kb/11'],
  ['satchel.example.testnet', 'satchel/42/evm', '0x3C443ac72C2Ebe80b48AA6101ccF3c1E8b0aB6d1', 'kb/11'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/evm', '0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d', 'kb/11, kb/31'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/btc', 'tb1q00qngh4vre45nwpaa9eljwuxy0zpljeg7jefsc', 'kb/11'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/sol', '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA', 'kb/11, kb/32'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/2/sol', '8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r', 'kb/32'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/42/evm', '0x61739f33AdbB7F76c1b5B222E4119085257528BE', 'kb/11'],
  ['satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc', 'tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7', 'kb/30 §2'],
  ['satchel-spk-btc-e9ea1a.testnet', 'satchel/2/btc', 'tb1qakdsc8u04sr8ujluyjfczud9mvx8ulx06ddkl7', 'kb/30 §2'],
  ['fanout.satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc', 'tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a', 'kb/30 §Contract fan-out'],
  ['spike.satchel-spk-mpc-e9ea1a.testnet', 'satchel/1/evm', '0x6fafd4339ab28eb793b01c52a0f4d69123586e00', 'kb/10'],
]

// research/final-addresses.md (team satchelhq, live-checked against derived_public_key): [set, id, btc, evm, sol]
const FINAL: [string, string, string, string, string][] = [
  ['satchel', '1', 'tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5', '0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad', 'AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd'],
  ['satchel', '2', 'tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u', '0xe7597038ce1030599fae70f4d6a9d1f9ea9dc76a', '5Gn16DW98FYQj1soZqNiUiqSsT3qcQiUTBEFuDgH1HSf'],
  ['satchel', '3', 'tb1qylyljhhghv7xpqa5vw5e8v5dgjrsg6s6a3dngd', '0x456d0c7e3f16b64385c9241fde45098aef2e997d', 'AM6HVA7mygEZSPe6BswPcnE8RM2TpHNHHiH3iZa1citj'],
  ['satchel', '4', 'tb1qujvrkz47vga3razn2fpegp9gfqfcnwcvf6cl7f', '0x8ccee6e631a0ba4197468c641b0348c01f1dbab0', 'FX8L3eZk5xjDXENUHsJ8YBMpvvZ5ajd6sXcE7uwTniHN'],
  ['satchel', '5', 'tb1q70288g5fzuzdnawruykutg0ts9vrcfpaecfj55', '0x630c522694cd9863a2770716d005a490d022f624', 'C57DF5rkbw4ucCuDZUfG7suxXsrL5chtAsCsQrjeGhHb'],
  ['satchel', '6', 'tb1qntk56m402m03dsgm5wlg26lc5kr67g92wee7zv', '0xdfb5013a1e7189dd26533b2fc80d536ae6748333', 'FJcx3pryuz6xKniMsYbGGtt37jVg4vVUzTppnwgJjJj5'],
  ['satchel', '7', 'tb1qpvhr4f9dc6s84kqhx9dnqxef6ccmgxs6fl6l2t', '0xec517d0c2c84fc30bb8f9b3ae9223c4f42e5640f', 'JCt19yBHQGcxccjTPunnQzA6Tax37hCAJUfKZrkgnwmc'],
  ['rc', '1', 'tb1q5y8ttdym4snraa9ujay3stza7avyf9ltf40f5x', '0x421ee6970e238e6fb0c08aa26e12bce686b1b7d7', '9bGAhsR4fqJC2P52mzQJXNC1QfvN23e8LEgyHaWR6NoS'],
  ['rc', '2', 'tb1qlu9qfrl357n6e7mnamw8j0v5ftcgcyqd7vmfak', '0x2f5b7846dcd708aa1d6f27224bb7a4f56f3a1ce5', 'FU3kh2sxcRLSYc9g3ViHaNe8wFCzNcNEef78VQcAM54r'],
  ['dev1', '1', 'tb1qcg94krv9g58qrtslkqlvyrv86el7w3p4ml5urc', '0x355180f2d253833dfb736b05561588d7d4bc7db3', '6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu'],
  ['dev1', '2', 'tb1qprcmru94v8kg0qqxdv6hradw4z29zk2wshs0vq', '0xfcc7917829b63cf0b7efb724d55fa9dedc5943d1', 'HNeHp8XJ7EGQBvhwAPNoRXprDYEWPvTrUvdwVEmCL64b'],
  ['dev1', '3', 'tb1qa3jnf4qlft24sam2slnmt3uas5c95mv7ual4ek', '0x0d9fe39915e2b026ca9e3ab268ff8745f87522d6', '491k3NitncmVHHh3gqDHtJLuw4Bh4Ns54YEuUAwkNrSG'],
]

function entry(name: string, predecessor: string, path: string, expected: string, source: string) {
  const chain = path.split('/')[2] as ChainSlug
  let address: string
  let publicKey: string
  let nearKey: string
  if (chain === 'sol') {
    const k = deriveEd25519('testnet', predecessor, path)
    address = solAddress('testnet', predecessor, path)
    publicKey = toHex(k)
    nearKey = nearKeyString('ed25519', k)
  } else {
    const k = deriveSecp256k1('testnet', predecessor, path)
    address = chain === 'evm' ? evmAddress('testnet', predecessor, path) : btcP2wpkhAddress('testnet', predecessor, path)
    publicKey = toHex(k.compressed)
    nearKey = nearKeyString('secp256k1', k.uncompressed)
  }
  const norm = (a: string) => (chain === 'sol' ? a : a.toLowerCase())
  assert(norm(address) === norm(expected), `${name}: derived ${address}, oracle ${expected}`)
  return {
    name,
    network: 'testnet',
    predecessor,
    path,
    chain,
    domain_id: DOMAIN_ID[chain],
    tweak: toHex(derivationTweak(predecessor, path)),
    public_key: publicKey,
    near_public_key: nearKey,
    address,
    source,
  }
}

export function deriveVectors() {
  const vectors = KB.map(([p, path, a, s], i) => entry(`kb_${i + 1}_${path.replace(/\//g, '_')}`, p, path, a, s))
  for (const [set, id, btc, evm, sol] of FINAL) {
    const pred = `${set}.satchelhq.testnet`
    vectors.push(entry(`${set}_${id}_btc`, pred, `satchel/${id}/btc`, btc, 'research/final-addresses.md (live-checked)'))
    vectors.push(entry(`${set}_${id}_evm`, pred, `satchel/${id}/evm`, evm, 'research/final-addresses.md (live-checked)'))
    vectors.push(entry(`${set}_${id}_sol`, pred, `satchel/${id}/sol`, sol, 'research/final-addresses.md (live-checked)'))
  }
  return {
    schema: 'satchel-derive-vectors/1',
    generator: 'tools/vectors/gen.ts',
    kdf: 'tweak = sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path); secp256k1 = root + BE(tweak)·G; ed25519 = root + (LE(tweak) mod l)·B',
    mpc_contract: 'v1.signer-prod.testnet',
    roots: MPC_ROOT_KEYS.testnet,
    public_key_encoding: 'secp256k1: 33-byte compressed hex; ed25519: 32-byte hex',
    vectors,
  }
}
