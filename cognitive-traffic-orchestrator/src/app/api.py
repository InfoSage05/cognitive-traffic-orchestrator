"""
FastAPI layer exposing the existing Streamlit-only pipeline (orchestrator,
risk index, predictor, RAG recommender) as JSON endpoints for the React
dashboard in ../../frontend. Streamlit's main.py is untouched and keeps
working as a separate, independent entrypoint into the same models.
"""
import os
import random
import sys

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.agents.core_orchestrator import PipelineOrchestrator
from src.app.alert_channel import send_alert_to_officers
from src.models import mobility_store
from src.models.analogue_recommender import NearestNeighborRAG
from src.models.db import get_connection, init_db, insert_event
from src.models.predictor import LightGBMPredictor
from src.models.risk_index import RiskIndexCalculator

app = FastAPI(title="Cognitive Traffic Orchestrator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
orchestrator = PipelineOrchestrator()
risk_calc = RiskIndexCalculator()
predictor = LightGBMPredictor()
rag = NearestNeighborRAG()
if predictor.model is None:
    predictor.train()
orchestrator.wire_shared_models(risk_calc=risk_calc, predictor=predictor, rag=rag)

# In-memory session state, mirroring what Streamlit kept in st.session_state.
# Resets on server restart; the historical dataset in SQLite does not.
_session: dict = {"events": [], "dispatches": []}

MOCK_LOCATIONS = [
    (13.0400041, 77.5180991),  # Peenya
    (12.9218755, 77.6451585),  # Agara/HSR
    (12.9445700, 77.5274017),  # Mysore Road
    (12.9995223, 77.6827499),  # ORR East
    (13.0127301, 77.5545135),  # Chord Road
]
MOCK_CAUSES = [
    "starting problem",
    "ಮಳೆ ನೀರು ಜಮೆಯಾಗಿದೆ (Heavy waterlogging)",
    "accident happening",
    "ಕೆಟ್ಟು ನಿಂತಿರುವ ವಾಹನ (Broken down truck)",
    "road work",
]


def _build_bundle(event: dict) -> dict:
    corridor = event.get("corridor")
    event_cause = event.get("event_cause")

    risk_score = risk_calc.calculate_risk_index(corridor)
    predicted_duration = predictor.predict(event)
    raw_recommendation = rag.recommend(event_cause, corridor)
    recommendation = rag.validate_brief(raw_recommendation)

    return {
        "event": event,
        "riskScore": round(float(risk_score), 1),
        "predictedDurationHours": round(float(predicted_duration), 2),
        "recommendation": recommendation,
    }


@app.post("/api/events/trigger")
def trigger_event():
    """Simulates an incoming OpenVINO edge event and runs it through the full pipeline."""
    lat, lon = random.choice(MOCK_LOCATIONS)
    raw_event = {
        "latitude": lat,
        "longitude": lon,
        "description": random.choice(MOCK_CAUSES),
        "timestamp": pd.Timestamp.now().isoformat(),
    }

    processed = orchestrator.process_event(raw_event)
    event_id = insert_event(processed)
    processed["id"] = event_id

    bundle = _build_bundle(processed)
    _session["events"].insert(0, bundle)
    _session["events"] = _session["events"][:50]
    return bundle


@app.get("/api/events/recent")
def recent_events(limit: int = 12):
    return _session["events"][:limit]


@app.post("/api/alerts/dispatch")
def dispatch_alert(payload: dict):
    """Sends a recommendation brief to the field-officer alert channel."""
    send_alert_to_officers(payload)
    record = {
        "target": payload.get("corridor", "Unknown corridor"),
        "channel": "Mobile push",
        "status": "delivered",
        "body": payload.get("reasoning", "Dispatch brief sent."),
        "manpower": payload.get("manpower"),
        "barricadeNeeded": payload.get("barricade_needed"),
    }
    _session["dispatches"].insert(0, record)
    _session["dispatches"] = _session["dispatches"][:50]
    return record


@app.get("/api/alerts/recent")
def recent_dispatches(limit: int = 12):
    return _session["dispatches"][:limit]


@app.get("/api/dashboard/summary")
def dashboard_summary():
    """Aggregates KPIs/charts from the historical SQLite dataset plus live session counters."""
    conn = get_connection()
    try:
        df = pd.read_sql_query(
            "SELECT event_cause, corridor, priority, requires_road_closure, "
            "start_datetime, resolved_datetime FROM events",
            conn,
        )
    finally:
        conn.close()

    total = len(df)
    cause_data, corridor_data, flow_data = [], [], []
    avg_duration_hours = None
    high_priority_pct = 0.0

    if total:
        df["priority"] = df["priority"].astype(str)
        high_priority_pct = (df["priority"].str.lower() == "high").mean() * 100

        cause_counts = df["event_cause"].astype(str).str.lower().value_counts().head(5)
        cause_data = [
            {"name": name.replace("_", " ").title(), "value": round(count / total * 100, 1)}
            for name, count in cause_counts.items()
        ]

        corridor_counts = df["corridor"].astype(str).value_counts().head(6)
        corridor_data = [{"name": name, "v": int(count)} for name, count in corridor_counts.items()]

        df["start_datetime"] = pd.to_datetime(df["start_datetime"], errors="coerce")
        df["resolved_datetime"] = pd.to_datetime(df["resolved_datetime"], errors="coerce")
        duration_hours = (df["resolved_datetime"] - df["start_datetime"]).dt.total_seconds() / 3600.0
        valid_duration = duration_hours[(duration_hours > 0) & (duration_hours < 48)]
        if not valid_duration.empty:
            avg_duration_hours = float(valid_duration.mean())

        df["hour"] = df["start_datetime"].dt.hour
        hourly = df.dropna(subset=["hour"]).groupby("hour").agg(
            congestion=("event_cause", "count"),
            risk=("priority", lambda s: (s.str.lower() == "high").mean() * 100),
        )
        flow_data = [
            {"h": f"{int(hour)}:00", "congestion": int(row.congestion), "risk": round(float(row.risk), 1)}
            for hour, row in hourly.sort_index().iterrows()
        ]

    return {
        "kpis": {
            "activeEvents": len(_session["events"]),
            "avgRiskIndex": round(float(high_priority_pct), 1),
            "predictedClearanceHours": round(avg_duration_hours, 2) if avg_duration_hours else None,
            "briefsDispatched": len(_session["dispatches"]),
        },
        "causeData": cause_data,
        "corridorData": corridor_data,
        "flowData": flow_data,
        "historicalEventCount": total,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "predictorTrained": predictor.model is not None}


@app.post("/api/mobility/route")
def plan_route(payload: dict):
    """Plans a route between source and destination: {"source": [lat, lon], "destination": [lat, lon]}."""
    source = tuple(payload["source"])
    destination = tuple(payload["destination"])
    bundle = orchestrator.plan_route(source, destination)
    best = bundle.get("best_route", {})
    route_id = mobility_store.insert_route({
        "source_lat": source[0],
        "source_lon": source[1],
        "dest_lat": destination[0],
        "dest_lon": destination[1],
        "distance_km": best.get("distance_km"),
        "duration_min": best.get("duration_min"),
        "eta_minutes": best.get("eta_minutes"),
        "risk_score": best.get("risk_score"),
        "congestion_score": best.get("congestion_score"),
        "corridor": best.get("corridor"),
        "provider": "mappls",
    })
    mobility_store.insert_route_alternatives(route_id, bundle.get("alternatives", []))
    bundle["route_id"] = route_id
    return bundle


@app.get("/api/nearby")
def nearby(lat: float, lon: float, categories: str = None):
    """Discovers nearby POIs (hospitals, police, fuel, etc.) around a point."""
    category_list = categories.split(",") if categories else None
    return orchestrator.find_nearby(lat, lon, category_list)


@app.post("/api/recommendation")
def recommendation(payload: dict):
    """Generates a human-readable recommendation for an event payload."""
    rec = orchestrator.recommend_action(payload)
    rec_id = mobility_store.insert_mobility_recommendation(payload.get("id"), rec)
    rec["recommendation_id"] = rec_id
    return rec
