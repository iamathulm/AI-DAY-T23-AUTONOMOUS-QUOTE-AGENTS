"use client";

import { cn } from "@/lib/utils";
import type { RiskTier } from "@/lib/types";

const riskConfig: Record<RiskTier, { label: string; className: string }> = {
  LOW: {
    label: "Low Risk",
    className: "bg-[var(--risk-low)]/15 text-[var(--risk-low)] border-[var(--risk-low)]/25",
  },
  MEDIUM: {
    label: "Medium Risk",
    className: "bg-[var(--risk-medium)]/15 text-[var(--risk-medium)] border-[var(--risk-medium)]/25",
  },
  HIGH: {
    label: "High Risk",
    className: "bg-[var(--risk-high)]/15 text-[var(--risk-high)] border-[var(--risk-high)]/25",
  },
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  const config = riskConfig[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border",
        config.className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tier === "LOW" && "bg-[var(--risk-low)]",
          tier === "MEDIUM" && "bg-[var(--risk-medium)]",
          tier === "HIGH" && "bg-[var(--risk-high)]"
        )}
      />
      {config.label}
    </span>
  );
}
