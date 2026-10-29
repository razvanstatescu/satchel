import { NotFoundView } from "@/components/NavShell";

/**
 * notFound() inside the app: the (app) layout already draws the shell, so this is only the view (v4 nested two shells,
 * app-inventory §5.1.5). A safety net: `/s/[id]` renders `NotFoundView` itself for an unknown id (a soft 404 with the
 * view in the server HTML), and unmatched URLs get the root not-found (a hard 404, same view, same shell).
 */
export default function AppNotFound() {
  return <NotFoundView />;
}
