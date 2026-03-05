"""Agent 3 — Premium Advisor (Groq LLM + Rule-based bands).

Hybrid agent: rule layer computes affordability bands, Groq Llama 3.3 70B
generates natural-language reasoning about whether the premium is a conversion
blocker.

Only triggered when bind_score > 60 (conditional edge in LangGraph).
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

# Rule-based premium affordability bands (salary range -> max acceptable premium)
PREMIUM_BANDS = {
    "<= $ 25 K": (400, 650),
    "> $ 25 K <= $ 40 K": (500, 750),
    "> $ 40 K <= $ 60 K": (550, 850),
    "> $ 60 K <= $ 90 K": (600, 950),
    "> $ 90 K ": (650, 1100),
}

COVERAGE_MULTIPLIER = {"Basic": 0.85, "Balanced": 1.0, "Enhanced": 1.15}


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
        logger.info("Agent 3: Initialized Groq LLM")
    return _llm


def _rule_based_assessment(
    quoted_premium: float, sal_range: str, coverage: str
) -> tuple[str, str]:
    """Compute premium flag and adjusted band using rules."""
    low, high = PREMIUM_BANDS.get(sal_range, (500, 800))
    multiplier = COVERAGE_MULTIPLIER.get(coverage, 1.0)
    adj_low = round(low * multiplier)
    adj_high = round(high * multiplier)
    band = f"${adj_low} - ${adj_high}"

    if quoted_premium > adj_high * 1.1:
        return "BLOCKER", band
    return "ACCEPTABLE", band


def _build_prompt(state: QuoteState) -> str:
    raw = state.get("raw_features", {})
    return f"""Analyze this auto insurance quote and determine if the premium is blocking conversion.

Quote context:
- Quoted Premium: ${state.get('quoted_premium', raw.get('Quoted_Premium', 'N/A'))}
- Coverage Type: {state.get('coverage', raw.get('Coverage', 'N/A'))}
- Salary Range: {state.get('sal_range', raw.get('Sal_Range', 'N/A'))}
- Vehicle Cost Range: {raw.get('Vehicl_Cost_Range', 'N/A')}
- Re-Quote: {raw.get('Re_Quote', 'N/A')}
- Bind Score: {state.get('bind_score', 'N/A')}/100
- Risk Tier: {state.get('risk_tier', 'N/A')}

Respond with ONLY a valid JSON object (no markdown, no extra text):
{{"premium_flag": "BLOCKER or ACCEPTABLE", "adjusted_band_low": number, "adjusted_band_high": number, "reasoning": "2-3 sentence explanation", "alternative_coverage": "string or null"}}"""


SYSTEM_PROMPT = (
    "You are an insurance premium analyst. You MUST respond with ONLY a valid JSON object. "
    "Do not include any text before or after the JSON. Do not use markdown code fences."
)


def _parse_llm_response(text: str) -> dict | None:
    """Robustly extract JSON from LLM response, handling common quirks."""
    text = text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(
            l for l in lines if not l.strip().startswith("```")
        ).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return None


def agent3_premium_advisor(state: QuoteState) -> QuoteState:
    """LangGraph node — premium blocker analysis with LLM reasoning + rule fallback."""
    raw = state.get("raw_features", {})
    quoted_premium = state.get("quoted_premium") or raw.get("Quoted_Premium", 700.0)
    sal_range = state.get("sal_range") or raw.get("Sal_Range", "")
    coverage = state.get("coverage") or raw.get("Coverage", "")

    # Always run rule-based assessment as baseline/fallback
    rule_flag, rule_band = _rule_based_assessment(quoted_premium, sal_range, coverage)

    # Attempt LLM reasoning
    try:
        llm = _get_llm()
        from langchain_core.messages import HumanMessage, SystemMessage

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=_build_prompt(state)),
        ])

        parsed = _parse_llm_response(response.content)

        if parsed and "premium_flag" in parsed:
            state["premium_flag"] = parsed["premium_flag"].upper()
            low = parsed.get("adjusted_band_low", 0)
            high = parsed.get("adjusted_band_high", 0)
            state["adjusted_band"] = f"${low} - ${high}" if low and high else rule_band
            state["premium_reasoning"] = parsed.get("reasoning", "LLM analysis complete.")
            logger.info(f"Agent 3: LLM response for {state.get('quote_num')}: {parsed['premium_flag']}")
            return state

        logger.warning(f"Agent 3: LLM returned unparseable response, using rules")
    except Exception as e:
        logger.warning(f"Agent 3: LLM call failed ({e}), falling back to rules")

    # Fallback to rule-based
    state["premium_flag"] = rule_flag
    state["adjusted_band"] = rule_band
    state["premium_reasoning"] = (
        f"Rule-based: Premium ${quoted_premium:.2f} vs affordability band {rule_band} "
        f"for salary range '{sal_range}' with '{coverage}' coverage."
    )
    return state
