import { describe, expect, it } from "vitest";
import { nextTokenId, satchelPathId, tokenVerdict } from "@/lib/token-exists";

describe("token-exists (src/proxy.ts: /s/<unknown id> answers HTTP 404)", () => {
  it("an id exists when it is below next_token_id (ids are never burned)", () => {
    expect(tokenVerdict("1", 8)).toBe("exists");
    expect(tokenVerdict("7", 8)).toBe("exists");
    expect(tokenVerdict("8", 8)).toBe("missing");
    expect(tokenVerdict("999", 8)).toBe("missing");
  });
  it("a malformed id is missing whatever the contract says; an unreadable contract is unknown (the request goes through)", () => {
    for (const bad of ["0", "abc", "01", "-1", "1.5", "", "12345678901"]) expect(tokenVerdict(bad, 8)).toBe("missing");
    expect(tokenVerdict("999", null)).toBe("unknown");
    expect(tokenVerdict("abc", null)).toBe("missing");
  });
  it("reads the id from every /s/<id> page, and leaves the social images alone", () => {
    expect(satchelPathId("/s/999")).toBe("999");
    expect(satchelPathId("/s/999/send")).toBe("999");
    expect(satchelPathId("/s/1/coin/btc")).toBe("1");
    expect(satchelPathId("/s/999/opengraph-image")).toBeNull();
    expect(satchelPathId("/s/999/opengraph-image-1uuf7f")).toBeNull();
    expect(satchelPathId("/s/999/twitter-image-1uuf7f")).toBeNull();
    expect(satchelPathId("/satchels")).toBeNull();
    expect(satchelPathId("/market")).toBeNull();
  });
  it("fixture mode answers from the fixture config, without a network read", async () => {
    expect(await nextTokenId(999)).toBe(8);
  });
});
