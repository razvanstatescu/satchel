import { describe, expect, it } from "vitest";
import { isWithinSizeLimit, MAX_BODY_BYTES, parseOnboardingBody } from "@/lib/onboarding-validate";

describe("parseOnboardingBody (POST /api/onboarding)", () => {
  it("accepts a full, valid survey response", () => {
    const r = parseOnboardingBody({ goal: ["explore", "build"], experience: "some", chains: ["btc", "near"], source: "hackathon" });
    expect(r).toEqual({
      ok: true,
      data: { skipped: false, goal: ["explore", "build"], experience: "some", chains: ["btc", "near"], source: "hackathon", shareAccount: false, accountId: null },
    });
  });

  it("accepts the Skip signal alone", () => {
    const r = parseOnboardingBody({ skipped: true });
    expect(r.ok).toBe(true);
    expect(r.ok && r.data.skipped).toBe(true);
  });

  it("accepts an empty object (everything was left blank)", () => {
    const r = parseOnboardingBody({});
    expect(r).toEqual({ ok: true, data: { skipped: false, goal: [], experience: null, chains: [], source: null, shareAccount: false, accountId: null } });
  });

  it("rejects an unknown top-level key", () => {
    const r = parseOnboardingBody({ goal: ["explore"], utm_source: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown option value", () => {
    expect(parseOnboardingBody({ goal: ["not-a-real-option"] }).ok).toBe(false);
    expect(parseOnboardingBody({ experience: "expert" }).ok).toBe(false);
    expect(parseOnboardingBody({ chains: ["doge"] }).ok).toBe(false);
    expect(parseOnboardingBody({ source: "tv-ad" }).ok).toBe(false);
  });

  it("drops the account id (rather than rejecting the request) when share_account isn't true", () => {
    const r = parseOnboardingBody({ account_id: "alice.testnet" });
    expect(r).toEqual({ ok: true, data: { skipped: false, goal: [], experience: null, chains: [], source: null, shareAccount: false, accountId: null } });
    const r2 = parseOnboardingBody({ share_account: false, account_id: "alice.testnet" });
    expect(r2.ok && r2.data.accountId).toBeNull();
  });

  it("keeps the account id only alongside share_account: true, and validates it as a NEAR testnet account", () => {
    const r = parseOnboardingBody({ share_account: true, account_id: "alice.satchelhq.testnet" });
    expect(r).toEqual({
      ok: true,
      data: { skipped: false, goal: [], experience: null, chains: [], source: null, shareAccount: true, accountId: "alice.satchelhq.testnet" },
    });
  });

  it("rejects a bad account id even with consent given", () => {
    for (const bad of ["Not An Account", "alice.near", "alice", "has spaces.testnet", "a".repeat(80) + ".testnet"]) {
      expect(parseOnboardingBody({ share_account: true, account_id: bad }).ok, bad).toBe(false);
    }
  });

  it("rejects a non-object body", () => {
    expect(parseOnboardingBody("just a string").ok).toBe(false);
    expect(parseOnboardingBody(null).ok).toBe(false);
    expect(parseOnboardingBody([1, 2, 3]).ok).toBe(false);
  });
});

describe("isWithinSizeLimit (the ~2 KB body cap)", () => {
  it("allows a normal survey body and the exact limit", () => {
    expect(isWithinSizeLimit(JSON.stringify({ goal: ["explore"], experience: "some" }))).toBe(true);
    expect(isWithinSizeLimit("a".repeat(MAX_BODY_BYTES))).toBe(true);
  });

  it("rejects a body over the limit", () => {
    expect(isWithinSizeLimit("a".repeat(MAX_BODY_BYTES + 1))).toBe(false);
    expect(isWithinSizeLimit(JSON.stringify({ goal: Array(500).fill("explore") }))).toBe(false);
  });
});

describe("parseOnboardingBody: a repeated option counts once", () => {
  it("dedupes goal and chains", () => {
    const r = parseOnboardingBody({ goal: ["explore", "explore", "gift"], chains: ["btc", "btc"] });
    expect(r.ok && r.data.goal).toEqual(["explore", "gift"]);
    expect(r.ok && r.data.chains).toEqual(["btc"]);
  });
});
