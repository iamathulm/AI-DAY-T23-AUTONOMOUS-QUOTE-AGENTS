"use client";

import { cn } from "@/lib/utils";

type PremiumFlag = "ACCEPTABLE" | "BLOCKER";

const premiumConfig: Record<PremiumFlag, { label: string; className: string }> = {
  ACCEPTABLE: {
    label: "Acceptable",
    className: "bg-[var(--premium-acceptable)]/15 text-[var(--premium-acceptable)] border-[var(--premium-acceptable)]/25",
  },
  BLOCKER: {
    label: "Blocker",
    className: "bg-[var(--premium-blocker)]/15 text-[var(--premium-blocker)] border-[var(--premium-blocker)]/25",
  },
};

export function PremiumBadge({ flag }: { flag: PremiumFlag }) {
  const config = premiumConfig[flag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
