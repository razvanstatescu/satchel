# Site refresh (2026-11-03, D-51)

The landing (`/`) catches up with the feature sprint (Oct 29 – Nov 2):
- the claims the new features made false are fixed;
- the sample card is the app's value card (D-50);
- a "What else it does" strip follows Trust.

The decision and its rules are in `plan/decisions.md` D-51. This folder keeps the research and design behind it.

**Superseded in part by D-52** (2026-11-03, the site polish round, `docs/design/site-polish/`). On the landing, R1's
network names give way to Ethereum, Base, Arbitrum and Optimism, and R3's "at mainnet prices" label is gone: the art
shows "≈ $8,000.00" alone. The strip is now a five-tile bento on its own band. `q-testnet` on `/` asks "Is it
audited?". The app and `/questions` keep this round's testnet wording. The files below are left as they were.

| File | What it holds |
|---|---|
| `facts.md` | Verified facts with sources, and an audit of every landing string against the new features (the false items F1–F8) |
| `rulings.md` | The binding rulings R1–R9: USDC on NEAR, lock claims by role, the dollar figure, allowances, offers, the sample |
| `copy.md` | The copy deck: every changed string, its word counts and its source |
| `design-notes.md` | The design: the value card in the art, the hero loop's keys and timing, the strip, the test changes |
| `strip-refs.md` | Mobbin references for the strip (pattern 1 was built) |
| `claims-audit.md` | The final claims audit of the built landing; W1–W3 are fixed |
| `../satchel-2.0/tests/blind-test-3.md` | The blind first-impression test of the built landing |

**How code comments cite this folder:**
- "site-refresh R9" means `rulings.md` R9;
- "site-refresh facts §1.5" means `facts.md` §1.5, and "site-refresh F7" is item F7 of its false-claim list;
- "site-refresh copy §3" means `copy.md` §3;
- "site-refresh design notes §1.4" means `design-notes.md` §1.4;
- "site-refresh W1" means `claims-audit.md` W1.

**Not kept:** the team brief, the audit of the landing before the refresh, the HTML prototype, the screenshots and the
saved Mobbin images. The built landing is the reference.

**App follow-ups found on the way** (outside the landing):
- `design-notes.md` §7:
  - the app's card truncates "≈ $X" beside "Paused for sale" below about 300 px of card;
  - the empty card hides its third chip below 352 px.
- `claims-audit.md` N6: Make an offer binds the inside epoch read at click time, not the one the page showed. Razvan has
  it, as a product call.
- `/questions` answers that name USDC held on NEAR depend on H-26 (Nov 8).
