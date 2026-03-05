"use client";

import { cn } from "@/lib/utils";

export function LimeDisplay({
  features,
  title,
}: {
  features: Record<string, number>;
  title: string;
}) {
  const entries = Object.entries(features).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)));

  return (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1">
        {entries.map(([key, value]) => {
          const pct = (Math.abs(value) / maxAbs) * 100;
          const isPositive = value > 0;

          return (
            <div key={key} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 truncate text-right font-mono text-[11px] text-muted-foreground">
                {key}
              </span>
              <div className="h-2.5 flex-1 rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isPositive ? "bg-[var(--risk-high)]/50" : "bg-[var(--risk-low)]/50"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-12 shrink-0 text-right font-mono text-[10px]",
                  isPositive ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"
                )}
              >
                {isPositive ? "+" : ""}
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
