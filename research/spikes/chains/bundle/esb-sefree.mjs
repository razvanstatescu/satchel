import * as esbuild from 'esbuild'
const r = await esbuild.build({
  entryPoints: ['bundle/entry-chainsig.ts'], bundle: true, platform: 'browser', format: 'esm', minify: true,
  outfile: 'bundle/out-chainsig-sefree.js', metafile: true, logLevel: 'error',
  alias: { 'chainsig.js': '/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-near-Satchel/051e5c71-dfe2-4356-a151-bf7f4bdf3156/scratchpad/csjs/chainsig-sefree/browser/index.browser.js', crypto: './bundle/crypto-stub.js' },
  nodePaths: ['node_modules'],
})
const out = r.metafile.outputs['bundle/out-chainsig-sefree.js']
console.log('bytes', out.bytes)
const agg = {}
for (const [p, i] of Object.entries(out.inputs)) { const m = [...p.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)]; const k = m.length ? m[m.length-1][1] : p; agg[k] = (agg[k]||0) + i.bytesInOutput }
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>(v/1024).toFixed(1)+'KB '+k).join('\n'))
