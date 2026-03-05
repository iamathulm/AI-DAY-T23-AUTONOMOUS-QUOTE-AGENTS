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
    risk_shap: dict  # top SHAP features {name: value}
    risk_lime: dict  # LIME weights {feature_condition: weight}
    risk_anchors: dict  # {rule: str, precision: float, coverage: float}
    risk_counterfactuals: list  # DiCE counterfactual dicts

    # --- Agent 2: Conversion Predictor ---
    bind_score: int  # 0-100
    bind_probability: float
    bind_shap: dict  # top SHAP features {name: value}
    bind_lime: dict  # LIME weights {feature_condition: weight}
    bind_anchors: dict  # {rule: str, precision: float, coverage: float}
    bind_counterfactuals: list  # DiCE counterfactual dicts
    urgency_days: int  # days until quote expiry

    # --- Agent 3: Premium Advisor (conditional) ---
    premium_flag: str  # BLOCKER | ACCEPTABLE
    adjusted_band: str
    premium_reasoning: str

    # --- Agent 4: Decision Router ---
    decision: str  # AUTO_APPROVE | AGENT_FOLLOWUP | ESCALATE_UNDERWRITER
    routing_reasoning: str  # LLM explanation for routing decision
    case_summary: str
    auto_approve_threshold: int
    confidence: float
