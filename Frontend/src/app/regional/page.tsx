"use client";

import { RegionalIntelligence } from "@/components/regional/regional-intelligence";

export default function RegionalPage() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Per-region performance, dynamic thresholds, and EA vs IA intelligence
      </p>
      <RegionalIntelligence />
    </div>
  );
}
