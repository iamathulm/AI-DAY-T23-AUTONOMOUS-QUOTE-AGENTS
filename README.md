# Autonomous Quote Agents

### KodryxAI Hackathon 2026 · Use Case 3 · Multi-Agent Insurance Pipeline

---

## Overview

Auto insurance carriers process thousands of quotes daily through Exclusive Agents (EA) and Independent Agents (IA) across multiple regions. Only **~22%** of quotes convert into bound policies. Every unconverted quote currently demands manual investigation by underwriting teams — creating bottlenecks, delayed decisions, and missed conversions.

**Autonomous Quote Agents** is a multi-agent AI system that automates the insurance quote evaluation pipeline. Four specialized agents work in sequence — profiling risk, predicting conversion, analyzing premium suitability, and routing decisions — requiring human intervention **only** when the system identifies high risk, low confidence, or suspicious patterns.

> A four-agent LangGraph pipeline that classifies risk via CatBoost, predicts conversion via CatBoost+SMOTE, advises on premiums via Groq LLM, and routes quotes to auto-approve, follow-up, or human escalation — with full explainability (SHAP/LIME/Anchors/DiCE) computed live at inference time for every quote.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Dataset | 146,259 quotes · 25 columns |
| Bind Rate (class imbalance) | 22.22% (1:3.5 ratio) |
| Agent 1 Accuracy (risk tier) | 100% (deterministic target) |
| Agent 2 Best PR-AUC (bind) | 0.2242 (data-limited — see docs) |
| Explainability Methods | 6 (SHAP · LIME · Anchors · DiCE · LLM CoT · Structured Summary) |
| Model Architectures Tested | 6 (Ridge · RF · CatBoost · MLP · FT-Transformer · Ensemble) |
| Pipeline Orchestration | LangGraph StateGraph with conditional routing |
| LLM Integration | Groq Llama 3.3 70B Versatile |
| Frontend Components | 34 components across 6 routes |

---

## System Architecture

```
Quote Input (25 fields)
  → Agent 1: Risk Profiler (CatBoost) → risk_tier + SHAP/LIME/Anchors/DiCE
  → Agent 2: Conversion Predictor (CatBoost+SMOTE) → bind_score + SHAP/LIME/Anchors/DiCE
  → [IF bind_score > threshold] Agent 3: Premium Advisor (Groq LLM + Rules) → premium_flag
  → Agent 4: Decision Router (LLM + Rules + Regional) → Decision + Case Summary
```

| Decision | What Happens | Human Involved? |
|----------|-------------|-----------------|
| **AUTO_APPROVE** | Quote approved instantly | No |
| **AGENT_FOLLOWUP** | Agent receives nudge to contact customer | No |
| **ESCALATE_UNDERWRITER** | Full case summary sent to underwriter | Yes |

---

## Agent Design

### Agent 1 — Risk Profiler

Classifies each quote into **LOW**, **MEDIUM**, or **HIGH** risk based on driving history and household complexity.

- **Model:** CatBoost Classifier (3-class) with native categorical handling
- **Features:** Prev_Accidents, Prev_Citations, Driver_Age, Driving_Exp, HH_Vehicles, HH_Drivers, Annual_Miles_Range, Veh_Usage
- **Accuracy:** 100% (target is deterministic from input features)
- **Explainability:** SHAP + LIME + Anchors + DiCE — all computed live per quote

### Agent 2 — Conversion Predictor

Predicts the probability that a quote will convert into a bound policy.

- **Model:** CatBoost Classifier (binary) with SMOTE oversampling (22% → 50/50 balanced)
- **Features:** 18 encoded features + 3 domain-engineered features (affordability_ratio, hh_need, risk_coverage_fit)
- **Output:** Bind score (0–100) and bind probability
- **Explainability:** SHAP + LIME + Anchors + DiCE — all computed live per quote
- **Honest Assessment:** PR-AUC 0.2242 — near base rate. 6 model architectures tested, all confirm this is a data limitation, not a model limitation.

### Agent 3 — Premium Advisor

Analyzes whether the quoted premium is blocking conversion. **Only triggers when bind_score > threshold** (~30–40% of quotes).

- **Architecture:** Hybrid — rule-based affordability bands + Groq Llama 3.3 70B reasoning
- **Output:** BLOCKER or ACCEPTABLE + adjusted premium band + natural language reasoning
- **Fallback:** If LLM fails → pure rule-based assessment activates automatically

### Agent 4 — Decision Router

Combines all upstream signals to determine the final routing decision.

- **Architecture:** LLM-first routing (Groq) with rule-based fallback
- **Regional Intelligence:** Dynamic auto-approve thresholds adapted per region and agent channel
- **Escalation:** Generates LLM narrative summaries for escalated quotes
- **Fallback:** 8-branch rule system handles all edge cases if LLM fails

---

## Explainability Stack (6 Methods)

Every agent decision is explainable. All ML-based explanations are computed **live at inference time** for every individual quote.

| Method | What It Answers | Used By | Timing |
|--------|----------------|---------|--------|
| **SHAP** | "What features matter most?" | Agent 1, 2 | ~5ms |
| **LIME** | "Why this specific prediction?" | Agent 1, 2 | ~200ms |
| **Anchors** | "What IF-THEN rule explains this?" | Agent 1, 2 | ~1–5s |
| **DiCE** | "What would need to change?" | Agent 1, 2 | ~1–3s |
| **LLM Chain-of-Thought** | "Explain your reasoning" | Agent 3, 4 | ~2s |
| **Structured Summary** | "Give me the full case for review" | Agent 4 | ~2s |

---

## Technology Stack

### Backend
| Component | Detail |
|-----------|--------|
| Python | 3.11+ |
| FastAPI + Uvicorn | REST API server (ASGI) |
| LangGraph | Multi-agent StateGraph orchestration |
| LangChain + langchain-groq | Groq Llama 3.3 70B integration |
| Pydantic v2 | Typed state schema |
| SSE (Starlette) | Server-Sent Events streaming |

### Machine Learning
| Component | Detail |
|-----------|--------|
| CatBoost | Agent 1 (risk) + Agent 2 (bind) classifiers |
| SMOTE (imbalanced-learn) | Class imbalance handling for Agent 2 |
| SHAP | TreeExplainer for both models |
| LIME | Local interpretable explanations |
| Alibi | Anchor rule-based explanations |
| DiCE (dice-ml) | Counterfactual explanations |

### Frontend
| Component | Version |
|-----------|---------|
| Next.js | 16.1.6 (App Router) |
| React | 19.2.3 |
| shadcn/ui (Radix) | 3.8.5 |
| Tailwind CSS | v4 |
| Recharts | 3.7.0 |
| GSAP + Motion | Animations |

---

## Dashboard (6 Routes)

| Route | Description |
|-------|-------------|
| `/` | **Landing** — Bento-grid overview with GSAP-animated interactive components |
| `/quotes` | **Live Quotes Console** — Custom quote form + sample loading + filterable results table with XAI panels |
| `/pipeline` | **Pipeline Graph** — Visual 4-step agent pipeline stepper with per-agent status and XAI expansion |
| `/analytics` | **Analytics Dashboard** — Bind score histogram, risk distribution, decision breakdown (Recharts) |
| `/escalations` | **Escalation Queue** — Escalated quotes with full case summaries and 4 XAI tabs |
| `/regional` | **Regional Intelligence** — Per-region bind rates, EA vs IA comparison, dynamic thresholds |

---

## Quick Start

### Prerequisites
- Python 3.11+, Node.js 20+, Groq API key ([console.groq.com](https://console.groq.com))
- Supabase project (optional, recommended for persistent judge-visible quote history)

### Setup

```bash
# 1. Environment variables
cat > .env << 'EOF'
GROQ_API_KEY=gsk_your_key_here
# Supabase (optional but recommended for persistence)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
EOF

# 2. Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r Backend/requirements.txt

# 3. Frontend
cd Frontend && npm install && cd ..
```

### Run

```bash
# Terminal 1 — Backend (from project root)
source .venv/bin/activate
python -m Backend.api.main
# → http://localhost:8000

# Terminal 2 — Frontend
cd Frontend && npm run dev
# → http://localhost:3000
```

### Verify

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"quote-agents-pipeline"}
```

### Enable Persistent Quote Storage (Supabase)

Run the SQL schema once in Supabase SQL Editor:

```sql
-- paste and run file contents from
-- supabase/schema.sql
```

After backend restart, these endpoints read from Supabase when configured:
- `/api/quotes`
- `/api/stats`
- `/api/regional-stats`

Writes happen on:
- `/api/process-quote`
- `/api/process-batch`

> **Full setup instructions:** See [Docs/Setup.md](Docs/Setup.md) for detailed setup guide, demo walkthrough, and troubleshooting.

---

## Project Structure

```
AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS/
├── ML/
│   ├── datasets/insurance_quotes.csv       # 146K-row source dataset
│   ├── notebooks/                          # 6 Jupyter notebooks (EDA → training → XAI)
│   └── models/                             # 30+ trained artifacts (.joblib, .parquet, .png)
├── Backend/
│   ├── agents/                             # 4 agent implementations
│   │   ├── agent1_risk_profiler.py         # CatBoost + SHAP/LIME/Anchors/DiCE
│   │   ├── agent2_conversion_predictor.py  # CatBoost + SMOTE + all 4 XAI
│   │   ├── agent3_premium_advisor.py       # Groq LLM + rule fallback
│   │   └── agent4_decision_router.py       # LLM routing + case summary
│   ├── pipeline/                           # LangGraph StateGraph + QuoteState schema
│   ├── api/                                # FastAPI server + 7 endpoints + SSE
│   └── models/                             # Pydantic models package
├── Frontend/
│   └── src/
│       ├── app/                            # 6 Next.js routes
│       ├── components/                     # 34 components (10 directories)
│       └── lib/                            # API client, types, mock data
├── Docs/
│   ├── Technical_Documentation.md          # Comprehensive technical documentation
│   ├── Setup.md                            # Setup & run guide
└── .env                                    # Groq + optional Supabase keys (not committed)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Docs/Technical_Documentation.md](Docs/Technical_Documentation.md) | Comprehensive technical documentation (1,700+ lines) — 20 sections, 14 Mermaid diagrams, model details, honest assessment, defense points |
| [Docs/Setup.md](Docs/Setup.md) | Step-by-step setup guide with troubleshooting |

## Deployment Notes

- **Frontend (Vercel):** set `NEXT_PUBLIC_API_URL` to your deployed backend `/api` base URL.
- **Backend (Render/Railway/Fly/K8s):** set `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Keep backend on Node runtime equivalent for Python service; do not expose service role key to client.

---

*Autonomous Quote Agents — KodryxAI Hackathon 2026 — Use Case 3*
