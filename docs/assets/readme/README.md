# The README's images

Rendered by [`apps/web/scripts/readme-assets.mjs`](../../../apps/web/scripts/readme-assets.mjs). Nothing here is drawn
by hand, so every screen matches the app at the commit it was made from.

| File | What it shows | Source |
|---|---|---|
| `banner.png` | The lockup, the one-line description, the chain charms and the token's own card image (`/api/card/1.svg`, its NEP-177 `media`) | `brand/logo/`, `brand/illustration/`, the app |
| `satchel-page.png` | The owner's view of Satchel #1 | the app, sample data, signed in as `alice.satchelhq.testnet` |
| `send.png` | The two steps of sending ETH: fill in, review | the app, sample data, as the owner |
| `buy-check.png` | The Buy tab of a clean listing (#3) and of a blocked one (#4) | the app, sample data, as `carol.satchelhq.testnet` |
| `market.png` | The market, with each listing's verdict | the app, sample data |
| `activity.png` | Satchel #1's activity | **live** app (`https://usesatchel.xyz`, the final contract `satchel.satchelhq.testnet`) |

"Sample data" is the app's fixture mode, the offline dataset the e2e suite runs on. Those screens keep the app's own
"Sample data: these pages don't read the chains live" strip. The contract page is not shown here: in fixture mode
it carries a sample birth transaction, which a reader might try to look up. Re-shoot it from the live app after the
final birth.

To regenerate, build and start the app in fixture mode, then run the script (it needs network access for the live
screen):

```sh
cd apps/web
NEXT_PUBLIC_DATA_MODE=fixture NEXT_PUBLIC_CONTRACT_ROLE=final NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet \
  NEXT_PUBLIC_APP_URL=https://usesatchel.xyz NEXT_PUBLIC_EXPECTED_CODE_HASH= FASTNEAR_API_KEY= pnpm exec next build
pnpm exec next start -p 3388 &
node scripts/readme-assets.mjs                      # all images
node scripts/readme-assets.mjs --only banner,send   # some of them
```

Fonts (Funnel Display, Onest, Geist Mono; SIL Open Font License 1.1) come from `docs/design/satchel-2.0/prototypes/assets/fonts/`.
