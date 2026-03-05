# AUTONOMOUS QUOTE AGENTS
### GITAM Hackathon - Use Case 3 | 12-Hour MVP Build Plan

---

## 1. Problem Summary

Auto insurance carriers process thousands of quotes daily through Exclusive Agents (EA) and Independent Agents (IA) across regions. Only 1 in 5 quotes ever converts to a bound policy. Every unconverted quote today demands a human to investigate — this is the problem this system solves.

The goal is to build a 4-agent pipeline that autonomously handles the full quote lifecycle: profiling risk, predicting conversion, negotiating premiums, and routing decisions — escalating to a human only when confidence demands it.

---

## 2. Dataset Overview

Single CSV file (~146K rows). Key columns and their agent mappings:

| Column | Type | Used By Agent | Notes |
|---|---|---|---|
| Quote_Num | ID | All agents | Unique quote identifier |
| Agent_Type | Categorical (EA/IA) | A2, A4, Bonus | Exclusive vs Independent agent |
| Q_Creation_DT | Date | A2 | Quote creation timestamp |
| Q_Valid_DT | Date | A2 | Quote expiry — urgency signal |
| Policy_Bind_DT | Date | Target derivation | Null if not bound |
| Region | Categorical | A2, A4, Bonus | Geographic signal |
| HH_Vehicles / HH_Drivers | Numeric | A1 | Household complexity |
| Driver_Age / Driving_Exp | Numeric | A1 | Risk signals |
| Prev_Accidents / Prev_Citations | Numeric | A1 | Core risk features |
| Sal_Range / Coverage | Categorical | A2, A3 | Affordability signals |
| Quoted_Premium | Numeric | A3 | Key pricing input |
| Policy_Bind | Binary Yes/No | Target variable | 22% positive class |

> **Class imbalance:** ~22% bind rate (Policy_Bind = Yes). Handled explicitly in Agent 2 using SMOTE oversampling on the training set only.

---

## 3. Agent Pipeline Architecture

The pipeline is a sequential LangGraph `StateGraph` where each agent node receives typed state, enriches it, and passes it forward.

---

### Agent 1 — Risk Profiler `[FULLY AUTO]`

| Property | Detail |
|---|---|
| Input Features | Prev_Accidents, Prev_Citations, Driving_Exp, Driver_Age, HH_Vehicles, HH_Drivers, Annual_Miles_Range, Veh_Usage |
| Output | `risk_tier`: LOW / MEDIUM / HIGH |
| Model | **CatBoost Classifier (3-class)** — native categorical support, no manual encoding needed |
| Why CatBoost | Published results showing CatBoost outperforms XGBoost/LightGBM on insurance data ([paper](https://arxiv.org/html/2307.07771v3)). Handles categoricals natively via ordered target encoding. |
| Explainability | **4 methods**: SHAP TreeExplainer, LIME, Anchor rules, DiCE counterfactuals |
| Training Note | No class imbalance issue — 3 tiers engineered from data distribution using actuarial signals |
| LangGraph Role | First node in StateGraph, enriches state with risk_tier + multi-explainability outputs |

**Risk Tier Engineering** (no ground-truth label exists):
- Composite risk score from: Prev_Accidents (weight 30), Prev_Citations (20), Driver_Age brackets, Driving_Exp brackets, Annual_Miles_Range, Veh_Usage
- Binned into LOW (bottom 50%), MEDIUM (50-85%), HIGH (top 15%) by percentile

---

### Agent 2 — Conversion Predictor `[FULLY AUTO]`

| Property | Detail |
|---|---|
| Input Features | Re_Quote, urgency_days, Coverage, Agent_Type, Region, Sal_Range, HH_Drivers, HH_Vehicles, Quoted_Premium, Vehicl_Cost_Range, Driver_Age, Driving_Exp, Prev_Accidents, Prev_Citations, Gender, Marital_Status, Education + risk_tier from A1 |
| Output | `bind_score`: 0–100, `bind_probability`: float |
| Model | **LightGBM Classifier** with SMOTE oversampling |
| Class Imbalance | SMOTE applied on training set only (22% → 50/50 balanced). Test set stays untouched at real 22% distribution. |
| Explainability | **4 methods**: SHAP TreeExplainer, LIME, Anchor rules, DiCE counterfactuals |
| LangGraph Role | Receives A1 state, appends bind_score + explainability outputs, passes forward |

---

### Agent 3 — Premium Advisor `[HYBRID]`

| Property | Detail |
|---|---|
| Input Features | Quoted_Premium, Coverage, Sal_Range, Vehicl_Cost_Range, Re_Quote + bind_score from A2 |
| Output | `premium_flag`: BLOCKER / ACCEPTABLE, adjusted_band, recommendation text |
| Model | **Groq Llama 3.3 70B** with structured JSON output + rule-based band calculation |
| Why HYBRID | Rule layer handles numeric bands, LLM generates natural language justification |
| Fallback | If Groq fails or returns malformed JSON → pure rule-based assessment |
| Explainability | Chain-of-thought prompting forces LLM to explain its reasoning |
| LangGraph Role | Only triggers for high bind_score quotes (> 60). Conditional edge in graph. |

---

### Agent 4 — Decision Router `[ESCALATE-ONLY]`

| Property | Detail |
|---|---|
| Input | risk_tier (A1), bind_score (A2), premium_flag (A3), Agent_Type, Region, regional_bind_rate (Bonus) |
| Output | `decision`: AUTO_APPROVE / AGENT_FOLLOWUP / ESCALATE_UNDERWRITER |
| Logic | Threshold-based on combined signals — dynamically adjusted per region/channel |
| Escalation Trigger | risk=HIGH AND bind_score > 70 AND premium_flag=BLOCKER |
| Auto Approve | risk=LOW AND bind_score >= 75 AND premium_flag=ACCEPTABLE |
| Agent Follow-Up | Everything in between |
| Explainability | Structured case summary generated with all upstream signals + Groq LLM summary for escalated quotes |

---

## 4. Decision Routing Thresholds

| Decision Bucket | Condition | Human Involved? |
|---|---|---|
| AUTO_APPROVE | risk=LOW, bind_score >= 75, premium=ACCEPTABLE | No |
| AGENT_FOLLOWUP | bind_score 40–74, any risk tier, premium=ACCEPTABLE | No (agent nudge only) |
| ESCALATE_UNDERWRITER | risk=HIGH + bind_score > 70 + premium=BLOCKER | Yes — case summary sent |
| ESCALATE_UNDERWRITER | Model confidence < 0.55 on any critical agent | Yes — low confidence path |
| ESCALATE_UNDERWRITER | Re_Quote=Yes + risk=HIGH + bind_score < 40 | Yes — re-quote risk flag |

> Thresholds are **dynamically adjusted per region and agent type** (see Section 16 — Regional & Channel Intelligence).

---

## 5. Full Tech Stack

### Backend

| Library / Tool | Purpose |
|---|---|
| Python 3.11+ | Core language for all ML and orchestration |
| FastAPI | REST API server, exposes pipeline endpoints to Next.js |
| uvicorn | ASGI server for FastAPI with async support |
| LangGraph 0.2.x | Multi-agent orchestration — StateGraph for sequential pipeline |
| langchain-groq | **Groq Llama 3.3 70B** integration inside Agent 3 and Agent 4 |
| pydantic v2 | Typed state schema passing between LangGraph nodes |
| SSE (starlette) | Server-Sent Events for live dashboard updates |

### ML / Data Layer

| Library | Purpose |
|---|---|
| pandas | EDA, feature engineering, date parsing |
| scikit-learn | Preprocessing, train/test split |
| imbalanced-learn | SMOTE for Agent 2 class imbalance |
| **catboost** | Agent 1 — Risk Profiler (native categorical support, superior on insurance data) |
| lightgbm | Agent 2 — Conversion Predictor (fast, handles class imbalance well) |
| shap | SHAP TreeExplainer for both CatBoost and LightGBM |
| **dice-ml** | DiCE counterfactual explanations — "what needs to change to convert?" |
| **lime** | LIME local explanations — linear approximation around each prediction |
| **alibi** | Anchor rule-based explanations — IF-THEN rules for underwriters |
| joblib | Saving and loading trained model files |

### Frontend

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | Main frontend framework |
| shadcn/ui | Component library — tables, badges, cards for dashboard |
| Tailwind CSS | Styling |
| EventSource API | Consuming SSE stream from FastAPI for live updates |
| Recharts | Bind score distribution chart, risk tier donut chart |

---

## 6. Explainability Design (4 Methods)

This is the key differentiator. Every agent decision is explainable through **4 complementary methods**:

| Method | What It Does | Best For | Used In |
|---|---|---|---|
| **SHAP** | Game-theory-based feature importance. Shows how each feature pushes prediction up/down. | Global + local feature importance | Agent 1, Agent 2 |
| **LIME** | Perturbs input locally, fits linear model to approximate decision boundary. | Quick local "why this prediction?" | Agent 1, Agent 2 |
| **Anchors** | Generates IF-THEN rules with precision/coverage metrics. E.g. "IF Prev_Accidents >= 2 AND Driver_Age < 25 THEN HIGH risk (precision: 95%)" | Human-readable rules underwriters think in | Agent 1, Agent 2 |
| **DiCE** | Counterfactual explanations — "This quote would have bound IF premium was $620 instead of $780 OR coverage was Basic instead of Enhanced" | **Actionable recommendations** — what to change | Agent 1, Agent 2 |
| **Chain-of-Thought** | LLM forced to explain reasoning step by step in natural language | Premium analysis reasoning | Agent 3 |
| **Structured Summary** | All upstream signals compiled into a readable case summary + LLM narrative | Underwriter handoff | Agent 4 |

### Per-Agent Explainability Matrix

| Agent | SHAP | LIME | Anchors | DiCE | LLM CoT |
|---|---|---|---|---|---|
| Agent 1 — Risk Profiler | Yes | Yes | Yes | Yes | — |
| Agent 2 — Conversion Predictor | Yes | Yes | Yes | Yes | — |
| Agent 3 — Premium Advisor | — | — | — | — | Yes |
| Agent 4 — Decision Router | — | — | — | — | Yes (escalated only) |

---

## 7. LangGraph State Schema

```python
class QuoteState(TypedDict, total=False):
    # Raw input
    quote_num: str
    agent_type: str
    region: str
    re_quote: bool
    quoted_premium: float
    coverage: str
    sal_range: str
    vehicl_cost_range: str
    veh_usage: str
    annual_miles_range: str
    raw_features: dict

    # Agent 1 output
    risk_tier: str           # LOW | MEDIUM | HIGH
    risk_score: float
    risk_shap: dict          # top 3 SHAP features
    risk_lime: dict          # LIME local explanation
    risk_anchors: str        # Anchor IF-THEN rule
    risk_counterfactuals: list  # DiCE counterfactuals

    # Agent 2 output
    bind_score: int          # 0-100
    bind_probability: float
    bind_shap: dict
    bind_lime: dict
    bind_anchors: str
    bind_counterfactuals: list
    urgency_days: int

    # Agent 3 output (conditional)
    premium_flag: str        # BLOCKER | ACCEPTABLE
    adjusted_band: str
    premium_reasoning: str

    # Agent 4 output
    decision: str            # AUTO_APPROVE | AGENT_FOLLOWUP | ESCALATE
    case_summary: str
    confidence: float
```

---

## 8. LangGraph Graph Wiring

```python
from langgraph.graph import StateGraph, END

graph = StateGraph(QuoteState)

graph.add_node("risk_profiler",          agent1_risk_profiler)
graph.add_node("conversion_predictor",   agent2_conversion_predictor)
graph.add_node("premium_advisor",        agent3_premium_advisor)
graph.add_node("decision_router",        agent4_decision_router)

graph.set_entry_point("risk_profiler")
graph.add_edge("risk_profiler", "conversion_predictor")

# Conditional edge — Agent 3 only runs for high bind_score quotes
graph.add_conditional_edges(
    "conversion_predictor",
    lambda state: "premium_advisor" if state["bind_score"] > 60 else "decision_router"
)

graph.add_edge("premium_advisor",  "decision_router")
graph.add_edge("decision_router",  END)

pipeline = graph.compile()
```

---

## 9. Project Directory Structure

```
AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS/
  Docs/
    MVP_Plan.md
    GITAM HACKATHON USE CASES_unlocked.pdf
  ML/
    datasets/
      insurance_quotes.csv
    notebooks/
      01_EDA_and_Feature_Engineering.ipynb
      02_Agent1_Risk_Profiler.ipynb
      03_Agent2_Conversion_Predictor.ipynb
    models/
      risk_model.joblib         # CatBoost
      conversion_model.joblib   # LightGBM
      risk_explainer.joblib     # SHAP TreeExplainer
      conversion_explainer.joblib
      label_encoders.joblib
      ordinal_maps.joblib
      feature_config.joblib
      regional_stats.joblib     # Per-region/channel bind rates
      train.parquet
      test.parquet
    requirements.txt
  Backend/
    agents/
      agent1_risk_profiler.py
      agent2_conversion_predictor.py
      agent3_premium_advisor.py
      agent4_decision_router.py
    pipeline/
      state.py
      graph.py
    api/
      main.py
      routes.py
    requirements.txt
  Frontend/
    src/
      app/
        page.tsx
        components/
          QuoteTable.tsx
          EscalationQueue.tsx
          RiskBadge.tsx
          LiveFeed.tsx
          AnalyticsPanel.tsx
          RegionalIntelligence.tsx
      lib/
        api.ts
  .env
  .env.example
  .gitignore
```

---

## 10. 12-Hour Build Plan

### Person A: ML + Backend

| Time Block | Task | Deliverable |
|---|---|---|
| Hour 1 | EDA: load CSV, check nulls/types, parse dates, engineer `risk_tier` labels, encode features, train/test split | `train.parquet`, `test.parquet`, encoders saved |
| Hour 2 | Train Agent 1 CatBoost (3-class risk tier), run SHAP | `risk_model.joblib` |
| Hour 3 | Train Agent 2 LightGBM + SMOTE, run SHAP, evaluate ROC-AUC & PR-AUC | `conversion_model.joblib` |
| Hour 4 | Run DiCE + Anchor + LIME on both models, save demo outputs | Multi-explainability notebooks complete |
| Hour 5 | Build LangGraph StateGraph, wire all 4 agent nodes, Groq integration for Agent 3 | Working pipeline end-to-end |
| Hour 6 | Build FastAPI app, all routes, CORS, SSE streaming | API live at localhost:8000 |
| Hour 7 | Compute regional/channel stats, integrate dynamic thresholds into Agent 4 | `regional_stats.joblib`, adaptive routing |
| Hour 8 | Test full pipeline with 100+ quotes, fix edge cases, tune thresholds | Stable end-to-end |
| Hour 9-10 | Wire explainability outputs into API responses, edge case hardening | Explainability in every API response |
| Hour 11-12 | Integration testing with frontend, demo script, README | Demo-ready backend |

### Person B: Frontend

| Time Block | Task | Deliverable |
|---|---|---|
| Hour 1-2 | Next.js scaffold, Tailwind + shadcn setup, layout, routing | Dashboard shell |
| Hour 3-4 | QuoteTable component, RiskBadge, DecisionBadge, SSE connection | Live updating quote table |
| Hour 5-6 | EscalationQueue panel with case summary cards, SHAP display | Escalation workflow |
| Hour 7-8 | Recharts analytics: bind score histogram, risk tier donut, EA vs IA bar chart | Visual analytics |
| Hour 9-10 | **Regional Intelligence panel**: region comparison table, dynamic threshold display, EA vs IA deep dive | Bonus feature complete |
| Hour 11-12 | Polish UI, responsive design, demo walkthrough, README | Demo-ready frontend |

---

## 11. Dashboard — Key Screens

### Screen 1 — Live Quote Feed
- Auto-refreshing table via SSE showing quotes being processed in real time
- Columns: Quote ID, Agent Type, Region, Risk Tier (badge), Bind Score (progress bar), Decision (badge)
- Color coding: LOW=green, MEDIUM=amber, HIGH=red for risk tiers
- AUTO_APPROVE=green, AGENT_FOLLOWUP=blue, ESCALATE=red for decisions
- Expandable row: SHAP features, LIME explanation, Anchor rule, DiCE counterfactuals

### Screen 2 — Escalation Queue
- Dedicated panel showing only escalated quotes awaiting underwriter action
- Each card: Quote ID, full case summary, SHAP top features, premium flag reasoning, counterfactual suggestions
- Mark as resolved button to clear from queue

### Screen 3 — Analytics Panel
- Bind score distribution histogram (Recharts BarChart)
- Risk tier breakdown donut chart
- EA vs IA conversion rate comparison bar chart
- Region-wise bind rate comparison table

### Screen 4 — Regional & Channel Intelligence (Bonus)
- Per-region bind rate heatmap or bar chart
- EA vs IA head-to-head performance comparison per region
- Dynamic threshold display: show how escalation thresholds adapt per region
- Insight cards: "Region C has 35% bind rate vs 22% overall — thresholds lowered"

---

## 12. Agent 3 — Groq Llama 3.3 70B Prompt Template

```
SYSTEM:
You are an insurance premium analyst. You MUST respond with ONLY a valid JSON object.
Do not include any text before or after the JSON. Do not use markdown code fences.

USER:
Analyze this auto insurance quote and determine if the premium is blocking conversion.

Quote context:
- Quoted Premium: {quoted_premium}
- Coverage Type: {coverage}
- Salary Range: {sal_range}
- Vehicle Cost Range: {vehicl_cost_range}
- Re-Quote: {re_quote}
- Bind Score: {bind_score} / 100
- Risk Tier: {risk_tier}

Respond with this exact JSON structure:
{"premium_flag": "BLOCKER or ACCEPTABLE", "adjusted_band_low": number, "adjusted_band_high": number, "reasoning": "2-3 sentence explanation", "alternative_coverage": "string or null"}
```

**Fallback**: If Groq fails or returns malformed JSON, rule-based premium bands activate automatically:
- Salary-to-premium affordability lookup
- Coverage multiplier (Basic=0.85x, Balanced=1.0x, Enhanced=1.15x)

---

## 13. FastAPI Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/process-quote` | Process single quote through 4-agent pipeline |
| POST | `/api/process-batch` | Process multiple quotes, streams results via SSE |
| GET | `/api/stream` | SSE endpoint — pushes each processed quote to connected clients |
| GET | `/api/quotes` | Get processed quotes with filtering (by decision, pagination) |
| GET | `/api/stats` | Aggregate statistics (decisions, risk tiers, bind scores) |
| GET | `/api/sample-quotes` | Load N random quotes from dataset for demo |
| GET | `/api/regional-stats` | Per-region and per-channel bind rates + threshold adjustments |

---

## 14. Groq Free Tier Limits

| Model | RPM | Daily Requests | Context |
|---|---|---|---|
| llama-3.3-70b-versatile | 30 | 14,400 | 131K tokens |

- Agent 3 only fires when `bind_score > 60` (~30-40% of quotes)
- Agent 4 LLM summary only fires for ESCALATE decisions (~10-15% of quotes)
- Processing 100 demo quotes = ~40 Groq calls = well within limits
- Retry/backoff wrapper for rate limit safety

---

## 15. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Groq returns malformed JSON in Agent 3 | Medium | try/except with fallback to rule-based bands; robust JSON parser handles markdown fences |
| SMOTE overfitting on Agent 2 | Low-Medium | Validate on held-out test set at real 22% distribution |
| SSE connection drops in browser | Low | Auto-reconnect EventSource with exponential backoff |
| Dirty dates in Q_Valid_DT | Medium | Parse with pandas coerce, fill nulls with median urgency |
| Groq rate limiting during demo | Low | Cache Agent 3 responses; conditional Agent 3 invocation reduces calls |
| Pipeline too slow for live demo | Low-Medium | SHAP always (fast for trees); LIME/Anchors/DiCE only for escalated quotes or on-demand |
| CatBoost categorical encoding mismatch at inference | Low | cat_features indices saved in feature_config; raw strings passed directly |

---

## 16. Regional & Channel Intelligence (Bonus — Required)

This is **not optional** — it directly addresses Bonus point 6 in the problem statement.

### What It Does

1. **Compute per-region and per-agent-type bind rates** from the full dataset at startup
2. **Store as a lookup table** (`regional_stats.joblib`) loaded at pipeline startup
3. **Agent 4 dynamically adjusts escalation thresholds** based on regional performance:
   - Regions with higher bind rates (e.g. Region C at 35%) get lower escalation thresholds (more autos get approved)
   - Regions with lower bind rates get stricter thresholds (more escalations to investigate why)
4. **EA vs IA comparison**: Track conversion rate differences by agent type per region

### Implementation

```python
# Computed once at startup from full dataset
regional_stats = df.groupby(["Region", "Agent_Type"]).agg(
    total_quotes=("Quote_Num", "count"),
    bound_quotes=("Policy_Bind_enc", "sum"),
    bind_rate=("Policy_Bind_enc", "mean"),
    avg_premium=("Quoted_Premium", "mean"),
).reset_index()

# Dynamic threshold adjustment
def get_regional_threshold(region, agent_type, base_threshold=75):
    region_rate = regional_stats.query(f"Region == '{region}'")["bind_rate"].mean()
    overall_rate = df["Policy_Bind_enc"].mean()
    adjustment = (region_rate - overall_rate) * 50  # scale factor
    return base_threshold - adjustment  # higher bind rate → lower threshold
```

### Dashboard Panel

- Region comparison bar chart (bind rate per region)
- EA vs IA head-to-head per region (grouped bar chart)
- Dynamic threshold table showing adjusted thresholds per region
- Insight cards highlighting outlier regions

---

## 17. requirements.txt

### ML / Notebooks
```
pandas
numpy
scikit-learn
imbalanced-learn
catboost
lightgbm
shap
dice-ml
lime
alibi
joblib
matplotlib
seaborn
jupyter
ipykernel
```

### Backend
```
fastapi
uvicorn[standard]
pydantic>=2.0
langgraph
langchain
langchain-groq
pandas
scikit-learn
imbalanced-learn
catboost
lightgbm
shap
dice-ml
lime
alibi
joblib
numpy
python-dotenv
httpx
```

---

*GITAM Hackathon 2026 — Use Case 3: Autonomous Quote Agents — 12-Hour MVP Plan*
