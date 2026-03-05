"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/quotes": "Live Quote Feed",
  "/pipeline": "Pipeline Visualization",
  "/escalations": "Escalation Queue",
  "/analytics": "Analytics Dashboard",
  "/regional": "Regional Intelligence",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div>
        <h1 className="font-serif text-lg font-normal italic text-foreground">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded border border-border bg-muted/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          SSE: Connected
        </span>
        <button className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
            3
          </span>
        </button>
      </div>
    </header>
  );
}
