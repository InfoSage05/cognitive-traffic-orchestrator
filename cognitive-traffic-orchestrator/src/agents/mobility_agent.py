"""
MobilityAgent: source -> destination route planning.
Reuses SpatialMappingAgent for corridor resolution and RiskIndexCalculator /
LightGBMPredictor for risk/ETA -- does not reimplement either.
"""
import math

from src.agents.spatial_agent import SpatialMappingAgent
from src.ingestion.http_client import IngestionHTTPError
from src.ingestion.mappls_ingestion import MapplsAuthError, get_mappls_client
from src.ingestion.osm_ingestion import OSMClient
from src.models.predictor import LightGBMPredictor
from src.models.risk_index import RiskIndexCalculator

EARTH_RADIUS_KM = 6371.0
FALLBACK_AVG_SPEED_KMH = 30.0


def _haversine_km(src: tuple, dst: tuple) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [src[0], src[1], dst[0], dst[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


class MobilityAgent:
    def __init__(self, mappls_client=None, risk_calc=None, predictor=None, spatial_agent=None, osm_client=None):
        self.mappls = mappls_client or get_mappls_client()
        self.osm = osm_client or OSMClient()
        self.risk_calc = risk_calc or RiskIndexCalculator()
        self.predictor = predictor or LightGBMPredictor()
        self.spatial = spatial_agent or SpatialMappingAgent()

    def _resolve_corridor(self, lat: float, lon: float) -> str:
        return self.spatial.process({"latitude": lat, "longitude": lon}).get("corridor", "Unknown Corridor")

    def _route_with_fallback(self, source: tuple, destination: tuple) -> dict:
        try:
            return self.mappls.route(source, destination, alternatives=True)
        except (IngestionHTTPError, MapplsAuthError) as exc:
            print(f"[MobilityAgent] Mappls route failed, falling back to OSM: {exc}")
        try:
            return self.osm.route(source, destination)
        except IngestionHTTPError as exc:
            print(f"[MobilityAgent] OSM route also failed, using straight-line distance estimate: {exc}")
            distance_km = _haversine_km(source, destination)
            duration_min = (distance_km / FALLBACK_AVG_SPEED_KMH) * 60.0
            return {
                "best": {
                    "distance_km": distance_km,
                    "duration_min": duration_min,
                    "congestion_level": "unknown",
                    "geometry": None,
                },
                "alternatives": [],
            }

    def process(self, source: tuple, destination: tuple) -> dict:
        route_result = self._route_with_fallback(source, destination)
        best = route_result.get("best", {})
        alternatives = route_result.get("alternatives", [])

        corridor = self._resolve_corridor(*source)
        risk_score = self.risk_calc.calculate_risk_index(corridor)

        base_duration_min = best.get("duration_min", 0.0) or 0.0
        eta_minutes = self.predictor.predict_eta(base_duration_min, corridor, risk_score)

        congestion_level = best.get("congestion_level")
        congestion_score = {"low": 20.0, "moderate": 50.0, "high": 80.0}.get(
            str(congestion_level).lower(), risk_score
        )

        return {
            "best_route": {
                "distance_km": best.get("distance_km"),
                "duration_min": base_duration_min,
                "eta_minutes": eta_minutes,
                "risk_score": risk_score,
                "congestion_score": congestion_score,
                "corridor": corridor,
                "geometry": best.get("geometry"),
            },
            "alternatives": alternatives,
            "schema_version": "1.0",
        }
