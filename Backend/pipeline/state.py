from __future__ import annotations

from typing import TypedDict


class QuoteState(TypedDict, total=False):
    # --- Raw input ---
    quote_num: str
    agent_type: str  # EA | IA
    region: str
    re_quote: bool
    quoted_premium: float
    coverage: str  # Basic | Balanced | Enhanced
    sal_range: str
    vehicl_cost_range: str
    veh_usage: str
    annual_miles_range: str
    raw_features: dict  # all input columns for SHAP

    # --- Agent 1: Risk Profiler ---
    risk_tier: str  # LOW | MEDIUM | HIGH
    risk_score: float
    risk_shap: dict  # top 3 SHAP feature contributions
    risk_lime: dict  # LIME local explanation
    risk_anchors: str  # Anchor IF-THEN rule
    risk_counterfactuals: list  # DiCE counterfactual examples

    # --- Agent 2: Conversion Predictor ---
    bind_score: int  # 0-100
    bind_probability: float
    bind_shap: dict
    bind_lime: dict
    bind_anchors: str
    bind_counterfactuals: list
    urgency_days: int  # days until quote expiry

    # --- Agent 3: Premium Advisor (conditional) ---
    premium_flag: str  # BLOCKER | ACCEPTABLE
    adjusted_band: str
    premium_reasoning: str

    # --- Agent 4: Decision Router ---
    decision: str  # AUTO_APPROVE | AGENT_FOLLOWUP | ESCALATE_UNDERWRITER
    case_summary: str
    confidence: float
