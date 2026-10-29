// THROWAWAY spike: dynamic /s/[id] under cacheComponents (params is a Promise; uncached reads need <Suspense>)
import { Suspense } from 'react';
import { cacheLife } from 'next/cache';
import { JsonRpcProvider } from 'near-api-js';
async function getAccount(id: string) {
  'use cache';
  cacheLife({ revalidate: 15 });
  const p = new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com' }, { retries: 2, wait: 250, backoff: 2 });
  const a = await p.viewAccount({ accountId: id });
  return a.amount.toString();
}
async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const amt = await getAccount(id);
  return <pre id="out">{`account ${id} amount ${amt} DONE`}</pre>;
}
export default function Page(props: PageProps<'/s/[id]'>) {
  return <main><h1>Satchel</h1><Suspense fallback={<p>loading</p>}><Body params={props.params} /></Suspense></main>;
}
