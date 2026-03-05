# AUTONOMOUS QUOTE AGENTS
### GITAM Hackathon - Use Case 3 | 12-Hour MVP Build Plan

---

## 1. Problem Summary

Auto insurance carriers process thousands of quotes daily through Exclusive Agents (EA) and Independent Agents (IA) across regions. Only 1 in 5 quotes ever converts to a bound policy. Every unconverted quote today demands a human to investigate — this is the problem this system solves.

The goal is to build a 4-agent pipeline that autonomously handles the full quote lifecycle: profiling risk, predicting conversion, negotiating premiums, and routing decisions — escalating to a human only when confidence demands it.

---

## 2. Dataset Overview

Single CSV file. Key columns and their agent mappings:

| Column | Type | Used By Agent | Notes |
|---|---|---|---|
| Quote_Num | ID | All agents | Unique quote identifier |
| Agent_Type | Categorical (EA/IA) | A2, A4 | Exclusive vs Independent agent |
| Q_Creation_DT | Date | A2 | Quote creation timestamp |
| Q_Valid_DT | Date | A2 | Quote expiry — urgency signal |
| Policy_Bind_DT | Date | Target derivation | Null if not bound |
| Region | Categorical | A2, A4 | Geographic signal |
| HH_Vehicles / HH_Drivers | Numeric | A1 | Household complexity |
| Driver_Age / Driving_Exp | Numeric | A1 | Risk signals |
| Prev_Accidents / Prev_Citations | Numeric | A1 | Core risk features |
| Sal_Range / Coverage | Categorical | A2, A3 | Affordability signals |
| Quoted_Premium | Numeric | A3 | Key pricing input |
| Policy_Bind | Binary Yes/No | Target variable | 22% positive class |

> **Class imbalance:** ~22% bind rate (Policy_Bind = Yes). Must be handled explicitly in Agent 2 using SMOTE or `class_weight` in the model.

---

## 3. Agent Pipeline Architecture

The pipeline is a sequential LangGraph `StateGraph` where each agent node receives typed state, enriches it, and passes it forward.

---

### Agent 1 — Risk Profiler `[FULLY AUTO]`

| Property | Detail |
|---|---|
| Input Features | Prev_Accidents, Prev_Citations, Driving_Exp, Driver_Age, Veh_Usage, Annual_Miles |
| Output | `risk_tier`: LOW / MEDIUM / HIGH |
| Model | XGBoost Classifier (3-class) |
| Explainability | SHAP TreeExplainer — top 3 feature contributions per quote |
| Training Note | No class imbalance issue — 3 tiers engineered from data distribution |
| LangGraph Role | First node in StateGraph, enriches state with risk_tier + shap_values |

---

### Agent 2 — Conversion Predictor `[FULLY AUTO]`

| Property | Detail |
|---|---|
| Input Features | Re_Quote, Q_Valid_DT, Coverage, Agent_Type, Region, Sal_Range, HH_Drivers + risk_tier from A1 |
| Output | `bind_score`: 0–100, `bind_probability`: float |
| Model | LightGBM Classifier with SMOTE oversampling |
| Class Imbalance | Apply SMOTE on training set OR use `scale_pos_weight` in LightGBM |
| Explainability | SHAP + urgency signal: days remaining on Q_Valid_DT |
| LangGraph Role | Receives A1 state, appends bind_score, passes forward |

---

### Agent 3 — Premium Advisor `[HYBRID]`

| Property | Detail |
|---|---|
| Input Features | Quoted_Premium, Coverage, Sal_Range, Vehicl_Cost_Range, Re_Quote + bind_score from A2 |
| Output | `premium_flag`: BLOCKER / ACCEPTABLE, adjusted_band, recommendation text |
| Model | LLM (Claude API) with structured JSON output + rule-based band calculation |
| Why HYBRID | Rule layer handles numeric bands, LLM generates natural language justification |
| Explainability | Chain-of-thought prompting forces LLM to explain its reasoning |
| LangGraph Role | Only triggers for high bind_score quotes (> 60). Conditional edge in graph. |

---

### Agent 4 — Decision Router `[ESCALATE-ONLY]`

| Property | Detail |
|---|---|
| Input | risk_tier (A1), bind_score (A2), premium_flag (A3), Agent_Type, Region |
| Output | `decision`: AUTO_APPROVE / AGENT_FOLLOWUP / ESCALATE_UNDERWRITER |
| Logic | Threshold-based on combined signals — no separate model needed |
| Escalation Trigger | risk=HIGH AND bind_score > 70 AND premium_flag=BLOCKER |
| Auto Approve | risk=LOW AND bind_score > 75 AND premium_flag=ACCEPTABLE |
| Agent Follow-Up | Everything in between |
| Explainability | Structured case summary generated with all upstream signals for underwriter |

---

## 4. Decision Routing Thresholds

| Decision Bucket | Condition | Human Involved? |
|---|---|---|
| AUTO_APPROVE | risk=LOW, bind_score >= 75, premium=ACCEPTABLE | No |
| AGENT_FOLLOWUP | bind_score 40–74, any risk tier, premium=ACCEPTABLE | No (agent nudge only) |
| ESCALATE_UNDERWRITER | risk=HIGH + bind_score > 70 + premium=BLOCKER | Yes — case summary sent |
| ESCALATE_UNDERWRITER | Model confidence < 0.55 on any critical agent | Yes — low confidence path |
| ESCALATE_UNDERWRITER | Re_Quote=Yes + risk=HIGH + bind_score < 40 | Yes — re-quote risk flag |

---

## 5. Full Tech Stack

### Backend

| Library / Tool | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Core language for all ML and orchestration |
| FastAPI | Latest | REST API server, exposes pipeline endpoints to Next.js |
| uvicorn | Latest | ASGI server for FastAPI with async support |
| LangGraph | 0.2.x | Multi-agent orchestration — StateGraph for sequential pipeline |
| langchain-anthropic | Latest | Claude API integration inside Agent 3 |
| pydantic | v2 | Typed state schema passing between LangGraph nodes |
| SSE (starlette) | Built-in | Server-Sent Events for live dashboard updates |

### ML / Data Layer

| Library | Purpose |
|---|---|
| pandas | EDA, feature engineering, date parsing |
| scikit-learn | Preprocessing, train/test split, SMOTE pipeline |
| imbalanced-learn | SMOTE for Agent 2 class imbalance |
| xgboost | Agent 1 — Risk Profiler classifier |
| lightgbm | Agent 2 — Conversion Predictor (faster, handles categoricals natively) |
| shap | Explainability for both XGBoost and LightGBM agents |
| joblib | Saving and loading trained .pkl model files |

### Frontend

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | Main frontend framework |
| shadcn/ui | Component library — tables, badges, cards for dashboard |
| Tailwind CSS | Styling |
| EventSource API | Consuming SSE stream from FastAPI for live updates |
| Recharts | Bind score distribution chart, risk tier donut chart |

---

## 6. LangGraph State Schema

```python
class QuoteState(TypedDict):
    # Raw input
    quote_num: str
    agent_type: str
    region: str
    re_quote: bool
    quoted_premium: float
    coverage: str
    sal_range: str
    raw_features: dict       # all input columns

    # Agent 1 output
    risk_tier: str           # LOW | MEDIUM | HIGH
    risk_shap: dict          # top 3 features + values

    # Agent 2 output
    bind_score: int          # 0-100
    bind_probability: float
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

## 7. LangGraph Graph Wiring

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

## 8. Project Directory Structure

```
hackathon-uc3/
  backend/
    agents/
      agent1_risk_profiler.py
      agent2_conversion_predictor.py
      agent3_premium_advisor.py
      agent4_decision_router.py
    pipeline/
      state.py              # Pydantic QuoteState schema
      graph.py              # LangGraph StateGraph wiring
    models/
      train_models.py       # EDA + model training script
      risk_model.pkl        # Saved XGBoost
      conversion_model.pkl  # Saved LightGBM
    api/
      main.py               # FastAPI app
      routes.py             # /process-quote, /stream endpoints
    data/
      insurance_quotes.csv
  frontend/
    app/
      page.tsx              # Main dashboard
      components/
        QuoteTable.tsx
        EscalationQueue.tsx
        RiskBadge.tsx
        LiveFeed.tsx
    lib/
      api.ts                # SSE + REST client
  requirements.txt
  README.md
```

---

## 9. 12-Hour Build Plan

| Time Block | Task | Owner Focus | Deliverable |
|---|---|---|---|
| Hour 1 | EDA on CSV, check nulls, engineer features (urgency_days, risk buckets) | ML | Clean dataset + feature list |
| Hour 2 | Train Agent 1 XGBoost, Agent 2 LightGBM+SMOTE, save .pkl, run SHAP | ML | risk_model.pkl, conversion_model.pkl |
| Hour 3 | Build LangGraph StateGraph, wire all 4 agent nodes, test with 5 quotes | Backend | Working pipeline end-to-end |
| Hour 4 | Build FastAPI app, /process-quote POST route, /stream SSE route | Backend | API accepting and processing quotes |
| Hour 5 | Integrate Claude API in Agent 3 with structured JSON output prompt | Backend | premium_flag + reasoning working |
| Hour 6 | Next.js dashboard scaffold, live table with SSE connection | Frontend | Live updating quote table |
| Hour 7 | Escalation queue panel, Risk badge components, Bind score column | Frontend | Full dashboard layout |
| Hour 8 | Recharts — bind score histogram, risk tier donut, EA vs IA bar chart | Frontend | Visual charts on dashboard |
| Hour 9 | Test full pipeline with 50+ quotes, fix edge cases, tune thresholds | Both | Stable end-to-end demo |
| Hour 10 | SHAP integration in API response, feature importance in frontend UI | ML + Frontend | Explainability visible in UI |
| Hour 11 | Bonus: per-region threshold adaptation, EA vs IA comparison panel | Backend | Regional intelligence panel |
| Hour 12 | Polish UI, demo script, README, full demo run-through | Both | Demo-ready build |

---

## 10. Dashboard — Key Screens

### Screen 1 — Live Quote Feed
- Auto-refreshing table via SSE showing quotes being processed in real time
- Columns: Quote ID, Agent Type, Region, Risk Tier (badge), Bind Score (progress bar), Decision (badge)
- Color coding: LOW=green, MEDIUM=amber, HIGH=red for risk tiers
- AUTO_APPROVE=green, AGENT_FOLLOWUP=blue, ESCALATE=red for decisions

### Screen 2 — Escalation Queue
- Dedicated panel showing only escalated quotes awaiting underwriter action
- Each card: Quote ID, full case summary, SHAP top features, premium flag reasoning
- Mark as resolved button to clear from queue

### Screen 3 — Analytics Panel
- Bind score distribution histogram (Recharts BarChart)
- Risk tier breakdown donut chart
- EA vs IA conversion rate comparison bar chart
- Region-wise bind rate comparison table

---

## 11. Explainability Design

| Agent | Method | What It Shows |
|---|---|---|
| Agent 1 — Risk Profiler | SHAP TreeExplainer | Top 3 features pushing risk up or down with delta values |
| Agent 2 — Conversion Predictor | SHAP + urgency signal | Why bind probability is high/low, days to expiry impact |
| Agent 3 — Premium Advisor | LLM Chain-of-Thought | Natural language: why premium is a blocker, what band to offer |
| Agent 4 — Decision Router | Structured case summary | Full reasoning trace for underwriter — all upstream signals in one block |

---

## 12. Agent 3 — Claude API Prompt Template

```
SYSTEM:
You are an insurance premium analyst. Always respond with valid JSON only.
No preamble, no explanation outside the JSON object.

USER:
Quote context:
- Quoted Premium: {quoted_premium}
- Coverage Type: {coverage}
- Salary Range: {sal_range}
- Vehicle Cost Range: {vehicl_cost_range}
- Re-Quote: {re_quote}
- Bind Score: {bind_score} / 100
- Risk Tier: {risk_tier}

Analyze if the quoted premium is the conversion blocker.
Respond ONLY with this JSON:
{
  "premium_flag": "BLOCKER" | "ACCEPTABLE",
  "adjusted_band_low": number,
  "adjusted_band_high": number,
  "reasoning": "2-3 sentence explanation",
  "alternative_coverage": "string or null"
}
```

---

## 13. FastAPI SSE Endpoint Pattern

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio, json

app = FastAPI()

@app.post("/process-quote")
async def process_quote(quote: dict):
    result = await pipeline.ainvoke(quote)
    return result

@app.get("/stream")
async def stream_quotes():
    async def event_generator():
        for quote in get_pending_quotes():
            result = await pipeline.ainvoke(quote)
            yield f"data: {json.dumps(result)}\n\n"
            await asyncio.sleep(0.1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## 14. Next.js SSE Consumer Pattern

```typescript
// lib/api.ts
export function streamQuotes(onUpdate: (data: QuoteResult) => void) {
  const source = new EventSource("/api/stream");
  source.onmessage = (e) => {
    const result = JSON.parse(e.data) as QuoteResult;
    onUpdate(result);
  };
  source.onerror = () => {
    source.close();
    setTimeout(() => streamQuotes(onUpdate), 2000); // auto-reconnect
  };
  return source;
}
```

---

## 15. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM returns malformed JSON in Agent 3 | Medium | try/except with fallback to rule-based band only |
| SMOTE overfitting on Agent 2 | Low-Medium | Validate on held-out test set, stratified k-fold |
| SSE connection drops in browser | Low | Auto-reconnect EventSource with exponential backoff |
| Dirty dates in Q_Valid_DT | Medium | Parse with pandas coerce, fill nulls with median urgency |
| Claude API rate limiting during demo | Low | Cache Agent 3 responses for repeated quote patterns |
| Pipeline too slow for live demo | Low-Medium | Process quotes in background thread, SSE pushes as ready |

---

## 16. Bonus — Regional and Channel Intelligence

If time permits after Hour 10:

- Group dataset by Region and Agent_Type, compute per-group bind rates
- Store as a lookup table loaded at pipeline startup
- Agent 4 reads regional bind rate and dynamically adjusts escalation threshold
- Example: Region C with 35% bind rate gets lower escalation threshold vs overall 22%
- Add EA vs IA comparison bar chart to Analytics panel in Next.js

This is a 1–2 hour addition that directly addresses the bonus criterion in the problem statement.

---

## 17. requirements.txt

```
# Core
fastapi
uvicorn[standard]
pydantic>=2.0

# LangGraph + LangChain
langgraph
langchain
langchain-anthropic

# ML
pandas
scikit-learn
imbalanced-learn
xgboost
lightgbm
shap
joblib
numpy

# Utilities
python-dotenv
httpx
```

---

*GITAM Hackathon 2026 — Use Case 3: Autonomous Quote Agents — 12-Hour MVP Plan*
