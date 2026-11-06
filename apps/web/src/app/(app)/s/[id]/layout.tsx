import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ObjArticle, ObjHead } from "@/components/client/SatchelPage";
import { NotFoundView } from "@/components/NavShell";
import { copy } from "@/lib/copy";
import { marketing } from "@/lib/copy/marketing";
import { pageMetadata } from "@/lib/seo";
import { getSatchelSnapshot } from "@/lib/data/server";
import { FIXTURE_IDS } from "@/lib/data/fixtures";

/**
 * /s/[id], the Satchel object page (app-screens §1.2; kb/90 §8.1 judge route). BLOCKING render, no Suspense boundary
 * above any fact: reads go through "use cache" (15 s), ids 1–7 are prerendered, and `instant = false` lets other ids
 * block. The layout renders the `<article>` and its head (the h1 and the tabs, which pick the Wallet head or the compact
 * header from the path); each tab page brings its two grid items (`ObjCol`, `ObjMain` from SatchelWallet.tsx), and the
 * flows render the Wallet tab as their inert background.
 *
 * An unknown id (past the minted ones) is a hard 404, answered by `src/proxy.ts` before rendering starts. If the
 * proxy could not read the contract, the request reaches this layout, which renders the not-found view itself (HTTP
 * 200, robots noindex, the heading in the server HTML) rather than calling `notFound()`: thrown from this blocking
 * layout, it made Next answer with its client-rendered error document (`<html id="__next_error__">`; QA-POLISH #6).
 * The tab pages below never render for an unknown id.
 */
export const instant = false;

export async function generateStaticParams() {
  return FIXTURE_IDS.map((id) => ({ id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const snap = await getSatchelSnapshot(id);
  if (!snap) return { title: copy.page.notfound.title(id), robots: { index: false } };
  const description = marketing.meta.satchel(id, snap.addresses.btc, snap.addresses.evm);
  // the per-Satchel social card is this segment's file-based image (opengraph-image.tsx), so no site-wide one here
  return pageMetadata({ path: `/s/${id}`, title: copy.page.title(id), description, images: false });
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
