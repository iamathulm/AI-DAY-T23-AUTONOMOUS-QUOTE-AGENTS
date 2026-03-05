"""LangGraph pipeline — 4-agent sequential StateGraph.

Agent 1 (Risk Profiler) → Agent 2 (Conversion Predictor)
    → [conditional] Agent 3 (Premium Advisor) → Agent 4 (Decision Router)

Agent 3 only fires when bind_score > threshold (from notebook 04 calibration/lift).
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
from langgraph.graph import END, StateGraph

from Backend.agents.agent1_risk_profiler import agent1_risk_profiler
from Backend.agents.agent2_conversion_predictor import agent2_conversion_predictor
from Backend.agents.agent3_premium_advisor import agent3_premium_advisor
from Backend.agents.agent4_decision_router import agent4_decision_router
from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ML" / "models"
_PREMIUM_ADVISOR_THRESHOLD = None


def _get_premium_advisor_threshold() -> int:
    """Load from notebook 04 or 04b calibration; fallback 60."""
    global _PREMIUM_ADVISOR_THRESHOLD
    if _PREMIUM_ADVISOR_THRESHOLD is None:
        for bundle_path in ["conversion_model_comparison_bundle.joblib", "conversion_xai_bundle.joblib"]:
            try:
                bundle = joblib.load(_MODEL_DIR / bundle_path)
                val = bundle.get("premium_advisor_threshold")
                if val is not None:
                    _PREMIUM_ADVISOR_THRESHOLD = int(val)
                    logger.info(f"Graph: Loaded premium_advisor_threshold={_PREMIUM_ADVISOR_THRESHOLD} from {bundle_path}")
                    return _PREMIUM_ADVISOR_THRESHOLD
            except Exception:
                pass
        logger.warning("Graph: Could not load premium_advisor_threshold, using 60")
        _PREMIUM_ADVISOR_THRESHOLD = 60
    return _PREMIUM_ADVISOR_THRESHOLD


def _should_run_premium_advisor(state: QuoteState) -> str:
    """Conditional edge: route to premium advisor only for high bind scores."""
    threshold = _get_premium_advisor_threshold()
    bind_score = state.get("bind_score", 0)
    if bind_score > threshold:
        logger.info(
            f"Quote {state.get('quote_num')}: bind_score={bind_score} > {threshold}, "
            f"routing to Premium Advisor"
        )
        return "premium_advisor"

    # Skip Agent 3 — set defaults so Agent 4 has all expected fields
    state["premium_flag"] = "ACCEPTABLE"
    state["adjusted_band"] = "N/A"
    state["premium_reasoning"] = (
        f"Skipped — bind_score ({bind_score}) below threshold ({threshold}). "
        f"Premium analysis not warranted for low-conversion quotes."
    )
    return "decision_router"


def build_pipeline() -> StateGraph:
    """Construct and compile the quote processing pipeline."""
    graph = StateGraph(QuoteState)

    graph.add_node("risk_profiler", agent1_risk_profiler)
    graph.add_node("conversion_predictor", agent2_conversion_predictor)
    graph.add_node("premium_advisor", agent3_premium_advisor)
    graph.add_node("decision_router", agent4_decision_router)

    graph.set_entry_point("risk_profiler")
    graph.add_edge("risk_profiler", "conversion_predictor")

    graph.add_conditional_edges(
        "conversion_predictor",
        _should_run_premium_advisor,
        {
            "premium_advisor": "premium_advisor",
            "decision_router": "decision_router",
        },
    )

    graph.add_edge("premium_advisor", "decision_router")
    graph.add_edge("decision_router", END)

    return graph.compile()


pipeline = build_pipeline()
