"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useBackendStatus } from "@/lib/use-backend-status";
import {
  useNotifications,
  dismissNotification,
  clearNotifications,
} from "@/lib/use-notifications";

const pageTitles: Record<string, string> = {
  "/new-quote": "Submit New Quote",
  "/quotes": "Live Quote Feed",
  "/pipeline": "Pipeline Visualization",
  "/escalations": "Escalation Queue",
  "/analytics": "Analytics Dashboard",
  "/regional": "Regional Intelligence",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";
  const { status } = useBackendStatus();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }, []);

  function handleClearAll() {
    clearNotifications();
    setOpen(false);
  }

  const sseLabel =
    status === "online"
      ? "SSE: Connected"
      : status === "offline"
        ? "SSE: Disconnected"
        : "SSE: Checking";
  const sseColor =
    status === "online"
      ? "border-[var(--risk-low)]/30 text-[var(--risk-low)]"
      : status === "offline"
        ? "border-[var(--risk-high)]/30 text-[var(--risk-high)]"
        : "border-border text-muted-foreground";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-sm">
      <div>
        <h1 className="font-serif text-lg font-normal italic text-foreground">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded border bg-muted/50 px-2.5 py-1 font-mono text-[11px] ${sseColor}`}
        >
          {sseLabel}
        </span>
        <div className="relative" onBlur={handleBlur} tabIndex={-1}>
          <button
            onClick={() => setOpen((p) => !p)}
            className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="size-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold text-foreground">
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                    No notifications
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2 border-b border-border/50 px-3 py-2.5 last:border-0"
                    >
                      <span className="mt-1 inline-flex size-1.5 shrink-0 rounded-full bg-primary/60" />
                      <div className="flex-1">
                        <p className="text-[12px] text-foreground/90">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {n.time}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
