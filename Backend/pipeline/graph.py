"""LangGraph pipeline — 4-agent sequential StateGraph.

Agent 1 (Risk Profiler) → Agent 2 (Conversion Predictor)
    → [conditional] Agent 3 (Premium Advisor) → Agent 4 (Decision Router)

Agent 3 only fires when bind_score > 60 (high-conversion quotes worth
analyzing for premium blockers). Otherwise, quotes go straight to Agent 4.
"""

from __future__ import annotations

import logging

from langgraph.graph import END, StateGraph

from Backend.agents.agent1_risk_profiler import agent1_risk_profiler
from Backend.agents.agent2_conversion_predictor import agent2_conversion_predictor
from Backend.agents.agent3_premium_advisor import agent3_premium_advisor
from Backend.agents.agent4_decision_router import agent4_decision_router
from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

PREMIUM_ADVISOR_THRESHOLD = 60


def _should_run_premium_advisor(state: QuoteState) -> str:
    """Conditional edge: route to premium advisor only for high bind scores."""
    bind_score = state.get("bind_score", 0)
    if bind_score > PREMIUM_ADVISOR_THRESHOLD:
        logger.info(
            f"Quote {state.get('quote_num')}: bind_score={bind_score} > {PREMIUM_ADVISOR_THRESHOLD}, "
            f"routing to Premium Advisor"
        )
        return "premium_advisor"

    # Skip Agent 3 — set defaults so Agent 4 has all expected fields
    state["premium_flag"] = "ACCEPTABLE"
    state["adjusted_band"] = "N/A"
    state["premium_reasoning"] = (
        f"Skipped — bind_score ({bind_score}) below threshold ({PREMIUM_ADVISOR_THRESHOLD}). "
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
