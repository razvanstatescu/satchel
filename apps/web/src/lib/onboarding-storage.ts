/**
 * First-time onboarding, persistence (kb/80, the onboarding build). Per browser, never per account: Satchel has no
 * accounts of its own, so "first time" means the first NEAR wallet connected in THIS browser.
 *
 * Storage: localStorage["satchel:onboarding:v1"] = `OnboardingRecord`. Absent means "show it"; present (whatever its
 * shape) means "done, never show it again". Every read and write is wrapped in try/catch: a throw (private mode,
 * storage disabled) is treated as "done" so a broken browser is never nagged on every load.
 */

export const ONBOARDING_KEY = "satchel:onboarding:v1";

export interface OnboardingRecord {
  v: 1;
  /** When it was last closed (any of: X, Escape, Skip, a CTA, or the survey's Skip/Send). */
  doneAt: number;
  /** True until a survey response has ever been sent (sticky: a later replay that's closed without sending again
   * never clears a true `submitted`). */
  skippedSurvey: boolean;
  submitted: boolean;
}

function isOnboardingRecord(v: unknown): v is OnboardingRecord {
  return !!v && typeof v === "object" && "doneAt" in v;
}

/** The stored record, or null if absent, unreadable or junk. Never throws. */
export function readOnboarding(): OnboardingRecord | null {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isOnboardingRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Should the onboarding show on this load? Only when the key is absent. A storage throw (private mode) answers
 * false (don't show) rather than true (don't nag), per the spec.
 */
export function shouldShowOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === null;
  } catch {
    return false;
  }
}

/**
 * Marks it done. `submitted` is sticky: once true, a later close that didn't submit again keeps it true (so a
 * replay's Skip never un-submits an earlier survey). Never throws.
 */
export function writeOnboardingDone(submittedNow: boolean): OnboardingRecord {
  const prevSubmitted = readOnboarding()?.submitted === true;
  const submitted = submittedNow || prevSubmitted;
  const record: OnboardingRecord = { v: 1, doneAt: Date.now(), skippedSurvey: !submitted, submitted };
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(record));
  } catch {
    /* private mode: nothing to persist, but the session's own state still closed it */
  }
  return record;
}
