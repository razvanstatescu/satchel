import { describe, expect, it } from "vitest";
import { buildClaimUrl, generateClaimKey, parseClaimFragment, parseClaimLink } from "@/lib/claim/link";
import { planClaim, runClaim } from "@/lib/claim/plan";

/** R3-X-4: a give-by-link claim moves only the gifted ids; everything else in the account is "also here". */

describe("claim link gift ids", () => {
  it("round-trips the secret and the gifted ids through the fragment", () => {
    const k = generateClaimKey();
    const url = buildClaimUrl(k.secretKey, ["7", "12"]);
    const u = new URL(url);
    expect(u.search).toBe("");
    const link = parseClaimLink(u.hash);
    expect(link?.key).toEqual(k);
    expect(link?.giftTokenIds).toEqual(["7", "12"]);
    expect(parseClaimFragment(u.hash)?.implicitAccountId).toBe(k.implicitAccountId);
  });

  it("an older link without ids parses as legacy (null gift list)", () => {
    const k = generateClaimKey();
    const link = parseClaimLink(`#${k.secretKey}`);
    expect(link?.key).toEqual(k);
    expect(link?.giftTokenIds).toBeNull();
    expect(buildClaimUrl(k.secretKey)).toMatch(/\/claim#[^&]+$/);
  });

  it("rejects a malformed gift param instead of silently claiming everything", () => {
    const k = generateClaimKey();
    expect(parseClaimLink(`#${k.secretKey}&gift=`)).toBeNull();
    expect(parseClaimLink(`#${k.secretKey}&gift=1,x`)).toBeNull();
    expect(parseClaimLink(`#${k.secretKey}&gift=-3`)).toBeNull();
  });

  it("ignores unknown params and de-duplicates ids", () => {
    const k = generateClaimKey();
    expect(parseClaimLink(`#${k.secretKey}&foo=1&gift=4,4,5`)?.giftTokenIds).toEqual(["4", "5"]);
  });
});

describe("planClaim", () => {
  it("claims only the gifted ids and lists the rest as others", () => {
    const p = planClaim(["3", "50", "51"], ["3"]);
    expect(p).toEqual({ claim: ["3"], others: ["50", "51"], missing: [], legacy: false });
  });

  it("reports a gifted id that is no longer there", () => {
    const p = planClaim(["50"], ["3"]);
    expect(p.claim).toEqual([]);
    expect(p.missing).toEqual(["3"]);
    expect(p.others).toEqual(["50"]);
  });

  it("legacy: claims everything found, labelled legacy", () => {
    expect(planClaim(["1", "2"], null)).toEqual({ claim: ["1", "2"], others: [], missing: [], legacy: true });
  });
});

describe("runClaim", () => {
  it("a failed transfer neither stops the other transfers nor skips the NEAR sweep", async () => {
    const sent: string[] = [];
    let swept = false;
    const out = await runClaim(
      ["1", "2", "3"],
      async (id) => {
        if (id === "2") throw new Error("boom");
        sent.push(id);
      },
      async () => {
        swept = true;
        return 5n;
      },
    );
    expect(sent).toEqual(["1", "3"]);
    expect(out).toEqual({ moved: ["1", "3"], failed: ["2"], nearSentYocto: 5n });
    expect(swept).toBe(true);
  });

  it("a failing sweep is reported as zero NEAR sent, not an exception", async () => {
    const out = await runClaim(["1"], async () => {}, async () => {
      throw new Error("sweep");
    });
    expect(out).toEqual({ moved: ["1"], failed: [], nearSentYocto: 0n });
  });
});
