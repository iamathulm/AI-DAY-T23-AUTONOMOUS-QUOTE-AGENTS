"use client";

import { cn } from "@/lib/utils";
import type { QuoteResult } from "@/lib/types";
import { RiskBadge } from "@/components/badges/risk-badge";
import { DecisionBadge } from "@/components/badges/decision-badge";
import { PremiumBadge } from "@/components/badges/premium-badge";
import { ShapDisplay } from "@/components/explainability/shap-display";
import { AnchorDisplay } from "@/components/explainability/anchor-display";
import { CounterfactualDisplay } from "@/components/explainability/counterfactual-display";
import {
  Shield,
  TrendingUp,
  DollarSign,
  GitBranch,
  ArrowRight,
  Clock,
  CheckCircle2,
  SkipForward,
} from "lucide-react";

type StepStatus = "pending" | "processing" | "complete" | "skipped";

interface PipelineStepDef {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
}

const STEPS: PipelineStepDef[] = [
  { id: "risk", name: "Risk Profiler", subtitle: "Agent 1 — CatBoost", icon: Shield },
  { id: "conversion", name: "Conversion Predictor", subtitle: "Agent 2 — LightGBM", icon: TrendingUp },
  { id: "premium", name: "Premium Advisor", subtitle: "Agent 3 — LLM Hybrid", icon: DollarSign },
  { id: "router", name: "Decision Router", subtitle: "Agent 4 — Threshold Logic", icon: GitBranch },
];

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="size-3.5 text-[var(--risk-low)]" />;
    case "processing":
      return (
        <span className="relative flex size-3.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
          <span className="relative inline-flex size-3.5 rounded-full bg-primary" />
        </span>
      );
    case "skipped":
      return <SkipForward className="size-3.5 text-muted-foreground" />;
    default:
      return <Clock className="size-3.5 text-muted-foreground/50" />;
  }
}

function getStepStatuses(quote: QuoteResult | null): Record<string, StepStatus> {
  if (!quote) return { risk: "pending", conversion: "pending", premium: "pending", router: "pending" };
  return {
    risk: "complete",
    conversion: "complete",
    premium: quote.premium_flag ? "complete" : "skipped",
    router: "complete",
  };
}

function StepCard({
  step,
  status,
  quote,
}: {
  step: PipelineStepDef;
  status: StepStatus;
  quote: QuoteResult | null;
}) {
  const Icon = step.icon;
  const isActive = status === "complete" || status === "processing";

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border transition-all",
        isActive
          ? "border-border bg-card"
          : status === "skipped"
            ? "border-border/50 bg-card/50"
            : "border-border/30 bg-card/30"
      )}
    >
      {/* Step header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded",
            isActive ? "bg-primary/15" : "bg-muted/30"
          )}
        >
          <Icon
            className={cn(
              "size-4",
              isActive ? "text-primary" : "text-muted-foreground/50"
            )}
          />
        </div>
        <div className="flex-1">
          <p className={cn("text-sm font-semibold", !isActive && "text-muted-foreground/50")}>
            {step.name}
          </p>
          <p className="text-[10px] text-muted-foreground">{step.subtitle}</p>
        </div>
        <StepStatusIcon status={status} />
      </div>

      {/* Step output */}
      <div className="flex-1 p-4">
        {status === "pending" && (
          <p className="text-xs text-muted-foreground/40">Waiting for input&hellip;</p>
        )}
        {status === "skipped" && (
          <p className="text-xs text-muted-foreground/60">
            Skipped — bind score ≤ 60
          </p>
        )}

        {status === "complete" && quote && step.id === "risk" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <RiskBadge tier={quote.risk_tier} />
              <span className="font-mono text-[11px] text-muted-foreground">
                Score: {quote.risk_score.toFixed(2)}
              </span>
            </div>
            <ShapDisplay features={quote.risk_shap} title="SHAP Features" />
            <AnchorDisplay rule={quote.risk_anchors} />
            <CounterfactualDisplay
              counterfactuals={quote.risk_counterfactuals}
              title="What would change the outcome?"
            />
          </div>
        )}

        {status === "complete" && quote && step.id === "conversion" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Bind Score</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {quote.bind_score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground">Urgency</p>
                <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Clock className="size-3.5" />
                  {quote.urgency_days} days
                </p>
              </div>
            </div>
            <ShapDisplay features={quote.bind_shap} title="SHAP Features" />
            <AnchorDisplay rule={quote.bind_anchors} />
          </div>
        )}

        {status === "complete" && quote && step.id === "premium" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {quote.premium_flag && <PremiumBadge flag={quote.premium_flag} />}
              {quote.adjusted_band && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Band: {quote.adjusted_band}
                </span>
              )}
            </div>
            {quote.premium_reasoning && (
              <div className="rounded border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  LLM Reasoning
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                  {quote.premium_reasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {status === "complete" && quote && step.id === "router" && (
          <div className="space-y-3">
            <DecisionBadge decision={quote.decision} />
            <div className="rounded border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Case Summary
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                {quote.case_summary}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Confidence:</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${quote.confidence * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-foreground">
                {(quote.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PipelineViewer({ quote }: { quote: QuoteResult | null }) {
  const statuses = getStepStatuses(quote);

  return (
    <div className="space-y-4">
      {/* Horizontal step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5",
                statuses[step.id] === "complete"
                  ? "border-primary/30 bg-primary/5"
                  : statuses[step.id] === "skipped"
                    ? "border-border/50 bg-muted/20"
                    : "border-border/30 bg-transparent"
              )}
            >
              <step.icon
                className={cn(
                  "size-3.5",
                  statuses[step.id] === "complete"
                    ? "text-primary"
                    : "text-muted-foreground/40"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  statuses[step.id] === "complete"
                    ? "text-foreground"
                    : "text-muted-foreground/40"
                )}
              >
                {step.name}
              </span>
              <StepStatusIcon status={statuses[step.id]} />
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight
                className={cn(
                  "mx-1.5 size-3.5",
                  statuses[STEPS[i + 1].id] !== "pending"
                    ? "text-primary/50"
                    : "text-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step detail cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            status={statuses[step.id]}
            quote={quote}
          />
        ))}
      </div>
    </div>
  );
}
