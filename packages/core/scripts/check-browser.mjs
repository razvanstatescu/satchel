// Bundles every subpath export for the browser (platform=browser, no Node polyfills) and fails on any Node built-in.
// Also prints the minified + gzip size of each entry, so lazy-loading decisions stay informed.
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
let failed = 0
for (const [name, entry] of Object.entries(pkg.exports)) {
  try {
    const r = await build({
      entryPoints: [new URL(`../${entry}`, import.meta.url).pathname],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      minify: true,
      write: false,
      logLevel: 'silent',
      // @solana/web3.js 1.x imports the `buffer` npm package itself (bundled); nothing else may need Node.
    })
    const out = r.outputFiles[0].contents
    console.log(`ok   ${name.padEnd(16)} ${(out.length / 1024).toFixed(1).padStart(7)} KB min  ${(gzipSync(out).length / 1024).toFixed(1).padStart(6)} KB gzip`)
  } catch (e) {
    failed++
    console.error(`FAIL ${name}: ${(e.errors ?? [e]).map((x) => x.text ?? String(x)).join('; ')}`)
  }
}
process.exit(failed ? 1 : 0)
