import { NotFoundView } from "@/components/NavShell";

/**
 * notFound() inside the app: the (app) layout already draws the shell, so this is only the view (v4 nested two shells,
 * app-inventory §5.1.5). A safety net: an unknown `/s/[id]` is rewritten by `src/proxy.ts` to the root not-found (a
 * hard 404, same view, same shell), like any unmatched URL; if the proxy can't tell, the layout renders the view.
 */
export default function AppNotFound() {
  return <NotFoundView />;
}
