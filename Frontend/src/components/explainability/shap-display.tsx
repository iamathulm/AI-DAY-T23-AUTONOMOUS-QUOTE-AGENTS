"use client";

import type { ShapFeature } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ShapDisplay({
  features,
  title,
}: {
  features: ShapFeature[];
  title: string;
}) {
  const maxAbsImpact = Math.max(...features.map((f) => Math.abs(f.impact)));

  return (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1.5">
        {features.map((feat) => {
          const widthPct = (Math.abs(feat.impact) / maxAbsImpact) * 100;
          const isPositive = feat.impact > 0;

          return (
            <div key={feat.feature} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-right font-mono text-[11px] text-muted-foreground">
                {feat.feature}
              </span>
              <div className="flex flex-1 items-center">
                <div className="relative h-4 w-full">
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                  {/* Bar */}
                  <div
                    className={cn(
                      "absolute top-0.5 h-3 rounded-sm transition-all",
                      isPositive
                        ? "left-1/2 bg-[var(--risk-high)]/60"
                        : "right-1/2 bg-[var(--risk-low)]/60"
                    )}
                    style={{ width: `${widthPct / 2}%` }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "w-14 shrink-0 text-right font-mono text-[11px]",
                  isPositive ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"
                )}
              >
                {isPositive ? "+" : ""}
                {feat.impact.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
