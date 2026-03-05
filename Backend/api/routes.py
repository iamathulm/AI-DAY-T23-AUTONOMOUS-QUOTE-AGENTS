"""API routes — quote processing and SSE streaming."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from Backend.pipeline.graph import pipeline
from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for processed quotes (for demo — replace with DB in production)
processed_quotes: list[dict] = []
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


def _serialize_result(result: dict) -> dict:
    """Ensure result is JSON-serializable."""
    out = {}
    for k, v in result.items():
        if isinstance(v, (str, int, float, bool, type(None))):
            out[k] = v
        elif isinstance(v, dict):
            out[k] = {
                str(kk): (float(vv) if isinstance(vv, (int, float)) else str(vv))
                for kk, vv in v.items()
            }
        else:
            out[k] = str(v)
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
    filtered = processed_quotes
    if decision:
        filtered = [q for q in filtered if q.get("decision") == decision]
    total = len(filtered)
    page = filtered[offset : offset + limit]
    return {"total": total, "offset": offset, "limit": limit, "quotes": page}


@router.get("/stats")
async def get_stats():
    """Aggregate statistics across all processed quotes."""
    if not processed_quotes:
        return {"total": 0, "message": "No quotes processed yet"}

    total = len(processed_quotes)
    decisions = {}
    risk_tiers = {}
    bind_scores = []
    regions = {}

    for q in processed_quotes:
        d = q.get("decision", "UNKNOWN")
        decisions[d] = decisions.get(d, 0) + 1

        r = q.get("risk_tier", "UNKNOWN")
        risk_tiers[r] = risk_tiers.get(r, 0) + 1

        bs = q.get("bind_score")
        if bs is not None:
            bind_scores.append(int(bs))

        reg = q.get("region", "UNKNOWN")
        regions[reg] = regions.get(reg, 0) + 1

    return {
        "total": total,
        "decisions": decisions,
        "risk_tiers": risk_tiers,
        "avg_bind_score": round(sum(bind_scores) / len(bind_scores), 1) if bind_scores else 0,
        "regions": regions,
    }


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
    quotes = df.to_dict(orient="records")
    return {"count": len(quotes), "quotes": quotes}
