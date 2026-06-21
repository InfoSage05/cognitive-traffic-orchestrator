"""
Thin adapter around the existing `events` table (src/models/db.py).
This is deliberately NOT a second data path: it wraps the same
get_connection()-based access the rest of the system already uses, and
isolates the legacy Theme_2_dataset.csv column quirks (mixed-type
requires_road_closure, etc.) in one place so future real traffic
sources (ASTraM, congestion/incident/signal feeds) can be swapped in
without changing this contract.
"""
from typing import Callable, Optional

import pandas as pd

from src.ingestion.http_client import normalize_schema_version
from src.models.db import get_connection


class TrafficEventSource:
    def __init__(self, conn_factory: Callable = get_connection):
        self._conn_factory = conn_factory

    def fetch_recent(self, corridor: Optional[str] = None, limit: int = 100) -> list:
        conn = self._conn_factory()
        try:
            if corridor:
                query = (
                    "SELECT id, latitude, longitude, event_cause, corridor, priority, "
                    "requires_road_closure, start_datetime FROM events WHERE corridor = ? "
                    "ORDER BY start_datetime DESC LIMIT ?"
                )
                df = pd.read_sql_query(query, conn, params=(corridor, limit))
            else:
                query = (
                    "SELECT id, latitude, longitude, event_cause, corridor, priority, "
                    "requires_road_closure, start_datetime FROM events "
                    "ORDER BY start_datetime DESC LIMIT ?"
                )
                df = pd.read_sql_query(query, conn, params=(limit,))
        finally:
            conn.close()
        return [self.normalize_row(row) for row in df.to_dict(orient="records")]

    def normalize_row(self, row: dict) -> dict:
        closure_raw = str(row.get("requires_road_closure", "")).strip().upper()
        requires_closure = closure_raw in ("1", "TRUE", "YES")
        return normalize_schema_version({
            "event_id": row.get("id"),
            "lat": row.get("latitude"),
            "lon": row.get("longitude"),
            "cause": row.get("event_cause"),
            "corridor": row.get("corridor"),
            "priority": row.get("priority"),
            "requires_closure": requires_closure,
            "start_time": row.get("start_datetime"),
            "source": "historical_csv",
        })
