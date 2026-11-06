import type { ViewFn } from "@/lib/near/contract";

/**
 * `dataSource().view`, loaded on first use. Client components that read a contract view only after an interaction or
 * once a wallet is connected pass this to `contractViews(...)`, so the data source (RPC clients, fixtures, simulation)
 * is not part of the page's first JavaScript.
 */
export const lazyView: ViewFn = async <T,>(contractId: string, method: string, args: Record<string, unknown>) => {
  const { dataSource } = await import("@/lib/data/source");
  return dataSource().view<T>(contractId, method, args);
};
