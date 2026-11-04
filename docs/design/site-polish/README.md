# Site polish (2026-11-03, D-52)

> **What this folder is:** the research and design record of the latest landing-page round of the web app
> (`apps/web`, the `/` route), after `docs/design/site-refresh/` (D-51). It sits on top of the Satchel 2.0 design
> (`docs/design/satchel-2.0/`); `brand/` stays the source of truth for visual identity. Kept as written on 2026-11-03;
> the built landing is the reference.

The landing (`/`) presents the mainnet product:
- it names the product's networks, and its one testnet signal is the header badge and its tooltip (plus the phone
  menu sheet's line);
- the role strip is gone on every page;
- "What else it does" is a five-tile bento on its own band (`--band`);
- the dev Trust band gets a looping code card;
- Uses gets a "+ USDC and L2s" hint.

The decision is in `plan/decisions.md` D-52, and the role banner's erratum is kb/90 E-55. This folder keeps the
research and design behind it.

| File | What it holds |
|---|---|
| `rulings.md` | The binding rulings P1–P13: the two FAQ framings, the phone sheet line, the Uses hint, "bc1q…", word budgets, the "Simplified" label, the `--band` token, page heights, amount type, the code loop's Pause, the lead tile on phones, an app follow-up |
| `copy.md` | The copy deck: every changed string with its word count and source, the docs that drift (§9) and the honesty check (§10) |
| `design-notes.md` | The design: the bento and its art, the code card and its loop, the Uses hint, the card without its label, the test changes |
| `refs-bento.md` | Mobbin, Just Add and Duskwatch references for the bento. Option C was built, on the `--band` token (P7) rather than `surface-sunken` |
| `refs-code.md` | Mobbin and live-site references for the code card. Concept 1 was built, as a 10 s loop with Pause (P11) rather than once on enter |

**Read the rulings first.** Where they differ from the copy deck or the design notes, the rulings win.

**How code comments cite this folder:**
- "site-polish P5" means `rulings.md` P5;
- "site-polish copy §3" means `copy.md` §3;
- "site-polish design notes §2.4" means `design-notes.md` §2.4;
- comments written during the build say "site polish round" with a ruling ("site polish round P8") or a
  `design-notes.md` section ("site polish round §2.4").

**Not kept:** the team brief and context (Razvan's ask and answers are in D-52), the HTML prototype and its tooling,
the working scripts, the screenshots and frame strips, and the saved Mobbin and site images. The built landing is the
reference.

**App follow-up found on the way** (outside the landing): in mainnet mode (`IS_TESTNET` false), `SatchelCard`'s head
row should be `items-center`, like the landing card (P13; `design-notes.md` §4). It wasn't built in this round; it
was built later the same day (commit `f0d37bb`: the pill centres beside a one-line total).
