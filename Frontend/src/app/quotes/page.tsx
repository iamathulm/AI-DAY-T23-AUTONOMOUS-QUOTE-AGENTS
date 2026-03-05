"use client";

import { useState, useMemo } from "react";
import type { RiskTier, Decision } from "@/lib/types";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { QuoteTable } from "@/components/quote/quote-table";
import { QuoteFilters } from "@/components/quote/quote-filters";
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
  const [riskFilter, setRiskFilter] = useState<RiskTier | "ALL">("ALL");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "ALL">("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return MOCK_QUOTES.filter((q) => {
      if (riskFilter !== "ALL" && q.risk_tier !== riskFilter) return false;
      if (decisionFilter !== "ALL" && q.decision !== decisionFilter) return false;
      if (regionFilter !== "ALL" && q.region !== regionFilter) return false;
      return true;
    });
  }, [riskFilter, decisionFilter, regionFilter]);

  const approvedCount = MOCK_QUOTES.filter((q) => q.decision === "AUTO_APPROVE").length;
  const escalatedCount = MOCK_QUOTES.filter((q) => q.decision === "ESCALATE_UNDERWRITER").length;

  return (
    <div className="flex flex-col gap-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Processed"
          value={String(MOCK_QUOTES.length)}
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
            (
              MOCK_QUOTES.reduce((s, q) => s + q.bind_score, 0) / MOCK_QUOTES.length
            ).toFixed(0)
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
          {filtered.length} of {MOCK_QUOTES.length} quotes
        </p>
      </div>

      {/* Table */}
      <QuoteTable quotes={filtered} />
    </div>
  );
}
