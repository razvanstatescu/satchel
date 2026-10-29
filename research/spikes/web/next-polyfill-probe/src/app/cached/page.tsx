// THROWAWAY spike: server-side cached RPC read under cacheComponents
import { cacheLife } from 'next/cache';
import { JsonRpcProvider } from 'near-api-js';
async function getMpcVersion() {
  'use cache';
  cacheLife({ revalidate: 15 });
  const p = new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com' }, { retries: 2, wait: 250, backoff: 2 });
  return p.callFunction<string>({ contractId: 'v1.signer-prod.testnet', method: 'version', args: {} });
}
export default async function Page() {
  const v = await getMpcVersion();
  return <pre id="out">{`mpc version ${String(v)} DONE`}</pre>;
}
