"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { processQuote } from "@/lib/api";
import type { QuoteResult } from "@/lib/types";
import { PipelineViewer } from "@/components/pipeline/pipeline-viewer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Shield,
  TrendingUp,
  DollarSign,
  GitBranch,
  User,
  Car,
  FileText,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Field option maps — sourced from dataset unique values             */
/* ------------------------------------------------------------------ */

const AGENT_TYPES = ["EA", "IA"] as const;
const REGIONS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const POLICY_TYPES = ["Car", "Truck", "Van"] as const;
const GENDERS = ["Male", "Female"] as const;
const MARITAL_STATUSES = ["Single", "Married", "Dirvorced", "Widow"] as const;
const EDUCATIONS = [
  "High School",
  "College",
  "Bachelors",
  "Masters",
  "Ph.D",
] as const;
const SAL_RANGES = [
  "<= $ 25 K",
  "> $ 25 K <= $ 40 K",
  "> $ 40 K <= $ 60 K",
  "> $ 60 K <= $ 90 K",
  "> $ 90 K ",
] as const;
const COVERAGES = ["Basic", "Balanced", "Enhanced"] as const;
const VEH_USAGES = ["Commute", "Pleasure", "Business"] as const;
const ANNUAL_MILES = [
  "<= 7.5 K",
  "> 7.5 K & <= 15 K",
  "> 15 K & <= 25 K",
  "> 25 K & <= 35 K",
  "> 35 K & <= 45 K",
  "> 45 K & <= 55 K",
  "> 55 K",
] as const;
const VEHICL_COSTS = [
  "<= $ 10 K",
  "> $ 10 K <= $ 20 K",
  "> $ 20 K <= $ 30 K",
  "> $ 30 K <= $ 40 K",
  "> $ 40 K ",
] as const;
const RE_QUOTES = ["No", "Yes"] as const;

/* ------------------------------------------------------------------ */
/*  Default form state                                                 */
/* ------------------------------------------------------------------ */

function defaultForm() {
  return {
    Quote_Num: `Q-${Date.now().toString(36).toUpperCase()}`,
    Agent_Type: "EA",
    Region: "A",
    Policy_Type: "Car",
    HH_Vehicles: 1,
    HH_Drivers: 1,
    Driver_Age: 35,
    Driving_Exp: 15,
    Prev_Accidents: 0,
    Prev_Citations: 0,
    Gender: "Male",
    Marital_Status: "Single",
    Education: "Bachelors",
    Sal_Range: "> $ 25 K <= $ 40 K",
    Coverage: "Basic",
    Veh_Usage: "Commute",
    Annual_Miles_Range: "> 7.5 K & <= 15 K",
    Vehicl_Cost_Range: "<= $ 10 K",
    Re_Quote: "No",
    Quoted_Premium: 750,
  };
}

/* ------------------------------------------------------------------ */
/*  Processing stages for the animated tracker                         */
/* ------------------------------------------------------------------ */

const AGENT_STAGES = [
  { label: "Risk Profiler", icon: Shield, color: "#22C55E" },
  { label: "Conversion Predictor", icon: TrendingUp, color: "#3B82F6" },
  { label: "Premium Advisor", icon: DollarSign, color: "#EAB308" },
  { label: "Decision Router", icon: GitBranch, color: "#8B5CF6" },
];

/* ------------------------------------------------------------------ */
/*  Decision → color map                                               */
/* ------------------------------------------------------------------ */

const DECISION_COLORS: Record<string, string> = {
  AUTO_APPROVE: "var(--decision-approve)",
  AGENT_FOLLOWUP: "var(--decision-followup)",
  ESCALATE_UNDERWRITER: "var(--decision-escalate)",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "var(--risk-low)",
  MEDIUM: "var(--risk-medium)",
  HIGH: "var(--risk-high)",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function NewQuotePage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeAgent, setActiveAgent] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof ReturnType<typeof defaultForm>>(
    key: K,
    value: ReturnType<typeof defaultForm>[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setForm(defaultForm());
    setResult(null);
    setError(null);
    setActiveAgent(-1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    // Animate agent stages
    for (let i = 0; i < 4; i++) {
      setActiveAgent(i);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const quote = await processQuote(form);
      setResult(quote);
      setActiveAgent(4); // all done
      // Redirect to pipeline view with this quote selected.
      router.push(`/pipeline?quote=${encodeURIComponent(quote.quote_num)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline processing failed");
      setActiveAgent(-1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Hero header ── */}
      <div className="relative mb-8 overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] px-6 py-6">
        {/* Dotted corner accents */}
        <div className="pointer-events-none absolute top-3 left-3 size-8 border-t border-l border-dashed border-white/10" />
        <div className="pointer-events-none absolute right-3 bottom-3 size-8 border-r border-b border-dashed border-white/10" />

        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground/50">
              Client Quote Intake
            </p>
            <h2 className="font-serif text-2xl italic text-foreground/90">
              New Quote Submission
            </h2>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted-foreground/80">
              Each quote passes through four specialist agents — risk profiling,
              conversion prediction, premium analysis, and intelligent routing.
              Fill the dossier below and submit.
            </p>
          </div>

          {/* Agent stage tracker */}
          <div className="hidden shrink-0 md:flex items-center gap-1.5">
            {AGENT_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = activeAgent === i;
              const isDone = activeAgent > i;
              return (
                <div
                  key={stage.label}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-lg border transition-all duration-300"
                    style={{
                      borderColor: isDone
                        ? stage.color
                        : isActive
                          ? stage.color
                          : "rgba(255,255,255,0.08)",
                      background: isDone
                        ? `${stage.color}18`
                        : isActive
                          ? `${stage.color}10`
                          : "transparent",
                      boxShadow: isActive
                        ? `0 0 16px ${stage.color}25`
                        : "none",
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2
                        className="size-4"
                        style={{ color: stage.color }}
                      />
                    ) : (
                      <Icon
                        className="size-4 transition-colors duration-300"
                        style={{
                          color: isActive ? stage.color : "rgba(255,255,255,0.2)",
                        }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[8px] font-medium uppercase tracking-wider transition-colors duration-300"
                    style={{
                      color: isDone || isActive
                        ? stage.color
                        : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {i < 3 && (
                    <div
                      className="absolute mt-4 ml-9 h-px w-1.5 transition-colors"
                      style={{
                        background: isDone ? stage.color : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-0">
        {/* ============= Section 01 — Identity ============= */}
        <FormSection
          num="01"
          title="Quote Identity"
          icon={FileText}
          accentColor="#f5f5f5"
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            <FieldGroup label="Quote Number" htmlFor="q-num">
              <Input
                id="q-num"
                value={form.Quote_Num}
                onChange={(e) => set("Quote_Num", e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </FieldGroup>
            <SelectField
              id="agent-type"
              label="Channel"
              value={form.Agent_Type}
              options={AGENT_TYPES}
              onChange={(v) => set("Agent_Type", v)}
            />
            <SelectField
              id="region"
              label="Region"
              value={form.Region}
              options={REGIONS}
              onChange={(v) => set("Region", v)}
            />
            <SelectField
              id="policy-type"
              label="Policy Type"
              value={form.Policy_Type}
              options={POLICY_TYPES}
              onChange={(v) => set("Policy_Type", v)}
            />
          </div>
        </FormSection>

        {/* ============= Section 02 — Driver ============= */}
        <FormSection
          num="02"
          title="Driver Profile"
          icon={User}
          accentColor="#22C55E"
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            <NumberField
              id="driver-age"
              label="Age"
              value={form.Driver_Age}
              min={18}
              max={65}
              onChange={(v) => set("Driver_Age", v)}
            />
            <NumberField
              id="driving-exp"
              label="Experience (yrs)"
              value={form.Driving_Exp}
              min={1}
              max={48}
              onChange={(v) => set("Driving_Exp", v)}
            />
            <SelectField
              id="gender"
              label="Gender"
              value={form.Gender}
              options={GENDERS}
              onChange={(v) => set("Gender", v)}
            />
            <SelectField
              id="marital"
              label="Marital Status"
              value={form.Marital_Status}
              options={MARITAL_STATUSES}
              onChange={(v) => set("Marital_Status", v)}
            />
            <SelectField
              id="education"
              label="Education"
              value={form.Education}
              options={EDUCATIONS}
              onChange={(v) => set("Education", v)}
            />
            <SelectField
              id="salary"
              label="Salary Range"
              value={form.Sal_Range}
              options={SAL_RANGES}
              onChange={(v) => set("Sal_Range", v)}
            />
            <NumberField
              id="prev-accidents"
              label="Prev. Accidents"
              value={form.Prev_Accidents}
              min={0}
              max={5}
              onChange={(v) => set("Prev_Accidents", v)}
            />
            <NumberField
              id="prev-citations"
              label="Prev. Citations"
              value={form.Prev_Citations}
              min={0}
              max={5}
              onChange={(v) => set("Prev_Citations", v)}
            />
          </div>
        </FormSection>

        {/* ============= Section 03 — Vehicle ============= */}
        <FormSection
          num="03"
          title="Household & Vehicle"
          icon={Car}
          accentColor="#3B82F6"
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <NumberField
              id="hh-vehicles"
              label="Vehicles in HH"
              value={form.HH_Vehicles}
              min={1}
              max={9}
              onChange={(v) => set("HH_Vehicles", v)}
            />
            <NumberField
              id="hh-drivers"
              label="Drivers in HH"
              value={form.HH_Drivers}
              min={1}
              max={9}
              onChange={(v) => set("HH_Drivers", v)}
            />
            <SelectField
              id="veh-usage"
              label="Usage"
              value={form.Veh_Usage}
              options={VEH_USAGES}
              onChange={(v) => set("Veh_Usage", v)}
            />
            <SelectField
              id="annual-miles"
              label="Annual Miles"
              value={form.Annual_Miles_Range}
              options={ANNUAL_MILES}
              onChange={(v) => set("Annual_Miles_Range", v)}
            />
            <SelectField
              id="vehicl-cost"
              label="Vehicle Cost"
              value={form.Vehicl_Cost_Range}
              options={VEHICL_COSTS}
              onChange={(v) => set("Vehicl_Cost_Range", v)}
            />
            <SelectField
              id="coverage"
              label="Coverage Tier"
              value={form.Coverage}
              options={COVERAGES}
              onChange={(v) => set("Coverage", v)}
            />
          </div>
        </FormSection>

        {/* ============= Section 04 — Premium ============= */}
        <FormSection
          num="04"
          title="Quote & Premium"
          icon={DollarSign}
          accentColor="#EAB308"
          isLast
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
            {/* Premium slider */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label
                  htmlFor="premium-slider"
                  className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60"
                >
                  Quoted Premium
                </Label>
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  ${form.Quoted_Premium.toLocaleString()}
                </span>
              </div>
              <Slider
                id="premium-slider"
                min={100}
                max={2000}
                step={10}
                value={[form.Quoted_Premium]}
                onValueChange={([v]) => set("Quoted_Premium", v)}
                className="py-1"
              />
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground/40">
                <span>$100</span>
                <span>$2,000</span>
              </div>
            </div>

            <SelectField
              id="re-quote"
              label="Re-Quote?"
              value={form.Re_Quote}
              options={RE_QUOTES}
              onChange={(v) => set("Re_Quote", v)}
            />
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="animated-border group relative flex h-10 items-center gap-2.5 overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] px-5 text-[13px] font-semibold text-foreground transition-all hover:border-white/25 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">
                  Agent {Math.min(activeAgent + 1, 4)} of 4 …
                </span>
              </>
            ) : (
              <>
                Run Pipeline
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-10 items-center gap-2 rounded-lg border border-border/40 px-4 text-[13px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        )}
      </form>

      {/* ── Result ── */}
      {result && (
        <div ref={resultRef} className="mt-10 space-y-6">
          {/* Success banner */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent" />
            <div className="flex items-center gap-3">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{
                  background: `${DECISION_COLORS[result.decision] ?? "#8B5CF6"}15`,
                  border: `1px solid ${DECISION_COLORS[result.decision] ?? "#8B5CF6"}30`,
                }}
              >
                <CheckCircle2
                  className="size-4"
                  style={{ color: DECISION_COLORS[result.decision] }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Pipeline Complete
                </p>
                <p className="text-xs text-muted-foreground">
                  Quote {result.quote_num} routed to{" "}
                  <span
                    className="font-semibold"
                    style={{ color: DECISION_COLORS[result.decision] }}
                  >
                    {result.decision.replace(/_/g, " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ResultCard
              label="Risk Tier"
              value={result.risk_tier}
              color={RISK_COLORS[result.risk_tier]}
            />
            <ResultCard
              label="Bind Score"
              value={String(result.bind_score)}
              sub={`/ 100`}
              color="#3B82F6"
            />
            <ResultCard
              label="Premium"
              value={result.premium_flag ?? "—"}
              color={
                result.premium_flag === "BLOCKER"
                  ? "var(--premium-blocker)"
                  : "var(--premium-acceptable)"
              }
            />
            <ResultCard
              label="Decision"
              value={result.decision.replace(/_/g, " ")}
              color={DECISION_COLORS[result.decision]}
              small
            />
            <ResultCard
              label="Confidence"
              value={`${Math.round(result.confidence * 100)}%`}
              color="#8B5CF6"
            />
          </div>

          {/* Full pipeline viewer */}
          <PipelineViewer quote={result} />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Subcomponents                                                      */
/* ================================================================== */

/** Numbered form section with left accent line */
function FormSection({
  num,
  title,
  icon: Icon,
  accentColor,
  isLast,
  children,
}: {
  num: string;
  title: string;
  icon: React.ElementType;
  accentColor: string;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-5">
      {/* Left numbered gutter */}
      <div className="hidden sm:flex flex-col items-center pt-0.5">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
          style={{
            color: accentColor,
            borderColor: `${accentColor}30`,
            background: `${accentColor}08`,
          }}
        >
          {num}
        </div>
        {!isLast && (
          <div
            className="mt-1 w-px flex-1"
            style={{
              background: `linear-gradient(to bottom, ${accentColor}20, transparent)`,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isLast ? "pb-0" : "pb-7"}`}>
        <div className="mb-3 flex items-center gap-2">
          <Icon
            className="size-3.5"
            style={{ color: `${accentColor}80` }}
          />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Label + child wrapper */
function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Reusable select field */
function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <FieldGroup label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldGroup>
  );
}

/** Reusable number field */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <FieldGroup label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 font-mono text-xs tabular-nums"
      />
    </FieldGroup>
  );
}

/** Result summary card with colored accent */
function ResultCard({
  label,
  value,
  sub,
  color,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border/40 bg-[#0c0c0c] px-3.5 py-3"
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `${color}50` }}
      />
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
        {label}
      </p>
      <p
        className={`font-semibold leading-tight ${small ? "text-xs" : "text-base"}`}
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
        {sub && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground/40">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
