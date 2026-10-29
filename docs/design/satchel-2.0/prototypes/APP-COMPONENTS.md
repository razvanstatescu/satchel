# App components added by the product designer (`proto/app.css`)

`app.css` builds on `tokens.css` + `components.css` and never redefines their classes. These are the new shared pieces;
the lead can adopt any of them into `components.css` (keep the names, or note a rename here). Prototype-only chrome is at
the bottom.

## Layout
| Class | What | Used on |
|---|---|---|
| `.obj` › `.obj__head`, `.obj__col`, `.obj__main` | The object page. One DOM order (head → col → main); from 1024 a grid `minmax(320,400) \| 1fr` with the col sticky at top 40 | `/s/[id]` and its tabs |
| `.obj--sub` + `.obj-compact` | Sub-tabs: below 1024 the col's card is hidden and the compact header (40×25 thumb, h1 at heading size, the state pill) takes its place; from 1024 the col returns | Activity, Sale |
| `.section-h` | A section heading row (h2 + one optional action), 44 tall | Inside, Facts, You get… |
| `.lg-only` / `.lg-hide` | Show only from / below 1024 (one control per breakpoint, never two) | visitor "Add coins" |
| `.list-head`, `.cardgrid` | List-page head (h1 + count + one action) and the 1 / 2 / 3-column card grid | `/satchels`, `/market` |

## Object page pieces
| Class | What |
|---|---|
| `.actions-grid` (+ `.actions`, `.why`) | The owner's four labelled 52 px buttons in a 2×2 grid: one coral, the rest secondary; disabled ones stay in place, and `.why` carries the reason (`aria-describedby`) |
| `.inside` › `.inside-row` (`__top`, `__name`, `__amt`, `__addr`) | One row per chain: 32 px charm, network, amount, the full grouped address (`data-full-address`), then `.tools` |
| `.tool` (+ `--icon`, `--link`, `[data-done]`) | A 44 px pill tool (Copy, QR, Retry, Add coins) on `surface-sunken`; `--link` is the named explorer link |
| `.facts` | The judge's `dl` (one per page): label column 150 from 560 px, values wrap |
| `.hash` | A code hash in 8-character groups that wrap only between groups (DOM text stays raw) |
| `.disclosure` | A `<details>` panel with a 52 px summary and a rotating chevron (Verify, How Satchel checks this, Config, NEAR fee) |
| `.how` | Three numbered steps (visitors only) |
| `.card-note`, `.under-card` (`--danger`) | One quiet line under a card (Sending…, For sale at 1 NEAR, nobody can buy it yet) |

## Sale
| Class | What |
|---|---|
| `.offer` (`--overview`, `--sale`) › `__price`, `__meta`, `__hint`, `__buy`, `__fine` | The offer block = `listing-facts`. `.offer__buy` gets `.buybar`: **pinned to the bottom below 1024**, inline from 1024. `--overview` keeps only the bar on phones |
| `.buybar` (+ `__row`, `__price`, `__note`) | The pinned buy bar; the page gets bottom padding while it shows (`body:has(.buybar…)`) |
| `.gate` (`--success/frozen/danger/muted`) | The GateLine: icon + words, the Buy button's `aria-describedby` |
| `.verdict` (`--clean/danger/frozen`) › `__top`, `__mark`, `__eyebrow`, `__title`, `__sub`, `__meta` | The one verdict block (`#clean-history`, `role=status`) |
| `.sigstrip` › `ol` › `.sig` (`--used/unused/wait/unknown`) + `__label` | One marker per past signature (12 max, then "+n"), so "clean" reads at a glance |
| `.freeze-line` | "Paused while it's for sale. The seller can't sign anything new…" under the verdict |
| `.youget`, `.record`, `.checks`, `.item-group`, `.items` › `.item`, `.sources`, `.chip-info` | You get, and the record (checks, grouped signatures with their pills, sources) |
| `.steps3` | How buying works |
| `.sale-panel`, `.progress` | The owner's sale status panel and the 250-block quiet-period bar |
| `.receipt` | A two-column `dl` (one column below 480 so accounts and hashes never break mid-word) |

## Flows (inside `.sheet`)
| Class | What |
|---|---|
| `.chainpick` | A full-width segmented chain picker: charm + ticker only, so it never clips at 360 |
| `.amount--hero` (+ `.amount__row`) | The big centred amount with its ticker right after the number (`field-sizing: content`; builders size the input from its value length for older browsers) |
| `.resolved` (+ `__ok`, `__warn`) | The recipient card after validation: charm, full grouped address, network, the warning tier, Clear |
| `.input-wrap` | An input with an inline Paste tool |
| `.feeline`, `.finality`, `.foot-note` (`--neutral`, `--danger`) | The fee line; the one finality line above the CTA; the reason/helper line under a CTA (`--neutral` = your own cancel, never red) |
| `.review-head`, `.ft`, `.kv` (`.kv--strong`), `.timechip`, `.check` | Review: the amount head, From/To rows, key-value rows, the time chip, the 44 px ack checkbox |
| `.track-head`, `.eta`, `.tracker__time`, `.row-right`, `.small-print` | Tracker extras: the heading, the honest ETA line, times and the m:ss timer |
| `.outcome` (`--success/danger/neutral/frozen`) | A terminal state that **replaces** the tracker heading (Not signed, Signed, not sent, Still waiting for NEAR, Expired, Not sent) |
| `.guard` (+ `__mark--frozen/danger`), `.unsent-card` | Guards as a centred state; the sheet fits it and shows no step counter |
| `.gift`, `.gift-tag` | Review gift: the card wears a lemon tag "To bob.satchelhq.testnet" on a string |
| `.conseq`, `.glyph`, `.recip`, `.status-line` | Consequence rows; the recipient card; the live status line under the account field |
| `.hook` (`__ends`, `__end`, `__who`, `__role`, `__strap`, `__track`, `__card`, `__stem`, `__ghost`, `__done`) | **The hand-off stage** for the motion designer: a strap with two hooks; the card (208 px below 480, 240 from 480) hangs under the giver, swings, slides along the strap and lands under the receiver; the dashed ghost marks where it was |
| `.qr-card` (`__band`, `__body`, `__net`), `.qr-plate`, `.notes`, `.incoming` | Add coins: the band-headed QR card, the white plate, the icon notes, the Incoming line |
| `.mint-charms` (+ `__row`), `.card__label` | Mint: the charms hanging over the first new card; the preview card's "Bitcoin address" rows |
| `.feed-day`, `.feed` › `details` › `summary` (`.feed__lead`, `__badge`, `__main`, `__title`, `__meta`, `__trail`, `__amt`, `__chev`), `.feed__detail`, `.feed-more` | Activity rows with a visible chevron that turns when open |
| `.mkt` (+ `__meta`, `__price`) | A Market item: card + price + listing + the server hint, all one link |
| `.keyless`, `.cmds` › `.cmd` (+ `__what`) | /contract: the keyless badge; each verify command with what it proves and a labelled Copy |
| `.acct-menu` (+ `__who`), `.menu-btn`, `.acct-pop`, `.wallets`, `.wallet-row` | The account menu (sheet below 768, popover from 768); the optional wallet picker (R7) |

## Proposals that touch the lead's classes (not applied to components.css)
1. **Toast offset:** `.toast-region { bottom: calc(var(--pinned-h, 0px) + 16px + env(safe-area-inset-bottom)) }` below 768,
   with the sheet foot or the buy bar setting `--pinned-h` on `body`, so a toast never covers a pinned button
   (inventory 5.2). Today's fixed 88 px is too low for a sheet foot (≈ 92 px) and too high when nothing is pinned.
2. **Small phones:** `.topbar .brand-link { flex: none }`, so the lockup never squeezes (it shrank to a smudge at 360,
   signed out). Below 420 the Testnet badge steps aside while "Connect" or a `.pending-pill` shows (it stays in the menu
   sheet and the footer). While a pending pill shows below 480, the lockup collapses to its tile (the `Mark` component).
3. **`.pending-pill`** (new, shell-level): 44 tall, spinner + "Sending 0.0010 ETH · 0:42"; `--attention` for "Signed, not
   sent · Broadcast now". From 1024 it becomes `.pending-card` at the bottom right.
4. **Segmented links:** `.seg__opt[aria-current="page"]` takes the inverse pill, for route-driven choices (Receive's chain).
5. **`[data-signed] [data-when]`** (the lead's landing mechanism) also drives my app pages; the rule is copied into
   `app.css` and should move to `components.css`, with `shell.html`'s inline shell styles (`.sidenav__account`, etc.).
6. **`.sheet__body > * { flex-shrink: 0 }`**: the sheet body is a flex column, so tall children (the QR card) were being
   squeezed and clipped instead of scrolling.
7. **`.sheet__thumb`**: the 40×25 card thumb beside a flow sheet's title, so every sheet shows the object first
   (design-spec principle 2) when it has no card of its own (Send, Sell).

## Prototype-only (never port)
`.state-bar` (the state switcher, `assets/app-states.js`), `.proto-flag` (marks the SOL-flagged and R7-optional
variants), `tools/app-sync.mjs` (pastes the shell, grouped addresses, code hashes and real QR codes).
