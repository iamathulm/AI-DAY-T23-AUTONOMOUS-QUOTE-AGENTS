"use client";

import { Database } from "lucide-react";

/**
 * Shown when the API fetch fails (backend offline) and no data is loaded.
 * Gives the user an explicit "Load Sample Data" button instead of
 * auto-populating mock data.
 */
export function EmptyState({
  onLoadSample,
  description = "No data available — the backend appears to be offline.",
}: {
  onLoadSample: () => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 bg-card/30 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/30">
        <Database className="size-5 text-muted-foreground/60" />
      </div>
      <div className="max-w-sm text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={onLoadSample}
        className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary/20"
      >
        Load Sample Data
      </button>
    </div>
  );
}
