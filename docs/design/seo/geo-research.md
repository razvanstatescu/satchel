# GEO research for usesatchel.xyz

Date: 2026-11-06. Scope: how to get the Satchel site understood, retrieved and cited by AI answer engines (ChatGPT
search, Perplexity, Google AI Overviews / AI Mode, Claude, Copilot). This is research only. Nothing in the app was
changed.

**How to read the confidence tags**

| Tag | Meaning |
|---|---|
| **[Official]** | Stated in the engine or crawler operator's own documentation. Highest confidence for *what the system does*, though it says nothing about how much a tactic helps. |
| **[Causal]** | A controlled or benchmark experiment (lab benchmark, matched difference-in-differences). |
| **[Corr]** | Large-sample correlational analysis. It shows what cited pages look like, not what *makes* them cited. |
| **[Small]** | A single-site or single-page test. Directional only. |
| **[Opinion]** | My judgement or industry consensus without data. |

Most GEO advice online is [Opinion] presented as fact. Where the evidence conflicts, both sides are given below.

---

## 1. Summary

1. **You can't be cited if you aren't retrieved, and retrieval runs through the classic search indexes.** Google says
   AI Overviews and AI Mode need nothing beyond being indexed and eligible for a snippet [Official]. ChatGPT search
   citations track Bing closely: 87% matched Bing's top results in one study [Corr], and Copilot is built on Bing.
   The site doesn't show up today for any query we tested, not even its own name (§3.8). So step one is to get indexed:
   verify the site in Search Console and Bing Webmaster Tools, submit the sitemap, and ping IndexNow.
2. **Content must be in the server HTML as visible text.** ChatGPT, Claude and Perplexity (crawlers and user-triggered
   fetchers alike) don't run JavaScript [Official/Corr/Small]. No tested system read facts that were only in JSON-LD
   [Small]. Our pages already render on the server (verified with crawler user agents), so the job is to keep it that way.
3. **What gets cited: the top of the page, self-contained factual sentences, numbers and sources.** About 44% of
   ChatGPT citations come from the first 30% of a page [Corr]. In AI Mode and Gemini, 92% of cited sentences are 6–20
   words long [Corr]. In the original GEO benchmark, adding statistics, quotations and citations raised visibility by
   27–41% [Causal, lab], but a 2025 replication found most such rewrites ineffective [Causal, lab]. Treat these as
   good writing hygiene, not a ranking lever.
4. **Brand mentions on other sites matter more than anything on the page.** Across 75K brands, web mentions correlate
   0.664 with AI Overview visibility, against 0.218 for backlinks [Corr]. Reddit, YouTube, Wikipedia, LinkedIn and
   GitHub dominate the cited domains [Corr]. For Satchel that means the public GitHub repo (if Razvan approves making it
   public), the X post, the hackathon listing and NEAR ecosystem pages, all using the same one-line description.
5. **Structured data is for Google features and entity clarity, not AI citation.** A matched study of 1,885 pages
   found that adding JSON-LD made no meaningful difference to citations [Causal]. Google stopped showing FAQ rich
   results on 2026-05-07 [Official]. Ship a small, honest set (WebSite, Organization, WebApplication, BreadcrumbList)
   and expect little from it.
6. **llms.txt: cheap to ship, but no answer engine is known to use it.** 97% of llms.txt files got zero requests in a
   month [Corr], Google says it doesn't use the file [Official], and the file has no measurable link to citations
   [Corr]. Coding agents do fetch it, and the hackathon's screening is done by Claude Code and Codex. So ship a short
   one, linked from the HTML.

---

## 2. Method

- I read the primary sources wherever they were reachable: crawler docs from OpenAI, Anthropic, Perplexity, Google,
  Apple, Meta and Common Crawl; Google Search Central; Microsoft's guidance; arXiv papers; and the original
  Ahrefs, SE Ranking, Seer, AirOps, Profound and searchVIU pages. Numbers that only appeared in secondary coverage
  are marked *(secondary only)*.
- For §3.8 I ran 14 web searches (2026-11-06) as a stand-in for what answer engines retrieve. A web search tool is
  not ChatGPT or Perplexity, but those engines retrieve from similar indexes (§3.2). It shows who we compete with.
- I checked the live site with `curl`, both as a browser and with GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot
  and CCBot user agents (§4).

---

## 3. Findings

### 3.1 Content properties that correlate with or cause citation

**The GEO paper** (Princeton / IIT Delhi / Allen AI, KDD 2024, arXiv:2311.09735) [Causal, lab benchmark]. The authors
rewrote source documents in GEO-bench and measured how visible they were in generated answers (Position-Adjusted Word
Count, PAWC). Changes against the unoptimized baseline, worked out from Table 1:

| Method | PAWC | Subjective impression |
|---|---|---|
| Quotation addition | +40.9% | +28.0% |
| Statistics addition | +30.6% | +22.8% |
| Fluency optimization | +28.0% | +13.5% |
| Cite sources | +27.5% | +13.5% |
| Technical terms | +17.6% | +10.9% |
| Easy-to-understand | +14.0% | +6.2% |
| Authoritative tone | +10.4% | +18.7% |
| Keyword stuffing | **−8.3%** | +4.7% |

- On Perplexity.ai itself: quotation addition gave +20.7% PAWC; statistics addition gave +8.7% PAWC and +37.2%
  subjective impression; keyword stuffing gave −9.1% PAWC.
- **Lower-ranked sources gained the most.** At rank 5: cite sources +115%, quotations +99.7%, statistics +97.9%. The
  same methods *hurt* the rank-1 source (−20% to −30%). That suits a new site like ours.
- The best pair was fluency plus statistics.

**The counter-evidence: C-SEO Bench** (NeurIPS Datasets & Benchmarks 2025, arXiv:2506.11097) [Causal, lab]. It tested
"conversational SEO" methods across 6 domains with several competing publishers. Most methods were "largely
ineffective" and sometimes hurt ranking. Traditional SEO (getting the document ranked higher in the context the LLM
receives) worked much better, and the gains shrank as more publishers adopted the methods. **Conclusion:** rewriting
tricks are weak. Being retrieved, high up, matters most.

**Large correlational studies of real engines** [Corr]:

- **SE Ranking, ChatGPT** (2025-11-24; 129K domains, 216K pages, 100K prompts, XGBoost + SHAP):
  - Referring domains: 1.6–1.8 citations under 2.5K, 8.4 above 350K, and citations double around 32K.
  - Domain traffic: 2–2.9 citations under 190K visits a month, 8.5 above 10M.
  - Length: pages under 800 words average 3.2 citations, pages over 2,900 words 5.1.
  - Sections: 120–180 words average 4.6 citations, under 50 words 2.7.
  - Data: pages with 19+ data points average 5.4 citations, against 2.8 for pages with few.
  - Freshness: updated within 3 months 6.0, otherwise 3.6.
  - FCP < 0.4 s averages 6.7 citations; FCP > 1.1 s averages 2.1.
  - *Negative or null:* FAQ sections 3.8 vs 4.1 without; question-style headings 3.4 vs 4.3; FAQ schema 3.6 vs 4.2;
    llms.txt negligible (removing it from the model improved accuracy).
- **ChatGPT citation position** (Growth Memo study, 2026-02; 1.2M answers, 18,012 citations): 44.2–44.3% of
  citations come from the first 30% of a page's text, 31% from the middle and 25% from the last third. *(Secondary
  only:)* cited text used definitive phrasing more often (36% vs 20%) and was dense in named entities.
- **AI Mode / Gemini sentence shape** (Bright Data study; 42,971 citations, 520 queries, 6 engines): 46.1% of AI Mode
  and Gemini citations sit in the first 30% of the page and 74.8% in the first half. 92.4% of cited sentences are
  6–20 words long, and every citation is a whole sentence ("atomic facts"). About 70% of these citations link with a
  `#:~:text=` fragment, so they point at one exact sentence.
- **AirOps, ChatGPT vs Google page one** (2025-07-18; 900 queries, 12K URLs, manual review): comparing pages ChatGPT
  cited with Google page-one results, sequential heading order 68.7% vs 23.9%, a single H1 87% vs 64%, at least one
  list ~80% vs 28.6%, schema with 3+ types 61% vs 25%. Observational, with no controls.

**Microsoft's guidance** (Bing team, Oct 2025) [Official, but advice rather than data]:
- Assistants split pages into chunks and assemble answers from them.
- Use H2/H3 as idea boundaries, Q&A blocks, lists and tables.
- Write "snippable", self-contained 1–2 sentence answers.
- Align the title, H1 and description.
- Avoid walls of text, answers hidden in tabs or accordions ("AI systems may not render hidden content"), key facts
  in PDFs or images, and vague words like "innovative" or "next-gen".

**What to take from this:** lead with a definition, write self-contained sentences of 6–20 words, include specific
numbers and links to sources, use a clean heading hierarchy, and give substantive sections of about 120–180 words.
Don't rely on question-style headings outside the FAQ: SE Ranking found they correlate with *fewer* citations.

### 3.2 Retrieval: rankings, query fan-out, freshness, off-site signals

- **Google AI Overviews follow Google rankings, but less than they used to** [Corr]. Ahrefs (Jul 2025, 1.9M
  citations) found 76% of cited pages ranked in the top 10. A re-run (2026-03-02, 863K SERPs, ~4M URLs) found 37.9%
  in the top 10, 31.2% at 11–100 and 31.0% beyond 100. Ahrefs credits *query fan-out*: Google splits the query into
  sub-queries and cites pages that rank across them. YouTube accounted for 5.6% of all cited URLs. (Ahrefs says its
  parsing changed between the two runs, so the comparison is not exact.)
- **Assistants barely overlap with the top 10 for the literal prompt** [Corr]. Ahrefs (2025-08-11, 15K prompts) found
  that only ~12% of ChatGPT, Gemini and Copilot citations rank in Google's top 10 for the prompt (ChatGPT ~8%,
  Perplexity 28.6%), and ~10% in Bing's. About 80% of cited URLs didn't rank in Google for the prompt at all.
- **But ChatGPT matches Bing when you use the query it actually ran** [Corr, small sample]. Seer (2025-02-06, ~100
  questions, 500+ citations): 87% of citations were in Bing's top results, against 56% in Google's (median Google rank
  17). The two findings fit together: ChatGPT rewrites the prompt into searches, and those searches mostly go to Bing.
  **So Bing indexing matters for ChatGPT and Copilot.**
- **Off-site mentions** [Corr]. Ahrefs (2025-05-26, 75K brands) gives these Spearman correlations with AI Overview
  brand visibility:

  | Signal | Correlation |
  |---|---|
  | Branded web mentions | 0.664 |
  | Branded anchors | 0.527 |
  | Branded search volume | 0.392 |
  | Domain Rating | 0.326 |
  | Backlinks | 0.218 |
  | Number of site pages | 0.17 |

  Brands in the top quartile for mentions averaged 169 AI Overview mentions; the next quartile averaged 14. SE Ranking
  found the same pattern for ChatGPT with Reddit and Quora mentions (1.8 → 7.0 citations across the range).
- **Which domains get cited** [Corr, vendor data]. Profound (680M citations, Aug 2024–Jun 2025), by share of each
  engine's top-10 sources:

  | Engine | Top cited domains |
  |---|---|
  | ChatGPT | Wikipedia 47.9%, Reddit 11.3%, Forbes 6.8%, G2 6.7% |
  | Google AI Overviews | Reddit 21%, YouTube 18.8%, Quora 14.3%, LinkedIn 13% |
  | Perplexity | Reddit 46.7%, YouTube 13.9% |

  Measured as a share of *all* citations, these domains are much smaller (Wikipedia is 7.8% of everything ChatGPT
  cites), so there is still plenty of room for ordinary sites.
- **Freshness** [Corr]. Ahrefs (2025-07-28, ~17M cited URLs) found assistant-cited pages ~25.7% younger than organic
  results (1,064 vs 1,432 days), or 13.1% younger by last-updated date. ChatGPT leaned furthest toward fresh content;
  AI Overviews barely differ from organic results. (The article's own tables disagree slightly with its text.) SE
  Ranking: updated within 3 months 6.0 citations vs 3.6. Microsoft recommends IndexNow so changes are noticed quickly
  (reported from SMX Munich 2025, secondary). Google warns against changing dates without changing content.

### 3.3 AI crawlers and fetchers (official docs, 2026-11-06)

| Operator | Token | Purpose | robots.txt | Runs JS |
|---|---|---|---|---|
| OpenAI | `OAI-SearchBot` | Index for ChatGPT search. "Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers." | Yes; ~24 h to apply | No (Vercel/MERJ) |
| OpenAI | `GPTBot` | Training of foundation models. Independent of OAI-SearchBot. | Yes | No |
| OpenAI | `ChatGPT-User` | User-triggered page visits in ChatGPT / Custom GPTs. Not used for search inclusion. | "may not apply" | No (RESONEO test) |
| OpenAI | `OAI-AdsBot` | Checks landing pages of ChatGPT ads | n/a | n/a |
| Anthropic | `Claude-SearchBot` | Index for Claude's search results. Blocking it "may reduce your site's visibility". | Yes; supports `Crawl-delay` | No (Vercel/MERJ, for Anthropic's crawler) |
| Anthropic | `ClaudeBot` | Training | Yes | No |
| Anthropic | `Claude-User` | Fetches when a Claude user's question needs the page | Yes (blocking it "prevents our system from retrieving your content") | No (RESONEO) |
| Anthropic | `Claude-Agent` | Anthropic-hosted browser acting for a user | separate article | (a browser) |
| Perplexity | `PerplexityBot` | Index for Perplexity search. Not used for training. | Yes, "we recommend allowing" | No (Vercel/MERJ) |
| Perplexity | `Perplexity-User` | User-triggered fetch | "generally ignores robots.txt" | No (RESONEO) |
| Google | `Googlebot` | Search, **including AI Overviews and AI Mode** | Yes | Yes (full rendering) |
| Google | `Google-Extended` | A token, not a crawler: controls training *and grounding* for Gemini Apps and Vertex AI. "Does not impact a site's inclusion in Google Search." | Yes | (uses Googlebot fetches) |
| Google | `Google-CloudVertexBot` | Crawls that site owners request for Vertex AI Agents | Yes | — |
| Microsoft | `bingbot` | Bing index, which feeds Copilot and (via search) ChatGPT | Yes | Copilot's user-mode fetch ran JS (RESONEO) |
| Apple | `Applebot` | Spotlight / Siri / Safari search, and may also feed Apple models and AI answers. Falls back to Googlebot rules. | Yes | "may render ... within a browser" |
| Apple | `Applebot-Extended` | A token: opts out of training only. "Can still be included in search results." | Yes | — |
| Meta | `meta-webindexer` | Meta AI search results and citations | Yes | — |
| Meta | `meta-externalagent` | Training and indexing | Yes | — |
| Meta | `meta-externalfetcher` | User-triggered fetch | "may bypass" | — |
| Common Crawl | `CCBot` | Open web corpus, widely used for LLM training (Common Crawl's page doesn't say so itself) | block example given | No (Vercel/MERJ) |

The pattern: most operators now run **three separate agents** (training, search index, user fetch). The search and
user agents decide whether we get *cited*. The training crawlers only decide whether models *know* about us without
searching. A marketing site that wants maximum visibility should allow all of them.

### 3.4 JavaScript: evidence that server HTML is required

- **Vercel and MERJ** (2024-12-17, Vercel's network) [Corr]: "none of the major AI crawlers currently render
  JavaScript" (OpenAI, Anthropic, Meta, ByteDance, Perplexity). ChatGPT and Claude download JS files (11.5% and 23.8%
  of their requests) but don't execute them. Gemini renders because it uses Googlebot's infrastructure, and AppleBot
  renders with a browser. In the past month GPTBot made 569M fetches and Claude 370M (combined AI crawlers ≈ 28% of
  Googlebot's volume). AI crawlers also hit 404s on ~34–35% of their fetches, against 8% for Googlebot, so stable URLs
  and redirects matter.
- **RESONEO** (2026-01, user-mode fetchers) [Small]: ChatGPT-User, Claude-User and Gemini's fetch saw only static HTML
  (plus `<noscript>` and `<template>`). Copilot, Grok and DeepSeek ran some JS. Perplexity-User decoded nothing on
  that test page. Google AI Mode didn't fetch at all; it answers from the index.
- **searchVIU** (2025-10-30; one page, eight fictional prices, each placed a different way) [Small]: no system named
  the price that was **only in JSON-LD**. ChatGPT and Gemini named prices that were visible in the HTML. Only Gemini
  picked up a JS-inserted price on direct fetch (Perplexity and AI Mode did after indexing). Claude named no prices at
  all.
- Unconfirmed claims that GPTBot started rendering JS in Sep 2026 have no primary source. Assume it doesn't.

**This matters for us twice over.** The hackathon screening is done by Claude Code and Codex (Q-017). They fetch pages
the way user agents do, so every fact a judge needs must be in the first HTML response and must not sit behind a
Suspense fallback. CLAUDE.md already requires that.

### 3.5 Structured data

**Current Google support** [Official]:
- The search gallery lists 25 features, including Article, Breadcrumb, Organization, Q&A, Software app, Video,
  Product and Profile page.
- **FAQ rich results stopped appearing on 2026-05-07, and the docs were removed on 2026-06-15.** The 2023 restriction
  had already limited them to government and health sites.
- **HowTo** was cut to desktop-only in Aug 2023 and is no longer in the gallery.
- **Software app** rich results *require* `aggregateRating` or `review` plus `offers.price`. `WebApplication` is
  supported. We have no genuine ratings, so we can't get the rich result, and fake ratings would break Google's
  policy.
- **Organization** goes on the home page and is used to disambiguate the entity and pick the logo. Recommended:
  `url`, `logo` (≥ 112 px), `sameAs`, `description`, and a `name` that matches the site name.
- **WebSite** (`name`, `alternateName`, `url`) on the home page helps Google choose the **site name**, alongside
  `og:site_name`, `<title>` and the headings.
- Google's AI features guide: "no additional requirements … nor other special optimizations", and no "new machine
  readable files, AI text files, or markup". Structured data must match the visible text.

**Evidence on AI citation:**
- **Ahrefs** (2026-05-11) [Causal, matched DiD]: 1,885 pages that added JSON-LD (Aug 2025–Mar 2026) against matched
  controls. AI Overviews −4.6% (significant but small, unexplained), AI Mode +2.4% (n.s.), ChatGPT +2.2% (n.s.).
  Caveat: every page studied already had 100+ AI Overview citations.
- **searchVIU** [Small]: JSON-LD-only facts were never surfaced (§3.4).
- **AirOps** [Corr]: cited pages carry more schema (61% vs 25%). **SE Ranking** [Corr]: FAQ schema pages had *fewer*
  citations (3.6 vs 4.2). These conflict, and neither is causal.
- **Microsoft**: Bing's team said on stage (SMX Munich, Mar 2025, secondary report) that schema helps Microsoft's LLMs
  understand content, and its Oct 2025 guidance recommends JSON-LD. This is the only engine claiming a benefit, and it
  is plausible for Copilot because Bing parses schema at index time.

**Verdict:** ship minimal, truthful JSON-LD, mainly for Google's site name, logo and breadcrumbs, and for Bing. Don't
expect any lift in ChatGPT, Claude or Perplexity citations. Never put a fact *only* in JSON-LD.

### 3.6 llms.txt and llms-full.txt

- **Spec** (llmstxt.org, Answer.AI, proposed 2024-09-03, now "v2"):
  - Markdown at `/llms.txt`. The H1 with the site name is the only required part.
  - Then a `>` blockquote summary, optional prose, and H2 "file lists" of `[title](url): note` links.
  - A final `## Optional` H2 holds links an agent can skip.
  - v2 recommends a clean `.md` version of each page (`page.md` / `index.html.md`), advertised with
    `<link rel="alternate" type="text/markdown">`, and `rel="describedby"` pointing to the llms.txt.
  - `llms-full.txt` (everything in one file) is a convention from docs platforms. It is **not in the spec**.
- **Do engines read it?**
  - Google's Search Advocate (Bluesky, 2025-06): "no AI system currently uses llms.txt". Google's AI features guide
    says no AI text files are needed [Official].
  - **Ahrefs log study** (2026-06-15; 137,210 domains, May 2026) [Corr]:
    - 28% publish a file (an upper bound, since the sample skews SEO-aware).
    - **97% of files got zero requests in the month.**
    - Of ~22K requests, AI bots made 19.5%: agents and coding tools 10.5% (Claude-Code is prominent), training
      crawlers 5.3% (GPTBot 4.5%), assistants 2.5% (ChatGPT-User, Claude-User), and retrieval bots only 1.1%
      (OAI-SearchBot 0.74%; PerplexityBot and Claude-SearchBot made a couple of hundred fetches in total).
    - Ahrefs' verdict: "the cons outweigh the pros right now". If you ship one, link it from the HTML and treat it
      like code (prompt-injection risk).
  - **SE Ranking** [Corr]: no measurable effect on ChatGPT citations.
  - **Chrome Lighthouse** added an experimental "Agentic browsing" audit (May 2026) that checks llms.txt: a missing
    file is "not applicable"; a malformed one fails. Its other checks are WebMCP, the accessibility tree and CLS
    *(secondary only for the exact checks)*.
- **Verdict:** ship a short, hand-written `/llms.txt`, linked from the footer and from `<link rel="describedby">`.
  There's one specific reason it may pay off for us: coding agents (Claude Code, Codex) do fetch llms.txt when they
  are pointed at it, and they are the judges. Skip `llms-full.txt` and per-page `.md` mirrors for now: they don't
  help citation and add maintenance (P2 at most).

### 3.7 Page-level patterns (evidence vs opinion)

| Pattern | Evidence | Confidence |
|---|---|---|
| Definitional first paragraph that names the entity ("Satchel is …") | 44% of ChatGPT and 46% of AI Mode citations come from the first 30% of the page; Microsoft says to align the title, H1 and description | Corr + Official advice: **high** |
| Self-contained sentences of 6–20 words, one claim each | Bright Data: 92.4% of cited sentences are 6–20 words; Microsoft says "self-contained" | Corr: **medium-high** |
| Specific numbers (chains, caps, timeouts, counts) | GEO statistics addition +31% (lab); SE Ranking: 19+ data points 5.4 vs 2.8 | Causal (lab) + Corr: **medium** |
| Outbound links to authoritative sources (NEAR docs, NEP-171, explorers) | GEO cite sources +27.5% (lab), +115% at rank 5 | Causal (lab), contested by C-SEO Bench: **medium-low** |
| Short quotations from authoritative sources | GEO +40.9% (lab) | Causal (lab), contested: **low-medium** |
| Sequential H1 → H2 → H3, a single H1, lists and tables | AirOps 68.7% vs 23.9%; Microsoft guidance | Corr + Official advice: **medium** |
| Question-form headings | SE Ranking: *fewer* citations (3.4 vs 4.3). Use them only on the FAQ page, where the user's query is a question. | Corr, negative: **don't use as a tactic** |
| Comparison tables (Satchel vs ERC-6551 vs handing over a seed phrase) | Microsoft says tables give "clean, reusable segments"; the "ERC-6551 vs" results are all comparison pages (§3.8) | Official advice + observation: **medium** |
| Visible "Last updated" date plus `dateModified` and sitemap `lastmod` | Ahrefs freshness; SE Ranking 3-month effect; Microsoft recommends IndexNow | Corr: **medium** |
| One description used everywhere (site, GitHub, X, listings) | Google picks site names from the home page *and* "references to it on the web"; Ahrefs: mentions correlate 0.664 | Official + Corr: **high** |
| About / author page (who built it, how to contact) | Google's Organization docs (disambiguation); no AI-specific data | Official (Google) + Opinion: **medium** |
| Content in `<details>` accordions | It is in the HTML, so non-JS fetchers see it; Microsoft warns that hidden content "may" be skipped | Official advice, untested: **low risk, worth hedging** |
| Fast first paint | SE Ranking: FCP < 0.4 s → 6.7 vs FCP > 1.1 s → 2.1 | Corr (probably a proxy for domain quality): **low** |
| Long pages (2,900+ words) | SE Ranking: 5.1 vs 3.2 | Corr, confounded by domain size: **low**. Don't pad. |

### 3.8 Current state: who answers our queries today (web search, 2026-11-06)

| Query | Who dominates | Content type |
|---|---|---|
| what is a token bound account | GitHub topic page, a fintech help-center guide, Medium (an L1 foundation's blog), a glossary page, Substack | Definitional explainers and glossaries for ERC-6551 |
| NFT that holds bitcoin | Hiro blog, Xverse blog, KuCoin Learn, Decrypt, Nasdaq | All about *Bitcoin NFTs/Ordinals*. **Nothing about an NFT that holds BTC.** Uncontested intent. |
| can you sell a crypto wallet | Exchange and wallet help centers (Ledger, Kraken, Blockchain.com, Bitpanda), a game support page | All read it as "sell crypto from a wallet". **Nobody answers "sell the wallet itself".** Uncontested intent. |
| NEAR chain signatures explained | docs.near.org (several locales), Blockworks, the NEP GitHub issue | Official docs plus launch news |
| ERC-6551 vs | GitHub reference repos, Substack, a dev-shop vendor's comparison pages (ERC-721, ERC-998, custodial) | Comparison pages, mostly vendor-made |
| how to transfer ownership of a crypto wallet | 1Password blog, NFT tooling help centers, Alchemy docs (smart accounts), estate-planning help | The answer engines give is "make a new wallet and move the funds". **No "transfer the NFT" answer.** |
| multi-chain NFT wallet bitcoin ethereum solana | Magic Eden wallet launch news (The Block, Decrypt, CoinMarketCap), Zelcore Academy | Multi-chain *wallet apps*, not NFTs that are wallets |
| how to verify a wallet before buying it | Hardware wallet vendors (Tangem, Ballet), reseller guides, Reddit | All hardware tamper checks. **Verifying a wallet's on-chain history before buying is uncontested.** |
| sell a wallet as an NFT, seller keeps seed phrase | OpenSea listings, generic NFT security blogs | Engines name the problem ("whoever holds the seed phrase…") but no source gives a solution |
| token bound account NEAR chain signatures NFT controls bitcoin address | docs.near.org (chain signatures, use cases), a glossary, a QuickNode ERC-6551 guide | The engine said it "found no source that describes this exact setup". **This is the exact gap Satchel fills.** |
| Satchel NFT wallet NEAR usesatchel.xyz | NEAR wallet listings (Meteor, Mintbase), and an unrelated BSV wallet library also called Satchel | **usesatchel.xyz is not indexed or retrieved.** The engine said the site might not exist. |
| Satchel app | Satchel One (a UK school homework app, teamsatchel.com), a fintech money app called Satchel, an iOS carrier app, handbags | **Name collision.** "Satchel" alone will never resolve to us. |

**What follows from this:**
- (a) Most of our intents are **uncontested**: the results answer a neighbouring question. A clear explainer page has
  an unusually good chance of being cited, but only once it is indexed.
- (b) The competitors are docs (docs.near.org), GitHub, help centers and glossary-style explainers. Our pages should
  look like docs: definitional, specific, with sources.
- (c) Our entity name is ambiguous. Always pair it with its category: "Satchel, an NFT wallet on NEAR" or "Satchel:
  an NFT that is a wallet". Use a consistent `alternateName`, and keep the domain in the copy (`usesatchel.xyz`).
- (d) Nothing about Satchel exists off-site yet. The engines' own fallback, "check the site directly or its
  developer's launch announcement", tells us what the corroborating sources need to be: GitHub, the X post, the
  hackathon page.

---

## 4. Audit of usesatchel.xyz today (2026-11-06, live)

| Check | Result |
|---|---|
| Server-rendered content | **Good.** `/` has ~7.1K characters of text in the raw HTML, and `/questions` has ~11K. The landing illustration has a text description. |
| AI crawler access | **Good.** GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and CCBot user agents all get 200 from Vercel. No bot firewall is blocking them. |
| robots.txt | `User-Agent: * / Allow: /` plus a sitemap. Fine. The `Host:` line is Yandex-only and non-standard (harmless, can go). |
| sitemap.xml | Lists `/`, `/market`, `/mint`, `/contract`, `/satchels` and token pages. **`/questions` is missing. No `<lastmod>`.** |
| `<title>` / description | "An NFT that is a wallet · Satchel", plus a specific description. Good. |
| H1 | "Sell a wallet with everything inside. The buyer checks it first." Value-first, but it doesn't name the entity or category. The *first paragraph* starts "Sellers can keep a copy…" and doesn't say "Satchel is …" until the second sentence. |
| Headings | One H1, then sequential H2s. Good. |
| Canonical | **No `<link rel="canonical">`.** |
| JSON-LD | **None.** |
| llms.txt | 404. |
| /questions | 35 Q&As inside `<details>/<summary>`. The answers are present in the HTML. |
| Explainer pages for the uncontested intents (§3.8) | None. `/how-it-works` returns 404; the depth lives in the GitHub docs, which are private. |
| Off-site corroboration | None indexed (the repo is private, there's no X post yet, no listings). |

---

## 5. Prioritized checklist

### P0: before the Nov 13 submission (cheap and decisive)

1. **Get indexed.** These are human steps that need account access. Verify `usesatchel.xyz` in Google Search Console
   and Bing Webmaster Tools, submit `/sitemap.xml` to both, and request indexing for `/`, `/questions`, `/contract`
   and `/market`. *Why:* Google says pages must be indexed to appear in AI features [Official], ChatGPT search tracks
   Bing [Corr], and Copilot is Bing. Bing Webmaster Tools' AI Performance report (public preview, Feb 2026) also
   shows Copilot citations.
2. **IndexNow ping** on deploy, for the home page and every page that changed. *Why:* Microsoft recommends it so
   AI systems notice fresh content (secondary).
3. **Sitemap fixes:** add `/questions` (and any new explainer pages), and add `lastModified` (build time for static
   pages; the latest activity for token pages, if cheap).
4. **Canonical URLs** on every indexable page (`alternates.canonical` in the Next.js metadata).
5. **A definitional first paragraph on the home page.** Keep the value-first H1 (this follows the landing preference),
   but make the first `<p>` under it a self-contained definition of 6–20-word sentences that names the entity, e.g.
   "Satchel is an NFT on NEAR that is a wallet. Each token controls its own Bitcoin, Ethereum and Solana addresses."
   *Why:* 44–46% of citations come from the first 30% [Corr]; Microsoft says to align the title, H1 and description.
6. **One canonical description, used everywhere.** The README, the GitHub repo description, the X bio and post, the
   hackathon listing and the site's meta description should all reuse: "Satchel is an NFT on NEAR that is a wallet:
   each token controls its own Bitcoin, Ethereum and Solana addresses through NEAR Chain Signatures, and a buyer can
   check its clean history before buying." *Why:* entity consistency and the name collision (§3.8); site names come
   from the home page plus references across the web [Official]; mentions correlate 0.664 [Corr].
7. **Keep every fact in visible server HTML** (this is already a rule). Add a test, or extend an existing Playwright
   check, that fetches `/`, `/questions`, `/contract`, `/market` and `/s/1` with JS disabled and asserts the key facts
   are present. *Why:* ChatGPT, Claude and Perplexity don't run JS [Corr/Small], and the judges are coding agents.
8. **robots.txt:** keep "allow all" (§6). Never `Disallow` the flow pages that carry `noindex`, or crawlers can't see
   the `noindex`. Keep the Vercel "AI bots" firewall rule off.

### P1: high value if time allows (this week)

9. **Explainer pages for the uncontested intents** (§3.8). Each is a docs-style page under `/learn/…` or similar, with
   a single H1, a definitional first paragraph, specific numbers, a table, links to sources and a visible updated
   date:
   - "Can you sell a crypto wallet?" Answer: not safely by handing over keys, because the seller can keep a copy; an
     NFT-controlled wallet can be sold.
   - "How to check a wallet before you buy it". This is the clean-history explainer: what a signature record is, why
     a signature made before a sale can outlive it, and how the buyer's browser checks each one.
   - "Satchel vs ERC-6551 token-bound accounts vs handing over a seed phrase", as a comparison table: native BTC/SOL
     vs EVM-only, who holds keys, pre-sale signature risk, and how a buyer verifies.
   - "NFTs that hold Bitcoin" or "How an NFT controls a Bitcoin address with NEAR Chain Signatures", linking out to
     docs.near.org.

   Facts must come from `kb/90` and `plan/decisions.md`. Product facts win over brand copy.
10. **Home page JSON-LD** (§7): `WebSite` (name "Satchel", alternateName "Satchel NFT wallet", "usesatchel.xyz"),
    `Organization` (logo, `sameAs` once the GitHub and X URLs are public), and `WebApplication` (no ratings). Low
    expected effect on AI citation, but useful for Google's site name and logo and for Bing.
11. **`/llms.txt`** (§8), linked from the footer and from `<link rel="describedby">`.
12. **An About / "Who built this" block or page:** Razvan Statescu as solo builder, built for the NEAR hackathon,
    testnet-only, with links to the repo (once public), X and contact details. It helps Google disambiguate the
    entity and helps readers trust it.
13. **Visible "Updated YYYY-MM-DD"** on explainer pages, `/questions` and `/contract`, matching `dateModified` in any
    JSON-LD.
14. **Outbound links to sources** in explainers and FAQ answers: NEAR Chain Signatures docs, the NEP-171 spec, the MPC
    signer account on an explorer, and the contract's own explorer pages. Quote one authoritative sentence where it
    adds proof.
15. **Internal links with descriptive anchors.** Every page links to the clean-history explainer, `/questions`,
    `/contract` and `/market`, with anchor text like "how the buyer checks clean history", not "learn more".

### P2: nice to have, low evidence

16. `BreadcrumbList` on `/s/[id]` and its tabs, and on explainer pages (a Google-supported rich result).
17. Open the top 3–5 `/questions` answers by default, or give them a visible summary outside `<details>`. This hedges
    Microsoft's warning about hidden content; the evidence is weak.
18. `FAQPage` JSON-LD on `/questions`, generated from the same data as the visible answers. No Google rich result since
    May 2026, and the AI evidence is null or negative. Only do it if it costs nothing.
19. Per-page `.md` mirrors per llms.txt v2, plus a Lighthouse "Agentic browsing" pass.
20. **Measurement:** filter the Vercel logs by AI user agents (GPTBot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
    Claude-User, PerplexityBot, Perplexity-User, bingbot, Googlebot, meta-webindexer). Watch Bing's AI Performance
    report and Search Console's "Web" search type, which includes AI Overviews and AI Mode. Re-run the §3.8 query
    panel weekly in ChatGPT, Perplexity, Claude and Gemini until Nov 25.

### What every indexable page must have

- A unique `<title>` of the form "*Topic* · Satchel", and a meta description that paraphrases the first paragraph.
- A canonical URL, and an entry in the sitemap with `lastmod`.
- Exactly one H1 and sequential H2/H3, with descriptive headings (questions only on the FAQ).
- A **first paragraph that works as an answer on its own**: 1–2 sentences of 6–20 words, naming "Satchel" and its
  category.
- Facts as visible text in the first HTML response: not image-only, not JS-only, not JSON-LD-only, and not behind a
  Suspense fallback.
- Specific numbers and named things (chains, networks, caps, contract account), and at least one outbound link to a
  source.
- Sections of about 120–180 words. Use a table wherever two or more things are compared.
- A visible updated date on content pages.
- Links to the clean-history explainer, `/questions` and `/contract`.
- JSON-LD only where it mirrors visible text (`WebSite`/`Organization`/`WebApplication` on `/`, `BreadcrumbList`
  deeper in the site).

---

## 6. Recommended robots.txt

```
# usesatchel.xyz: every crawler is welcome, including AI search, AI training and user-triggered fetchers.
# Flow pages (send, transfer, unknown ids) use <meta name="robots" content="noindex">, so they are NOT disallowed
# here; a disallow would hide the noindex from crawlers.
# For reference, AI agents this file intentionally allows: OAI-SearchBot, GPTBot, ChatGPT-User, Claude-SearchBot,
# ClaudeBot, Claude-User, PerplexityBot, Perplexity-User, Googlebot (incl. AI Overviews/AI Mode), Google-Extended,
# bingbot, Applebot, Applebot-Extended, meta-webindexer, meta-externalagent, CCBot.

User-agent: *
Allow: /

Sitemap: https://usesatchel.xyz/sitemap.xml
```

Notes:
- Don't add per-bot groups. A crawler that matches a named group ignores the `*` group, so named groups only create
  ways for the rules to drift apart. The wildcard already allows everything.
- Allowing the training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent)
  is a deliberate choice: we *want* future models to know what Satchel is. Google-Extended also controls Gemini
  *grounding*, so blocking it would cost Gemini citations.
- Keep `/api/*` crawlable. The README and judges use `/api/satchels/1`.
- The current `robotsFor()` output already matches this, apart from the `Host:` line, which can be dropped.

---

## 7. Recommended JSON-LD shape (home page only)

Every value must match visible text on the page. No ratings and no reviews.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://usesatchel.xyz/#website",
      "name": "Satchel",
      "alternateName": ["Satchel NFT wallet", "usesatchel.xyz"],
      "url": "https://usesatchel.xyz/",
      "publisher": { "@id": "https://usesatchel.xyz/#org" }
    },
    {
      "@type": "Organization",
      "@id": "https://usesatchel.xyz/#org",
      "name": "Satchel",
      "url": "https://usesatchel.xyz/",
      "logo": "https://usesatchel.xyz/<512px logo>.png",
      "description": "<the canonical one-line description from P0-6>",
      "founder": { "@type": "Person", "name": "Razvan Statescu" },
      "sameAs": ["<GitHub repo URL once public>", "<X profile URL>"]
    },
    {
      "@type": "WebApplication",
      "name": "Satchel",
      "url": "https://usesatchel.xyz/",
      "description": "<same description>",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any (web browser)",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "creator": { "@id": "https://usesatchel.xyz/#org" }
    }
  ]
}
```

Leave out `sameAs` entries until the URLs exist and are public. `offers.price: 0` is truthful (testnet, free to use)
but won't earn a rich result without ratings, and that's fine. Render it server-side in a
`<script type="application/ld+json">`.

---

## 8. Recommended /llms.txt shape

Hand-written, under ~60 lines, using only links and plain descriptions (Ahrefs' prompt-injection advice). Version it in
the repo, and serve it as `text/plain` or `text/markdown`.

```markdown
# Satchel

> Satchel is an NFT on NEAR that is a wallet: each token of a NEP-171 contract controls its own Bitcoin, Ethereum
> and Solana addresses through NEAR Chain Signatures. Give or sell the NFT and the coins go with it. Before buying,
> the buyer's browser checks the Satchel's clean history: every signature the contract ever issued for it.

Testnet only (NEAR testnet; Bitcoin testnet4; Ethereum Sepolia and its L2 testnets; Solana devnet). The coins have no
value. Built by Razvan Statescu for the NEAR hackathon, November 2026.

## Start here
- [Home](https://usesatchel.xyz/): what a Satchel is and how a sale works
- [Questions](https://usesatchel.xyz/questions): answers about keys, chains, clean history, selling, giving, fees
- [Contract facts](https://usesatchel.xyz/contract): contract account, access keys, code hash, MPC signer

## Live data (server-rendered, readable without JavaScript)
- [Satchel #1](https://usesatchel.xyz/s/1): owner, addresses, balances, signature count
- [Satchel #1 as JSON](https://usesatchel.xyz/api/satchels/1): the same facts as JSON
- [Market](https://usesatchel.xyz/market): listings, each with its clean-history verdict

## Explainers
- <one line per /learn page once it exists>

## Optional
- [Source code](<GitHub URL once public>)
- [NEAR Chain Signatures docs](https://docs.near.org/chain-abstraction/chain-signatures)
```

Add `<link rel="describedby" href="/llms.txt">` to the root layout and link the file in the footer. Re-check every line
against kb/90 before shipping. The contract account and the "no admin key" claim change at the keyless birth on
Nov 10, so word them for whichever contract is live.

---

## 9. What not to bother with, and why

| Skip | Why |
|---|---|
| Keyword stuffing, or "GEO rewrites" of copy for their own sake | GEO paper: keyword stuffing −8% to −9% [Causal, lab]; C-SEO Bench: most rewrite methods are ineffective or harmful [Causal, lab] |
| FAQ / HowTo markup for rich results | FAQ rich results are gone (2026-05-07) and HowTo is out of the gallery [Official]. Schema has no causal citation lift [Causal]. |
| Fake or self-assigned `aggregateRating` / reviews | Required for the Software app rich result, but fabricating them breaks Google's policy, and we have none |
| llms-full.txt, per-page `.md` mirrors, "AI sitemaps" | Not in the spec (full) or unused by answer engines; 97% of llms.txt files never get fetched [Corr]; Google says no AI files are needed [Official] |
| Per-bot robots.txt groups and crawl-delay tuning | Adds drift risk for no gain at our traffic level |
| Turning every heading into a question | Correlates with *fewer* ChatGPT citations [Corr] |
| Padding pages to 2,900+ words | The length correlation is confounded by domain size [Corr]; Microsoft warns against walls of text |
| Changing dates without changing content | Google warns against it; the freshness benefit comes from real updates |
| A Wikipedia or Wikidata entry | Notability rules make it unrealistic for a hackathon project, and it would be removed |
| Buying links, directories, PR wires | Backlinks correlate weakly (0.218) next to genuine mentions (0.664) [Corr]. This is spam risk with little upside. |
| AI visibility tracking SaaS | A manual weekly query panel plus Bing's AI Performance report and logs covers our scale |

---

## 10. Sources (all read on 2026-11-06 unless noted)

Research and studies:
- GEO: Generative Engine Optimization, KDD 2024. https://arxiv.org/abs/2311.09735 (tables from the HTML v3:
  https://arxiv.org/html/2311.09735v3)
- C-SEO Bench: Does Conversational SEO Work? NeurIPS D&B 2025. https://arxiv.org/abs/2506.11097
- Ahrefs, 38% of AI Overview citations from the top 10 (2026-03-02): https://ahrefs.com/blog/ai-overview-citations-top-10/
- Ahrefs, AI Overview brand visibility factors, 75K brands (2025-05-26): https://ahrefs.com/blog/ai-overview-brand-correlation/
- Ahrefs, AI assistants cite fresher content, 17M citations (2025-07-28): https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content/
- Ahrefs, only 12% of AI-cited URLs rank in the top 10 (2025-08-11): https://ahrefs.com/blog/ai-search-overlap/
- Ahrefs, schema and AI citations, matched DiD (2026-05-11): https://ahrefs.com/blog/schema-ai-citations/
- Ahrefs, 97% of llms.txt files never read, 137K sites (2026-06-15): https://ahrefs.com/blog/llmstxt-study/
- SE Ranking, ChatGPT citation factors, 129K domains (2025-11-24): https://seranking.com/blog/chatgpt-citation-factors/
- Seer Interactive, 87% of SearchGPT citations match Bing (2025-02-06): https://www.seerinteractive.com/insights/87-percent-of-searchgpt-citations-match-bings-top-results
- AirOps, Structuring content for LLMs (2025-07-18): https://www.airops.com/report/structuring-content-for-llms
- Profound, AI platform citation patterns (2025-06, updated 2025-08): https://www.tryprofound.com/blog/ai-platform-citation-patterns
- Practical Ecommerce summary of the Growth Memo (ChatGPT position) and Bright Data (AI Mode / Gemini sentence)
  studies (2026-03-09): https://www.practicalecommerce.com/studies-reveal-ai-citation-clues
- Vercel and MERJ, The rise of the AI crawler (2024-12-17): https://vercel.com/blog/the-rise-of-the-ai-crawler
- RESONEO, LLM user-mode crawler test (2026-01): https://think.resoneo.com/sentinel/geo-llm-crawler-report.html
- searchVIU, Schema markup and AI put to the test (test 2025-10-30): https://searchviu.com/en/schema-markup-and-ai-in-2025-what-chatgpt-claude-perplexity-gemini-really-see

Official documentation:
- OpenAI crawlers: https://developers.openai.com/api/docs/bots
- Anthropic crawlers: https://support.claude.com/en/articles/8896518
- Perplexity crawlers: https://docs.perplexity.ai/guides/bots
- Google common crawlers (Google-Extended): https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
- Google, AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Google, Succeeding in AI search (2025-05): https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search
- Google structured data gallery: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Google FAQPage (deprecation notice): https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Google HowTo/FAQ changes (2023-08): https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Google Software app: https://developers.google.com/search/docs/appearance/structured-data/software-app
- Google Organization: https://developers.google.com/search/docs/appearance/structured-data/organization
- Google site names: https://developers.google.com/search/docs/appearance/site-names
- Apple Applebot: https://support.apple.com/en-us/119829
- Meta web crawlers: https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers.md
- Common Crawl CCBot: https://commoncrawl.org/ccbot
- Microsoft (Bing team), Optimizing your content for inclusion in AI search answers (2025-10): https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers
- llms.txt spec: https://llmstxt.org/

Secondary only (used for context, flagged in the text):
- Search Engine Roundtable on Microsoft and schema for LLMs (SMX Munich 2025): https://www.seroundtable.com/schema-llms-copilot-bing-microsoft-39093.html
- Search Engine Roundtable, "No AI system currently uses llms.txt" (2025-06): https://seroundtable.com/google-ai-llms-txt-39607.html
- Lighthouse agentic browsing / llms.txt audit coverage (2026-05): https://ppc.land/google-adds-llms-txt-to-lighthouse-as-agentic-web-standards-heat-up/
- Bing AI Performance report coverage (2026-02): https://www.practicalecommerce.com/bings-improved-ai-performance-section
