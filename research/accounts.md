# Throwaway testnet spike accounts (created 2026-10-21 via near-cli-rs faucet, 10 NEAR each)

Keys: legacy keychain `~/.near-credentials/testnet/<account>.json` (never copy into the project).
These are NOT the team accounts. Team accounts (`satchel.<team>.testnet`, buyer, seller) are
still a human decision (names appear in the README for judges).

| Account | Used by |
|---|---|
| satchel-spk-mpc-e9ea1a.testnet | mpc agent (MPC signer spikes, latency go/no-go) |
| satchel-spk-chain-e9ea1a.testnet | chains agent (chainsig.js, EVM Sepolia, Solana devnet) |
| satchel-spk-btc-e9ea1a.testnet | btc agent (Bitcoin testnet4) |
| satchel-spk-sdk-e9ea1a.testnet | sdk agent (toolchain/deploy/lock rehearsal) |
| satchel-spk-web-e9ea1a.testnet | web agent (wallet tx flow, RPC polling) |
| satchel-spk-pay-e9ea1a.testnet | pay agent (FT/USDC, indexing checks) |

| smoke1.satchel-spk-web-e9ea1a.testnet | 2026-10-27 pre-hackathon smoke of the real wasm (`aea0b2e9…`) against the live MPC; see `spikes/smoke/RESULTS.md`. Not related to `satchelhq` |
