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
from src.agents.llm_agent import router as llm_router
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

# Mount the LLM Planner/Guide Agent routes
app.include_router(llm_router)

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

    # Heuristic for Live Traffic Load / Blockage Impact
    try:
        timestamp_str = event.get("timestamp") or event.get("start_datetime")
        if timestamp_str:
            hour = pd.to_datetime(timestamp_str).hour
        else:
            hour = pd.Timestamp.now().hour
    except Exception:
        hour = pd.Timestamp.now().hour

    # Higher base load during peak hours (8-11 AM, 5-9 PM)
    base_load = 75 if hour in [8, 9, 10, 17, 18, 19, 20] else 45
    # Risk score inflates the load directly
    blockage_impact = min(100.0, base_load + (float(risk_score) * 0.4))

    return {
        "event": event,
        "riskScore": round(float(risk_score), 1),
        "predictedDurationHours": round(float(predicted_duration), 2),
        "blockageImpact": round(float(blockage_impact), 1),
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
    session_events = _session["events"]
    if len(session_events) >= limit:
        return session_events[:limit]

    needed = limit - len(session_events)
    conn = get_connection()
    try:
        df = pd.read_sql_query(
            "SELECT id, latitude, longitude, event_cause, requires_road_closure, "
            "start_datetime as timestamp, corridor, priority, description, reason_breakdown "
            "FROM events WHERE latitude IS NOT NULL AND longitude IS NOT NULL "
            "ORDER BY start_datetime DESC LIMIT ?",
            conn,
            params=(needed,)
        )
    except Exception as e:
        print(f"Error querying historical events: {e}")
        df = pd.DataFrame()
    finally:
        conn.close()

    db_bundles = []
    for _, row in df.iterrows():
        event = row.to_dict()
        # Normalize types
        event["latitude"] = float(event["latitude"])
        event["longitude"] = float(event["longitude"])
        # Check if already in session_events
        if any(e.get("event", {}).get("id") == event["id"] for e in session_events):
            continue
        try:
            bundle = _build_bundle(event)
            db_bundles.append(bundle)
        except Exception as e:
            print(f"Error building bundle for event {event['id']}: {e}")

    combined = list(session_events) + db_bundles
    return combined[:limit]


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
    try:
        source = tuple(payload["source"])
        destination = tuple(payload["destination"])
        print(f"[API] Route request: {source} -> {destination}")
        bundle = orchestrator.plan_route(source, destination)
        best = bundle.get("best_route", {})
        print(f"[API] Route result: distance={best.get('distance_km')} km, geometry={'yes' if best.get('geometry') else 'NONE'}")
        try:
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
                "provider": "osrm",
            })
            mobility_store.insert_route_alternatives(route_id, bundle.get("alternatives", []))
            bundle["route_id"] = route_id
        except Exception as db_err:
            print(f"[API] Route DB insert failed (non-fatal): {db_err}")
        return bundle
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "best_route": {"distance_km": None, "duration_min": None, "eta_minutes": None, "risk_score": 0, "congestion_score": 0, "corridor": "Unknown", "geometry": None}, "alternatives": [], "schema_version": "1.0"}


@app.get("/api/nearby")
def nearby(lat: float, lon: float, categories: str = None):
    """Discovers nearby POIs (hospitals, police, fuel, etc.) around a point."""
    category_list = categories.split(",") if categories else None
    return orchestrator.find_nearby(lat, lon, category_list)


@app.get("/api/mobility/search")
def search_places(q: str):
    """Searches for locations in Bengaluru using Mappls text search/place search."""
    from src.ingestion.mappls_ingestion import get_mappls_client
    client = get_mappls_client()
    try:
        # Bias results near Bengaluru center (12.9716, 77.5946)
        return client.place_search(q, lat=12.9716, lon=77.5946)
    except Exception as e:
        print(f"Mappls place search failed: {e}")
        return []


@app.get("/api/mobility/geocode")
def geocode_place(q: str):
    """Geocodes an address query using Mappls Geocode."""
    from src.ingestion.mappls_ingestion import get_mappls_client
    client = get_mappls_client()
    try:
        return client.geocode(q)
    except Exception as e:
        print(f"Mappls geocode failed: {e}")
        return {"lat": None, "lon": None, "formatted_address": None}


@app.post("/api/recommendation")
def recommendation(payload: dict):
    """Generates a human-readable recommendation for an event payload."""
    rec = orchestrator.recommend_action(payload)
    rec_id = mobility_store.insert_mobility_recommendation(payload.get("id"), rec)
    rec["recommendation_id"] = rec_id
    return rec
