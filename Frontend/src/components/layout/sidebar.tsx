"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  GitBranch,
  AlertTriangle,
  BarChart3,
  Globe,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/escalations", label: "Escalations", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/regional", label: "Regional", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-7 items-center justify-center rounded bg-primary/15">
          <Activity className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold leading-tight text-foreground">
            Quote Agents
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Autonomous
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <span className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Operations
        </span>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System status footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--risk-low)] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--risk-low)]" />
          </span>
          <span className="text-[11px] text-muted-foreground">
            Pipeline Active
          </span>
        </div>
      </div>
    </aside>
  );
}
