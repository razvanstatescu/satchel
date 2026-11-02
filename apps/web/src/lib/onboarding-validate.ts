import { z } from "zod";

/**
 * POST /api/onboarding, request validation (the onboarding build). Strict against the option ids the survey's copy
 * deck uses (copy/onboarding.ts): an unknown key or an unknown option value is a 400, never a silent drop. The one
 * exception is `account_id`, which is dropped (not rejected) when `share_account` isn't `true`, since a client bug
 * or an old tab sending it anyway shouldn't fail the whole request.
 */

export const GOAL_OPTIONS = ["explore", "gift", "trade", "multichain", "build", "other"] as const;
export const EXPERIENCE_OPTIONS = ["new", "some", "regular", "builder"] as const;
export const CHAINS_OPTIONS = ["btc", "evm", "sol", "near", "none"] as const;
export const SOURCE_OPTIONS = ["hackathon", "x", "friend", "search", "other"] as const;

export type GoalOption = (typeof GOAL_OPTIONS)[number];
export type ExperienceOption = (typeof EXPERIENCE_OPTIONS)[number];
export type ChainsOption = (typeof CHAINS_OPTIONS)[number];
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

/** A NEAR testnet account id (config.ts' `accountId` shape, plus the `.testnet` suffix this app only ever runs on). */
const testnetAccountId = z
  .string()
  .min(2)
  .max(64)
  .regex(/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+\.testnet$/, "not a NEAR testnet account id");

const BodySchema = z
  .object({
    skipped: z.boolean().optional(),
    goal: z.array(z.enum(GOAL_OPTIONS)).max(GOAL_OPTIONS.length).optional(),
    experience: z.enum(EXPERIENCE_OPTIONS).optional(),
    chains: z.array(z.enum(CHAINS_OPTIONS)).max(CHAINS_OPTIONS.length).optional(),
    source: z.enum(SOURCE_OPTIONS).optional(),
    share_account: z.boolean().optional(),
    account_id: testnetAccountId.optional(),
  })
  .strict();

export interface OnboardingPayload {
  skipped: boolean;
  goal: GoalOption[];
  experience: ExperienceOption | null;
  chains: ChainsOption[];
  source: SourceOption | null;
  shareAccount: boolean;
  accountId: string | null;
}

/** The request body, no larger than this many bytes (the spec's "about 2 KB"; checked on the raw text before parsing). */
export const MAX_BODY_BYTES = 2048;

export type ParseResult = { ok: true; data: OnboardingPayload } | { ok: false; error: string };

/** `text.length` in UTF-8 bytes stays within `MAX_BODY_BYTES` (checked before `JSON.parse`, so an oversize body never
 * reaches the parser). */
export function isWithinSizeLimit(text: string): boolean {
  return Buffer.byteLength(text, "utf8") <= MAX_BODY_BYTES;
}

/** Validates a parsed JSON body. Unknown keys and unknown option values are rejected (400); an `account_id` present
 * without `share_account: true` is dropped rather than rejected. */
export function parseOnboardingBody(raw: unknown): ParseResult {
  const r = BodySchema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") };
  const v = r.data;
  const shareAccount = v.share_account === true;
  return {
    ok: true,
    data: {
      skipped: v.skipped === true,
      goal: [...new Set(v.goal ?? [])], // a repeated option counts once
      experience: v.experience ?? null,
      chains: [...new Set(v.chains ?? [])],
      source: v.source ?? null,
      shareAccount,
      accountId: shareAccount ? v.account_id ?? null : null,
    },
  };
}
