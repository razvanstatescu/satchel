import type { Metadata } from "next";
import { MintFlow } from "@/components/client/MintFlow";
import { Skeleton } from "@/components/ui";
import { copy } from "@/lib/copy";
import { pageMetadata } from "@/lib/seo";
import { safeReturnPath } from "./safe-from";

/**
 * /mint (app-screens §10): the Mint flow in the FlowShell, over My Satchels (the background is a quiet, inert frame of
 * that page: its head and card skeletons, no data). `?from=` is where Close returns (a same-site path only).
 */
export const instant = false;

// `?from=` only says where Close returns: every variant canonicalises to /mint.
export const metadata: Metadata = pageMetadata({ path: "/mint", title: copy.mint.title, description: copy.mint.meta });

function MintBackdrop() {
  return (
    <div aria-hidden="true" inert>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <p className="m-0 font-display text-title text-ink">{copy.home.list.title}</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-7 p-0 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton className="aspect-[1.586/1] w-full max-w-100 rounded-card" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function MintPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  return (
    <>
      <MintBackdrop />
      <MintFlow from={safeReturnPath(sp.from)} />
    </>
  );
}
