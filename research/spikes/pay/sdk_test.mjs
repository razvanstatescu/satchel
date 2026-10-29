// Throwaway: does the 1Click SDK work without a token? (mainnet, dry quote only)
import { OpenAPI, OneClickService, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
OpenAPI.BASE = 'https://1click.chaindefuser.com';
const tokens = await OneClickService.getTokens();
const pick = s => tokens.find(t => t.blockchain === s.chain && t.symbol === s.sym);
for (const s of [{chain:'btc',sym:'BTC'},{chain:'eth',sym:'ETH'},{chain:'sol',sym:'SOL'},{chain:'near',sym:'wNEAR'},{chain:'near',sym:'USDC'}]) { const t = pick(s); console.log(s.chain, s.sym, t?.assetId, 'price', t?.price, t?.priceUpdatedAt); }
const q = await OneClickService.getQuote({
  dry: true, swapType: QuoteRequest.swapType.EXACT_OUTPUT, slippageTolerance: 100,
  originAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near', depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
  destinationAsset: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1', amount: '5000000',
  refundTo: '0x2527D02599Ba641c19FEa793cD0F167589a0f10D', refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  recipient: 'alice.near', recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  deadline: new Date(Date.now() + 3600e3).toISOString(),
});
console.log('SDK dry quote OK without token:', JSON.stringify({ correlationId: q.correlationId, minAmountIn: q.quote.minAmountIn, amountIn: q.quote.amountIn, amountOut: q.quote.amountOut, timeEstimate: q.quote.timeEstimate, hasSignature: !!q.signature, depositAddress: q.quote.depositAddress ?? null }));
