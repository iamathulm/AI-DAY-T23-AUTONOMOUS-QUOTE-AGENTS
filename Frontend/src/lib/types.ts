// Matches the LangGraph QuoteState schema from the backend pipeline

export type RiskTier = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "AUTO_APPROVE" | "AGENT_FOLLOWUP" | "ESCALATE_UNDERWRITER";
export type PremiumFlag = "BLOCKER" | "ACCEPTABLE";
export type AgentType = "EA" | "IA";

export interface ShapFeature {
  feature: string;
  value: number;
  impact: number;
}

export interface CounterfactualExplanation {
  original: Record<string, string | number>;
  changed: Record<string, string | number>;
  outcome: string;
}

export interface QuoteResult {
  // Identity
  quote_num: string;
  agent_type: AgentType;
  region: string;
  timestamp: string;

  // Raw input
  re_quote: boolean;
  quoted_premium: number;
  coverage: string;
  sal_range: string;
  vehicl_cost_range: string;
  driver_age: number;
  driving_exp: number;
  prev_accidents: number;
  prev_citations: number;

  // Agent 1 — Risk Profiler
  risk_tier: RiskTier;
  risk_score: number;
  risk_shap: ShapFeature[];
  risk_lime: Record<string, number>;
  risk_anchors: string;
  risk_counterfactuals: CounterfactualExplanation[];

  // Agent 2 — Conversion Predictor
  bind_score: number;
  bind_probability: number;
  bind_shap: ShapFeature[];
  bind_lime: Record<string, number>;
  bind_anchors: string;
  bind_counterfactuals: CounterfactualExplanation[];
  urgency_days: number;

  // Agent 3 — Premium Advisor (conditional)
  premium_flag: PremiumFlag | null;
  adjusted_band: string | null;
  premium_reasoning: string | null;

  // Agent 4 — Decision Router
  decision: Decision;
  case_summary: string;
  confidence: number;
  routing_reasoning: string | null;
}

export interface PipelineStep {
  agent: string;
  status: "pending" | "processing" | "complete" | "skipped";
  output?: Record<string, unknown>;
}

export interface StatsOverview {
  total_quotes: number;
  bind_rate: number;
  auto_approve_pct: number;
  agent_followup_pct: number;
  escalation_pct: number;
  risk_distribution: { tier: RiskTier; count: number }[];
  decision_distribution: { decision: Decision; count: number }[];
  bind_score_histogram: { range: string; count: number }[];
}

export interface RegionalStats {
  region: string;
  total_quotes: number;
  bind_rate: number;
  ea_bind_rate: number;
  ia_bind_rate: number;
  avg_bind_score: number;
  escalation_rate: number;
  dynamic_threshold: number;
}
