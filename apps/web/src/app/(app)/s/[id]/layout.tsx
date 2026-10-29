import { SOL_UI_ENABLED } from "@/lib/config";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ObjArticle, ObjHead } from "@/components/client/SatchelPage";
import { NotFoundView } from "@/components/NavShell";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";
import { FIXTURE_IDS } from "@/lib/data/fixtures";

/**
 * /s/[id], the Satchel object page (app-screens §1.2; kb/90 §8.1 judge route). BLOCKING render, no Suspense boundary
 * above any fact: reads go through "use cache" (15 s), ids 1–7 are prerendered, and `instant = false` lets other ids
 * block. The layout renders the `<article>` and its head (the h1 and the tabs, which pick the Wallet head or the compact
 * header from the path); each tab page brings its two grid items (`ObjCol`, `ObjMain` from SatchelWallet.tsx), and the
 * flows render the Wallet tab as their inert background.
 *
 * An unknown id (past the minted ones) is a soft 404: HTTP 200, robots noindex and the not-found view, all in the server
 * HTML. The layout renders that view itself rather than calling `notFound()`: thrown from this blocking layout, it made
 * Next answer with its client-rendered error document (`<html id="__next_error__">`, no heading in the HTML; QA-POLISH
 * #6). The tab pages below never render for an unknown id.
 */
export const instant = false;

export async function generateStaticParams() {
  return FIXTURE_IDS.map((id) => ({ id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) return { title: copy.page.notfound.title(id), robots: { index: false } };
  const description = copy.page.meta(id, snap.addresses.btc, snap.addresses.evm, SOL_UI_ENABLED ? snap.addresses.sol : undefined);
  return { title: copy.page.title(id), description, openGraph: { title: copy.title.page(copy.page.title(id)), description } };
}

export default async function SatchelLayout(props: { params: Promise<{ id: string }>; children: ReactNode }) {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) return <NotFoundView />;
  return (
    <ObjArticle snap={snap}>
      <ObjHead snap={snap} />
      {/* each tab page supplies grid items; a flow's FlowShell root (fixed children only) must not take a grid cell */}
      <div className="contents *:data-flow-shell:contents">{props.children}</div>
    </ObjArticle>
  );
}
