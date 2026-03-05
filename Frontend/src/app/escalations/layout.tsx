import { AppShell } from "@/components/layout/app-shell";

export default function EscalationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
