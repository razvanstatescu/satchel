/**
 * Writes the Rust-vs-TS differential corpus: one JSONL file per chain, each line {r: SignRequest, v: TS verdict,
 * h?: record hashes, f?: key fields}. The Rust side replays it in contracts/satchel/src/parse/fuzz_tests.rs
 * (`differential_vs_ts_reference`). Method and findings: docs/security/fuzzing.md.
 *
 *   pnpm --filter @satchel/tools fuzz:corpus --n 1500 --n-btc 600                     # seed corpus → tools/fuzz/corpus (committed)
 *   pnpm --filter @satchel/tools fuzz:corpus --n 100000 --out ../target/fuzz-corpus   # deep corpus (not committed)
 *
 * Options: --n <cases per chain> (default 1000) · --n-evm/--n-btc/--n-sol/--n-msg <override> · --seed <u32> (default 1) · --out <dir>
 *          · --chains evm,btc,sol,msg (msg = the C7 evm_message / sol_message kinds)
 */
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { corpus, loadSeeds, type Chain } from '../../packages/core/test/fuzz/gen'

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1]! : d
}
const here = dirname(fileURLToPath(import.meta.url))
const nAll = Number(arg('n', '1000'))
const seed = Number(arg('seed', '1'))
const out = resolve(arg('out', join(here, 'corpus')))
const chains = arg('chains', 'evm,btc,sol,msg').split(',') as Chain[]

mkdirSync(out, { recursive: true })
const seeds = loadSeeds()
const manifest: Record<string, unknown> = { generator: 'tools/fuzz/gen-corpus.ts', seed, chains: {} }
for (const chain of chains) {
  const t0 = Date.now()
  const n = Number(arg(`n-${chain}`, String(nAll)))
  const path = join(out, `${chain}.jsonl`)
  const ws = createWriteStream(path)
  const hist: Record<string, number> = {}
  let buf = ''
  for (const c of corpus(chain, n, seed, seeds)) {
    hist[c.v] = (hist[c.v] ?? 0) + 1
    buf += `${JSON.stringify(c)}\n`
    if (buf.length > 1 << 20) {
      ws.write(buf)
      buf = ''
    }
  }
  ws.end(buf)
  await new Promise<void>((ok) => ws.on('finish', () => ok()))
  const ms = Date.now() - t0
  ;(manifest.chains as Record<string, unknown>)[chain] = { cases: n, verdicts: hist }
  const throws = Object.keys(hist).filter((k) => k.startsWith('THROW:'))
  console.log(`${chain}: ${n} cases → ${path} in ${ms} ms; ok ${hist.ok ?? 0}; ${Object.keys(hist).length} verdict kinds${throws.length ? `; TS THROWS: ${throws.join(', ')}` : ''}`)
}
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
