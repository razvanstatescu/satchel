// THROWAWAY: average block time over recent windows
import { rpc } from './nearlib.mjs';
const net = process.argv[2] ?? 'testnet';
if (net === 'mainnet') process.env.RPCS = 'https://rpc.mainnet.fastnear.com';
const head = (await rpc('block', { finality: 'final' })).result.header;
for (const back of [200, 2000, 20000]) {
  let b = null;
  for (let k = 0; k < 10 && !b; k++) b = (await rpc('block', { block_id: head.height - back - k })).result?.header;
  const dt = (Number(BigInt(head.timestamp_nanosec) - BigInt(b.timestamp_nanosec)) / 1e9);
  const dh = head.height - b.height;
  console.log(`${net} head ${head.height}: last ${dh} blocks = ${dt.toFixed(1)} s -> ${(dt / dh).toFixed(3)} s/block; 200 blocks ~ ${(200 * dt / dh).toFixed(0)} s`);
}
