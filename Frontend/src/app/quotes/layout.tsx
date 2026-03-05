import { AppShell } from "@/components/layout/app-shell";

export default function QuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
