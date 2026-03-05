import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-56">
        <AppHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
