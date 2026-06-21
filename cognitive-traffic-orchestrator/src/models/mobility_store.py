"""
Centralizes all reads/writes for the Phase 1 mobility tables
(poi_cache, routes, route_alternatives, traffic_snapshots,
mobility_recommendations, emergency_resources), mirroring how
src/models/db.py centralizes access to the legacy `events` table.
Follows the same connect/commit/close pattern as insert_event().
"""
import json
import uuid
from datetime import datetime, timedelta

from src.models.db import get_connection


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def upsert_poi_cache(pois: list) -> None:
    if not pois:
        return
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for poi in pois:
            poi_id = f"{poi.get('source')}:{poi.get('category')}:{poi.get('lat')}:{poi.get('lon')}:{poi.get('name')}"
            cursor.execute(
                """INSERT OR REPLACE INTO poi_cache
                   (id, source, category, lat, lon, name, distance_m, payload, fetched_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    poi_id,
                    poi.get("source"),
                    poi.get("category"),
                    poi.get("lat"),
                    poi.get("lon"),
                    poi.get("name"),
                    poi.get("distance_m"),
                    json.dumps(poi),
                    _now_iso(),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def get_cached_pois(lat: float, lon: float, category: str, max_age_seconds: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT payload, fetched_at FROM poi_cache WHERE category = ?",
            (category,),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    if not rows:
        return None

    cutoff = datetime.utcnow() - timedelta(seconds=max_age_seconds)
    fresh = []
    for payload, fetched_at in rows:
        try:
            if datetime.fromisoformat(fetched_at) < cutoff:
                continue
        except (TypeError, ValueError):
            continue
        fresh.append(json.loads(payload))
    return fresh if fresh else None


def insert_route(route: dict) -> str:
    route_id = route.get("id", f"RT{uuid.uuid4().hex[:8].upper()}")
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO routes
               (id, source_lat, source_lon, dest_lat, dest_lon, distance_km, duration_min,
                eta_minutes, risk_score, congestion_score, corridor, provider, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                route_id,
                route.get("source_lat"),
                route.get("source_lon"),
                route.get("dest_lat"),
                route.get("dest_lon"),
                route.get("distance_km"),
                route.get("duration_min"),
                route.get("eta_minutes"),
                route.get("risk_score"),
                route.get("congestion_score"),
                route.get("corridor"),
                route.get("provider"),
                _now_iso(),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return route_id


def insert_route_alternatives(route_id: str, alternatives: list) -> None:
    if not alternatives:
        return
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for rank, alt in enumerate(alternatives):
            alt_id = f"ALT{uuid.uuid4().hex[:8].upper()}"
            cursor.execute(
                """INSERT INTO route_alternatives
                   (id, route_id, distance_km, duration_min, congestion_level, rank)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    alt_id,
                    route_id,
                    alt.get("distance_km"),
                    alt.get("duration_min"),
                    alt.get("congestion_level"),
                    rank,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def insert_traffic_snapshot(snapshot: dict) -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO traffic_snapshots
               (id, corridor, route_id, congestion_level, avg_speed_kmh, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                f"SNAP{uuid.uuid4().hex[:8].upper()}",
                snapshot.get("corridor"),
                snapshot.get("route_id"),
                snapshot.get("congestion_level"),
                snapshot.get("avg_speed_kmh"),
                _now_iso(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def insert_mobility_recommendation(event_id, recommendation: dict) -> str:
    rec_id = f"REC{uuid.uuid4().hex[:8].upper()}"
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mobility_recommendations
               (id, event_id, risk_score, predicted_duration_hours, barricade_needed,
                manpower, human_summary, validation_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rec_id,
                event_id,
                recommendation.get("risk_score"),
                recommendation.get("predicted_duration_hours"),
                int(bool(recommendation.get("dispatch_recommendation", {}).get("barricade_needed", False))),
                recommendation.get("dispatch_recommendation", {}).get("manpower"),
                recommendation.get("human_summary"),
                recommendation.get("dispatch_recommendation", {}).get("validation_status"),
                _now_iso(),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return rec_id


def upsert_emergency_resources(resources: list) -> None:
    if not resources:
        return
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for res in resources:
            res_id = f"{res.get('category')}:{res.get('lat')}:{res.get('lon')}:{res.get('name')}"
            cursor.execute(
                """INSERT OR REPLACE INTO emergency_resources
                   (id, category, name, lat, lon, distance_m, source, refreshed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    res_id,
                    res.get("category"),
                    res.get("name"),
                    res.get("lat"),
                    res.get("lon"),
                    res.get("distance_m"),
                    res.get("source"),
                    _now_iso(),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def get_emergency_resources(lat: float, lon: float, radius_m: float):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT category, name, lat, lon, distance_m, source FROM emergency_resources")
        rows = cursor.fetchall()
    finally:
        conn.close()

    results = []
    for category, name, res_lat, res_lon, distance_m, source in rows:
        if res_lat is None or res_lon is None:
            continue
        approx_distance_m = ((res_lat - lat) ** 2 + (res_lon - lon) ** 2) ** 0.5 * 111_000
        if approx_distance_m <= radius_m:
            results.append({
                "category": category,
                "name": name,
                "lat": res_lat,
                "lon": res_lon,
                "distance_m": distance_m or approx_distance_m,
                "source": source,
            })
    return results
