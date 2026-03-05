/**
 * API client for the Autonomous Quote Agents backend.
 * Fetches data from /api endpoints and transforms backend shapes
 * into the frontend TypeScript interfaces.
 */

import type {
  QuoteResult,
  StatsOverview,
  RegionalStats,
  ShapFeature,
  CounterfactualExplanation,
  RiskTier,
  Decision,
  AgentType,
  PremiumFlag,
} from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Generic fetcher
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Transformers  (backend shape → frontend types)
// ---------------------------------------------------------------------------

function transformShap(
  shap: Record<string, number> | undefined | null,
  rawFeatures: Record<string, unknown>,
): ShapFeature[] {
  if (!shap || typeof shap !== "object" || Array.isArray(shap)) return [];
  return Object.entries(shap).map(([feature, impact]) => ({
    feature,
    value: Number(rawFeatures[feature] ?? 0),
    impact: Number(impact),
  }));
}

function transformAnchors(anchors: unknown): string {
  if (!anchors) return "No explanation available";
  if (typeof anchors === "string") return anchors;
  if (typeof anchors === "object" && anchors !== null) {
    const a = anchors as Record<string, unknown>;
    const rule = String(a.rule ?? "No rule found");
    const precision = a.precision
      ? `(precision: ${(Number(a.precision) * 100).toFixed(0)}%)`
      : "";
    return `${rule} ${precision}`.trim();
  }
  return String(anchors);
}

function transformCounterfactuals(
  cfs: unknown[] | undefined | null,
  rawFeatures: Record<string, unknown>,
): CounterfactualExplanation[] {
  if (!Array.isArray(cfs)) return [];
  return cfs.map((cf) => {
    if (typeof cf !== "object" || cf === null) {
      return { original: {}, changed: {}, outcome: "N/A" };
    }
    const cfObj = cf as Record<string, unknown>;
    const original: Record<string, string | number> = {};
    const changed: Record<string, string | number> = {};
    for (const [key, val] of Object.entries(cfObj)) {
      const origVal = rawFeatures[key];
      if (origVal !== undefined && String(origVal) !== String(val)) {
        original[key] = origVal as string | number;
        changed[key] = val as string | number;
      }
    }
    // If no diff detected, show full counterfactual
    if (Object.keys(changed).length === 0) {
      for (const [key, val] of Object.entries(cfObj)) {
        changed[key] = val as string | number;
      }
    }
    return { original, changed, outcome: "Alternative scenario" };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformQuote(raw: any): QuoteResult {
  const rf: Record<string, unknown> = raw.raw_features ?? {};
  return {
    quote_num: raw.quote_num ?? "",
    agent_type: (raw.agent_type ?? rf.Agent_Type ?? "EA") as AgentType,
    region: raw.region ?? (rf.Region as string) ?? "",
    timestamp: raw.timestamp ?? new Date().toISOString(),

    re_quote: raw.re_quote !== undefined ? Boolean(raw.re_quote) : rf.Re_Quote === "Yes",
    quoted_premium: raw.quoted_premium ?? Number(rf.Quoted_Premium ?? 0),
    coverage: raw.coverage ?? (rf.Coverage as string) ?? "",
    sal_range: raw.sal_range ?? (rf.Sal_Range as string) ?? "",
    vehicl_cost_range:
      raw.vehicl_cost_range ?? (rf.Vehicl_Cost_Range as string) ?? "",
    driver_age: Number(rf.Driver_Age ?? 0),
    driving_exp: Number(rf.Driving_Exp ?? 0),
    prev_accidents: Number(rf.Prev_Accidents ?? 0),
    prev_citations: Number(rf.Prev_Citations ?? 0),

    risk_tier: (raw.risk_tier ?? "MEDIUM") as RiskTier,
    risk_score: Number(raw.risk_score ?? 0),
    risk_shap: transformShap(raw.risk_shap, rf),
    risk_lime: raw.risk_lime ?? {},
    risk_anchors: transformAnchors(raw.risk_anchors),
    risk_counterfactuals: transformCounterfactuals(raw.risk_counterfactuals, rf),

    bind_score: Number(raw.bind_score ?? 0),
    bind_probability: Number(raw.bind_probability ?? 0),
    bind_shap: transformShap(raw.bind_shap, rf),
    bind_lime: raw.bind_lime ?? {},
    bind_anchors: transformAnchors(raw.bind_anchors),
    bind_counterfactuals: transformCounterfactuals(raw.bind_counterfactuals, rf),
    urgency_days: Number(raw.urgency_days ?? 0),

    premium_flag: (raw.premium_flag as PremiumFlag) ?? null,
    adjusted_band: raw.adjusted_band ?? null,
    premium_reasoning: raw.premium_reasoning ?? null,

    decision: (raw.decision ?? "AGENT_FOLLOWUP") as Decision,
    case_summary: raw.case_summary ?? "",
    confidence: Number(raw.confidence ?? 0),
    routing_reasoning: raw.routing_reasoning ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

/** Fetch all processed quotes with optional filtering. */
export async function fetchQuotes(opts?: {
  limit?: number;
  offset?: number;
  decision?: Decision;
}): Promise<{ total: number; quotes: QuoteResult[] }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.decision) params.set("decision", opts.decision);
  const qs = params.toString();

  const data = await apiFetch<{
    total: number;
    quotes: unknown[];
  }>(`/quotes${qs ? `?${qs}` : ""}`);

  return {
    total: data.total,
    quotes: data.quotes.map(transformQuote),
  };
}

/** Fetch aggregated pipeline statistics. */
export async function fetchStats(): Promise<StatsOverview> {
  return apiFetch<StatsOverview>("/stats");
}

/** Fetch per-region statistics. */
export async function fetchRegionalStats(): Promise<RegionalStats[]> {
  const data = await apiFetch<{ regions: RegionalStats[] }>("/regional-stats");
  return data.regions;
}

/** Process a single quote through the 4-agent pipeline. */
export async function processQuote(
  input: Record<string, unknown>,
): Promise<QuoteResult> {
  const raw = await apiFetch<unknown>("/process-quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return transformQuote(raw);
}

/** Process a batch of quotes. */
export async function processBatch(
  quotes: Record<string, unknown>[],
): Promise<QuoteResult[]> {
  const data = await apiFetch<{ results: unknown[] }>("/process-batch", {
    method: "POST",
    body: JSON.stringify({ quotes }),
  });
  return data.results
    .filter((r: unknown) => !(r as Record<string, unknown>).error)
    .map(transformQuote);
}

/** Get N random sample quotes from the CSV dataset (for demo). */
export async function fetchSampleQuotes(
  n = 10,
): Promise<Record<string, unknown>[]> {
  const data = await apiFetch<{ quotes: Record<string, unknown>[] }>(
    `/sample-quotes?n=${n}`,
  );
  return data.quotes;
}

/** Subscribe to SSE stream of processed quotes. */
export function subscribeToStream(
  onQuote: (q: QuoteResult) => void,
): () => void {
  const es = new EventSource(`${API_URL}/stream`);
  es.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (!parsed.keepalive) {
        onQuote(transformQuote(parsed));
      }
    } catch {
      // ignore parse errors
    }
  };
  return () => es.close();
}
