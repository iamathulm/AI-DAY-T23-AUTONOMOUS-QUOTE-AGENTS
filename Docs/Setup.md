# Setup Guide — Autonomous Quote Agents

Complete setup instructions for running the multi-agent insurance quote pipeline locally.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Project Structure](#2-clone--project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Supabase (Optional, Recommended)](#4-supabase-optional-recommended)
5. [ML Notebooks — Training Models](#5-ml-notebooks--training-models)
6. [Backend — API Server](#6-backend--api-server)
7. [Frontend — Dashboard](#7-frontend--dashboard)
8. [Running the Full Stack](#8-running-the-full-stack)
9. [Verifying Everything Works](#9-verifying-everything-works)
10. [Demo Walkthrough](#10-demo-walkthrough)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| **Python** | 3.11+ | `python3 --version` |
| **Node.js** | 20+ | `node --version` |
| **npm** | 10+ | `npm --version` |
| **pip** | Latest | `pip3 --version` |
| **Groq API Key** | Free tier | [console.groq.com](https://console.groq.com) |

### Get a Groq API Key (Free)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / log in
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key — you'll need it in step 3

> **Free tier limits:** 30 requests/minute, 14,400 requests/day — more than enough for development and demos.

---

## 2. Clone & Project Structure

```bash
# Clone the repository
git clone <repository-url>
cd AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS
```

The project has three main directories:

```
AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS/
├── ML/          ← Notebooks + trained model artifacts
├── Backend/     ← FastAPI + LangGraph pipeline
├── Frontend/    ← Next.js 16 dashboard
├── Docs/        ← Technical documentation + this file
└── .env         ← Environment variables (you create this)
```

---

## 3. Environment Variables

Create a `.env` file in the **project root**:

```bash
# From the project root directory
touch .env
```

Add your Groq API key:

```env
GROQ_API_KEY=gsk_your_api_key_here
```

> **Important:** The `.env` file is loaded by the Backend agents (`agent3_premium_advisor.py` and `agent4_decision_router.py`) using `python-dotenv`. It reads from the project root automatically.

**Optional frontend variable** — only needed if the backend runs on a non-default port:

```env
# In Frontend/.env.local (create if needed)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

The frontend defaults to `http://localhost:8000/api` if this variable is not set.

---

## 4. Supabase (Optional, Recommended)

Use Supabase if you want persistent quote history across restarts, devices, and judge sessions.

### 4.1 Create schema

Open Supabase SQL Editor and run:

```sql
-- from repository file
-- supabase/schema.sql
```

### 4.2 Add env vars in project root `.env`

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Backend also accepts `NEXT_PUBLIC_SUPABASE_URL` as URL fallback for compatibility.

### 4.3 Verify persistence

1. Restart backend.
2. Process one quote via UI or `/api/process-quote`.
3. Check `public.quote_runs` table in Supabase.

When configured, these endpoints read persisted records:
- `/api/quotes`
- `/api/stats`
- `/api/regional-stats`

---

## 5. ML Notebooks — Training Models

> **If model artifacts already exist** in `ML/models/` (30+ `.joblib` files), you can **skip this step entirely** and go straight to step 5. The trained models are checked into the repository.

### Check if models exist

```bash
ls ML/models/*.joblib
```

If you see files like `risk_model.joblib`, `conversion_model.joblib`, etc., the models are already trained.

### If you need to retrain (optional)

#### 4.1 Create a Python virtual environment

```bash
# From the project root
python3 -m venv .venv
source .venv/bin/activate    # macOS/Linux
# .venv\Scripts\activate     # Windows
```

#### 4.2 Install ML dependencies

```bash
pip install -r ML/requirements.txt
```

#### 4.3 Run notebooks in order

Open Jupyter and run each notebook sequentially:

```bash
cd ML/notebooks
jupyter notebook
```

**Run order (dependencies shown):**

```
01_EDA.ipynb                          ← Exploratory analysis (read-only)
    ↓
02_Feature_Engineering.ipynb          ← Saves encoding artifacts
    ↓
    ├── 03_Agent1_Risk_Profiler.ipynb ← CatBoost risk model + XAI bundle
    │                                    (can run in parallel with 04)
    ├── 04_Agent2_Conversion_Predictor.ipynb ← CatBoost bind model + XAI bundle
    │       ↓
    │   04b_Model_Comparison.ipynb    ← Optional: 6-model comparison analysis
    │
    └── 05_Regional_Intelligence.ipynb ← Regional stats + dynamic thresholds
```

> **Notebooks 03 and 04 can run in parallel** on different machines if needed. All other notebooks must run sequentially.

#### 4.4 Verify artifacts were created

```bash
ls ML/models/
# Should see: risk_model.joblib, conversion_model.joblib, 
# risk_xai_bundle.joblib, conversion_xai_bundle.joblib,
# regional_stats.joblib, feature_config.joblib, etc.
```

---

## 6. Backend — API Server

### 5.1 Create a Python virtual environment (if not done in step 4)

```bash
# From the project root
python3 -m venv .venv
source .venv/bin/activate
```

### 5.2 Install Backend dependencies

```bash
pip install -r Backend/requirements.txt
```

This installs FastAPI, LangGraph, LangChain, CatBoost, SHAP, LIME, DiCE, Alibi, and all other dependencies.

### 5.3 Start the FastAPI server

```bash
# From the project root (important — not from Backend/)
python -m Backend.api.main
```

Or using uvicorn directly:

```bash
uvicorn Backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Important:** Run from the **project root**, not from inside `Backend/`. The agents use relative imports like `from Backend.pipeline.state import QuoteState`.

### 5.4 Verify the server is running

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"quote-agents-pipeline"}
```

You should see log messages as models lazy-load on first request:
```
Agent 1: Loaded risk model + explainer + XAI bundle
Agent 2: Loaded conversion model + explainer + XAI bundle
Agent 4: Loaded regional_stats.joblib
```

---

## 7. Frontend — Dashboard

### 6.1 Install Node.js dependencies

```bash
cd Frontend
npm install
```

### 6.2 Start the development server

```bash
npm run dev
```

The dashboard will be available at **http://localhost:3000**.

### 6.3 Build for production (optional)

```bash
npm run build
npm start
```

---

## 8. Running the Full Stack

You need **two terminal windows** running simultaneously:

### Terminal 1 — Backend

```bash
cd /path/to/AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS
source .venv/bin/activate
python -m Backend.api.main
# Server starts on http://localhost:8000
```

### Terminal 2 — Frontend

```bash
cd /path/to/AI-DAY-T23-AUTONOMOUS-QUOTE-AGENTS/Frontend
npm run dev
# Dashboard starts on http://localhost:3000
```

### Quick start (both in one command)

```bash
# Terminal 1: Backend
source .venv/bin/activate && python -m Backend.api.main &

# Terminal 2: Frontend  
cd Frontend && npm run dev
```

---

## 9. Verifying Everything Works

### 9.1 Health check

```bash
curl http://localhost:8000/health
```

### 9.2 Process a test quote

```bash
curl -X POST http://localhost:8000/api/process-quote \
  -H "Content-Type: application/json" \
  -d '{
    "Quote_Num": "TEST-001",
    "Agent_Type": "EA",
    "Region": "A",
    "Driver_Age": 34,
    "Driving_Exp": 12,
    "Prev_Accidents": 0,
    "Prev_Citations": 1,
    "Gender": "Male",
    "Marital_Status": "Single",
    "Education": "Bachelors",
    "Coverage": "Enhanced",
    "Sal_Range": "> $ 40 K <= $ 60 K",
    "Veh_Usage": "Commute",
    "Annual_Miles_Range": "> 7.5 K & <= 15 K",
    "Vehicl_Cost_Range": "<= $ 10 K",
    "Re_Quote": "No",
    "Quoted_Premium": 750.0,
    "Q_Creation_DT": "2025/01/01",
    "Q_Valid_DT": "2025/03/01",
    "HH_Vehicles": 1,
    "HH_Drivers": 1,
    "Policy_Type": "Car"
  }'
```

**Expected response fields:**
- `risk_tier`: LOW, MEDIUM, or HIGH
- `bind_score`: 0–100
- `risk_shap`, `risk_lime`, `risk_anchors`, `risk_counterfactuals`: XAI explanations
- `bind_shap`, `bind_lime`, `bind_anchors`, `bind_counterfactuals`: XAI explanations
- `premium_flag`: BLOCKER or ACCEPTABLE (if Agent 3 ran)
- `decision`: AUTO_APPROVE, AGENT_FOLLOWUP, or ESCALATE_UNDERWRITER
- `case_summary`: Structured text summary

### 9.3 Load sample quotes from dataset

```bash
curl http://localhost:8000/api/sample-quotes?n=5
```

### 9.4 Open the dashboard

Navigate to **http://localhost:3000** in your browser. You should see the landing page with the bento grid overview.

Click on **Quotes** in the sidebar to start processing quotes.

---

## 10. Demo Walkthrough

### Quick Demo (2 minutes)

1. Open http://localhost:3000
2. Click **Quotes** in the sidebar
3. Use the quote form to submit a custom quote, or click **"Run Pipeline"** in the sidebar to auto-load and process 10 sample quotes
4. Watch quotes appear in the table with risk tiers, bind scores, and decisions
5. Click any row to expand and see **SHAP / LIME / Anchors / DiCE** explanations
6. Navigate to **Escalations** to see escalated quotes with full case summaries
7. Navigate to **Analytics** for pipeline statistics and charts
8. Navigate to **Regional** for per-region bind rates and EA vs IA comparison

### Full Demo (5 minutes)

1. Start with the **Landing page** — walk through the bento grid showing the 4-agent architecture
2. Go to **Pipeline** — show a single quote flowing through all 4 agents with visual stepper
3. Go to **Quotes** — process a batch of 20 quotes, demonstrate filtering by decision type
4. Show **Explainability** — expand a quote row and walk through each XAI tab (SHAP bar chart, LIME weights, Anchor rules, DiCE what-if cards)
5. Go to **Escalations** — show a case where the system escalated and explain why (LLM narrative)
6. Go to **Analytics** — show risk distribution, bind score histogram, decision breakdown
7. Go to **Regional** — show per-region performance and dynamic threshold adaptation

---

## 11. Troubleshooting

### Backend won't start

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'Backend'` | Run from the **project root**, not from `Backend/` |
| `ModuleNotFoundError: No module named 'catboost'` | `pip install -r Backend/requirements.txt` |
| Model `.joblib` files not found | Run ML notebooks first (step 4) or check `ML/models/` directory |
| `GROQ_API_KEY` not found | Create `.env` in project root with `GROQ_API_KEY=gsk_...` |

### Frontend won't start

| Error | Solution |
|-------|----------|
| `Module not found` | Run `npm install` in the `Frontend/` directory |
| Next.js version mismatch | Delete `node_modules` and `npm install` fresh |
| API connection refused | Ensure backend is running on port 8000 |

### Pipeline errors

| Issue | Solution |
|-------|----------|
| Agent 3/4 LLM calls fail | Check `.env` for valid `GROQ_API_KEY`. Agents will fall back to rule-based logic automatically |
| LIME/Anchors/DiCE timeout | These explainers are lazy-loaded on first request — first call is slower. Subsequent calls are fast |
| Groq rate limit (429) | Wait 60 seconds. Free tier allows 30 RPM. Agent 3 is conditional (only ~30-40% of quotes trigger it) |
| Bind scores cluster around 50 | This is expected — see "Honest Assessment" in Technical Documentation. The dataset has limited predictive signal for bind prediction |

### Common issues

| Issue | Solution |
|-------|----------|
| SSE not working | Ensure backend CORS allows `http://localhost:3000` (configured in `main.py`) |
| Frontend shows mock data | Backend is not running or not reachable. Check browser console for fetch errors |
| Supabase table not updating | Ensure schema from `supabase/schema.sql` is applied, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, then restart backend |
| Supabase URL set as `NEXT_PUBLIC_SUPABASE_URL` only | Supported, but backend restart is still required after env changes |
| Port 8000 already in use | Kill existing process: `lsof -i :8000` then `kill <PID>`, or use `--port 8001` |
| Port 3000 already in use | Next.js will auto-increment to 3001. Or kill: `lsof -i :3000` |

---

## API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/process-quote` | Process single quote through 4-agent pipeline |
| `POST` | `/api/process-batch` | Process multiple quotes |
| `GET` | `/api/stream` | SSE endpoint for real-time updates |
| `GET` | `/api/quotes?limit=50&offset=0&decision=AUTO_APPROVE` | Fetch processed quotes with filtering |
| `GET` | `/api/stats` | Aggregate statistics |
| `GET` | `/api/regional-stats` | Per-region performance |
| `GET` | `/api/sample-quotes?n=10` | Load random quotes from dataset |

---

*Autonomous Quote Agents — KodryxAI Hackathon 2026 — Use Case 3*
