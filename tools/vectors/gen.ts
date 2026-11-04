/**
 * Generates the shared Rust/TS vectors (kb/90 §12.2): vectors/{evm,btc,sol,msg}.json, plus history.json, derive.json
 * and allowance.json (each in its own shape).
 *
 *   pnpm --filter @satchel/tools vectors          # write
 *   pnpm --filter @satchel/tools vectors:check    # fail if the committed files differ (CI)
 *
 * Every vector's expected outcome is declared by hand from the spec rule and cross-checked against the TS reference
 * classifier (@satchel/core/policy); accepted BTC vectors are also checked against bitcoinjs-lib `hashForWitnessV0`.
 * Deterministic: no clock, no randomness, no network.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkUnique, type Vector, type VectorFile, type VectorSet } from './lib'
import { evmVectors } from './evm'
import { btcVectors } from './btc'
import { solVectors } from './sol'
import { msgVectors } from './msg'
import { historyVectors } from './history'
import { deriveVectors } from './derive'
import { allowanceVectors } from './allowance'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vectors')
const check = process.argv.includes('--check')

function file(set: VectorSet, vectors: Vector[]): VectorFile {
  checkUnique(vectors)
  return { schema: 'satchel-vectors/1', set, generator: 'tools/vectors/gen.ts', vectors }
}

const outputs: [string, unknown][] = [
  ['evm.json', file('evm', evmVectors())],
  ['btc.json', file('btc', btcVectors())],
  ['sol.json', file('sol', solVectors())],
  ['msg.json', file('msg', msgVectors())],
  ['history.json', historyVectors()],
  ['derive.json', deriveVectors()],
  ['allowance.json', allowanceVectors()],
]

mkdirSync(OUT, { recursive: true })
let stale = 0
for (const [name, data] of outputs) {
  const text = `${JSON.stringify(data, null, 2)}\n`
  const path = join(OUT, name)
  if (check) {
    let cur = ''
    try {
      cur = readFileSync(path, 'utf8')
    } catch {
      /* missing */
    }
    if (cur !== text) {
      console.error(`STALE ${path}`)
      stale++
    } else console.log(`ok    ${path}`)
  } else {
    writeFileSync(path, text)
    if (name === 'allowance.json') {
      const a = data as ReturnType<typeof allowanceVectors>
      console.log(`wrote ${path}: ${a.debits.length} debits, ${a.evm_raw.length} evm_raw, ${a.window.length} window vectors`)
      continue
    }
    const n = (data as { vectors: unknown[] }).vectors.length
    const vs = (data as { vectors: Vector[] }).vectors
    const ok = Array.isArray(vs) && typeof vs[0]?.expect?.ok === 'boolean' ? vs.filter((v) => v.expect.ok).length : n
    console.log(`wrote ${path}: ${n} vectors (${ok} accepted, ${n - ok} refused)`)
  }
}
if (stale) {
  console.error(`${stale} vector file(s) out of date: run pnpm --filter @satchel/tools vectors`)
  process.exit(1)
}
