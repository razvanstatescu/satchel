// Throwaway: 1Click dry quotes without auth, varying fields to isolate errors. Usage: node quote.mjs
const base = {
  dry: true, swapType: 'EXACT_OUTPUT', slippageTolerance: 100,
  originAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near', depositType: 'ORIGIN_CHAIN',
  destinationAsset: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1', amount: '5000000',
  refundTo: '0x2527D02599Ba641c19FEa793cD0F167589a0f10D', refundType: 'ORIGIN_CHAIN',
  recipient: 'satchel-demo-buyer.near', recipientType: 'DESTINATION_CHAIN',
  deadline: new Date(Date.now() + 3600e3).toISOString(),
};
const variants = {
  'base (nonexistent named recipient)': {},
  'recipient=existing named (aurora)': { recipient: 'aurora' },
  'recipient=implicit hex': { recipient: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1' },
  'recipient=existing named relay.tg': { recipient: 'relay.tg' },
  'EXACT_INPUT 5 USDC, recipient aurora': { swapType: 'EXACT_INPUT', recipient: 'aurora' },
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [name, over] of Object.entries(variants)) {
  const body = { ...base, ...over };
  const t0 = Date.now();
  const r = await fetch('https://1click.chaindefuser.com/v0/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  const q = j.quote;
  console.log(`[${name}] HTTP ${r.status} ${Date.now() - t0}ms`, q ? JSON.stringify({ amountIn: q.amountIn, minAmountIn: q.minAmountIn, amountOut: q.amountOut, minAmountOut: q.minAmountOut, amountInUsd: q.amountInUsd, amountOutUsd: q.amountOutUsd, timeEstimate: q.timeEstimate, withdrawFee: q.withdrawFee, refundFee: q.refundFee, depositAddress: q.depositAddress, deadline: q.deadline }) : JSON.stringify(j).slice(0, 300));
  await sleep(1500);
}
