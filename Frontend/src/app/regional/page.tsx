"use client";

import { useState, useEffect } from "react";
import type { RegionalStats } from "@/lib/types";
import { MOCK_REGIONAL } from "@/lib/mock-data";
import { fetchRegionalStats } from "@/lib/api";
import { RegionalIntelligence } from "@/components/regional/regional-intelligence";
import { EmptyState } from "@/components/layout/empty-state";

export default function RegionalPage() {
  const [regions, setRegions] = useState<RegionalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetchRegionalStats()
      .then((r) => { if (r.length > 0) setRegions(r); })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false));
  }, []);

  function loadSample() {
    setRegions(MOCK_REGIONAL);
    setFetchFailed(false);
  }

  if (!loading && fetchFailed && regions.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Per-region performance, dynamic thresholds, and EA vs IA intelligence
        </p>
        <EmptyState onLoadSample={loadSample} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Per-region performance, dynamic thresholds, and EA vs IA intelligence
        {loading && " — loading…"}
      </p>
      {regions.length > 0 && <RegionalIntelligence regions={regions} />}
    </div>
  );
}
