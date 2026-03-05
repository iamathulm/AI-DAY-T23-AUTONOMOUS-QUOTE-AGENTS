"""Agent 4 — Decision Router (LLM-based routing + case summary).

Uses Groq LLM to route quotes to AUTO_APPROVE, AGENT_FOLLOWUP, or
ESCALATE_UNDERWRITER based on combined signals. Falls back to rule-based
routing if LLM fails. Generates a structured case summary for escalated quotes.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import joblib
from dotenv import load_dotenv

from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

_llm = None
_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ML" / "models"
_regional_stats = None
_conversion_cfg = None


def _get_llm():
    global _llm
    if _llm is None:
        from langchain_groq import ChatGroq

        _llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY"),
            max_retries=2,
        )
    return _llm


def _load_regional_stats():
    global _regional_stats
    if _regional_stats is None:
        try:
            _regional_stats = joblib.load(_MODEL_DIR / "regional_stats.joblib")
            logger.info("Agent 4: Loaded regional_stats.joblib")
        except Exception as e:
            logger.warning(f"Agent 4: Could not load regional stats ({e}), using defaults")
            _regional_stats = {}
    return _regional_stats


def _load_conversion_cfg() -> dict:
    """Load conversion settings used to describe Agent 3 skip behavior."""
    global _conversion_cfg
    if _conversion_cfg is None:
        _conversion_cfg = {}
        for bundle_path in ["conversion_model_comparison_bundle.joblib", "conversion_xai_bundle.joblib"]:
            try:
                bundle = joblib.load(_MODEL_DIR / bundle_path)
                _conversion_cfg.update(bundle)
            except Exception:
                continue
    return _conversion_cfg


def _ensure_premium_context(state: QuoteState) -> None:
    """Always provide a meaningful premium explanation, even when Agent 3 is skipped."""
    bind_score = int(state.get("bind_score", 0))
    cfg = _load_conversion_cfg()
    threshold = int(cfg.get("premium_advisor_threshold", 60))

    if state.get("premium_flag") is None:
        state["premium_flag"] = "ACCEPTABLE"
    state.setdefault("adjusted_band", "N/A")

    if not state.get("premium_reasoning"):
        if bind_score <= threshold:
            state["premium_reasoning"] = (
                f"Skipped — bind score {bind_score}/100 is below the premium-advisor threshold "
                f"({threshold}). Premium deep-dive is deferred for low-conversion quotes."
            )
        else:
            state["premium_reasoning"] = (
                "Premium Advisor output missing; using router fallback with existing signals."
            )


def _get_auto_approve_threshold(state: QuoteState) -> int:
    """
    Resolve dynamic auto-approve threshold from regional intelligence (notebook 05).
    Falls back to static default if regional stats are unavailable.
    """
    stats = _load_regional_stats()
    base = int(round(float(stats.get("base_auto_approve_threshold", 75))))

    raw = state.get("raw_features", {})
    region = state.get("region") or raw.get("Region")
    agent_type = state.get("agent_type") or raw.get("Agent_Type")

    region_th = None
    channel_th = None

    if region:
        region_info = stats.get("region_thresholds", {}).get(region)
        if isinstance(region_info, dict):
            region_th = region_info.get("auto_approve_threshold")

    if agent_type:
        channel_info = stats.get("channel_thresholds", {}).get(agent_type)
        if isinstance(channel_info, dict):
            channel_th = channel_info.get("auto_approve_threshold")

    # Prefer blended threshold when both are present.
    if region_th is not None and channel_th is not None:
        return int(round((float(region_th) + float(channel_th)) / 2.0))
    if region_th is not None:
        return int(round(float(region_th)))
    if channel_th is not None:
        return int(round(float(channel_th)))
    return base


def _build_routing_context(state: QuoteState) -> str:
    """Build structured context for LLM routing decision."""
    raw = state.get("raw_features", {})
    risk = state.get("risk_tier", "MEDIUM")
    bind_score = state.get("bind_score", 50)
    _ensure_premium_context(state)
    premium_flag = state.get("premium_flag", "ACCEPTABLE")
    confidence = state.get("confidence", 1.0)
    re_quote = raw.get("Re_Quote", "No") == "Yes"
    auto_approve_threshold = _get_auto_approve_threshold(state)
    state["auto_approve_threshold"] = auto_approve_threshold

    return f"""Quote: {state.get('quote_num', 'UNKNOWN')}
Agent Type: {state.get('agent_type', raw.get('Agent_Type', 'N/A'))}
Region: {state.get('region', raw.get('Region', 'N/A'))}
Re-Quote: {re_quote}

[Signals]
- Risk Tier: {risk}
- Bind Score: {bind_score}/100
- Auto-Approve Threshold: {auto_approve_threshold}
- Premium Flag: {premium_flag}
- Pipeline Confidence: {confidence:.2f}
- Quoted Premium: ${raw.get('Quoted_Premium', 'N/A')}"""


def _route_decision_llm(state: QuoteState) -> tuple[str, str]:
    """Use LLM to decide routing. Returns (decision, reasoning)."""
    context = _build_routing_context(state)
    prompt = f"""You are an insurance quote routing specialist. Given the pipeline analysis below, decide how to route this quote.

{context}

Routing options:
- AUTO_APPROVE: Low risk, high conversion likelihood, acceptable premium. No human needed.
- AGENT_FOLLOWUP: Moderate signals; agent should follow up with customer. No escalation.
- ESCALATE_UNDERWRITER: High risk, premium blocker, low confidence, or suspicious pattern (e.g. re-quote + high risk + low bind). Human underwriter must review.

Respond with ONLY a valid JSON object (no markdown, no extra text):
{{"decision": "AUTO_APPROVE or AGENT_FOLLOWUP or ESCALATE_UNDERWRITER", "reasoning": "2-3 sentence explanation"}}"""

    try:
        llm = _get_llm()
        from langchain_core.messages import HumanMessage, SystemMessage

        resp = llm.invoke([
            SystemMessage(
                content="You MUST respond with ONLY a valid JSON object. No text before or after. Keys: decision, reasoning."
            ),
            HumanMessage(content=prompt),
        ])
        text = (resp.content or "").strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
        parsed = json.loads(text)
        decision = str(parsed.get("decision", "AGENT_FOLLOWUP")).strip().upper()
        reasoning = str(parsed.get("reasoning", "No reasoning provided.")).strip()
        valid = decision in ("AUTO_APPROVE", "AGENT_FOLLOWUP", "ESCALATE_UNDERWRITER")
        if valid:
            return decision, reasoning
    except Exception as e:
        logger.warning(f"Agent 4: LLM routing failed ({e}), using rule fallback")
    return None, ""


def _route_decision_rules(state: QuoteState) -> str:
    """Rule-based fallback when LLM fails."""
    risk = state.get("risk_tier", "MEDIUM")
    bind_score = state.get("bind_score", 50)
    premium_flag = state.get("premium_flag") or "ACCEPTABLE"
    confidence = state.get("confidence", 1.0)
    re_quote = state.get("raw_features", {}).get("Re_Quote", "No") == "Yes"
    auto_approve_threshold = state.get("auto_approve_threshold", 75)

    if confidence < 0.55:
        return "ESCALATE_UNDERWRITER"
    if re_quote and risk == "HIGH" and bind_score < 40:
        return "ESCALATE_UNDERWRITER"
    if risk == "HIGH" and bind_score > max(70, auto_approve_threshold - 5) and premium_flag == "BLOCKER":
        return "ESCALATE_UNDERWRITER"
    if risk == "LOW" and bind_score >= auto_approve_threshold and premium_flag == "ACCEPTABLE":
        return "AUTO_APPROVE"
    if bind_score >= auto_approve_threshold and premium_flag == "ACCEPTABLE":
        return "AUTO_APPROVE"
    if 40 <= bind_score < auto_approve_threshold and premium_flag == "ACCEPTABLE":
        return "AGENT_FOLLOWUP"
    if bind_score > 60 and premium_flag == "BLOCKER":
        return "ESCALATE_UNDERWRITER"
    if bind_score < 40:
        return "AGENT_FOLLOWUP"
    return "AGENT_FOLLOWUP"


def _route_decision(state: QuoteState) -> str:
    """Route using LLM; fallback to rules on failure."""
    decision, reasoning = _route_decision_llm(state)
    if decision is not None:
        state["routing_reasoning"] = reasoning
        return decision
    fallback = _route_decision_rules(state)
    state["routing_reasoning"] = f"LLM failed; used rule-based fallback → {fallback}"
    return fallback


def _build_case_summary(state: QuoteState) -> str:
    """Build a structured summary for underwriter review."""
    raw = state.get("raw_features", {})

    def _top_factors(shap: dict | None) -> str:
        if not shap:
            return "- No SHAP factors available"
        pairs = sorted(shap.items(), key=lambda kv: abs(float(kv[1])), reverse=True)[:4]
        return "\n".join([f"- {k}: {float(v):+.3f}" for k, v in pairs])

    lines = [
        f"Case: {state.get('quote_num', 'UNKNOWN')}",
        f"Agent Type: {state.get('agent_type', raw.get('Agent_Type', 'N/A'))}",
        f"Region: {state.get('region', raw.get('Region', 'N/A'))}",
        "",
        "[Agent 1 — Risk Profiler]",
        f"Risk Tier: {state.get('risk_tier', 'N/A')}",
        "Top Risk Factors:",
        _top_factors(state.get("risk_shap", {})),
        "",
        "[Agent 2 — Conversion Predictor]",
        f"Bind Score: {state.get('bind_score', 'N/A')}/100",
        f"Bind Probability: {state.get('bind_probability', 'N/A')}",
        f"Auto-Approve Threshold: {state.get('auto_approve_threshold', 'N/A')}",
        f"Urgency: {state.get('urgency_days', 'N/A')} days until expiry",
        "Top Conversion Factors:",
        _top_factors(state.get("bind_shap", {})),
        "",
        "[Agent 3 — Premium Advisor]",
        f"Premium Flag: {state.get('premium_flag', 'N/A')}",
        f"Adjusted Band: {state.get('adjusted_band', 'N/A')}",
        f"Reasoning: {state.get('premium_reasoning', 'N/A')}",
        "",
        f"Pipeline Confidence: {state.get('confidence', 'N/A')}",
        f"Routing Reasoning: {state.get('routing_reasoning', 'N/A')}",
        f"Quoted Premium: ${raw.get('Quoted_Premium', 'N/A')}",
        f"Re-Quote: {raw.get('Re_Quote', 'N/A')}",
    ]
    return "\n".join(lines)


def _generate_llm_summary(state: QuoteState) -> str:
    """Use Groq to generate a human-readable case summary for escalated quotes."""
    structured = _build_case_summary(state)
    try:
        llm = _get_llm()
        from langchain_core.messages import HumanMessage, SystemMessage

        resp = llm.invoke([
            SystemMessage(
                content=(
                    "You are an insurance underwriter assistant. Given the pipeline "
                    "analysis below, write a concise 3-5 sentence summary highlighting: "
                    "(1) why this quote was escalated, (2) the key risk factors, "
                    "(3) a recommended action. Be direct and professional."
                )
            ),
            HumanMessage(content=structured),
        ])
        return f"{resp.content}\n\n--- Raw Signals ---\n{structured}"
    except Exception as e:
        logger.warning(f"Agent 4: LLM summary failed ({e}), using structured only")
        return structured


def agent4_decision_router(state: QuoteState) -> QuoteState:
    """LangGraph node — routes the quote and generates a case summary."""
    decision = _route_decision(state)
    state["decision"] = decision

    if decision == "ESCALATE_UNDERWRITER":
        state["case_summary"] = _generate_llm_summary(state)
    else:
        state["case_summary"] = _build_case_summary(state)

    logger.info(
        f"Agent 4: {state.get('quote_num')} → {decision} "
        f"(risk={state.get('risk_tier')}, bind={state.get('bind_score')}, "
        f"premium={state.get('premium_flag')})"
    )
    return state
