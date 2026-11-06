import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { safeReturnPath } from "@/app/(app)/mint/safe-from";
import { swingFrames } from "@/components/client/MintFlow";
import { APP_NAV, navKeyFor, satchelIdOf } from "@/components/client/NavLinks";
import { HACKATHON_URL, LANDING_ANCHORS, Strips } from "@/components/NavShell";
import { copy } from "@/lib/copy";

/**
 * The shell (design-spec §3.3; app-screens §1.1, §2, §10): the nav model and its current item, the landing's in-page
 * links, Mint's return path, the charms' swing, and the shell's copy.
 */

describe("the app nav", () => {
  it("is My Satchels · Market · Mint · Address book · Contract facts, with the 2.0 routes", () => {
    expect(APP_NAV.map((i) => [i.label, i.href])).toEqual([
      ["My Satchels", "/satchels"],
      ["Market", "/market"],
      ["Mint", "/mint"],
      ["Address book", "/address-book"],
      ["Contract facts", "/contract"],
    ]);
  });

  it("marks the page's own item (exact) and its sub-pages", () => {
    expect(navKeyFor("/satchels", false)).toEqual({ key: "satchels", exact: true });
    expect(navKeyFor("/market", false)).toEqual({ key: "market", exact: true });
    expect(navKeyFor("/mint", false)).toEqual({ key: "mint", exact: true });
    expect(navKeyFor("/contract", false)).toEqual({ key: "contract", exact: true });
    expect(navKeyFor("/", false)).toEqual({ key: null, exact: false });
    expect(navKeyFor("/no-such-page", false)).toEqual({ key: null, exact: false });
    expect(navKeyFor("/marketplace", false).key).toBeNull(); // a prefix of the path is not a section
  });

  it("puts a Satchel's pages under My Satchels only when the viewer owns it", () => {
    for (const path of ["/s/1", "/s/1/activity", "/s/12/sale", "/s/3/send"]) {
      expect(navKeyFor(path, true), path).toEqual({ key: "satchels", exact: false });
      expect(navKeyFor(path, false), path).toEqual({ key: null, exact: false });
    }
    expect(satchelIdOf("/s/42/receive")).toBe("42");
    expect(satchelIdOf("/s/abc")).toBeNull();
    expect(satchelIdOf("/satchels")).toBeNull();
  });
});

describe("the landing's top bar", () => {
  it("links the landing's sections in page order (the proto ids) and names them from the shell's copy", () => {
    expect(LANDING_ANCHORS).toEqual([
      { href: "/#how", label: "How it works" },
      { href: "/#clean", label: "Clean history" },
      { href: "/#questions", label: "Questions" },
    ]);
    expect(HACKATHON_URL).toMatch(/^https:\/\//);
  });
});

describe("Mint's return path (?from=)", () => {
  it("keeps same-site paths", () => {
    for (const p of ["/", "/satchels", "/s/1", "/s/1/sale?list=1", "/market#top"]) expect(safeReturnPath(p), p).toBe(p);
  });

  it("refuses anything that could leave the site, loop, or isn't a path", () => {
    for (const p of [undefined, "", "satchels", "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/x", "javascript:alert(1)", "/mint", "/mint?from=/", "/mint/"])
      expect(safeReturnPath(p), JSON.stringify(p)).toBeNull();
    expect(safeReturnPath(["/satchels"])).toBeNull();
    expect(safeReturnPath("/minted")).toBe("/minted"); // only /mint itself loops
  });
});

describe("the charms' swing (motion-spec §7)", () => {
  it("is a damped pendulum about 0°: alternating extremes, each 0.62 of the last, then rest", () => {
    const f = swingFrames(90, 9);
    expect(f[0]).toEqual([90, "0deg", expect.any(String)]);
    const extremes = f.slice(1, -1).map(([, v]) => parseFloat(String(v)));
    expect(extremes).toHaveLength(5);
    expect(extremes[0]).toBe(9);
    for (let i = 1; i < extremes.length; i++) {
      expect(Math.sign(extremes[i])).toBe(-Math.sign(extremes[i - 1]));
      expect(Math.abs(extremes[i])).toBeCloseTo(Math.abs(extremes[i - 1]) * 0.62, 1);
    }
    expect(f[f.length - 1][1]).toBe("0deg");
    // time only moves forward, a half-period (420 ms) between extremes, about 2.3 s to rest
    const times = f.map(([t]) => t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[2] - times[1]).toBe(420);
    expect(times[times.length - 1] - times[0]).toBeGreaterThan(2000);
    expect(times[times.length - 1] - times[0]).toBeLessThan(2500);
  });
});

describe("the Strips (D-52: only the fixture strip stays; the role strip is gone on every page)", () => {
  it("renders no role-strip, and (fixture mode) the fixture strip", () => {
    const html = renderToStaticMarkup(createElement(Strips));
    expect(html).not.toContain("role-strip");
    expect(html).toContain('data-testid="fixture-strip"');
    expect(html).toContain(copy.app.fixture.replace(/'/g, "&#x27;"));
  });
});

describe("the shell's copy (design-spec §3.3, R8, DL-10)", () => {
  it("says one connect label everywhere and the footer note is footer.testnet", () => {
    expect(copy.nav.connect).toBe("Connect NEAR wallet");
    expect(copy.nav.connect.startsWith(copy.nav.connectShort)).toBe(true); // "Connect" below 480 keeps the full name
    expect(copy.mint.connect).toBe(copy.nav.connect);
    expect(copy.footer.testnet).toBe("Testnet only. Coins here have no value.");
  });

  it("names the account controls so their visible text stays in the name (WCAG 2.5.3)", () => {
    expect(copy.nav.accountButton("alice.testnet")).toBe("Account alice.testnet");
    expect(`${copy.nav.mySatchels}, ${copy.nav.signedInAs("alice.testnet")}`).toBe("My Satchels, signed in as alice.testnet");
  });

  it("keeps the mint honest: a cancel changes nothing, an unconfirmed mint may still land", () => {
    expect(copy.mint.cancelled).toBe("You cancelled in your wallet. Nothing was minted.");
    expect(copy.mint.unconfirmed).not.toMatch(/nothing was minted/i);
    expect(copy.mint.depositAmount).toBe("0.02\u00a0NEAR"); // a no-break space before the ticker
  });
});
