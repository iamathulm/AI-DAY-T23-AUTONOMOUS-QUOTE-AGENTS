import { AppShell } from "@/components/layout/app-shell";

export default function NewQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
