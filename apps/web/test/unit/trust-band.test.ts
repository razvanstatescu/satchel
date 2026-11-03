import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionsSection } from "@/components/landing/QuestionsSection";
import { TrustSection, UnderTheHood } from "@/components/landing/TrustSection";
import { REPO_URL } from "@/lib/config";
import { copy, type SolVariant } from "@/lib/copy";
import { FAQ_IDS, faqItems, splitLead } from "@/lib/faq";
import type { ContractRole } from "@/lib/lock-facts";

/**
 * Trust, Under the hood and Questions as server HTML (design-spec §4.7, §4.8; D-42), for every variant: the three
 * contract roles, and the Solana stories e2e can't reach (its build is `final` with SOL send on). Simulated and
 * generic: no addresses, no Satchel number, no account id, no read time, nothing read live.
 */

const L = copy.landing.lock;
const H = copy.landing.hood;
const ROLES: ContractRole[] = ["dev", "rc", "final"];
/** Under the hood's "Check it yourself" links, in order: generic, none needs a live read. */
const HOOD_LINKS = ["/s/1", "/s/1/activity", "/market", "/contract", REPO_URL];

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));
const labels = (html: string) => [...html.matchAll(/data-l="([^"]*)"/g)].map((m) => decode(m[1]));
/** A string as React writes it into the HTML. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
/** The positions of `parts` in `t`: all found, in order. */
function inOrder(t: string, parts: string[]) {
  const at = parts.map((p) => t.indexOf(p));
  at.forEach((i, k) => expect(i, parts[k]).toBeGreaterThan(-1));
  expect([...at].sort((a, b) => a - b)).toEqual(at);
}

const trust = (role: ContractRole, sol: SolVariant = "send") => renderToStaticMarkup(createElement(TrustSection, { role, sol }));
const hood = (sol: SolVariant = "send") => renderToStaticMarkup(createElement(UnderTheHood, { sol }));
const questions = (role: ContractRole, sol: SolVariant = "send") => renderToStaticMarkup(createElement(QuestionsSection, { role, sol }));
/** The trust copy only (the section up to Under the hood). */
const head = (html: string) => html.slice(0, html.indexOf('id="under-the-hood"'));

describe("TrustSection", () => {
  it("is the #trust section: the H2, the lead, the limits (bold lead), then one link, to /contract, and Under the hood", () => {
    const html = trust("final");
    expect(html).toMatch(/^<section id="trust" aria-labelledby="trust-title" data-lock-variant="locked"/);
    expect(html).toMatch(/<h2 id="trust-title"[^>]*>No admin key\. Not even ours\.<\/h2>/);
    inOrder(text(html), [L.h2, L.body, L.limits, L.cta, H.h2]);
    expect(html).toContain(`<strong class="font-bold">What you still trust:</strong> ${esc(L.limits.slice("What you still trust: ".length))}`);
    expect(hrefs(head(html))).toEqual(["/contract"]);
    expect(html).not.toContain('data-testid="lock-note"');
  });

  it("rc renders exactly the final band (the role strip's release-candidate line is gone site-wide, P2)", () => {
    expect(trust("rc")).toBe(trust("final"));
  });

  it("dev: the dev twin, never 'No admin key', and no Contract facts art (that contract has keys)", () => {
    const html = trust("dev");
    expect(html).toContain('data-lock-variant="dev"');
    inOrder(text(html), [L.dev.h2, L.dev.body, L.limits, L.cta]);
    expect(text(html)).not.toContain(L.h2);
    expect(text(html)).not.toContain(L.body);
    expect(html).not.toContain("data-trust-art");
    expect(labels(html)).not.toContain(L.slip.verdict);
  });

  it("dev: a simplified sign_for code card (site polish round §2), aria-hidden, labelled Simplified", () => {
    const html = trust("dev");
    const art = /<div class="lp-codefield" data-code="">[\s\S]*$/.exec(html)?.[0] ?? "";
    expect(art).not.toBe("");
    expect(art).toContain('<div class="lp-slip lp-code" aria-hidden="true">');
    expect(text(art)).toBe(""); // every line, caption and the file/tag chip is attribute-drawn
    const c = L.dev.code;
    expect(labels(art)).toContain(c.file);
    expect(labels(art)).toContain(c.tag);
    expect(c.tag).toBe("Simplified");
    for (const cap of c.caps) expect(labels(art)).toContain(cap);
    // none of the final slip's values, and none of the banned plumbing words
    for (const v of Object.values(L.slip)) if (typeof v === "string") expect(labels(art)).not.toContain(v);
    expect(labels(art).join(" ")).not.toMatch(/\bdelegate\b|\bMPC\b|\bapproval\b|\btrustless\b|\.testnet\b|0x[0-9a-f]{4,}/i);
    // every line, its tokens joined, stays within the 320 px card's slack (≤ 34 characters)
    for (const line of c.lines) {
      const joined = line.map(([, s]) => s).join("");
      expect(joined.length, joined).toBeLessThanOrEqual(34);
    }
    // exactly one Pause button, outside the aria-hidden card, named and toggled like the hero's
    const buttons = art.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(1);
    const pauseBtn = buttons[0]!;
    expect(pauseBtn).toContain(`aria-label="${esc(copy.landing.hero.anim.pause)}"`);
    expect(pauseBtn).toContain('aria-pressed="false"');
    expect(art.indexOf("lp-slip lp-code")).toBeLessThan(art.indexOf(pauseBtn));
  });

  it("rc and final keep Contract facts (never the code card) and show no dev-only labels", () => {
    for (const role of ["rc", "final"] as const) {
      const html = trust(role);
      expect(html).not.toContain("data-code");
      expect(html).not.toContain("lp-codefield");
    }
  });

  it("rc and final show the Contract facts slip: a lemon Day island, aria-hidden, every label an attribute", () => {
    for (const role of ["rc", "final"] as const) {
      const art = /<div class="lp-trust" data-scheme="day" aria-hidden="true" data-enter="trust" data-trust-art="">[\s\S]*$/.exec(trust(role))?.[0] ?? "";
      expect(art, role).not.toBe("");
      expect(text(art)).toBe("");
      const s = L.slip;
      expect(labels(art)).toEqual([s.title, s.keys, s.keysValue, s.admin, s.adminValue, s.code, s.codeValue, s.verdict]);
      expect(art).toContain('data-k="peek-btc"');
      expect(art).toContain('data-k="peek-eth"');
      expect(art).not.toMatch(/<(a|button|text|title)\b/);
    }
  });

  it("is data-free in every role: no addresses, no Satchel number, no account id, no read time, no live proof", () => {
    for (const role of ROLES) {
      const html = trust(role);
      const t = text(html);
      expect(html, role).not.toContain("data-full-address");
      expect(html, role).not.toMatch(/<time\b/);
      expect(t, role).not.toMatch(/#\d|\.testnet\b|\bUTC\b|\d{2}:\d{2}:\d{2}/);
      expect(t, role).not.toMatch(/Live on testnet|Live from testnet|belongs to|This happened on testnet/);
    }
  });
});

describe("UnderTheHood", () => {
  it("is one closed <details id=under-the-hood>: the summary, then the six rules and the five generic links", () => {
    const html = hood();
    expect(html.match(/<details\b[^>]*>/g)).toHaveLength(1);
    expect(html).toMatch(/^<details id="under-the-hood"/);
    expect(html).not.toMatch(/<details\b[^>]*\sopen/);
    expect(text(/<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(html)![1])).toBe(`${H.h2} ${H.summary}`);
    const t = text(html);
    for (const r of H.rules("send")) expect(t).toContain(`${r.title}. ${r.body}`);
    expect(html.match(/data-hood-rule="\d"/g)).toHaveLength(6);
    expect(decode(html)).toContain(`<ol aria-label="${H.rulesTitle}"`);
    expect(decode(html)).toContain(`<ul aria-label="${H.linksTitle}"`);
    expect(hrefs(html)).toEqual(HOOD_LINKS);
    for (const label of [H.links.one, H.links.activity, H.links.market, H.links.contract, H.links.repo]) expect(t).toContain(label);
    // the source link opens a new tab and says so
    expect(html).toMatch(new RegExp(`<a href="${REPO_URL}" target="_blank" rel="noreferrer"`));
    expect(t).toContain(copy.a11y.newTab);
  });

  it("names no Satchel: no addresses, no '#1', no sale that needs a live market read (D-42)", () => {
    for (const sol of ["send", "off", "ui", "none"] as const) {
      const html = hood(sol);
      expect(html, sol).not.toContain("data-full-address");
      expect(text(html), sol).not.toMatch(/#\d|Satchel #|\.testnet\b|A sale the check blocks/);
      expect(hrefs(html), sol).not.toContain("/s/4/sale");
    }
  });

  it("tells the Solana story it is given: `none` refuses Solana messages and never mentions SOL transfers", () => {
    const t = text(hood("none"));
    expect(t).toContain(H.rules("none")[0].body);
    expect(t).toContain("Solana messages");
    expect(t).not.toContain("plain SOL transfers");
    expect(t).not.toContain("blockhash");
  });

  it("its plus is decorative and turns 45° when open, without a transition under reduced motion", () => {
    const summary = /<summary\b[^>]*>[\s\S]*?<\/summary>/.exec(hood())![0];
    expect(summary).toMatch(/<svg[^>]*class="[^"]*lucide-plus[^"]*group-open:rotate-45[^"]*motion-reduce:transition-none[^"]*"[^>]*aria-hidden="true"/);
    expect(summary).toMatch(/class="[^"]*\bmin-h-15\b/); // a 60 px row
  });
});

describe("QuestionsSection", () => {
  const html = questions("final");

  it("renders seven closed details[name=faq] with their anchor ids, in order", () => {
    const details = html.match(/<details\b[^>]*>/g) ?? [];
    expect(details).toHaveLength(7);
    expect(details.map((d) => /\sid="([^"]+)"/.exec(d)?.[1])).toEqual([...FAQ_IDS]);
    expect(FAQ_IDS).toEqual(["q-send", "q-keys", "q-proves", "q-after", "q-chains", "q-cost", "q-testnet"]);
    for (const d of details) {
      expect(d).toContain('name="faq"');
      expect(d).not.toMatch(/\sopen/);
    }
    expect(html).toMatch(/^<section id="questions" aria-labelledby="questions-title"/);
    expect(html).toMatch(/<h2 id="questions-title"[^>]*>Questions<\/h2>/);
  });

  it("puts every question in its summary and every answer after it, its first sentence the bold lead", () => {
    const t = text(html);
    for (const it of faqItems({ role: "final", sol: "send" })) {
      expect(t).toContain(`${it.q} ${it.a}`);
      expect(html).toContain(`>${esc(splitLead(it.a).lead)}</strong>`);
    }
  });

  it("carries the landing's one disclosure, in q-proves only: the browser, not the contract, checks", () => {
    expect([...text(html).matchAll(/not the contract/g)]).toHaveLength(1);
    const proves = html.slice(html.indexOf('id="q-proves"'), html.indexOf('id="q-after"'));
    expect(text(proves)).toContain("Your browser, not the contract, checks each one on its own chain");
  });

  it("adds the development line to the custody answer only on the dev role", () => {
    expect(text(questions("dev"))).toContain(copy.landing.questions.keysDev);
    for (const role of ["rc", "final"] as const) expect(text(questions(role))).not.toContain(copy.landing.questions.keysDev);
  });

  it("each summary is a ≥ 64 px row (72 from 768) with a decorative plus that turns 45°", () => {
    for (const s of html.match(/<summary\b[^>]*>[\s\S]*?<\/summary>/g) ?? []) {
      expect(s).toMatch(/class="[^"]*\bmin-h-16\b[^"]*\bmd:min-h-18\b/);
      expect(s).toMatch(/lucide-plus[^"]*group-open:rotate-45/);
    }
  });
});
