"""API routes — quote processing and SSE streaming."""

from __future__ import annotations

import asyncio
import json
import logging
import math
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from Backend.db.supabase_store import get_quote_store
from Backend.pipeline.graph import pipeline
from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

# Load env vars before Supabase store initialization.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

router = APIRouter()

# In-memory store for processed quotes (for demo — replace with DB in production)
processed_quotes: list[dict] = []
quote_store = get_quote_store()
# Subscribers for SSE
_sse_subscribers: list[asyncio.Queue] = []


class QuoteInput(BaseModel):
    Quote_Num: str
    Agent_Type: str = "EA"
    Q_Creation_DT: str = ""
    Q_Valid_DT: str = ""
    Region: str = "A"
    HH_Vehicles: int = 1
    HH_Drivers: int = 1
    Driver_Age: int = 35
    Driving_Exp: int = 15
    Prev_Accidents: int = 0
    Prev_Citations: int = 0
    Gender: str = "Male"
    Marital_Status: str = "Single"
    Education: str = "Bachelors"
    Sal_Range: str = "> $ 25 K <= $ 40 K"
    Coverage: str = "Basic"
    Veh_Usage: str = "Commute"
    Annual_Miles_Range: str = "> 7.5 K & <= 15 K"
    Vehicl_Cost_Range: str = "<= $ 10 K"
    Re_Quote: str = "No"
    Quoted_Premium: float = 700.0
    Policy_Type: str = "Car"


class BatchInput(BaseModel):
    quotes: list[QuoteInput] = Field(..., min_length=1, max_length=500)


def _quote_to_state(q: QuoteInput) -> QuoteState:
    """Convert a QuoteInput to the pipeline's initial state."""
    raw = q.model_dump()
    return QuoteState(
        quote_num=q.Quote_Num,
        agent_type=q.Agent_Type,
        region=q.Region,
        re_quote=q.Re_Quote == "Yes",
        quoted_premium=q.Quoted_Premium,
        coverage=q.Coverage,
        sal_range=q.Sal_Range,
        vehicl_cost_range=q.Vehicl_Cost_Range,
        veh_usage=q.Veh_Usage,
        annual_miles_range=q.Annual_Miles_Range,
        raw_features=raw,
    )


def _serialize_value(v: Any) -> Any:
    """Recursively convert a value to a JSON-safe Python type."""
    if v is None or isinstance(v, (bool, str)):
        return v

    # Normalize NaN/Inf-ish scalar values to JSON null.
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass

    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        fv = float(v)
        return fv if math.isfinite(fv) else None
    if isinstance(v, (int, float)):
        if isinstance(v, float) and not math.isfinite(v):
            return None
        return v
    if isinstance(v, np.ndarray):
        return _serialize_value(v.tolist())
    if isinstance(v, dict):
        return {str(k): _serialize_value(vv) for k, vv in v.items()}
    if isinstance(v, (list, tuple)):
        return [_serialize_value(item) for item in v]
    return str(v)


def _serialize_result(result: dict) -> dict:
    """Ensure result is JSON-serializable, including nested lists/dicts."""
    out = {k: _serialize_value(v) for k, v in result.items()}
    out.setdefault("timestamp", datetime.utcnow().isoformat() + "Z")
    return out


async def _notify_subscribers(data: dict):
    """Push a processed quote to all SSE subscribers."""
    for q in _sse_subscribers:
        await q.put(data)


@router.post("/process-quote")
async def process_quote(quote: QuoteInput):
    """Process a single quote through the 4-agent pipeline."""
    try:
        state = _quote_to_state(quote)
        result = pipeline.invoke(state)
        serialized = _serialize_result(result)
        processed_quotes.append(serialized)
        if quote_store.enabled:
            try:
                quote_store.insert_quote(serialized)
            except Exception as db_err:
                logger.warning(f"Supabase insert failed for {quote.Quote_Num}: {db_err}")
        await _notify_subscribers(serialized)
        return serialized
    except Exception as e:
        logger.exception(f"Pipeline error for {quote.Quote_Num}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-batch")
async def process_batch(batch: BatchInput):
    """Process multiple quotes sequentially, streaming results via SSE."""
    results = []
    for q in batch.quotes:
        try:
            state = _quote_to_state(q)
            result = pipeline.invoke(state)
            serialized = _serialize_result(result)
            processed_quotes.append(serialized)
            if quote_store.enabled:
                try:
                    quote_store.insert_quote(serialized)
                except Exception as db_err:
                    logger.warning(f"Supabase insert failed for {q.Quote_Num}: {db_err}")
            await _notify_subscribers(serialized)
            results.append(serialized)
        except Exception as e:
            logger.error(f"Pipeline error for {q.Quote_Num}: {e}")
            results.append({"quote_num": q.Quote_Num, "error": str(e)})
    return {"processed": len(results), "results": results}


@router.get("/stream")
async def stream_quotes():
    """SSE endpoint — pushes each processed quote to connected clients in real time."""
    queue: asyncio.Queue = asyncio.Queue()
    _sse_subscribers.append(queue)

    async def event_generator():
        try:
            while True:
                data = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'keepalive': True})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            _sse_subscribers.remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/quotes")
async def get_quotes(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    decision: str | None = Query(None),
):
    """Get processed quotes with optional filtering."""
    if quote_store.enabled:
        try:
            total, quotes = quote_store.list_quotes(
                limit=limit,
                offset=offset,
                decision=decision,
            )
            return {
                "total": total,
                "offset": offset,
                "limit": limit,
                "quotes": quotes,
            }
        except Exception as e:
            logger.warning(f"Supabase read failed for /quotes, falling back to memory: {e}")

    filtered = processed_quotes
    if decision:
        filtered = [q for q in filtered if q.get("decision") == decision]
    total = len(filtered)
    page = filtered[offset : offset + limit]
    return {"total": total, "offset": offset, "limit": limit, "quotes": page}


@router.get("/stats")
async def get_stats():
    """Aggregate statistics matching the frontend StatsOverview interface."""
    source_quotes = processed_quotes
    if quote_store.enabled:
        try:
            source_quotes = quote_store.list_quotes_for_analytics(max_rows=5000)
        except Exception as e:
            logger.warning(f"Supabase read failed for /stats, falling back to memory: {e}")

    if not source_quotes:
        return {
            "total_quotes": 0,
            "bind_rate": 0,
            "auto_approve_pct": 0,
            "agent_followup_pct": 0,
            "escalation_pct": 0,
            "risk_distribution": [],
            "decision_distribution": [],
            "bind_score_histogram": [],
        }

    total = len(source_quotes)
    decisions: dict[str, int] = {}
    risk_tiers: dict[str, int] = {}
    bind_scores: list[int] = []

    for q in source_quotes:
        d = q.get("decision", "UNKNOWN")
        decisions[d] = decisions.get(d, 0) + 1

        r = q.get("risk_tier", "UNKNOWN")
        risk_tiers[r] = risk_tiers.get(r, 0) + 1

        bs = q.get("bind_score")
        if bs is not None:
            bind_scores.append(int(bs))

    auto_approve = decisions.get("AUTO_APPROVE", 0)
    followup = decisions.get("AGENT_FOLLOWUP", 0)
    escalate = decisions.get("ESCALATE_UNDERWRITER", 0)

    # Bind rate: % of quotes with bind_score >= 50
    bound = sum(1 for s in bind_scores if s >= 50)
    bind_rate = round(bound / total * 100, 1) if total else 0

    # Histogram (0-10, 11-20, … 91-100)
    ranges = [
        "0-10", "11-20", "21-30", "31-40", "41-50",
        "51-60", "61-70", "71-80", "81-90", "91-100",
    ]
    histogram = {r: 0 for r in ranges}
    for s in bind_scores:
        idx = min(max(0, (s - 1) // 10), 9)
        if s == 0:
            idx = 0
        histogram[ranges[idx]] += 1

    return {
        "total_quotes": total,
        "bind_rate": bind_rate,
        "auto_approve_pct": round(auto_approve / total * 100, 1),
        "agent_followup_pct": round(followup / total * 100, 1),
        "escalation_pct": round(escalate / total * 100, 1),
        "risk_distribution": [
            {"tier": tier, "count": count}
            for tier, count in risk_tiers.items()
            if tier in ("LOW", "MEDIUM", "HIGH")
        ],
        "decision_distribution": [
            {"decision": d, "count": c}
            for d, c in decisions.items()
        ],
        "bind_score_histogram": [
            {"range": r, "count": histogram[r]} for r in ranges
        ],
    }


@router.get("/regional-stats")
async def get_regional_stats():
    """Per-region performance, bind rates (EA vs IA), and dynamic thresholds."""
    source_quotes = processed_quotes
    if quote_store.enabled:
        try:
            source_quotes = quote_store.list_quotes_for_analytics(max_rows=5000)
        except Exception as e:
            logger.warning(f"Supabase read failed for /regional-stats, falling back to memory: {e}")

    if not source_quotes:
        return {"regions": []}

    regions_data: dict[str, dict] = {}
    for q in source_quotes:
        reg = q.get("region", "UNKNOWN")
        if reg not in regions_data:
            regions_data[reg] = {"ea_scores": [], "ia_scores": [], "escalated": 0, "total": 0}
        rd = regions_data[reg]
        rd["total"] += 1
        bs = int(q.get("bind_score", 0))
        at = q.get("agent_type", q.get("raw_features", {}).get("Agent_Type", "EA"))
        if at == "EA":
            rd["ea_scores"].append(bs)
        else:
            rd["ia_scores"].append(bs)
        if q.get("decision") == "ESCALATE_UNDERWRITER":
            rd["escalated"] += 1

    result = []
    for reg, rd in regions_data.items():
        total = rd["total"]
        all_scores = rd["ea_scores"] + rd["ia_scores"]
        avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0
        bound = sum(1 for s in all_scores if s >= 50)
        bind_rate = round(bound / total * 100, 1) if total else 0
        ea_bound = sum(1 for s in rd["ea_scores"] if s >= 50)
        ea_rate = round(ea_bound / len(rd["ea_scores"]) * 100, 1) if rd["ea_scores"] else 0
        ia_bound = sum(1 for s in rd["ia_scores"] if s >= 50)
        ia_rate = round(ia_bound / len(rd["ia_scores"]) * 100, 1) if rd["ia_scores"] else 0
        esc_rate = round(rd["escalated"] / total * 100, 1) if total else 0
        dynamic = max(50, min(90, 70 + int((avg_score - 50) * 0.4)))
        result.append({
            "region": reg,
            "total_quotes": total,
            "bind_rate": bind_rate,
            "ea_bind_rate": ea_rate,
            "ia_bind_rate": ia_rate,
            "avg_bind_score": avg_score,
            "escalation_rate": esc_rate,
            "dynamic_threshold": dynamic,
        })
    return {"regions": result}


@router.get("/sample-quotes")
async def sample_quotes(n: int = Query(10, ge=1, le=100)):
    """Load N random quotes from the dataset for demo processing."""
    csv_path = (
        __import__("pathlib").Path(__file__).resolve().parent.parent.parent
        / "ML"
        / "datasets"
        / "insurance_quotes.csv"
    )
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = pd.read_csv(csv_path).sample(n=n, random_state=None)
    raw_quotes = df.to_dict(orient="records")
    quotes = [_serialize_value(q) for q in raw_quotes]
    return {"count": len(quotes), "quotes": quotes}
