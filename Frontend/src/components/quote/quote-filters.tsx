"use client";

import type { RiskTier, Decision } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuoteFiltersProps {
  riskFilter: RiskTier | "ALL";
  decisionFilter: Decision | "ALL";
  regionFilter: string;
  onRiskChange: (v: RiskTier | "ALL") => void;
  onDecisionChange: (v: Decision | "ALL") => void;
  onRegionChange: (v: string) => void;
}

export function QuoteFilters({
  riskFilter,
  decisionFilter,
  regionFilter,
  onRiskChange,
  onDecisionChange,
  onRegionChange,
}: QuoteFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={riskFilter}
        onValueChange={(v) => onRiskChange(v as RiskTier | "ALL")}
      >
        <SelectTrigger size="sm" className="w-36 border-sky-500/35 bg-sky-500/10 text-sky-200">
          <SelectValue placeholder="Risk Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Risk</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={decisionFilter}
        onValueChange={(v) => onDecisionChange(v as Decision | "ALL")}
      >
        <SelectTrigger size="sm" className="w-44 border-violet-500/35 bg-violet-500/10 text-violet-200">
          <SelectValue placeholder="Decision" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Decisions</SelectItem>
          <SelectItem value="AUTO_APPROVE">Auto Approve</SelectItem>
          <SelectItem value="AGENT_FOLLOWUP">Agent Follow-up</SelectItem>
          <SelectItem value="ESCALATE_UNDERWRITER">Escalate</SelectItem>
        </SelectContent>
      </Select>

      <Select value={regionFilter} onValueChange={onRegionChange}>
        <SelectTrigger size="sm" className="w-36 border-amber-500/35 bg-amber-500/10 text-amber-200">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Regions</SelectItem>
          <SelectItem value="Northeast">Northeast</SelectItem>
          <SelectItem value="Southeast">Southeast</SelectItem>
          <SelectItem value="Midwest">Midwest</SelectItem>
          <SelectItem value="West">West</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
