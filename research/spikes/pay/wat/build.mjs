import wabtInit from 'wabt';
import { readFileSync, writeFileSync } from 'node:fs';
const wabt = await wabtInit();
const mod = wabt.parseWat(process.argv[2] || 'ft_receiver.wat', readFileSync(new URL('./' + (process.argv[2] || 'ft_receiver.wat'), import.meta.url), 'utf8'), {});
const { buffer } = mod.toBinary({});
writeFileSync(new URL('./' + (process.argv[2] || 'ft_receiver.wat').replace('.wat', '.wasm'), import.meta.url), Buffer.from(buffer));
console.log('wasm bytes', buffer.length, 'exports', WebAssembly.Module.exports(new WebAssembly.Module(buffer)).map(e => e.name));
