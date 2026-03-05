"use client";

import { useState, useEffect } from "react";
import type { QuoteResult } from "@/lib/types";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { fetchQuotes } from "@/lib/api";
import { EscalationQueue } from "@/components/escalation/escalation-queue";
import { EmptyState } from "@/components/layout/empty-state";
import { AlertTriangle } from "lucide-react";

export default function EscalationsPage() {
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetchQuotes({ limit: 500 })
      .then(({ quotes: q }) => { if (q.length > 0) setQuotes(q); })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false));
  }, []);

  function loadSample() {
    setQuotes(MOCK_QUOTES);
    setFetchFailed(false);
  }

  if (!loading && fetchFailed && quotes.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Quotes requiring underwriter review with full case summaries and explainability
        </p>
        <EmptyState onLoadSample={loadSample} />
      </div>
    );
  }

  const escalatedCount = quotes.filter(
    (q) => q.decision === "ESCALATE_UNDERWRITER"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Quotes requiring underwriter review with full case summaries and explainability
          {loading && " — loading…"}
        </p>
        {quotes.length > 0 && (
          <div className="flex items-center gap-2 rounded border border-[var(--risk-high)]/20 bg-[var(--risk-high)]/5 px-3 py-1.5">
            <AlertTriangle className="size-3.5 text-[var(--risk-high)]" />
            <span className="text-[11px] font-semibold text-[var(--risk-high)]">
              {escalatedCount} pending
            </span>
          </div>
        )}
      </div>

      {quotes.length > 0 && <EscalationQueue quotes={quotes} />}
    </div>
  );
}
