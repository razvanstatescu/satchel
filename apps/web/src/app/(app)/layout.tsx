import { AppShell } from "@/components/NavShell";

/** The app chrome (design-spec §3.3): the top bar below 1024 px, the 256 px side nav from 1024, one footer. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
