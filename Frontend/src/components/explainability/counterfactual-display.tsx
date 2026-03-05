"use client";

import type { CounterfactualExplanation } from "@/lib/types";
import { ArrowRight } from "lucide-react";

export function CounterfactualDisplay({
  counterfactuals,
  title,
}: {
  counterfactuals: CounterfactualExplanation[];
  title: string;
}) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-2">
        {counterfactuals.map((cf, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded border border-border bg-muted/20 px-3 py-2"
          >
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
              {Object.entries(cf.original).map(([key, val]) => (
                <span key={key} className="font-mono text-[11px] text-muted-foreground">
                  {key}:{" "}
                  <span className="text-foreground/70">{String(val)}</span>
                </span>
              ))}
            </div>
            <ArrowRight className="size-3.5 shrink-0 text-primary" />
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
              {Object.entries(cf.changed).map(([key, val]) => (
                <span key={key} className="font-mono text-[11px] text-primary">
                  {key}:{" "}
                  <span className="font-semibold">{String(val)}</span>
                </span>
              ))}
            </div>
            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              → {cf.outcome}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
