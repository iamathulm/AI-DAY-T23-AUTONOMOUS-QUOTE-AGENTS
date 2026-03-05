import { AppShell } from "@/components/layout/app-shell";

export default function RegionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
