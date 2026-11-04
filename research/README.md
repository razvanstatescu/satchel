# research/: throwaway spikes and their evidence

**Not product code.** Nothing in `contracts/`, `packages/`, `apps/` or `tools/` imports from here, and no spike file
was copied into the product (CLAUDE.md rule 1). The product was written from the specification in `../kb/`.

The spikes were small, disposable experiments on NEAR testnet and the three target chains, run mostly on
2026-10-21 (Phase 0) to answer one technical question each before the design was fixed. Each folder's `RESULTS.md`
holds the answer and the raw evidence; the distilled knowledge is in `../kb/` (kb/10 to kb/51, kb/70), and
[`kb/90-technical-spec.md`](../kb/90-technical-spec.md) is the design built on it. Two later folders (`smoke`,
`dev2-live`) record testnet runs of the real contract.

| Folder | Question it answered |
|---|---|
| [`spikes/mpc/`](spikes/mpc/RESULTS.md) | How NEAR's MPC signer behaves: request shape, gas and deposit, latency, timeouts, key derivation |
| [`spikes/chains/`](spikes/chains/RESULTS.md) | Building, signing and broadcasting EVM (Sepolia) and Solana (devnet) transactions from MPC signatures |
| [`spikes/btc/`](spikes/btc/RESULTS.md) | Bitcoin testnet4 P2WPKH through the MPC: BIP143 preimages, multi-input fan-out, Esplora APIs |
| [`spikes/sdk/`](spikes/sdk/RESULTS.md) | near-sdk 5.29.1 and toolchain behaviour, deploy and lock rehearsal |
| [`spikes/keyless-birth/`](spikes/keyless-birth/RESULTS.md) | That one transaction can create, fund, deploy and initialise an account with no AddKey |
| [`spikes/pay/`](spikes/pay/RESULTS.md) | USDC (NEP-141) `ft_transfer_call` behaviour and indexing for the sale flow |
| [`spikes/web/`](spikes/web/RESULTS.md) | Wallet transaction flow in the browser, RPC polling, Next.js polyfills |
| [`spikes/sec/`](spikes/sec/RESULTS.md) | Payload parsing edge cases, with the source standards (EIPs, NEPs) saved in `sources/` |
| [`spikes/hackathon/`](spikes/hackathon/RESULTS.md) | The hackathon rules and submission API; `HACKATHON.snapshot.md` is a copy of the official rules |
| [`spikes/ux-refs/`](spikes/ux-refs/), [`spikes/ux/`](spikes/ux/README.md) | UX reference research, and the earlier revisions of the UX spec that kb/90 §13 quotes |
| [`spikes/smoke/`](spikes/smoke/RESULTS.md) | 2026-10-27: the real contract wasm against the live MPC on a throwaway account (EVM, BTC and SOL signatures verified) |
| [`spikes/dev2-live/`](spikes/dev2-live/RESULTS.md) | 2026-10-30: the sprint features (C1–C7) run end to end on `dev2.satchelhq.testnet` |

`vendor/` folders inside some spikes hold third-party sources saved for reading, under their own licenses.

Other files:
- [`accounts.md`](accounts.md): the throwaway testnet accounts the spikes used. They are not the team accounts.
- [`final-addresses.md`](final-addresses.md): the BTC, EVM and SOL addresses of the demo Satchels, computed in
  advance from the contract ids and checked against the MPC. Its funding warning dates from before the team account
  `satchelhq.testnet` existed (it exists since 2026-10-29, D-48).
