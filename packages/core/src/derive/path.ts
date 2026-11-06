/** The token-path helper on its own (no curve libraries), so light callers can import it without `derive/index.ts`. */

export type ChainSlug = 'btc' | 'evm' | 'sol'

const CANONICAL_TOKEN_ID = /^[1-9][0-9]*$/

/** "satchel/{id}/{chain}". Token ids are canonical decimals ("1", never "01"), or the address changes (kb/30 §Gotchas). */
export function tokenPath(tokenId: string, chain: ChainSlug): string {
  if (!CANONICAL_TOKEN_ID.test(tokenId)) throw new Error(`non-canonical token id: ${JSON.stringify(tokenId)}`)
  return `satchel/${tokenId}/${chain}`
}
