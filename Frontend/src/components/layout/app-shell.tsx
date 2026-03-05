"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useBackendStatus } from "@/lib/use-backend-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useBackendStatus();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      <div className="square-grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_44%)]" />

      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col pl-56 bg-background">
        <AppHeader />
        {status === "offline" && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-[var(--risk-high)]/20 bg-[var(--risk-high)]/5 px-3 py-2">
            <span className="inline-flex size-2 rounded-full bg-[var(--risk-high)]" />
            <p className="text-[12px] text-[var(--risk-high)]/90">
              Backend offline — start the server for live data, or click &quot;Load Sample Data&quot; below.
            </p>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
