"""
NearbyIntelligenceAgent: discovers hospitals, police, fuel, parking,
EV chargers, metro, bus stops, pharmacies. Checks the persistent
poi_cache (mobility_store) before calling out to Mappls/OSM, since POIs
barely change -- this is the cross-restart cache, distinct from the
in-process TTLCache inside http_client used within a single run.
"""
from datetime import datetime, timezone

from src.ingestion.http_client import IngestionHTTPError
from src.ingestion.mappls_ingestion import MapplsAuthError, get_mappls_client
from src.ingestion.osm_ingestion import OSMClient
from src.models import mobility_store

DEFAULT_CATEGORIES = [
    "hospital", "police", "fuel", "parking", "ev_charging", "metro", "bus_stop", "pharmacy",
]

POI_CACHE_MAX_AGE_SECONDS = 24 * 3600


class NearbyIntelligenceAgent:
    def __init__(self, mappls_client=None, osm_client=None):
        self.mappls = mappls_client or get_mappls_client()
        self.osm = osm_client or OSMClient()

    def _fetch_category(self, lat: float, lon: float, category: str) -> list:
        cached = mobility_store.get_cached_pois(lat, lon, category, POI_CACHE_MAX_AGE_SECONDS)
        if cached is not None:
            return cached

        try:
            pois = self.mappls.nearby_search(lat, lon, [category])
        except (IngestionHTTPError, MapplsAuthError) as exc:
            print(f"[NearbyIntelligenceAgent] Mappls nearby_search failed for {category}, falling back to OSM: {exc}")
            pois = []

        if not pois:
            try:
                pois = self.osm.overpass_query(lat, lon, [category])
            except IngestionHTTPError as exc:
                print(f"[NearbyIntelligenceAgent] OSM overpass_query failed for {category}: {exc}")
                pois = []

        mobility_store.upsert_poi_cache(pois)
        return pois

    def process(self, lat: float, lon: float, categories: list = None) -> dict:
        categories = categories or DEFAULT_CATEGORIES
        pois = []
        for category in categories:
            pois.extend(self._fetch_category(lat, lon, category))

        emergency_categories = {"hospital", "police", "fuel", "pharmacy"}
        emergency_pois = [p for p in pois if p.get("category") in emergency_categories]
        if emergency_pois:
            mobility_store.upsert_emergency_resources(emergency_pois)

        return {
            "pois": pois,
            "queried_at": datetime.now(timezone.utc).isoformat(),
            "schema_version": "1.0",
        }
