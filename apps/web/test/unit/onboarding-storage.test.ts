import { afterEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_KEY, readOnboarding, shouldShowOnboarding, writeOnboardingDone } from "@/lib/onboarding-storage";

/** A minimal localStorage, optionally one that throws (private mode / storage disabled). */
function fakeStorage(opts: { throwing?: boolean } = {}) {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => {
      if (opts.throwing) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.throwing) throw new Error("SecurityError");
      store.set(k, v);
    },
    removeItem: (k: string) => void store.delete(k),
    store,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shouldShowOnboarding", () => {
  it("absent key: show it", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    expect(shouldShowOnboarding()).toBe(true);
  });

  it("key present (done): hide it, whatever its value", () => {
    const ls = fakeStorage();
    ls.store.set(ONBOARDING_KEY, "anything at all");
    vi.stubGlobal("window", { localStorage: ls });
    expect(shouldShowOnboarding()).toBe(false);
  });

  it("storage throws (private mode): hide it (never nag)", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage({ throwing: true }) });
    expect(shouldShowOnboarding()).toBe(false);
  });

  it("no window at all (SSR-like): hide it, and never throws", () => {
    expect(() => shouldShowOnboarding()).not.toThrow();
    expect(shouldShowOnboarding()).toBe(false);
  });
});

describe("readOnboarding", () => {
  it("absent or junk: null", () => {
    const ls = fakeStorage();
    vi.stubGlobal("window", { localStorage: ls });
    expect(readOnboarding()).toBeNull();
    ls.store.set(ONBOARDING_KEY, "not json");
    expect(readOnboarding()).toBeNull();
    ls.store.set(ONBOARDING_KEY, JSON.stringify({ not: "a record" }));
    expect(readOnboarding()).toBeNull();
  });

  it("a real record round-trips", () => {
    const ls = fakeStorage();
    vi.stubGlobal("window", { localStorage: ls });
    writeOnboardingDone(true);
    const r = readOnboarding();
    expect(r).toMatchObject({ v: 1, submitted: true, skippedSurvey: false });
    expect(typeof r?.doneAt).toBe("number");
  });

  it("throws: null, never throws itself", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage({ throwing: true }) });
    expect(() => readOnboarding()).not.toThrow();
    expect(readOnboarding()).toBeNull();
  });
});

describe("writeOnboardingDone", () => {
  it("submitted sticks: a later close without a new submission keeps submitted true", () => {
    const ls = fakeStorage();
    vi.stubGlobal("window", { localStorage: ls });
    writeOnboardingDone(true);
    expect(readOnboarding()).toMatchObject({ submitted: true, skippedSurvey: false });
    writeOnboardingDone(false); // a replay, closed again without sending the survey again
    expect(readOnboarding()).toMatchObject({ submitted: true, skippedSurvey: false });
  });

  it("never submitted: skippedSurvey stays true", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    writeOnboardingDone(false);
    expect(readOnboarding()).toMatchObject({ submitted: false, skippedSurvey: true });
  });

  it("never throws when storage throws, and still returns the record for in-memory use this session", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage({ throwing: true }) });
    const r = writeOnboardingDone(true);
    expect(r.submitted).toBe(true);
  });
});
