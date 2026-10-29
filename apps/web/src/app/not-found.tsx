import type { Metadata } from "next";
import { AppShell, NotFoundView } from "@/components/NavShell";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.page.notfound.generic };

/**
 * Unmatched URLs (a hard 404). The root layout carries no chrome (the route groups do), so this draws the app shell
 * itself, once. notFound() inside (app) renders `(app)/not-found.tsx` instead, inside that layout's shell.
 */
export default function NotFound() {
  return (
    <AppShell>
      <NotFoundView />
    </AppShell>
  );
}
