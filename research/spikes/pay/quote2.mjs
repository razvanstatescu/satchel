// Throwaway: does 1Click require the NEAR recipient to exist / be USDC-registered? (dry quotes, no auth)
const base = {
  dry: true, swapType: 'EXACT_OUTPUT', slippageTolerance: 100,
  originAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near', depositType: 'ORIGIN_CHAIN',
  destinationAsset: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1', amount: '5000000',
  refundTo: '0x2527D02599Ba641c19FEa793cD0F167589a0f10D', refundType: 'ORIGIN_CHAIN', recipientType: 'DESTINATION_CHAIN',
  deadline: new Date(Date.now() + 3600e3).toISOString(),
};
const cases = [
  ['satchel.near (exists, NOT USDC-registered)', { recipient: 'satchel.near' }],
  ['zzz.near (exists, NOT USDC-registered)', { recipient: 'zzz.near' }],
  ['alice.near (exists, registered)', { recipient: 'alice.near' }],
  ['fresh implicit 64-hex (does not exist)', { recipient: 'ab'.repeat(32) }],
  ['recipientType INTENTS, recipient satchel.near', { recipient: 'satchel.near', recipientType: 'INTENTS' }],
  ['EXACT_OUTPUT 0.000001 USDC (dust) to alice.near', { recipient: 'alice.near', amount: '1' }],
  ['deadline in the past', { recipient: 'alice.near', deadline: new Date(Date.now() - 60e3).toISOString() }],
  ['bad originAsset', { recipient: 'alice.near', originAsset: 'nep141:nope.near' }],
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [name, over] of cases) {
  const r = await fetch('https://1click.chaindefuser.com/v0/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, ...over }) });
  const j = await r.json().catch(() => ({}));
  console.log(`[${name}] HTTP ${r.status}`, j.quote ? `ok minAmountIn=${j.quote.minAmountIn} amountIn=${j.quote.amountIn} amountOut=${j.quote.amountOut} t=${j.quote.timeEstimate}s` : JSON.stringify(j).slice(0, 260));
  await sleep(1200);
}
