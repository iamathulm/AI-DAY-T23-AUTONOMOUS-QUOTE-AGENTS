"use client";

import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/types";

const decisionConfig: Record<Decision, { label: string; className: string }> = {
  AUTO_APPROVE: {
    label: "Auto Approve",
    className: "bg-[var(--decision-approve)]/15 text-[var(--decision-approve)] border-[var(--decision-approve)]/25",
  },
  AGENT_FOLLOWUP: {
    label: "Agent Follow-up",
    className: "bg-[var(--decision-followup)]/15 text-[var(--decision-followup)] border-[var(--decision-followup)]/25",
  },
  ESCALATE_UNDERWRITER: {
    label: "Escalate",
    className: "bg-[var(--decision-escalate)]/15 text-[var(--decision-escalate)] border-[var(--decision-escalate)]/25",
  },
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  const config = decisionConfig[decision];
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
