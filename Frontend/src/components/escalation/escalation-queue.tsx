"use client";

import { useState } from "react";
import type { QuoteResult } from "@/lib/types";
import { RiskBadge } from "@/components/badges/risk-badge";
import { PremiumBadge } from "@/components/badges/premium-badge";
import { ShapDisplay } from "@/components/explainability/shap-display";
import { AnchorDisplay } from "@/components/explainability/anchor-display";
import { CounterfactualDisplay } from "@/components/explainability/counterfactual-display";
import { LimeDisplay } from "@/components/explainability/lime-display";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

function EscalationCard({
  quote,
  onResolve,
}: {
  quote: QuoteResult;
  onResolve: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Card header with urgency indicator */}
      <div className="flex items-start gap-4 border-b border-border px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded bg-[var(--risk-high)]/10">
          <AlertTriangle className="size-4 text-[var(--risk-high)]" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-foreground">
              {quote.quote_num}
            </span>
            <RiskBadge tier={quote.risk_tier} />
            {quote.premium_flag && <PremiumBadge flag={quote.premium_flag} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              {quote.agent_type === "EA" ? "Exclusive" : "Independent"} Agent
            </span>
            <span>{quote.region}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {quote.urgency_days}d remaining
            </span>
            <span>
              Confidence:{" "}
              <span
                className={cn(
                  "font-mono font-semibold",
                  quote.confidence < 0.55
                    ? "text-[var(--risk-high)]"
                    : "text-foreground"
                )}
              >
                {(quote.confidence * 100).toFixed(0)}%
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <span className="font-mono text-lg font-bold text-foreground">
            {quote.bind_score}
          </span>
          <span className="text-[10px] leading-tight">
            bind<br />score
          </span>
        </div>
      </div>

      {/* Compact info row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border bg-muted/10 px-5 py-2.5 text-[11px]">
        <span>
          <span className="text-muted-foreground">Premium: </span>
          <span className="font-mono font-semibold">${quote.quoted_premium.toLocaleString()}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Coverage: </span>
          <span className="font-medium">{quote.coverage}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Salary: </span>
          <span className="font-medium">{quote.sal_range}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Driver: </span>
          <span className="font-medium">{quote.driver_age}yo, {quote.driving_exp}yr exp</span>
        </span>
        <span>
          <span className="text-muted-foreground">Accidents: </span>
          <span className="font-mono font-semibold">{quote.prev_accidents}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Citations: </span>
          <span className="font-mono font-semibold">{quote.prev_citations}</span>
        </span>
      </div>

      {/* Case summary */}
      <div className="px-5 py-3">
        <p className="text-xs leading-relaxed text-foreground/80">
          {quote.case_summary}
        </p>
      </div>

      {/* Expandable explainability */}
      <div className="border-t border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between px-5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Explainability Details</span>
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
        {expanded && (
          <div className="border-t border-border px-5 py-4">
            <Tabs defaultValue="shap" className="w-full">
              <TabsList variant="line">
                <TabsTrigger value="shap">SHAP</TabsTrigger>
                <TabsTrigger value="lime">LIME</TabsTrigger>
                <TabsTrigger value="anchors">Anchors</TabsTrigger>
                <TabsTrigger value="dice">DiCE</TabsTrigger>
                {quote.premium_reasoning && (
                  <TabsTrigger value="premium">Premium</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="shap" className="pt-3">
                <div className="grid gap-6 md:grid-cols-2">
                  <ShapDisplay features={quote.risk_shap} title="Risk Profiler" />
                  <ShapDisplay features={quote.bind_shap} title="Conversion Predictor" />
                </div>
              </TabsContent>
              <TabsContent value="lime" className="pt-3">
                <div className="grid gap-6 md:grid-cols-2">
                  <LimeDisplay features={quote.risk_lime} title="Risk Profiler" />
                  <LimeDisplay features={quote.bind_lime} title="Conversion Predictor" />
                </div>
              </TabsContent>
              <TabsContent value="anchors" className="pt-3">
                <div className="grid gap-6 md:grid-cols-2">
                  <AnchorDisplay rule={quote.risk_anchors} />
                  <AnchorDisplay rule={quote.bind_anchors} />
                </div>
              </TabsContent>
              <TabsContent value="dice" className="pt-3">
                <div className="space-y-4">
                  <CounterfactualDisplay
                    counterfactuals={quote.risk_counterfactuals}
                    title="Risk — What would change?"
                  />
                  <CounterfactualDisplay
                    counterfactuals={quote.bind_counterfactuals}
                    title="Conversion — What would change?"
                  />
                </div>
              </TabsContent>
              {quote.premium_reasoning && (
                <TabsContent value="premium" className="pt-3">
                  <div className="rounded border border-border bg-muted/20 px-3 py-2">
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {quote.premium_reasoning}
                    </p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onResolve(quote.quote_num)}
          className="gap-1.5"
        >
          <CheckCircle2 className="size-3.5" />
          Mark Resolved
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <UserCheck className="size-3.5" />
          Assign Underwriter
        </Button>
      </div>
    </div>
  );
}

export function EscalationQueue({ quotes }: { quotes: QuoteResult[] }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const escalated = quotes.filter(
    (q) => q.decision === "ESCALATE_UNDERWRITER" && !resolved.has(q.quote_num)
  );

  const handleResolve = (id: string) => {
    setResolved((prev) => new Set(prev).add(id));
  };

  if (escalated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
        <CheckCircle2 className="size-8 text-[var(--risk-low)]/50 mb-3" />
        <p className="text-sm text-muted-foreground">All escalations resolved</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {escalated.map((quote) => (
        <EscalationCard
          key={quote.quote_num}
          quote={quote}
          onResolve={handleResolve}
        />
      ))}
    </div>
  );
}
