"""Agent 4 — Decision Router (Threshold rules + LLM case summary).

Routes quotes to AUTO_APPROVE, AGENT_FOLLOWUP, or ESCALATE_UNDERWRITER
based on combined signals from upstream agents. Generates a structured
case summary for escalated quotes.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

_llm = None


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


def _route_decision(state: QuoteState) -> str:
    """Apply threshold rules to determine routing decision."""
    risk = state.get("risk_tier", "MEDIUM")
    bind_score = state.get("bind_score", 50)
    premium_flag = state.get("premium_flag", "ACCEPTABLE")
    confidence = state.get("confidence", 1.0)
    re_quote = state.get("raw_features", {}).get("Re_Quote", "No") == "Yes"

    # Low-confidence path: always escalate if any agent is unsure
    if confidence < 0.55:
        return "ESCALATE_UNDERWRITER"

    # High-risk re-quote with low conversion: suspicious pattern
    if re_quote and risk == "HIGH" and bind_score < 40:
        return "ESCALATE_UNDERWRITER"

    # Clear escalation: high risk + decent conversion chance + premium problem
    if risk == "HIGH" and bind_score > 70 and premium_flag == "BLOCKER":
        return "ESCALATE_UNDERWRITER"

    # Auto-approve: low risk, high conversion, no premium issue
    if risk == "LOW" and bind_score >= 75 and premium_flag == "ACCEPTABLE":
        return "AUTO_APPROVE"

    # Medium-high conversion with acceptable premium
    if bind_score >= 75 and premium_flag == "ACCEPTABLE":
        return "AUTO_APPROVE"

    # Agent follow-up zone: moderate signals
    if 40 <= bind_score <= 74 and premium_flag == "ACCEPTABLE":
        return "AGENT_FOLLOWUP"

    # High bind score but premium is blocking
    if bind_score > 60 and premium_flag == "BLOCKER":
        return "ESCALATE_UNDERWRITER"

    # Low conversion: agent follow-up to investigate
    if bind_score < 40:
        return "AGENT_FOLLOWUP"

    return "AGENT_FOLLOWUP"


def _build_case_summary(state: QuoteState) -> str:
    """Build a structured summary for underwriter review."""
    raw = state.get("raw_features", {})
    lines = [
        f"=== CASE SUMMARY: {state.get('quote_num', 'UNKNOWN')} ===",
        f"Agent Type: {state.get('agent_type', raw.get('Agent_Type', 'N/A'))}",
        f"Region: {state.get('region', raw.get('Region', 'N/A'))}",
        "",
        f"[Agent 1 — Risk Profiler]",
        f"  Risk Tier: {state.get('risk_tier', 'N/A')}",
        f"  Key Factors: {json.dumps(state.get('risk_shap', {}), indent=2)}",
        "",
        f"[Agent 2 — Conversion Predictor]",
        f"  Bind Score: {state.get('bind_score', 'N/A')}/100",
        f"  Bind Probability: {state.get('bind_probability', 'N/A')}",
        f"  Urgency: {state.get('urgency_days', 'N/A')} days until expiry",
        f"  Key Factors: {json.dumps(state.get('bind_shap', {}), indent=2)}",
        "",
        f"[Agent 3 — Premium Advisor]",
        f"  Premium Flag: {state.get('premium_flag', 'N/A')}",
        f"  Adjusted Band: {state.get('adjusted_band', 'N/A')}",
        f"  Reasoning: {state.get('premium_reasoning', 'N/A')}",
        "",
        f"[Pipeline Confidence]: {state.get('confidence', 'N/A')}",
        f"[Quoted Premium]: ${raw.get('Quoted_Premium', 'N/A')}",
        f"[Re-Quote]: {raw.get('Re_Quote', 'N/A')}",
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
