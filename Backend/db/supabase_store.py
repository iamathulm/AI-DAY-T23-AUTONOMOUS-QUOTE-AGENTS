"""Supabase quote persistence (optional, no-auth server-side integration)."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class SupabaseQuoteStore:
    """Thin storage wrapper around Supabase table `quote_runs`."""

    def __init__(self):
        self._client = None
        self.enabled = False

        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        )

        if not url or not key:
            logger.info("Supabase disabled: missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_*_KEY")
            return

        try:
            from supabase import create_client

            self._client = create_client(url, key)
            self.enabled = True
            logger.info("Supabase enabled for quote_runs persistence")
        except Exception as e:
            logger.warning(f"Supabase disabled: client init failed ({e})")
            self._client = None
            self.enabled = False

    def insert_quote(self, quote: dict[str, Any]) -> None:
        if not self.enabled or self._client is None:
            return

        row = {
            "quote_num": quote.get("quote_num"),
            "decision": quote.get("decision"),
            "risk_tier": quote.get("risk_tier"),
            "bind_score": quote.get("bind_score"),
            "agent_type": quote.get("agent_type")
            or quote.get("raw_features", {}).get("Agent_Type"),
            "region": quote.get("region") or quote.get("raw_features", {}).get("Region"),
            "payload": quote,
            "created_at": quote.get("timestamp"),
        }

        self._client.table("quote_runs").insert(row).execute()

    def list_quotes(
        self,
        *,
        limit: int,
        offset: int,
        decision: str | None = None,
    ) -> tuple[int, list[dict[str, Any]]]:
        if not self.enabled or self._client is None:
            return 0, []

        count_query = self._client.table("quote_runs").select("id", count="exact", head=True)
        if decision:
            count_query = count_query.eq("decision", decision)
        count_resp = count_query.execute()
        total = int(getattr(count_resp, "count", 0) or 0)

        data_query = (
            self._client.table("quote_runs")
            .select("payload")
            .order("created_at", desc=True)
            .range(offset, max(offset, offset + limit - 1))
        )
        if decision:
            data_query = data_query.eq("decision", decision)

        data_resp = data_query.execute()
        rows = getattr(data_resp, "data", []) or []
        quotes = [r.get("payload", {}) for r in rows if isinstance(r, dict)]
        return total, quotes

    def list_quotes_for_analytics(self, *, max_rows: int = 5000) -> list[dict[str, Any]]:
        if not self.enabled or self._client is None:
            return []

        resp = (
            self._client.table("quote_runs")
            .select("payload")
            .order("created_at", desc=True)
            .limit(max_rows)
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return [r.get("payload", {}) for r in rows if isinstance(r, dict)]


_STORE: SupabaseQuoteStore | None = None


def get_quote_store() -> SupabaseQuoteStore:
    global _STORE
    if _STORE is None:
        _STORE = SupabaseQuoteStore()
    return _STORE
