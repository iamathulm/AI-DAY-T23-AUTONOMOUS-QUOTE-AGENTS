import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import DotGrid from "@/components/landing/dot-grid";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-28">
        <DotGrid
          dotSize={4}
          gap={18}
          baseColor="#151515"
          activeColor="#f5f5f5"
          proximity={85}
          shockRadius={180}
          shockStrength={2.2}
          resistance={950}
          returnDuration={1.4}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_44%)]" />

      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col pl-56">
        <AppHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
