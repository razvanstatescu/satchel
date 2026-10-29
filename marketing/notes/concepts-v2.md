# Satchel 2.0 launch film: research, three treatments and the production script

Story lead notes, 2026-10-26. This rethinks the film from scratch for brand 2.0: the sticker S, the coral tile and the three
chain charms. `notes/concepts.md` (brand 1.0, Oct 22) stays as history. Its research on the repetition-reveal, single props
and the but/therefore rule still applies, so it isn't repeated here. Nothing here is locked until the human approves it.
Once approved, the VO lines move into `script/SCRIPT.md` (v3) so `tools/audio/run.mjs` can voice and time them.

## TL;DR

- **A · Along for the ride.** Bitcoin, Ethereum and Solana live on one Satchel and go wherever it goes. On the day it's
  sold, they need proof that nobody kept a signature that could take them away.
- **B · Every peel leaves a mark.** In a world made of stickers, a Satchel is the one you can peel off and hand to anyone.
  Every signature it makes leaves an outline, so a buyer can check that none is still out there.
- **C · Cute on the outside.** The friendliest wallet you'll ever give away. Flip the card over and you find a contract
  built to be checked.
- **Recommended: "Hand it over"**, a merge. It takes A's charms as the characters, B's outlines as the picture of the
  record and C's single flip as the turn, all on the brand's own spine: "Stick it on. Hand it over." The script has 27 VO
  lines (249 words) and runs about 2:12. The full production script is in §4.

---

## 0. Brief and guardrails

- **Audience.** The NEAR HACKATHON judges: crypto-native founders and VCs (Illia Polosukhin, Haseeb Qureshi, Eddy Lazzarin,
  Mert Mumtaz and others). They watch on X, on phones, and often muted at first. The account has X Premium, so 110–140 s
  is fine.
- **Balance (the human's feedback on v1).** About half the film is the product: what it is, mint, fill, send, give, sell
  and the top use cases. The other half is the unique tech: the catch and the clean-history protocol.
- **On-screen wording is mainnet-style.** Use `alice.near`, `bc1q…` and plain chain names. Never write "testnet",
  "Sepolia", "devnet" or "faucet".
- **Copy corrections from the app team (2026-10-26), which override the brand's sample copy:**
  - No "every chain" claim anywhere: not the OG tagline "The NFT that carries every chain.", not the welcome line
    "One NFT. Every chain inside." Say "Bitcoin, Ethereum and Solana" or "three chains".
  - No fiat. The card shows native amounts, never a $ total.
  - No "Safe to buy in about 2 minutes". There is no wait after listing; the only wait is the quiet period before listing.
  - A signature takes "Usually about 10 seconds".
  - App words are "Give" (never "Transfer") and "Paused for sale".
- **Never claim:**
  - "trustless" or "no trust needed";
  - any wait between listing and buying;
  - that the contract enforces the clean-history check. The buyer's browser runs it, the app keeps Buy off until it
    passes, and the buy is bound to the record count;
  - features that aren't built: inheritance, timelocks, delegates, ERC-20 or SPL tokens, multisig, a mobile app.

  Say "NEAR's signer network" or "NEAR Chain Signatures", never "MPC". Don't promise "safe"; say "clean".
- **Brand 2.0 rules that bite in motion.**
  - The S never gets a face, never rotates, never sits on coral and never gets a ring or a hook.
  - No real chain logos go inside the charms.
  - Stickers, not glass: ink outlines and hard shadows, no glow.
  - Coral is never used for text.
  - The tone is friendly, short and concrete, with verbs first. You "give" or "sell" a Satchel, and the new holder "gets
    everything inside".

---

## 1. Research

### 1.1 Six references

| # | Reference | What it shows | What we take |
|---|---|---|---|
| 1 | **Pixar, *Luxo Jr.* (1986)**, [Wikipedia](https://en.wikipedia.org/wiki/Luxo_Jr.) *(search summary)* | Two desk lamps carry a whole story without faces or dialogue: "they express emotions using body language, such as Luxo Sr. 'scolding' Luxo Jr. by shaking its head, and Luxo Jr. being ashamed by sinking down." Lasseter applied Disney's classic animation principles. | Our charms have only two dots and a smile, so they act with the swing: weight, timing and follow-through. BTC is heavy, ETH curious and SOL quick. Every emotion has to read with the sound off. |
| 2 | ***Headspace Guide to Meditation*** (Netflix; Strange Beast, Blink Industries, Compost Creative, Augenblick), [It's Nice That](https://www.itsnicethat.com/features/headspace-guide-to-meditation-netflix-animation-150221) | Abstract inner states made concrete with natural metaphors and a shape language: rounded forms read as friendly, angular ones as anger or upset. Colour shifts signal transitions. The art director's note on restraint: "the curse of the ego too clever is not right here." | Round charms against a jagged signed slip. One palette shift for the catch (Day to Night and back). One metaphor per idea, never stacked. |
| 3 | **Kurzgesagt – In a Nutshell**, [Core77](https://www.core77.com/posts/26915/From-the-Super-Adorable-Science-Files-Videos-by-Kurzgesagt) | Cute flat characters and bright colour carry heavy, exact science: "moving infographics that don't get bogged down in too much data visualization." | Cuteness won't lose a serious jury; vagueness will. Every tech beat names the exact thing (nonce, coin, blockhash), and the motion is the explanation. |
| 4 | **Duolingo's characters**, Linda Simensky (head of animation), [AWN](https://www.awn.com/animationworld/duolingo-vital-role-animated-characters-language-learning) | Characters get "personalities" and "goals, dreams, and things that they wanted to do, and… roadblocks keeping them from doing these things". A story with a learning objective and character moments fits in "200-300 words". | The charms' goal is to go wherever the Satchel goes. Their roadblock is a signature made before the sale. Our VO budget is about 250 words. |
| 5 | **Google Pixel 6 launch animations**, [Buff Motion](https://www.buffmotion.com/projects/google-pixel-6) | An R&D phase found "the right level of playfulness and character". Kinetic type was animated to "personify the words", balancing "realistic user journeys" against embellishment. | Stage the real flows (mint, send, give, buy) faithfully, and put the play around them: in the type, the transitions and the charms outside the phone. |
| 6 | **Twitter × Omnicom Media Group neuroscience study** (127 users), [Social Media Today](https://www.socialmediatoday.com/social-business/twitter-conducts-new-study-key-elements-effective-video-platform) | An early story arc made viewing past 3 s **58 %** more likely. People in the first 3 s raised emotional response **133 %**. Personal relevance and memory encoding were the same with sound on or off in the first 3 s. Videos with text were **11 %** more likely to be viewed and had **28 %** higher completion. | Tell a complete micro-story in 3 s, put faces and a hand on screen early, and let the captions carry the whole film. |

Two more sources support this:
- **Phantom's rebrand** (Bakken & Bæck) gave its ghost "a more dynamic, distinctive, and sleeker look, designed to be your
  trusted companion that helps you navigate the expanding multichain world"
  ([Phantom](https://phantom.com/learn/blog/introducing-phantom-s-new-brand-identity)). Crypto natives already trust a
  friendly character on a serious wallet.
- **X's own creative guidance** ([business.x.com](https://business.x.com/en/advertising/creative-best-practices)) says to
  add captions for sound-off viewing, show branding in the first 3 seconds and show movement early. The page returned
  403 here, so this comes from a search summary.

### 1.2 What lands in the first 5 seconds on muted X

1. **Frame 0 moves and has a face in it.** A charm is mid-fall at frame 0 and opens its eyes at 0.2 s.
2. **A whole micro-story by 3 s**: the coins stick on, then the Satchel is handed over. This is the study's early story arc.
3. **A human signal by 1.6 s.** A hand reaches in, which gives the "people" effect without drawing whole people. Hands are
   cheaper and more sticker-like.
4. **The captions carry everything.** Each is 2–5 words. In the hook they change every 1.2–1.8 s, and each one stays
   ≥ 0.8 s + 0.25 s per word after it lands.
5. **The brand shows from frame 0** in its assets: the coral card band, ink outlines, hard shadows and the charms. The
   lockup lands at about 0:07, once the story has hooked.
6. **Pattern interrupt.** A bright Day frame and a satisfying physical action (snap, peel, swing) stand out on a timeline
   of dark, glowing crypto video.
7. **The first 10 s stand alone.** The study found that clips of 15 s or less encode better, so the opening 10 s must
   give what it is, the hand-off and the name.

---

## 2. Three treatments

### Treatment A · "Along for the ride"

**Logline.** Bitcoin, Ethereum and Solana live together on one Satchel and go wherever it goes. On the day it's sold, they
need proof that nobody kept a signature that could take them away.

**Tone.** Warm comedy with Pixar-short body language. A storyteller narrator talks about the charms like a nature-film host
describing three small, brave creatures. It plays in Day, with one Night scene for the scare.

**Central device.** The three charms are the protagonists. They never speak; they react. The product is their home and
the tech is how they're protected. Every hand-off is a "ride" (the brand's pendulum swing), and the charms love rides.

| Time | Beat | We see | VO (spoken) | On screen |
|---|---|---|---|---|
| 0:00–0:06 | Meet them | Three charms drop in one by one and hang from a bar. Each opens its eyes as it's named and swings at its own speed. | "Meet Bitcoin. Ethereum. And Solana." | "Bitcoin." "Ethereum." "Solana." |
| 0:06–0:11 | Home | The bar is the bottom edge of a coral-banded card, Satchel #7. The logo slaps in. | "They live on a Satchel: one NFT, three native addresses." | "They live in one NFT." |
| 0:11–0:16 | Move in | "Mint a Satchel" is pressed and a fresh card pops out. The charms hop on and their address tags print. | "Mint one on NEAR, and they move right in." | "Mint a Satchel." |
| 0:16–0:22 | Mealtime | Coins fly in from an exchange and a wallet. Each charm gulps its coin and its balance ticks up. | "Fill them up from any wallet or exchange. Native coins, no wrapping." | "Fill them up." |
| 0:22–0:32 | Errands | The Send flow plays in a phone frame ("Usually about 10 seconds"). The BTC charm tosses a coin to a `bc1q…` address, then ETH and SOL do the same. | "Send from any of them. Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction." | "Send on all three." |
| 0:32–0:38 | Nobody else | A seed-phrase note tries to stick and slides off. A stranger's tap bounces, and the charms turn their backs. | "No seed phrase to copy. They answer only to whoever holds the Satchel." | "Only the holder." |
| 0:38–0:46 | First ride | alice gives #7 to bob. The card swings like a charm, and the charms ride with their eyes closed. A jingle plays at the top of the swing. | "Give the Satchel to a friend, and they go too. No bridge. No wrapped tokens." | "Give it. They go too." |
| 0:46–0:56 | Road trips | Party hats for a gift to sam.near. A heavy trade across a desk. A team treasury passed like a baton. | "Birthday presents. Big trades. A treasury, passed to the next team." | "Gift it." "Sell it." "Pass it on." |
| 0:56–1:08 | The scare | Night. A seller pockets a signed slip, sells the Satchel, then uses the slip. The ETH charm is yanked off the bar and the other two cling together. | "But some rides are risky. A signature made before a sale can still be used after it." | "Signed before." "Used after." |
| 1:08–1:12 | The question | The two remaining charms look at the camera. | "So how does a buyer know it's clean?" | "Is it clean?" |
| 1:12–1:21 | The diary | Day returns and the card flips. Its back is a diary, and an entry writes itself before each signature is made. | "Satchel keeps a diary. Every signature goes in it, on NEAR, before NEAR's signer network makes it." | "Written down first." |
| 1:21–1:28 | House rules | Odd notes bounce off the door (raw hash, token approval, durable nonce). A "satchelhq" hand finds the key hook empty. | "It signs only plain transfers it can read. And there's no admin key. Not even ours." | "Plain transfers only." "No admin key." |
| 1:28–1:32 | Packing | A price tag goes on and frost spreads. The charms wrap up in tiny scarves. | "Put it up for sale, and signing pauses." | "Paused for sale." |
| 1:32–1:43 | Inspection | The buyer's browser reads the diary. Each charm vouches for its own entries with a stamp. | "Then the buyer's browser checks every entry against each chain. Nonce used. Coin spent. Blockhash expired." | "Clean history." |
| 1:43–1:48 | Not this one | On another Satchel, a charm points at an open entry. Buy stays grey. | "If one old signature could still move coins, Buy stays off." | "Blocked: 1 unused signature" |
| 1:48–1:58 | Best ride yet | Buy is pressed. The card swings to carol while the USDC goes to bob, and the charms whoop. | "When it's clean, one transaction, bound to that history, pays the seller, and they're off to a new home." | "Satchel #7 is yours." |
| 1:58–2:04 | End | The lockup lands and the charms wave. | "Satchel. They go where it goes." | "Stick it on. Hand it over." |

- **Signature moment:** the ride. During the first give, the top of the swing plays at half speed for 12 frames, with the
  charms' eyes closed and the jingle ringing. Every later hand-off repeats it at full speed. The scare inverts it, with
  flat faces.
- **Music arc:** whimsical indie-pop (glockenspiel, claps, a whistle, upright bass) peaks at the road trips. The scare is
  a single held cello note and a thump. The diary brings a curious ticking motif, the inspection lands three stamp hits,
  and the best ride brings back the full band and the whistle.
- **VO:** 211 words, about 82 s at 155 wpm. **Runtime:** about 2:04.
- **Risks:**
  - *Too cute for this jury.* Narrated feelings ("they go too", "best ride yet") read like a kids' show, so the judges
    may remember the charms and not the protocol.
  - *Accuracy leaks through the metaphor.* "They answer only to whoever holds the Satchel" turns the contract's owner check
    into a mood. A charm "yanked off the bar" suggests the chain leaves, not the coins. "Diary" undersells a public
    on-chain record. The charms are the chains, not the wallet, and the narration blurs that.
  - *Cost.* Character animation (expressions, scarves, party hats) takes the most time.

### Treatment B · "Every peel leaves a mark"

**Logline.** In a world made of stickers, a Satchel is the one sticker you can peel off and hand to anyone, with native coins
inside. Every signature it ever makes leaves an outline behind, so a buyer can see that none is still out there.

**Tone.** Tactile, "oddly satisfying" ASMR-pop: graphic, fast and rhythmic. The narration is minimal and the captions do
most of the work. The charms are décor here, not actors.

**Central device.** Sticker mechanics are the product's grammar: a slap adds, a peel hands over, an outline is a record,
a laminate means paused, and a stamp means checked. The backing sheet is the history.

| Time | Beat | We see | VO (spoken) | On screen |
|---|---|---|---|---|
| 0:00–0:04 | Peel | Macro on a sticker sheet: a fingernail lifts a coral card's corner. A slow, crisp peel takes it off whole, and it slaps onto a new sheet. | "This NFT is a wallet." | "This NFT is a wallet." |
| 0:04–0:09 | Inside | Three coin stickers (orange, lavender, violet) slap onto it in rhythm. | "Native Bitcoin, Ethereum and Solana, stuck to one token." | "Three chains. One token." |
| 0:09–0:14 | Mint | A fresh sheet. A new Satchel peels off and its three address stickers print. | "Mint one, and it comes with its own three addresses." | "Mint one." |
| 0:14–0:18 | Fill | Coin stickers fly in from an exchange sticker and a wallet sticker: slap, slap, slap. | "Fill it from any wallet or exchange." | "Fill it up." |
| 0:18–0:26 | Send | A sticker printer labelled "NEAR's signer network" prints a "Send 0.01 BTC" sticker, which slaps onto the Bitcoin lane. ETH and SOL repeat, faster. | "Send on all three chains. NEAR Chain Signatures signs each one, usually in about ten seconds." | "Send on all three." |
| 0:26–0:31 | No seed phrase | A seed-phrase sticker has no glue: it won't stick and falls off. | "There's no seed phrase to copy. Only the holder can sign." | "No seed phrase." |
| 0:31–0:38 | Give | The Satchel is peeled off alice's laptop and slapped onto bob's, swinging like a charm on the way. | "Give it away: peel it off, hand it over, and everything inside goes with it." | "Peel. Hand. Stick." |
| 0:38–0:47 | Use cases | Three fast slaps: onto a gift box, onto a trade ticket, onto a team laptop. | "Gift a funded wallet. Sell a position in one trade. Hand a treasury to the next team." | "Gift." "Sell." "Hand over." |
| 0:47–0:57 | The catch | Before the sale, a "Send 0.85 ETH" sticker is peeled off and hidden under the seller's thumb. After the sale it's slapped on, and the ETH coin peels away. | "But a signature peeled off before a sale can still be used after it." | "Peeled before." "Used after." |
| 0:57–1:04 | The backing | The sheet flips. The backing shows the outline of every signature ever peeled, including that one. | "On Satchel, it can't hide. Every signature leaves its outline on NEAR before it's made." | "Every peel leaves a mark." |
| 1:04–1:11 | The cutter | The die cuts only plain "send" shapes. A blank square (raw hash), an "approve forever" star and a "durable nonce" loop jam and spit out. A "satchelhq" hand finds no spare blade. | "It signs only plain transfers it can read. And there's no admin key. Not even ours." | "Plain transfers only." "No admin key." |
| 1:11–1:16 | Laminate | A price tag goes on and a clear laminate seals the sheet. | "List it, and the sheet is sealed. Nothing new gets signed." | "Paused for sale." |
| 1:16–1:27 | Stamps | In the buyer's browser, every outline gets a stamp, in rhythm. | "The buyer's browser checks every outline against its chain. Nonce used. Coin spent. Blockhash expired." | "Checked in your browser." |
| 1:27–1:32 | The live one | One outline stays empty and red: its sticker is still out there. | "One live signature, and Buy stays off." | "Blocked: 1 unused signature" |
| 1:32–1:44 | The trade | The sheet is clean. The payment sticker is stamped with the outline count. The Satchel peels off bob and slaps onto carol while the USDC slaps onto bob. | "Clean? Then one transaction, bound to that exact sheet, pays the seller and hands it over." | "One transaction." |
| 1:44–1:52 | End | The lockup slaps on. | "Satchel. Stick it on. Hand it over." | "Stick it on. Hand it over." |

- **Signature moment:** the backing reveal. The sheet flips to camera to show a grid of empty outlines. Stamps land on
  the downbeats, and one outline is left red.
- **Music arc:** a foley-built groove (peels, slaps and stamps as percussion over a tight 120 BPM house-funk beat). The catch
  filters down to a lonely peel loop. The backing reveal drops the full beat, with stamps on the downbeats, and the film
  ends on a final slap.
- **VO:** 191 words, about 74 s. **Runtime:** about 1:52.
- **Risks:**
  - *Metaphor collision.* The Satchel, the coins and the signatures are all stickers, so viewers may not know which sticker
    is which.
  - *"Why does a wallet have a backing sheet?"* The history needs a line of setup, and "outline on NEAR" is an odd phrase.
  - *Almost no real product UI.* The judges barely see mint, send, give or buy screens, which the human asked for.
  - *Design-reel risk*: Colosseum's "flashy visuals with little substance". With the charms as décor, there is less
    emotion and less sense of people.
  - *Cost* is low to medium (no acting), but the peel and laminate effects need render tests.

### Treatment C · "Cute on the outside"

**Logline.** Satchel looks like the friendliest wallet you've ever handed to a friend. Flip it over: underneath is a contract
built to be checked.

**Tone.** Deadpan, witty and confident, in two registers. The front of the card is Day: bouncy, with product UI and charms.
The back is Night: precise, with big plain statements. The flip is both the joke and the thesis.

**Central device.** The card's two sides. The front is what you do (the product); the back is why it can be handed over
(the engineering). The film peeks at the back after a few product beats, then flips for good at the catch.

| Time | Beat | We see | VO (spoken) | On screen |
|---|---|---|---|---|
| 0:00–0:04 | Front | Day. The card bounces in and the charms smile and wave. | "This is Satchel. It's cute." | "Cute." |
| 0:04–0:07 | Back | A hard flip to Night: the back of the card, with lines writing themselves ("record, then sign", "admin keys: 0"). | "It's also paranoid." | "Also paranoid." |
| 0:07–0:14 | What it is | Flip back to the front: three chain rows with native amounts, and a hand holding the card. | "On the front: one NFT with native Bitcoin, Ethereum and Solana inside. Whoever holds it holds everything inside." | "One NFT. Three chains." |
| 0:14–0:21 | Mint, fill | Mint is pressed, three addresses print and coins land. | "Mint one on NEAR. Fill it from any wallet or exchange." | "Mint it. Fill it." |
| 0:21–0:29 | Send | The Send flow ("Usually about 10 seconds"), ending on "Sent". | "Send on all three chains: approve in your NEAR wallet, and NEAR Chain Signatures signs." | "Send on all three." |
| 0:29–0:35 | Back peek | A quick flip: "No seed phrase · signs only for the holder". Then it flips back. | "On the back: no seed phrase. The contract signs only for the holder." | "Only the holder signs." |
| 0:35–0:43 | Give | The Give sheet, then the swing to bob. | "Give it to a friend, and everything inside goes too. No bridge. No wrapped tokens." | "Give it." |
| 0:43–0:53 | Use cases | Gift, trade and treasury vignettes. | "Gift a funded wallet. Sell a position in one trade. Hand a treasury to the next team." | "Gift." "Sell." "Hand over." |
| 0:53–1:02 | The catch | On the front, a seller pockets a signed slip, sells, and uses the slip later. | "But a signature made before a sale can still be used after it." | "Signed before. Used after." |
| 1:02–1:06 | Question | A buyer's cursor hovers. | "So how does a buyer know it's clean?" | "Is it clean?" |
| 1:06–1:10 | The big flip | The card flips for good, and the whole world turns with it, Day to Night. | "Here's the paranoid part." | "The paranoid part." |
| 1:10–1:20 | Record, no key | On the back, a record line writes itself before each signature. A key slot reads "0". | "Every signature goes on the record, on NEAR, before NEAR's signer network makes it. And there's no admin key. Not even ours." | "Recorded first." "No admin key." |
| 1:20–1:27 | Plain, paused | Refused requests bounce off. Frost spreads with "Paused for sale". | "It signs only plain transfers it can read. List it, and signing pauses." | "Plain transfers only." |
| 1:27–1:38 | The check | The rows resolve in the buyer's browser. | "The buyer's browser checks every record against each chain. Nonce used. Coin spent. Blockhash expired." | "Clean history." |
| 1:38–1:43 | Blocked | Satchel #4 shows one unused signature. | "One live signature, and Buy stays off." | "Blocked: 1 unused signature" |
| 1:43–1:53 | Flip back | The card flips to its front as it swings to carol, and Day returns. | "Clean? One transaction, bound to that exact history, pays the seller, and the buyer gets everything inside." | "Satchel #7 is yours." |
| 1:53–2:00 | End | The lockup lands. | "Satchel. Cute on the outside. Paranoid on the inside." | "Cute outside. Paranoid inside." |

- **Signature moment:** the big flip at 1:06. The card turns and the world flips with it, from Day to Night: "Here's
  the paranoid part."
- **Music arc:** bright toy-pop on the front, with each peek at the back a hard cut to a low synth sting. The big flip
  drops into a tight, serious, driving beat. The flip back resolves the toy melody on the serious kit.
- **VO:** 205 words, about 79 s. **Runtime:** about 2:00.
- **Risks:**
  - *Tone.* "Paranoid" is a security compliment to VCs ("only the paranoid survive") but clashes with the brand's
    friendly voice. Calling yourself "cute" can feel smug.
  - *Legibility.* The back invites dense mono text that won't read on a phone, and frequent flips become a gimmick.
  - *Gloom.* About 45 s of Night goes against the human's feedback that the landing was "too serious and gloomy for a
    wallet app".
  - *Accuracy.* Keep "paranoid" about the contract's behaviour, and never say "most secure" or "trustless".

### Comparison

| | A · Along for the ride | B · Every peel leaves a mark | C · Cute on the outside |
|---|---|---|---|
| Muted hook by 0:05 | strong (faces), but "what it is" only lands by 0:11 | strong (the satisfying peel), but abstract | strong and witty, but leans on the VO joke |
| Product half: the real app on screen | good | weak (metaphor, little UI) | good |
| Tech crisp enough for VCs | medium (narrated metaphors) | high (one precise image) | high |
| Brand 2.0 fit | strongest on the charms | strongest on stickers | medium ("paranoid", long Night) |
| One image people remember | the ride | the backing sheet of outlines | the big flip |
| Cost (2 weeks, Remotion, 2D) | medium-high | low-medium | low |
| Accuracy risk | medium | medium | low-medium |

---

## 3. Recommendation: "Hand it over" (a merge)

**What it takes from each treatment.**
- **From A**, the charms as the characters: faces in frame 0, reactions and the ride. One Satchel (#7) passes through
  three holders: alice, then bob, then carol. The VO stays literal and never narrates feelings; the charms do the emoting.
- **From B**, the back of the card as the history. Each signature appears as a dashed outline *before* it is signed. The
  buyer's check stamps every outline, and an unused one stays red. That one picture shows both "recorded first" and "the
  buyer checks every record". The VO never says "sticker".
- **From C**, a single flip as the film's turn. The catch ends, the card flips, Day returns and the VO says "Satchel keeps
  the receipts." The card flips back during the buy. The film never says "paranoid", the tech plays in Day and only the
  catch is Night.
- **From the brand**, the spine. "Stick it on. Hand it over." opens the film as an action (the coins snap on, the card is
  handed over) and closes it as a promise.

**Why this one.**
- **The hook works muted.** In 3 s there is a whole story with faces and a hand. By 0:05 the captions have said "Stick it
  on. Hand it over. Bitcoin. Ethereum. Solana. One NFT."
- **The balance is what the human asked for.** The product runs 0:00–0:58, the catch and the tech 0:58–1:55, and the buy
  is both. The product half shows the real flows (mint, fill, send, give, use cases), each with a charm moment.
- **The tech plays as a step-by-step proof a NEAR co-founder can follow:**
  1. complete: every signature goes on the record first;
  2. no bypass: there is no admin key, so the contract can't sign off the record;
  3. checkable: it signs only plain transfers it can read;
  4. final: signing pauses while it's for sale;
  5. checked: the buyer's browser checks every record;
  6. gated: one live signature keeps Buy off;
  7. bound: the buy is one transaction tied to that exact history.

  The words are the exact ones the jury uses: nonce, coin, blockhash, raw hash, token approval, durable nonce.
- **It is all brand 2.0**: stickers, charms, the swing and the coral card, mostly in Day. Day/Night is the brand's own
  theme system, used once as the catch.
- **It is buildable.** It is all 2D vector work in the existing Remotion project, timeline pipeline and mastering chain. The
  new parts are a charm rig, sticker hands, a peel transition, the flip, frost and stamps.

**The spine (but/therefore).** Stick three chains on one NFT, **therefore** you can hand a whole wallet over. **But** a
signature made before the sale can still be used after it. **Therefore** Satchel puts every signature on the record first,
has no admin key to bypass it, signs only what can be checked, and pauses while it's for sale. **Therefore** the buyer's
browser can check every record, **and** the buy is one transaction bound to exactly that history.

*Salvage from C:* "Cute on the outside. Paranoid on the inside." could be the X post's first line. That's the human's call.

---

## 4. Production script: "Hand it over" (v3)

### 4.1 Specs and world bible

- **Format.** 1920×1080, 30 fps. 120 BPM: a beat is 15 frames and a bar is 60 frames. Final timing comes from the voiced
  lines, snapped to the grid (`tools/audio/run.mjs` writes `timeline.json`). Master at −14 LUFS / −1 dBTP with
  `tools/render-master.sh`. Keep key text inside the centre 1080×1080 so a square recut works.
- **Palette.**
  - Day (ground `#F6F5FB`, surface `#FFFFFF`, ink `#1D1340`) everywhere except the catch (C1), which is Night (ground
    `#120C26`, surface `#1C1538`, ink `#F4F2FF`).
  - Coral `#FF5C4D` is the card band and the one primary button per frame, and never text.
  - Lemon `#FFD84D` and sky `#8FD3FF` are sticker accents only: sleeves, the "New" badge, the backdrop behind the charms.
  - States: success for Sent, the stamps and Clean history; frozen (blue, snowflake) for signing and Paused for sale;
    danger for the signed slip, Unused and Blocked.
- **Type.**
  - Funnel Display 800 for captions and titles, in sentence case at 110–160 px: ink on Day, `#F4F2FF` on Night.
  - Onest for UI and supers. Geist Mono only for addresses, hashes and record labels.
  - Only the hook and end captions get the sticker treatment: white fill, ink outline, hard ink shadow. All other
    captions are plain ink so they read fast.
  - Captions slap in: scale 1.2 → 1, the shadow snaps from 0 to 8 px, with a tilt of up to ±2°. The logo never tilts.
- **Stickers, not glass.** Ink outlines are 3 px at UI scale and about 6 px at hero scale. Shadows are hard ink offsets with
  no blur. No glow, gradients, neon or 3D coins.
- **The Satchel card (hero: Satchel #7).**
  - The front is 1.586:1, radius 28 (scaled), with a coral band reading "Satchel #7" and a white body showing native
    balances, never fiat. A charm bar runs along the bottom edge, and the three charms hang from it on short ink stems.
  - The back is a white backing with dashed outlines (2 px dashed ink, dash 8/6) and the header "History · N signatures".
- **The charms.**
  - BTC is orange `#F7931A`, ETH lavender `#A3ABE0` and SOL violet `#C08CFF` (illustration fills on both themes). Each has
    a 3 px ink outline, a hard shadow, two dot eyes and a one-stroke mouth.
  - Allowed expressions: open dots, closed arcs (joy), wide dots (surprise), and a mouth that smiles, goes flat or makes an
    "o". No eyebrows, no limbs, no chain logos. They never speak.
  - Their personalities come from swing physics. BTC is heavy and slow (period ≈ 0.9 s) and lands last. ETH is curious
    (period ≈ 0.7 s), tilts its head ±6° and notices things first. SOL is quick (period ≈ 0.45 s), overshoots and reacts
    first.
  - They act with their bodies. To "stamp", a charm swings up and bonks the outline.
- **The swing (the brand's signature motion).**
  - Lift: y −12 px, scale 1.04, rotate up to 10° toward the direction of travel.
  - Slide: 600 ms with a pendulum (−10° → +5° → −2° → 0).
  - Land: the shadow returns to 4 px.
  - The charms follow 60–90 ms behind at 1.5× the amplitude, with their eyes closed, and the jingle plays at the apex.
  - Every hand-off uses it. In the catch, the sale uses it with flat faces.
- **Hands and holders.**
  - Flat sticker hands share one neutral fill and an ink outline. Sleeves and small mono name tags tell them apart:
    alice.near is lemon, bob.near sky, carol.near white with ink stripes. The seller in the catch has an ink sleeve and
    the stranger a grey one. The team's hand has a plain sleeve with a "satchelhq" tag.
  - Every tap presses its button 4 px into its shadow.
- **Props.**
  - The signed slip: a jagged edge, a danger outline, a scribble and "Send 0.85 ETH · signed".
  - Coin stickers: plain coins in the chain colours, with no logos.
  - The price tag "250.00 USDC", the frost laminate with the snowflake pill, and the success stamps.
  - The contract plaque `satchel.satchelhq.near` with an empty key slot.
  - The gift box, the trade desk and the relay baton.
- **Transitions.**
  - The slap-in is the default.
  - The peel (the whole frame curls off like a sticker) is used twice: H2→P1 and T7→E1.
  - Whips use 2-frame smears, and the camera punches in.
  - There is one 3D flip (T0) and its return in T7. Night falls in C1 as a blind-wipe from the top, and Day returns
    with the flip.
- **UI.**
  - Product screens are recreated in a phone frame (8 px ink bezel, radius 40), following the brand 2.0 In-context
    board, with real product copy only.
  - The consequences happen outside the phone: the card leaps out of the frame into the world.
- **Voice.** One narrator: warm, smiling, adult, about 155 wpm. Use a slight wry tilt on "Not even ours." and "Satchel
  keeps the receipts." Never cutesy, and no character voices. Re-audition, because v5's Brian read was built for the
  leather brand.

### 4.2 Voiceover

One file per line; the ids are stable. The times are targets, and the pipeline re-times from the voiced files.

| id | line | scene | words | ≈ start |
|---|---|---|---|---|
| V01 | Stick it on. | H1 | 3 | 0:00.9 |
| V02 | Hand it over. | H1 | 3 | 0:02.1 |
| V03 | Native Bitcoin, Ethereum and Solana, in one NFT. | H2 | 8 | 0:03.1 |
| V04 | Whoever holds the Satchel holds everything inside. | H2 | 7 | 0:06.6 |
| V05 | Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses. | P1 | 14 | 0:10.3 |
| V06 | Fill it from any wallet or exchange, straight to its addresses. | P2 | 11 | 0:16.3 |
| V07 | Then send from it, on all three chains. | P3 | 8 | 0:22.3 |
| V08 | Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction. | P3 | 13 | 0:25.4 |
| V09 | There's no seed phrase to copy. The contract signs only for the holder. | P4 | 13 | 0:32.3 |
| V10 | Give it to a friend, and everything inside goes with it. No bridge. No wrapped tokens. | P5 | 16 | 0:38.3 |
| V11 | Gift a funded wallet. | P6 | 4 | 0:46.3 |
| V12 | Sell a whole position in one trade. | P6 | 7 | 0:50.3 |
| V13 | Hand a treasury to the next team. | P6 | 7 | 0:54.3 |
| V14 | But there's a catch. | C1 | 4 | 0:58.4 |
| V15 | A signature made before the sale can still be used after it. | C1 | 12 | 1:00.8 |
| V16 | So how does a buyer know it's clean? | C1 | 8 | 1:08.4 |
| V17 | Satchel keeps the receipts. | T0 | 4 | 1:13.6 |
| V18 | Every signature goes on the record, on NEAR, before NEAR's signer network makes it. | T1 | 14 | 1:16.3 |
| V19 | And there's no admin key. Not even ours. So it can't sign anything off the record. | T2 | 16 | 1:22.3 |
| V20 | It only signs plain transfers it can read, so each one can be checked later. | T3 | 15 | 1:28.8 |
| V21 | List it, and signing pauses. The history stops growing. | T4 | 9 | 1:34.8 |
| V22 | Then the buyer's browser checks every record against each chain. | T5 | 10 | 1:38.8 |
| V23 | Nonce used. Coin spent. Blockhash expired. (three phrases on beats: 1:42.8 · 1:44.2 · 1:45.6) | T5 | 6 | 1:42.8 |
| V24 | If one old signature could still move coins, Buy stays off. | T6 | 11 | 1:50.0 |
| V25 | When it's clean, one transaction, bound to that exact history, pays the seller, | T7 | 13 | 1:54.8 |
| V26 | and the buyer gets everything inside. | T7 | 6 | 2:00.1 |
| V27 | Satchel. Stick it on. Hand it over. | E1 | 7 | 2:05.0 |

**Total: 249 words**, about 96 s of voice at 155 wpm. The product lines (V01–V13) have 114 words, the catch and tech lines
(V14–V26) 128, and the close 7. Runtime is about **2:12** with music breaths.

### 4.3 Scenes

| id | beat | time · length | what we see | on-screen text |
|---|---|---|---|---|
| H1 | Stick it on, hand it over | 0:00–0:03.4 · 3.4 s | See §4.4. On a Day ground, the three charms snap onto Satchel #7's charm bar, one per beat, and their eyes pop open. alice's hand peels the card off (a 4-frame glimpse of its back, with faint dashed outlines: the plant) and swings it to bob's hand. | "Stick it on." → "Hand it over." |
| H2 | One NFT | 0:03.4–0:10 · 6.6 s | The camera punches in on the charms, and each wiggles as its name lands. It pulls back to the whole card. On "Satchel" the lockup slaps in at top left, and bob's hand gives the card a little bounce. | "Bitcoin. Ethereum. Solana." → "One NFT." → lockup + "Whoever holds it holds everything inside." |
| P1 | Mint | 0:10–0:16 · 6 s | The lockup peels away to reveal a phone frame on the Mint screen. The preview card reads "New Satchel" with three addresses listed, above a coral "Mint a Satchel" button. alice's thumb presses it; "Approve in your wallet…" then "Minting…". The card leaps out of the phone as **Satchel #7** with a lemon "New" badge, and the charms snap on (a quicker echo of the hook). Three address tags print in Geist Mono: `bc1q9h…x4d7` · `0x8f2a…41c9` · `7xKX…gAsU`. A chip reads "Standard NEAR NFT", and the title "Satchel #7 is yours." appears. | "Mint a Satchel." → "Three addresses. One NFT." |
| P2 | Fill | 0:16–0:22 · 6 s | The Receive screen: QR, "This Satchel's Bitcoin address", Copy. An Incoming row goes from "+0.0513 BTC · in mempool" to "Received". Outside the phone, coin stickers fly in from two generic stickers (an exchange building, a wallet), and each charm gulps its coin (squash, cheeks puff). The tags count up to 0.0513 BTC · 0.90 ETH · 13.65 SOL. | "Fill it up." → "Straight to its addresses." |
| P3 | Send | 0:22–0:32 · 10 s | **Steps:**<br>1. "Send Bitcoin": 0.0100 BTC (hero size), to `bc1q…y8sd`, "Network fee ~282 sats · paid by this Satchel".<br>2. "Send 0.0100 BTC" is pressed, and a neutral "Your NEAR wallet" sheet opens. Approve.<br>3. The tracker: "Approved in your wallet ✓", then "Signing with NEAR's signer network · Usually about 10 seconds" (a frozen pulse; the timer jump-cuts from 0:03 to 0:09), then "Broadcast to Bitcoin ✓".<br>4. Toast: "Sent 0.0100 BTC". The BTC charm flicks a coin off frame.<br>5. Two 0.7 s flashes: "Sent 0.05 ETH" (the ETH charm flicks), then "Sent 1.25 SOL" (SOL flicks fastest). | "Send on all three." → "NEAR Chain Signatures signs." |
| P4 | No seed phrase | 0:32–0:38 · 6 s | A lemon sticky note with 12 words flutters in, tries to stick to the card, slides off and drops out of frame. A stranger's hand (grey sleeve) taps Send on the card; the card wobbles "no" and a pill pops up: "Not the holder". The charms side-eye the stranger. | "No seed phrase." → "Only the holder signs." |
| P5 | Give | 0:38–0:46 · 8 s | The Give sheet: "Give Satchel #7", To `bob.near` ("Account found"), "Bob gets everything inside: 0.0412 BTC · 0.85 ETH · 12.4 SOL". "Give it to bob.near" is pressed. **The swing** follows at full size, alice to bob: the charms ride with their eyes closed and the jingle plays at the apex. alice waves. | "Everything inside goes too." → "No bridge. No wrapped tokens." |
| P6 | Use cases | 0:46–0:58 · 12 s | Three 4 s sticker vignettes, each ending on the swing and the jingle:<br>(a) A gift box pops open, and Satchel #12 rises with its charms in tiny party hats. It swings to `sam.near`.<br>(b) An OTC desk: a heavy Satchel (4.20 BTC · 60 ETH · 900 SOL) swings right as a "250,000 USDC" stack slides left, and they cross mid-table.<br>(c) A relay: a "Team treasury" Satchel passes like a baton from `old-team.near` to `new-team.near`.<br>The scene ends on the three cards swinging in sync. | "Gift a funded wallet." → "One trade. Whole position." → "Hand over a treasury." |
| C1 | The catch | 0:58–1:12 · 14 s | **Steps:**<br>1. The music cuts, and Night falls as a blind-wipe from the top.<br>2. A seller's hand (ink sleeve) holds a Satchel with no number visible. It taps Send "0.85 ETH". A signed slip (jagged, danger outline, a scribble) pops out and, instead of being sent, slides into a back pocket. The ETH charm's eyes follow it.<br>3. The sale: the card swings to a buyer's hand (white sleeve), with the charms' mouths flat.<br>4. After the sale, the slip comes out of the pocket and slaps onto an "Ethereum" strip. The ETH charm's coins whoosh to the seller, its tag drops from 0.85 ETH to 0, and its face goes "o" and grey.<br>5. The buyer's hand freezes, and the other two charms look at us. | "But there's a catch." → "Signed before the sale." → "Used after it." → "Is it clean?" |
| T0 | The flip | 1:12–1:16 · 4 s | A whip to Satchel #7, listed, in bob's hand. The card **flips** (the film's one 3D flip), and Day sweeps back in with the rotation. Its back holds three dashed outlines, one for each P3 send, each with a chain dot and a mono label, under the header "History · 3 signatures". This pays off the H1 plant. | "Satchel keeps the receipts." |
| T1 | On the record | 1:16–1:22 · 6 s | A macro on one outline being born, with the history header out of frame. The dashed outline draws itself and its label types: `ETH · nonce 1`. A pill pulses: "Signing with NEAR's signer network · Usually about 10 seconds". The signature then prints into the outline ("Signed"), and the sticker peels out and flies off toward Ethereum, leaving the outline behind. | "Recorded first." → "Then signed." |
| T2 | No admin key | 1:22–1:28.5 · 6.5 s | The camera pulls back to the contract, a sticker plaque reading `satchel.satchelhq.near`. Its key slot holds an empty dashed key shape and a "0". A hand with a "satchelhq" sleeve tag reaches in, finds nothing and wiggles its fingers, and the charms giggle. A small mono footnote for people who pause: "Access keys: 0 · Born in one transaction · No key ever added". | "No admin key." → "Not even ours." |
| T3 | Plain transfers only | 1:28.5–1:34.5 · 6 s | A slot labelled "Satchel signs" sits on the card's edge, and request stickers arrive on the beat:<br>• "Send 0.01 BTC → bc1q…" can be read, so it passes and gets an outline.<br>• "Raw hash 0x8cb1…" is blank: it bounces with "Can't read it".<br>• "Approve unlimited tokens" bounces.<br>• "Durable nonce" bounces. | "Plain transfers only." |
| T4 | Paused for sale | 1:34.5–1:38.5 · 4 s | bob slaps a price tag, "250.00 USDC", on the card's corner; a tiny list sheet shows "Ready to list ✓". A frost laminate sweeps across, with the pill "Paused for sale" (snowflake, frozen blue). A hand tries Send and slides off the frost. The history header frosts over at "3 signatures". There is no countdown anywhere. | "Paused for sale." |
| T5 | The check | 1:38.5–1:49.5 · 11 s | **Steps:**<br>1. carol's browser (`carol.near`) shows Satchel #7's sale page with its history panel and "Checked in your browser". A scan beam sweeps the three outlines.<br>2. On the V23 beats, each charm swings up and bonks its own outline, leaving a success stamp: ETH "Nonce used", BTC "Coin spent", SOL "Blockhash expired".<br>3. The verdict: a shield-check, "Clean history" and "Clean. No past signature can move these coins."<br>4. The coral "Buy for 250.00 USDC" lights up, and the charms cheer. | "Checked in your browser." → (the stamps carry the three phrases) → "Clean history." |
| T6 | Blocked | 1:49.5–1:54.5 · 5 s | A tab switch to Satchel #4. Its back has one red dashed outline: `ETH · nonce 12 · Unused`. At the frame edge, C1's jagged slip pokes out of a back pocket (the callback). #4's ETH charm bonks the red outline and looks at us. A banner reads "Blocked: 1 unused signature", and Buy is greyed out with the reason under it. | "Blocked: 1 unused signature" |
| T7 | The hand-off | 1:54.5–2:04.5 · 10 s | **Steps:**<br>1. Back to #7: carol presses "Buy for 250.00 USDC". The button reads "Re-checking history…", then "Approve in your wallet…".<br>2. The price tag clips to the card with a mono line: "bound to 3 signatures".<br>3. **One move**: the card flips to its front (the frost melts) and swings like a charm from bob's hand to carol's, while the USDC tag flies to bob on "pays the seller". They cross mid-frame and land on the 2:00 downbeat with the jingle.<br>4. "Satchel #7 is yours." and "You now control 0.0412 BTC · 0.85 ETH · 12.4 SOL." The charms cheer. | "One transaction." → "Satchel #7 is yours." |
| E1 | End card | 2:04.5–2:12.5 · 8 s | The frame peels away to the end card (§4.5). | §4.5 |

**Keep the numbers consistent.** Fill 0.0513 BTC · 0.90 ETH · 13.65 SOL, then send 0.0100 BTC · 0.05 ETH · 1.25 SOL. The
Give sheet and the sale show 0.0412 BTC · 0.85 ETH · 12.4 SOL, because the fees round away at this precision. #7's history
is exactly the three P3 sends, so it reads "3 signatures" from T0 to T7. T1 is a macro with the header out of frame, so its
outline never changes the count.

### 4.4 The opening 5 seconds, frame by frame (30 fps)

| frame | time | picture | text | sound |
|---|---|---|---|---|
| 0 | 0.00 | Day ground. Satchel #7's card (coral band, white body, ink outline, hard shadow) is already sliding up into the centre, 85 % of the way there, with an empty charm bar. The BTC charm is mid-fall at top left, eyes closed, with a 3-frame smear. This is the poster frame: a coral card and one sleeping orange face. | — | the first glockenspiel note |
| 1–4 | 0.03–0.13 | The card settles (expo-out) as BTC falls. | — | — |
| 5 | 0.17 | BTC snaps onto its hook: a 0.85 squash, and the swing begins. The caption starts its slap. | "Stick it on." (lands f9) | SNAP 1 |
| 7 | 0.23 | BTC's dot eyes pop open and it smiles. | | |
| 15 | 0.50 | ETH snaps on from top centre while BTC is still swinging. | | SNAP 2 |
| 17 | 0.57 | ETH's eyes open and it tilts toward BTC. | | |
| 25 | 0.83 | SOL zips in from top right, overshoots its hook by 40 px and springs back, eyes already open, with the biggest grin. | | SNAP 3 (brighter) |
| 27–48 | 0.90–1.60 | All three swing at their own speeds: BTC slow, ETH medium, SOL quick. | | VO V01 "Stick it on." |
| 48 | 1.60 | alice's hand (lemon sleeve, small tag `alice.near`) enters from the left and pinches the card's top-left corner. | | |
| 52–56 | 1.73–1.87 | The corner peels up. For 4 frames the curl shows the card's back: faint dashed outlines (the plant, paid off at 1:12). | "Stick it on." peels off; "Hand it over." slaps in (lands f58) | PEEL |
| 56–78 | 1.87–2.60 | **The swing**: the hand lifts the card to +10° and passes it right with the pendulum (−10° → +5° → −2° → 0) over 600 ms. The charms trail on their stems with their eyes closed. | | VO V02 "Hand it over." (f62–84); JINGLE at the apex (f66) |
| 78 | 2.60 | bob's hand (sky sleeve, tag `bob.near`) catches the card, and it lands with a small bounce. | | the groove kicks in on the landing |
| 80–93 | 2.67–3.10 | The camera punches in from 1.0 to 1.3 toward the charms, and the hands slide out. | "Hand it over." holds | |
| 93 | 3.10 | | | VO V03 begins: "Native Bitcoin…" |
| 99 | 3.30 | BTC wiggles. | "Bitcoin." | a tick |
| 108 | 3.60 | ETH tilts. | "Bitcoin. Ethereum." | a tick |
| 117 | 3.90 | SOL hops. | "Bitcoin. Ethereum. Solana." | a tick |
| 147 | 4.90 | The camera pulls back to the whole card, and the three words peel away. | "One NFT." slaps in | VO "…in one NFT." (≈ 5.0–5.8) |
| 150 | 5.00 | The card is centred, three faces smile at the camera, and "One NFT." has landed and is still. | "One NFT." | |

**By 0:05, a muted viewer has seen:**
- motion from frame 0, faces from 0.2 s and a human hand at 1.6 s;
- a complete micro-story: the coins stick on, then the Satchel is handed over;
- the brand's colour and sticker look throughout;
- six caption words that carry the idea.

From 5–10 s, V04 and the lockup add the name and the promise. Sound-on viewers get three snaps, a peel and a jingle before
the first full sentence.

### 4.5 The closing line and end card

- **Closing line (V27):** "Satchel. Stick it on. Hand it over." It bookends the hook. By now, "hand it over" carries
  the clean history with it.
- **End card** on the Day ground, held at least 5 s:
  - The lockup (`brand-v2/logo/satchel-lockup-on-light.svg`), centred at about y 38 %, with clear space of a quarter of
    the tile. It slaps in by scale and drop only: no rotation, no glow, never on coral.
  - The headline **"Stick it on. Hand it over."** in Funnel Display 800, about 96 px, ink, with the sticker treatment.
  - Under it, in Onest 600 at about 40 px, ink-muted: "Bitcoin, Ethereum and Solana in one NFT." and "Every signature
    on the record."
  - The footer, in Onest 500 at about 28 px: "Built on NEAR Chain Signatures · NEAR HACKATHON 2026 · `[TBD: app URL]`".
  - The charm bar (`brand-v2/illustration/satchel-charms-chains.svg`) at top right, as in the OG image. It swings gently,
    the charms blink in turn, and SOL gives a last bounce.
  - **Motion order:** the lockup, then the headline (+0.4 s), the two lines (+0.3 s apart) and the footer. On the 2:10
    downbeat the mark does the brand's button press (4 px down into its shadow and back) with a soft slap. Silence in the
    last 0.5 s.

### 4.6 Music and sound

| cue | time | what |
|---|---|---|
| M1 Hook | 0:00–0:10 | Three snaps (0.17 · 0.50 · 0.83 s), a glockenspiel pickup, the jingle at the swing apex (2.2 s), then the groove kicks in on the landing (2.6 s). Bright indie-pop at 120 BPM: handclaps, plucked bass, glockenspiel, a whistled hook. |
| M2 Product | 0:10–0:46 | The groove builds every 8 bars: a pop for the mint, coin plinks on eighths, send whooshes. A 1-bar comic break at 0:32 (a descending slide as the seed note slips off), then a lift into the give swing (the jingle at about 0:43). |
| M3 Use cases | 0:46–0:58 | The chorus, warmest and fullest. The three swings land on bar downbeats with the jingle. |
| M4 Catch | 0:58–1:12 | A hard stop at 0:58.0 (one muted pluck) and Night. A low heartbeat pulse from 1:00 with a ticking hi-hat. A dull thud at about 1:06 when the slip is used, a sub hit at 1:08, then near silence. |
| M5 Flip | 1:12–1:16 | A 2-bar riser, a whoosh on the flip (1:13), Day back, and the **drop** at 1:16.0. |
| M6 Tech | 1:16–1:49 | A driving groove: the hook melody in a confident register on a heavier kit. Accents: the outline drawing itself, a comic "tok" at the empty key slot, three "boop" bounces on the beats, a frost shimmer, the scan sweep, three stamp hits on "Nonce used / Coin spent / Blockhash expired", and a bright chord on "Clean history". |
| M7 Blocked | 1:49.5–1:54.5 | The band drops to bass and tick for 2 bars, with a soft deflating "wah" on the banner. No horror sting. |
| M8 Hand-off | 1:54.5–2:04.5 | A high-pass sweep builds 1:55–1:59, then a snare roll, then the **landing** on 2:00: a big slap, the jingle and the full band. |
| M9 Outro | 2:04.5–2:12.5 | The whistled hook resolves, a final slap on the mark's press (2:10), a ring-out, and silence in the last 0.5 s. |

- **SFX to build:** sticker slap, peel, charm snap-on, the charms' jingle (the sonic signature of the swing), coin plink,
  gulp, whip whoosh, stamp, frost shimmer, bounce boop, scan sweep, pocket slide, thud, sub hit and button press.
- **Density:** 1–3 sounds per second at most, and leave the VO clear.
- **Mix:** VO on top, music ducked about 13 dB under it.

### 4.7 Risks for this script, and what defuses them

- **"Too cute for VCs."**
  - The charms never talk and the narrator is an adult. The VO is literal: every tech line names the exact mechanism.
  - The real product flows are on screen.
  - The tech plays as a sequence of steps a protocol person can check: on the record, no admin key, plain transfers,
    paused, browser check, blocked, bound buy.
  - Phantom shows that crypto natives accept a friendly character on a serious wallet.
- **The metaphor stays in the picture.** The VO never says "sticker", "outline" or "diary". The outlines are literally
  "the record", and the stamps are the chains answering.
- **Accuracy traps to watch in review:**
  - "native", not "real";
  - "send on all three chains", never "spend it like any wallet" (Satchel refuses contract calls and approvals);
  - "clean", never "safe";
  - the check runs in the buyer's browser, and "Buy stays off" is the app;
  - "can't sign anything off the record" is about the contract. It doesn't claim that NEAR's signer network is trustless,
    and we never say so;
  - no countdown after listing;
  - no "every chain", no fiat, "Give" not "Transfer", "Usually about 10 seconds".
- **Production traps:**
  - The peel and the flip need render tests early; fake the curl with a clip-path and a white back triangle.
  - The charm rig (eyes, mouth, stem spring) is reused in about 12 scenes, so build it first.
  - Keep `CameraMotionBlur` to whips of 0.4 s or less (cookbook §6).
- **"Satchel keeps the receipts."** It's slangy, and it's also a NEAR pun: a receipt is NEAR's unit of execution, and the
  record is written in the same receipt as the signing call. If the human finds it too cute, swap in "Flip it over."

### 4.8 Fact check

| Claim (line) | Source |
|---|---|
| Native BTC, ETH and SOL addresses in one NFT (V03, V05) | `README.md` intro: "Each token controls its own native Bitcoin… Ethereum… and Solana… addresses" |
| Whoever holds it holds everything inside; give it and everything goes with it; no bridge, no wrapped tokens (V04, V10) | README intro; brand 2.0 Main board; kb/80 Give review ("Its addresses go with it") |
| Fill from any wallet or exchange; send on three chains; approve in a NEAR wallet; NEAR Chain Signatures signs (V06–V08) | README "How it works"; kb/80 Receive and Send; D-40 (SOL send flow built, flag on); "Usually about 10 seconds" from the app team (2026-10-26) |
| No seed phrase; the contract signs only for the holder (V09) | README "The problem"; "Only the current owner can call `sign_for`" |
| A signature made before the sale can be used after it (V15) | README "The problem" |
| Every signature on the record on NEAR before the signer network makes it (V18) | README "The record comes before the signature"; kb/70 TL;DR 3 |
| No admin key, not even ours; can't sign off the record (V19) | README "born without a key", "no access keys", "never signed a transaction"; kb/70 TL;DR 9 (any key could sign without a record, which is why there are none) |
| Only plain transfers it can read (V20); T3's refusals | README: refuses raw hashes, permits, EIP-7702 authorizations, contract calls, other chains, non-ALL sighash and durable nonces |
| Listing pauses signing; the history stops growing (V21) | README "While listed, signing and transfers are refused" |
| The buyer's browser checks every record: nonce used, coin spent, blockhash expired (V22, V23) | README "Clean history runs in the buyer's browser" and "What 'Clean history' means" |
| Buy stays off if one could still move coins (V24) | README "The app disables Buy until the check passes" (the contract does not enforce it) |
| One transaction bound to that exact history pays the seller (V25, V26) | README: `buy(token_id, listing_id, expected_sig_count)` fails if anything changed, and the seller is paid in the same transaction |
| No wait to buy (T4 shows no countdown) | kb/90 §5.7 and D-05 rev 2: "no post-listing buy cooldown"; the only wait is the quiet period before `list` |
| #4 is blocked with "1 unused signature" (T6) | README "Demo token #4 is blocked on purpose"; D-32 |
| "Paused for sale", "Give", no fiat, no "every chain" | brand 2.0 README content table; app-team corrections (2026-10-26) |

### 4.9 Open items for the human and the team

1. **SOL send in the shipped app.** D-40 builds and flags it, but the full SOL UI is first in the cut order. If the
   submitted app hides it, keep P3's SOL flash as the "Sent 1.25 SOL" toast only, or drop the flash. The SOL address and
   the "Blockhash expired" stamp stay either way.
2. **The Give sheet's "Clean history: no unused signatures" line** (brand canvas). The film leaves it out unless the
   rebuilt app ships it, which also keeps the reveal for T5.
3. **Cast numbers.** #7 is the hero (the brand canvas sample) and #4 the blocked one (it matches the real demo #4).
   250.00 USDC is illustrative; the real demo sells #3 for 5.00 USDC. Decide whether any real screen recordings will be
   cut in, and if so, match them.
4. **Voice.** Audition two or three warmer reads before voicing.
5. **"Satchel keeps the receipts"**: keep it, or swap in "Flip it over."
6. **The X post's first line** (not posted; the human's call): the brand line, or C's "Cute on the outside. Paranoid on
   the inside."
