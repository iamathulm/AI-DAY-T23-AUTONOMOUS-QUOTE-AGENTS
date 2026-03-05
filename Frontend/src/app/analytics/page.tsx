"use client";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Aggregated pipeline performance metrics and conversion insights
      </p>
      <AnalyticsDashboard />
    </div>
  );
}
