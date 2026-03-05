"use client";

import { useState, useEffect } from "react";
import type { StatsOverview } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";
import { fetchStats } from "@/lib/api";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { EmptyState } from "@/components/layout/empty-state";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetchStats()
      .then((s) => { if (s.total_quotes > 0) setStats(s); })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false));
  }, []);

  function loadSample() {
    setStats(MOCK_STATS);
    setFetchFailed(false);
  }

  if (!loading && fetchFailed && !stats) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Aggregated pipeline performance metrics and conversion insights
        </p>
        <EmptyState onLoadSample={loadSample} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Aggregated pipeline performance metrics and conversion insights
        {loading && " — loading…"}
      </p>
      {stats && <AnalyticsDashboard stats={stats} />}
    </div>
  );
}
