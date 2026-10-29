// THROWAWAY spike 09: (a) which recipient address types bitcoinjs-lib v7 accepts WITHOUT initEccLib;
// (b) does initEccLib work with @bitcoinerlab/secp256k1 (pure JS) and tiny-secp256k1 (wasm) in Node;
// (c) per-type output script lengths -> Bitcoin Core dust thresholds.
import * as bitcoin from 'bitcoinjs-lib'

const NET = bitcoin.networks.testnet
const addrs = {
  p2wpkh: 'tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7',
  p2tr: 'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c', // BIP-350 testnet test vector (valid x-only key)
  p2pkh: 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn',
  p2sh: '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc',
  mainnet_bc1q: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  garbage: 'tb1qnotanaddress',
}
const dustFor = (scriptLen, witness) => ((8 + 1 + scriptLen) + (witness ? 67 : 148)) * 3
function tryAll(label) {
  const res = {}
  for (const [k, a] of Object.entries(addrs)) {
    try {
      const s = bitcoin.address.toOutputScript(a, NET)
      const witness = s[0] === 0x00 || (s[0] >= 0x51 && s[0] <= 0x60)
      res[k] = { ok: true, scriptLen: s.length, dust: dustFor(s.length, witness) }
    } catch (e) { res[k] = { ok: false, err: e.message.slice(0, 80) } }
  }
  console.log(label, JSON.stringify(res, null, 1))
}
tryAll('WITHOUT initEccLib:')
const noble = await import('@bitcoinerlab/secp256k1')
bitcoin.initEccLib(noble.default ?? noble)
tryAll('WITH initEccLib(@bitcoinerlab/secp256k1):')
try {
  const tiny = await import('tiny-secp256k1')
  bitcoin.initEccLib(tiny)
  console.log('tiny-secp256k1 (wasm) initEccLib in Node: ok; isPoint(G)=', tiny.isPoint(Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'hex')))
} catch (e) { console.log('tiny-secp256k1 failed:', e.message) }
