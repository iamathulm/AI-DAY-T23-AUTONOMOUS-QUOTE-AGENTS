# Autonomous Quote Agents  

## Overview

Insurance providers process thousands of auto insurance quotes daily through Exclusive Agents (EA) and Independent Agents (IA). However, only a small portion of these quotes convert into bound policies. Most unconverted quotes require manual investigation by underwriting teams, creating operational inefficiencies and delays.

**Autonomous Quote Agents** is a multi-agent AI system that automates the insurance quote evaluation pipeline. The system profiles risk, predicts conversion probability, analyzes premium suitability, and routes decisions automatically. Human intervention is required only when the system identifies high risk or uncertainty.

The solution demonstrates how **AI agents, machine learning models, and explainability techniques** can work together to streamline insurance underwriting workflows.
---

## Objective

The goal of this project is to build an intelligent pipeline capable of:

- Assessing the **risk profile of a quote**
- Predicting the **likelihood of policy conversion**
- Determining whether the **quoted premium prevents conversion**
- Automatically **routing quotes to approval, follow-up, or underwriting escalation**

This approach reduces manual workload while enabling faster and more consistent decision-making.
---

## System Architecture

The system is implemented as a **four-agent pipeline orchestrated using LangGraph**. Each agent performs a specialized task and enriches a shared state object before passing it to the next stage.

**Pipeline Flow**

Risk Profiler → Conversion Predictor → Premium Advisor → Decision Router


Each quote moves through the pipeline and results in an explainable decision.
---

## Agent Design

### Agent 1 — Risk Profiler

Evaluates the driving and behavioral risk associated with the quote.

**Model:** XGBoost Classifier  
**Output:** Risk tier classification (**LOW, MEDIUM, HIGH**)

SHAP explanations identify the key features influencing the risk prediction.
---

### Agent 2 — Conversion Predictor

Estimates the probability that a quote will convert into a bound policy.

**Model:** LightGBM Classifier  
**Output:** Bind probability and bind score (**0–100**)

Class imbalance in the dataset is addressed using **SMOTE** during training.
---

### Agent 3 — Premium Advisor

Analyzes whether the quoted premium is preventing conversion.

This component uses a **hybrid approach** combining rule-based pricing logic with **LLM reasoning through Claude API**.

**Output**

- Premium evaluation (**BLOCKER** or **ACCEPTABLE**)  
- Suggested premium adjustment band  
- Natural language explanation  

This agent runs only when conversion likelihood is sufficiently high.
---

### Agent 4 — Decision Router

Combines signals from all previous agents to determine the final action.

Possible outcomes:

- **AUTO_APPROVE** – Low risk and high conversion probability  
- **AGENT_FOLLOWUP** – Moderate conversion potential requiring outreach  
- **ESCALATE_UNDERWRITER** – High-risk or uncertain cases requiring human review  
---

## Explainability

Transparency is integrated into every stage of the pipeline.

| Agent | Explainability Method |
|------|------------------------|
| Risk Profiler | SHAP feature importance |
| Conversion Predictor | SHAP explanations and urgency signals |
| Premium Advisor | LLM-generated reasoning |
| Decision Router | Structured case summaries |

This ensures every automated decision can be clearly justified.
---

## Technology Stack

### Backend
- Python
- FastAPI
- LangGraph
- LangChain
- Claude API

### Machine Learning
- Pandas
- Scikit-learn
- XGBoost
- LightGBM
- SHAP

### Frontend
- Next.js
- Tailwind CSS
- shadcn/ui
- Recharts

### Communication
- Server-Sent Events (SSE) for real-time dashboard updates
---

## Dashboard

The system includes a monitoring dashboard with three main views.

### Live Quote Feed
Displays real-time quote processing results including risk tier, bind score, and decision.

### Escalation Queue
Shows quotes requiring underwriter attention with full case summaries.

### Analytics Panel
Provides aggregated insights such as:

- Risk distribution  
- Conversion rates  
- Regional comparisons  
- EA vs IA performance metrics  
---
