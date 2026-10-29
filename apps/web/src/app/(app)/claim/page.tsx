import type { Metadata } from "next";
import { ClaimFlow } from "@/components/client/ClaimFlow";
import { copy } from "@/lib/copy";

/**
 * /claim (A2 Give by link; plan/feature-ideas.md A2): client-only — the secret lives only in `location.hash`, which
 * server HTML never sees, so this route renders no facts about the link server-side. `ClaimFlow` reads the fragment
 * on mount and does everything from there.
 */
export const metadata: Metadata = { title: copy.claim.title, description: copy.claim.note, robots: { index: false } };

export default function ClaimPage() {
  return <ClaimFlow />;
}
