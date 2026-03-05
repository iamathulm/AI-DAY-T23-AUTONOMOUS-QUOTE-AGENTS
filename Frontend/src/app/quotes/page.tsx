"use client";

import { useState, useMemo, useEffect } from "react";
import type { QuoteResult, RiskTier, Decision } from "@/lib/types";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { fetchQuotes } from "@/lib/api";
import { QuoteTable } from "@/components/quote/quote-table";
import { QuoteFilters } from "@/components/quote/quote-filters";
import { EmptyState } from "@/components/layout/empty-state";
import { Activity, CheckCircle, AlertTriangle, ArrowUpRight } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div
        className="flex size-8 items-center justify-center rounded"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="size-4" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [riskFilter, setRiskFilter] = useState<RiskTier | "ALL">("ALL");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "ALL">("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  useEffect(() => {
    fetchQuotes({ limit: 500 })
      .then(({ quotes: q }) => { if (q.length > 0) setQuotes(q); })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (riskFilter !== "ALL" && q.risk_tier !== riskFilter) return false;
      if (decisionFilter !== "ALL" && q.decision !== decisionFilter) return false;
      if (regionFilter !== "ALL" && q.region !== regionFilter) return false;
      return true;
    });
  }, [quotes, riskFilter, decisionFilter, regionFilter]);

  const approvedCount = quotes.filter((q) => q.decision === "AUTO_APPROVE").length;
  const escalatedCount = quotes.filter((q) => q.decision === "ESCALATE_UNDERWRITER").length;

  function loadSample() {
    setQuotes(MOCK_QUOTES);
    setFetchFailed(false);
  }

  if (!loading && fetchFailed && quotes.length === 0) {
    return <EmptyState onLoadSample={loadSample} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Processed"
          value={String(quotes.length)}
          icon={Activity}
          accent="var(--primary)"
        />
        <StatCard
          label="Auto Approved"
          value={String(approvedCount)}
          icon={CheckCircle}
          accent="var(--risk-low)"
        />
        <StatCard
          label="Escalated"
          value={String(escalatedCount)}
          icon={AlertTriangle}
          accent="var(--risk-high)"
        />
        <StatCard
          label="Avg Bind Score"
          value={
            quotes.length
              ? (quotes.reduce((s, q) => s + q.bind_score, 0) / quotes.length).toFixed(0)
              : "0"
          }
          icon={ArrowUpRight}
          accent="var(--decision-followup)"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <QuoteFilters
          riskFilter={riskFilter}
          decisionFilter={decisionFilter}
          regionFilter={regionFilter}
          onRiskChange={setRiskFilter}
          onDecisionChange={setDecisionFilter}
          onRegionChange={setRegionFilter}
        />
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} of {quotes.length} quotes
        </p>
      </div>

      {/* Table */}
      <QuoteTable quotes={filtered} />
    </div>
  );
}
