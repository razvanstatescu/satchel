# What else Satchel could do (research, 2026-10-29)

> **Status (2026-11-04): historical research note (2026-10-29), the input to the feature sprint.** Razvan picked A1–A4 and C1–C7; A4 was built and then removed on 2026-10-30, and the other ideas were not built. What shipped and where it is specified: `plan/progress/feature-sprint.md` and `docs/specs/*.md`.

> **For:** Razvan, to pick what to build in the time left.
> **Inputs:** the current contract and app, `kb/`, the README "What's next", and a scan of comparable products:
> ERC-6551 token-bound accounts, Lit PKPs (signing policies, spending limits, session keys), and NEAR's own
> Chain Signatures use cases.
> **The constraint that matters most:** the contract is frozen on **Nov 9** and born keyless on **Nov 10**, after
> which it can never change. Every idea is tagged:
> - **Contract:** needs new contract code. It must land, with tests, fuzzing and a security pass, by Nov 9.
> - **App only:** frontend or tooling, using contract methods we already have. It can ship until Nov 13.

## What Satchel already does (so we don't re-propose it)
- **Tokens:** open mint, and each NFT has its own BTC, ETH and SOL addresses.
- **Moving coins:** send on all three chains, with structured payloads only (no blind signing).
- **Give / transfer:** whoever holds the NFT controls the coins.
- **Sale:** list and buy in NEAR or USDC with a single payout and withdraw, plus proceeds escrow.
- **Clean history:** every signature is recorded, and the buyer's browser checks that none can still move the coins.
- **Pages:** Market, My Satchels, the contract-facts page, and JSON APIs.
- **Recovery:** retry a stuck send with the same nonce or inputs and higher fees ("Broadcast again").

Competitors' table stakes we already match or beat:
- ERC-6551 wallets "sell the NFT, the inventory goes with it", but on one EVM chain, and a buyer can't tell whether
  the seller kept a pre-signed transaction.
- Lit PKPs make keys transferable, with programmable signing policies, but have no sale-safety story.

## Ideas, ranked by value for the effort

### App only (no contract change)
| # | Idea | Why users want it | Effort |
|---|---|---|---|
| A1 | **A social card per Satchel.** Sharing `usesatchel.xyz/s/7` on X, Telegram or Discord shows that Satchel's card: its number, the coins inside and "Clean history". Today every link shows the same site-wide image | Sharing a Satchel is how it gets sold or gifted. It also lifts our own X demo post. Cheap, and visible to every judge | ½ day |
| A2 | **Give by link (a claim link).** Gift a Satchel to someone who has no NEAR account yet. The app moves it to a fresh implicit account, funds a few cents of NEAR for gas, and puts the key in the link's `#fragment`. The recipient opens the link, sees what's inside, and keeps it or moves it to their own wallet | "Hand it over" is the brand's main idea, and today the receiver needs a NEAR account first. Risk to explain in the UI: the link is a bearer token, like cash in an envelope | 1½ days |
| A3 | **Empty the Satchel.** One flow takes everything out to addresses you choose (BTC, ETH, SOL), one signature per chain, with the change rules and fees handled | The first thing a buyer does after buying. Today it means three separate Send flows | 1 day |
| A4 | **Request coins.** On Add coins, set an amount and share a payment link or QR code: BIP-21 for Bitcoin, EIP-681 for Ethereum, Solana Pay for Solana. Wallets open them pre-filled | Topping up a Satchel you're about to give or sell, or letting a friend chip in | ½ day |
| A5 | **Agent tools (an MCP server).** Read-only tools any AI agent can call:<br>• `get_satchel`;<br>• `check_clean_history` (running the same checker as the browser);<br>• `list_market`;<br>• `prepare_buy`, which returns the unsigned buy for a wallet to approve | AI agents that buy or verify wallets. It fits NEAR's agent themes, and the Claude Code and Codex screening agents (Q-017) can verify a Satchel in one call | 1 day |
| A6 | **An embeddable "Clean history" badge** with public API docs: a snippet or iframe any site or marketplace can show next to a Satchel, backed by `/api/satchels/[id]` and `/api/clean-history` | Third-party marketplaces can show Satchel's safety signal without building the checker | ½ day |
| A7 | **Arrival alerts while the page is open.** A browser notification when coins land, or when a Bitcoin send confirms | Testnet4 confirmations take hours; nobody wants to keep refreshing. A full email or push service would need a backend we don't have, so it's out | ½ day |

### Contract (by Nov 9, or never for this contract)
| # | Idea | Why users want it | Effort and risk |
|---|---|---|---|
| C1 | **A `history_digest(token_id)` view:** `{sig_count, sha256 of the records}`. It's on the README "What's next" list | Lets any NEAR marketplace bind an order to a Satchel's exact history, as our `buy` does, without reading every record | ½ day; view-only, very low risk |
| C2 | **USDC (ERC-20) inside, on Sepolia.** Also accept EVM transactions whose `data` is exactly `transfer(to, amount)` on an allowlisted token (Circle Sepolia USDC). Clean history needs nothing new: the EVM rule is nonce-based, so any signed tx with nonce n is dead once n is used. The app adds the token balance and a "Send USDC" option | Stablecoins are what people actually keep in a wallet they gift or sell. It's the biggest step towards real-world use. SPL tokens on Solana are much harder; skip them | 2 days + tests; medium (a new parser branch, fuzzing, and an allowlist that is frozen at birth) |
| C3 | **More EVM chains** (Base, Arbitrum and OP Sepolia). The Satchel already has the **same address on every EVM chain**. The contract only allows chain id 11155111 today, and that list is frozen at birth. Nonces are per chain, so the checker must query each chain | "One Satchel, every EVM L2". Cheap in the contract (a list), medium in the app and checker | 1½ days; low contract risk, but the checker must keep two providers per chain |
| C4 | **Offers.** A buyer escrows an offer (NEAR or USDC) on any Satchel, listed or not, bound to its current `sig_count`; the owner accepts or it expires, and refunds are automatic. It makes the market two-sided | Most Satchels won't be listed. Offers let a buyer start the deal | 2–3 days; medium-high (escrow, expiry, refunds, interplay with listings) |
| C5 | **Spending allowance (delegated signer).** The owner lets another NEAR account (a family member, a bot, an AI agent) sign sends up to a cap per day and per chain. The cap is enforceable because the contract already parses the amounts. The allowance resets on transfer or sale | Lit-style "spending limits" for the agents era: give your trading bot or your kid a budget, not the wallet | 2–3 days; medium-high (new state, caps per chain, reset rules) |
| C6 | **NEAR-side assets inside.** The Satchel also holds NEAR and NEP-141 tokens directly in the contract, so they move with the NFT and need no clean history (the contract enforces it) | A natively NEAR feature, which the judges will like | 3 days; high (balance accounting, storage, withdraw, sale interplay) |
| C7 | **Message signing** (EIP-191 `personal_sign`, BIP-322): "prove you control this address" and sign in to dapps. Never EIP-712, because permits and orders can move funds. These records can't move coins, so the checker shows them without blocking a sale | Lets a Satchel log in to sites and prove ownership | 1½ days; medium (a new request kind; a leaked log-in signature is harmless for funds, but explain it) |

### Out of scope for this hackathon
- Calldata or dapp interaction beyond C2 (WalletConnect with full EVM calls): clean history can't vouch for
  arbitrary contract calls.
- Auctions, royalties and fractional Satchels.
- Inheritance or a dead-man switch (dropped earlier).
- Mainnet.
- 1Click "Add coins from any chain" (D-19: Intents has no testnet, Q-007).

## Recommendation
1. **Contract, before Nov 9: C1 + C2**, or C1 + C3 if you'd rather show breadth than stablecoins. Each needs the
   full routine: tests, a fuzz run, a security pass, and the rc rehearsal on Nov 9. Adding more puts the freeze at
   risk.
2. **App, until Nov 13: A1 → A3 → A2 → A5**, then A4, A6 and A7 if there's time.
   - A1 is the cheapest visible win.
   - A3 and A2 complete the gift-and-buy story.
   - A5 speaks directly to the AI screening.

Sources: [ERC-6551 overview (eco.com)](https://eco.com/support/en/articles/13713947-what-is-erc-6551-a-guide-to-token-bound-accounts),
[ERC-6551 explained (NOWNodes)](https://nownodes.io/blog/erc-6551-token-bound-accounts-explained/),
[ERC-6551 and AI agents (cryptocmd)](https://cryptocmd.com/learn/how-ai-agents-own-crypto-wallets-using-erc-6551),
[Lit: signing policies as code](https://spark.litprotocol.com/signing-policies-as-code/),
[Lit: session signatures](https://spark.litprotocol.com/session-sig-pt-2/),
[NEAR docs: Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures),
[Chain Signatures use cases (Proximity)](https://medium.com/@ProximityFi/unlocking-multichain-web3-with-near-chain-signatures-fd42555892b7).
