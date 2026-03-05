"use client";

import { useState } from "react";
import type { QuoteResult } from "@/lib/types";
import { RiskBadge } from "@/components/badges/risk-badge";
import { DecisionBadge } from "@/components/badges/decision-badge";
import { PremiumBadge } from "@/components/badges/premium-badge";
import { ShapDisplay } from "@/components/explainability/shap-display";
import { LimeDisplay } from "@/components/explainability/lime-display";
import { AnchorDisplay } from "@/components/explainability/anchor-display";
import { CounterfactualDisplay } from "@/components/explainability/counterfactual-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock } from "lucide-react";

function BindScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            score >= 75
              ? "bg-emerald-400"
              : score >= 40
                ? "bg-yellow-400"
                : "bg-red-500"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">{score}</span>
    </div>
  );
}

function QuoteExpandedRow({ quote }: { quote: QuoteResult }) {
  return (
    <div className="space-y-4 px-2 py-4">
      {/* Summary strip */}
      <div className="animated-border flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-border/90 bg-muted/25 px-4 py-2.5 text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div>
          <span className="text-muted-foreground">Premium: </span>
          <span className="font-mono font-semibold text-foreground">
            ${quote.quoted_premium.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Coverage: </span>
          <span className="font-medium text-foreground">{quote.coverage}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Salary: </span>
          <span className="font-medium text-foreground">{quote.sal_range}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Confidence: </span>
          <span className="font-mono font-semibold text-foreground">
            {(quote.confidence * 100).toFixed(0)}%
          </span>
        </div>
        {quote.premium_flag && (
          <div>
            <span className="text-muted-foreground">Premium: </span>
            <PremiumBadge flag={quote.premium_flag} />
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Urgency: </span>
          <span className="inline-flex items-center gap-1 font-mono text-foreground">
            <Clock className="size-3" />
            {quote.urgency_days}d
          </span>
        </div>
      </div>

      {/* Case summary */}
      <div className="animated-border rounded-xl border border-border/90 bg-muted/15 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Case Summary
        </h4>
        <p className="text-xs leading-relaxed text-foreground/80">
          {quote.case_summary}
        </p>
      </div>

      {/* Explainability tabs */}
      <Tabs defaultValue="shap" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="shap">SHAP</TabsTrigger>
          <TabsTrigger value="lime">LIME</TabsTrigger>
          <TabsTrigger value="anchors">Anchors</TabsTrigger>
          <TabsTrigger value="counterfactuals">DiCE</TabsTrigger>
          {quote.premium_reasoning && (
            <TabsTrigger value="premium">Premium Analysis</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="shap" className="pt-3">
          <div className="grid gap-6 md:grid-cols-2">
            <ShapDisplay features={quote.risk_shap} title="Risk Profiler — SHAP" />
            <ShapDisplay features={quote.bind_shap} title="Conversion Predictor — SHAP" />
          </div>
        </TabsContent>

        <TabsContent value="lime" className="pt-3">
          <div className="grid gap-6 md:grid-cols-2">
            <LimeDisplay features={quote.risk_lime} title="Risk Profiler — LIME" />
            <LimeDisplay features={quote.bind_lime} title="Conversion Predictor — LIME" />
          </div>
        </TabsContent>

        <TabsContent value="anchors" className="pt-3">
          <div className="grid gap-6 md:grid-cols-2">
            <AnchorDisplay rule={quote.risk_anchors} />
            <AnchorDisplay rule={quote.bind_anchors} />
          </div>
        </TabsContent>

        <TabsContent value="counterfactuals" className="pt-3">
          <div className="space-y-4">
            <CounterfactualDisplay
              counterfactuals={quote.risk_counterfactuals}
              title="Risk Profiler — Counterfactuals"
            />
            <CounterfactualDisplay
              counterfactuals={quote.bind_counterfactuals}
              title="Conversion Predictor — Counterfactuals"
            />
          </div>
        </TabsContent>

        {quote.premium_reasoning && (
          <TabsContent value="premium" className="pt-3">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {quote.premium_flag && <PremiumBadge flag={quote.premium_flag} />}
                {quote.adjusted_band && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Suggested band: {quote.adjusted_band}
                  </span>
                )}
              </div>
              <div className="animated-border rounded-xl border border-border/90 bg-muted/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-xs leading-relaxed text-foreground/80">
                  {quote.premium_reasoning}
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export function QuoteTable({ quotes }: { quotes: QuoteResult[] }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="animated-border rounded-2xl border border-border/90 bg-card/95 shadow-[0_14px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead>Quote ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Risk Tier</TableHead>
            <TableHead>Bind Score</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const isExpanded = expandedRow === quote.quote_num;
            return (
              <TableRow
                key={quote.quote_num}
                className="group cursor-pointer"
                data-state={isExpanded ? "selected" : undefined}
                onClick={() =>
                  setExpandedRow(isExpanded ? null : quote.quote_num)
                }
              >
                <TableCell>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {quote.quote_num}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                      quote.agent_type === "EA"
                        ? "border border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                        : "border border-violet-500/35 bg-violet-500/15 text-violet-300"
                    )}
                  >
                    {quote.agent_type}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {quote.region}
                </TableCell>
                <TableCell>
                  <RiskBadge tier={quote.risk_tier} />
                </TableCell>
                <TableCell>
                  <BindScoreBar score={quote.bind_score} />
                </TableCell>
                <TableCell>
                  <DecisionBadge decision={quote.decision} />
                </TableCell>
                <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                  {new Date(quote.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Expanded detail panel — rendered outside the table for proper layout */}
      {expandedRow && (
        <div className="border-t border-border px-4">
          {quotes
            .filter((q) => q.quote_num === expandedRow)
            .map((q) => (
              <QuoteExpandedRow key={q.quote_num} quote={q} />
            ))}
        </div>
      )}
    </div>
  );
}
