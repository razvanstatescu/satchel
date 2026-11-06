import { buildSnapshot } from "@/lib/data/snapshot";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { contractViews } from "@/lib/near/contract";

/** Browser-side snapshot build, split out of `client.ts` so the data source and derivation load on demand. */
export async function freshSnapshot(initial: SatchelSnapshot): Promise<SatchelSnapshot> {
  const src = dataSource();
  const [config, lock] = await Promise.all([contractViews(src.view).config(), src.lock()]);
  const s = await buildSnapshot(initial.token_id, src, { config, lock }, Date.now());
  return s ?? initial;
}
