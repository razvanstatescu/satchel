# Pre-computed Satchel addresses (P0-A1)

> Computed 2026-10-21 by `research/spikes/mpc/js/final_addresses.mjs` (throwaway) for team account **`satchelhq.testnet`**. Live cross-check against `v1.signer-prod.testnet` `derived_public_key`: domain 0 **MATCH**, domain 1 **MATCH**.
> Derivation: `sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path)` (kb/10). BTC = P2WPKH testnet4 (`tb1q…`), EVM = Sepolia, SOL = devnet.

## ⚠ Do not fund anything until `satchelhq.testnet` exists on-chain

Until the team owns `satchelhq.testnet`, anyone could register it, create `satchel.satchelhq.testnet` and sign for every address below (review R-02). Check: `near account view-account-summary satchelhq.testnet network-config testnet-fastnear now` must show the account.

Predecessors: `satchel.satchelhq.testnet` (**final**, created keyless on Day 10, never before), `rc.satchelhq.testnet` (**rc**, created keyless on Day 9), `dev1.satchelhq.testnet` (**dev1**).

Amounts follow `plan/phase0-checklist.md` §4. **W** = wallet path; **F** = fallback (no testnet4 wallet, D-33: fund dev1 #1 big, fan out on Day 5). With no team testnet4 wallet, **F applies** (D-38).

| Set | # | BTC testnet4 (fund) | Sepolia EVM (fund ETH) | Solana devnet (fund SOL) |
|---|---|---|---|---|
| dev1 | 1 | `tb1qcg94krv9g58qrtslkqlvyrv86el7w3p4ml5urc`<br>W: 2 × 50k · F: 2 × 500k sats | `0x355180f2d253833dfb736b05561588d7d4bc7db3`<br>W: 0.01 · F: 0.3 | `6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu`<br>0.2 |
| dev1 | 2 | `tb1qprcmru94v8kg0qqxdv6hradw4z29zk2wshs0vq`<br>1 × 50k sats | `0xfcc7917829b63cf0b7efb724d55fa9dedc5943d1`<br>0.01 | `HNeHp8XJ7EGQBvhwAPNoRXprDYEWPvTrUvdwVEmCL64b`<br>— |
| dev1 | 3 | `tb1qa3jnf4qlft24sam2slnmt3uas5c95mv7ual4ek`<br>— sats | `0x0d9fe39915e2b026ca9e3ab268ff8745f87522d6`<br>0.01 | `491k3NitncmVHHh3gqDHtJLuw4Bh4Ns54YEuUAwkNrSG`<br>— |
| final | 1 | `tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5`<br>3 UTXOs: 100k + 50k + 50k sats | `0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad`<br>0.05 | `AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd`<br>0.5 |
| final | 2 | `tb1qdkyxcms7phwyy2fn94tlng8f2zdsc74a8lpf3u`<br>2 × 50k sats | `0xe7597038ce1030599fae70f4d6a9d1f9ea9dc76a`<br>0.02 | `5Gn16DW98FYQj1soZqNiUiqSsT3qcQiUTBEFuDgH1HSf`<br>— |
| final | 3 | `tb1qylyljhhghv7xpqa5vw5e8v5dgjrsg6s6a3dngd`<br>1 × 50k sats | `0x456d0c7e3f16b64385c9241fde45098aef2e997d`<br>0.02 | `AM6HVA7mygEZSPe6BswPcnE8RM2TpHNHHiH3iZa1citj`<br>— |
| final | 4 | `tb1qujvrkz47vga3razn2fpegp9gfqfcnwcvf6cl7f`<br>— sats | `0x8ccee6e631a0ba4197468c641b0348c01f1dbab0`<br>0.01 | `FX8L3eZk5xjDXENUHsJ8YBMpvvZ5ajd6sXcE7uwTniHN`<br>— |
| final | 5 | `tb1q70288g5fzuzdnawruykutg0ts9vrcfpaecfj55`<br>2 × 50k sats | `0x630c522694cd9863a2770716d005a490d022f624`<br>0.01 | `C57DF5rkbw4ucCuDZUfG7suxXsrL5chtAsCsQrjeGhHb`<br>— |
| final | 6 | `tb1qntk56m402m03dsgm5wlg26lc5kr67g92wee7zv`<br>1 × 50k sats | `0xdfb5013a1e7189dd26533b2fc80d536ae6748333`<br>0.02 | `FJcx3pryuz6xKniMsYbGGtt37jVg4vVUzTppnwgJjJj5`<br>— |
| final | 7 | `tb1qpvhr4f9dc6s84kqhx9dnqxef6ccmgxs6fl6l2t`<br>2 × 50k sats | `0xec517d0c2c84fc30bb8f9b3ae9223c4f42e5640f`<br>0.02 | `JCt19yBHQGcxccjTPunnQzA6Tax37hCAJUfKZrkgnwmc`<br>— |
| rc | 1 | `tb1q5y8ttdym4snraa9ujay3stza7avyf9ltf40f5x`<br>2 × 50k sats | `0x421ee6970e238e6fb0c08aa26e12bce686b1b7d7`<br>0.01 | `9bGAhsR4fqJC2P52mzQJXNC1QfvN23e8LEgyHaWR6NoS`<br>— |
| rc | 2 | `tb1qlu9qfrl357n6e7mnamw8j0v5ftcgcyqd7vmfak`<br>— sats | `0x2f5b7846dcd708aa1d6f27224bb7a4f56f3a1ce5`<br>0.01 | `FU3kh2sxcRLSYc9g3ViHaNe8wFCzNcNEef78VQcAM54r`<br>— |

## Priority if time is short (fallback F)

1. **dev1 #1:** request the largest testnet4 claims you can (e.g. 2 × 500k sats from the mempool.space faucet) to `tb1qcg94krv9g58qrtslkqlvyrv86el7w3p4ml5urc`, and 0.3 Sepolia ETH to `0x355180f2d253833dfb736b05561588d7d4bc7db3`. Agents fan these out to the other addresses on Day 5 with the product's own send flow.
2. **final #1 SOL:** 0.5 devnet SOL to `AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd` (faucet.solana.com, human only).
3. **final #1–#7 BTC** directly, as many as the faucets allow, because testnet4 confirmations can take hours.

Explorers: `https://mempool.space/testnet4/address/<tb1q…>` (never `testnet4.mempool.space`, which is mainnet) · `https://sepolia.etherscan.io/address/<0x…>` · `https://explorer.solana.com/address/<…>?cluster=devnet`.
