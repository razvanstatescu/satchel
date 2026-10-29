import { describe, expect, it } from "vitest";
import { CONTRACT_ROLE } from "@/lib/config";
import { copy } from "@/lib/copy";
import { lockView, type ContractRole } from "@/lib/lock-facts";

/**
 * The landing trust band's head (landing v4 §2.6, D-42): the landing reads nothing, so "No admin key" is a build-time
 * claim keyed to the contract role (spec risk 5). Role → variant: dev → the dev twin; rc → the main copy plus the
 * release-candidate line; final → the main copy. No variant names an account, a Satchel or a time; `/contract` keeps the
 * live proof.
 */

const L = copy.landing.lock;
const ROLES: ContractRole[] = ["dev", "rc", "final"];
const all = (role: ContractRole) => {
  const v = lockView(role);
  return [v.h2, v.body, v.note ?? ""].join(" ");
};

describe("lockView(role)", () => {
  it("final: the main H2 and the generic body, no note", () => {
    expect(lockView("final")).toEqual({ variant: "locked", h2: "No admin key. Not even ours.", body: L.body, note: null });
    expect(L.body).toBe("Satchel's contract was born without a key and can't be upgraded. Nobody can add one or change its code, us included.");
  });

  it("rc: the main H2 and body, plus the release-candidate line", () => {
    expect(lockView("rc")).toEqual({ variant: "locked", h2: L.h2, body: L.body, note: copy.role.rc });
    expect(copy.role.rc).toBe("Release candidate: testnet rehearsal");
  });

  it("dev: the dev twin, which never claims 'No admin key' (the dev contract still has keys)", () => {
    const v = lockView("dev");
    expect(v).toEqual({ variant: "dev", h2: L.dev.h2, body: L.dev.body, note: null });
    expect(v.h2).toBe("Development contract");
    expect(v.body).toContain("still has keys");
    expect(all("dev")).not.toContain(L.h2);
    expect(all("dev")).not.toContain(L.body);
  });

  it("only rc and final claim no admin key; the claim and its twin never mix", () => {
    for (const role of ROLES) {
      const v = lockView(role);
      expect(v.variant, role).toBe(role === "dev" ? "dev" : "locked");
      expect(v.h2 === L.h2, role).toBe(role !== "dev");
      expect(v.body === L.dev.body, role).toBe(role === "dev");
    }
  });

  it("is generic in every role: no account id, no Satchel number, no time, no live wording (D-42)", () => {
    for (const role of ROLES) {
      const t = all(role);
      expect(t, role).not.toMatch(/\.testnet\b/);
      expect(t, role).not.toMatch(/#\d/);
      expect(t, role).not.toMatch(/\bUTC\b|\bago\b|\d{4}-\d{2}-\d{2}/);
      expect(t, role).not.toMatch(/\blive\b|belongs to/i);
    }
  });

  it("the build's own role picks one of the three (the band takes CONTRACT_ROLE by default)", () => {
    expect(ROLES).toContain(CONTRACT_ROLE);
    expect(lockView(CONTRACT_ROLE).variant).toBe(CONTRACT_ROLE === "dev" ? "dev" : "locked");
  });
});
