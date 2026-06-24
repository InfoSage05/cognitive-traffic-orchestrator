"""
Mappls (MapmyIndia) ingestion adapter: Geocoding, Reverse Geocoding,
Nearby Search, Place Search, Routing, Distance Matrix, Traffic Routing.

Auth: Mappls' current (Aug 2025+) auth model for Cloud-app static keys is a
single `access_token` query parameter appended to every request -- there is
no OAuth2 client_credentials token exchange and no separate client secret.
(The old Bearer-token/client_id+secret flow now lives on Mappls' "legacy"
docs branch and does not apply to keys issued from the Cloud app console.)
"""
import threading
from typing import Optional

from src import config
from src.ingestion.http_client import RetryableHTTPClient, TTLCache, normalize_schema_version

ATLAS_BASE = "https://atlas.mappls.com/api"
ROUTE_BASE = "https://route.mappls.com/route"


class MapplsAuthError(Exception):
    """Raised when MAPPLS_API_KEY is not configured."""


class MapplsClient:
    def __init__(self, api_key: Optional[str] = None, http: Optional[RetryableHTTPClient] = None):
        self.api_key = api_key if api_key is not None else config.MAPPLS_API_KEY
        self.http = http or RetryableHTTPClient(cache=TTLCache())

    def _auth_params(self, **extra) -> dict:
        if not self.api_key:
            raise MapplsAuthError("MAPPLS_API_KEY is not configured.")
        return {"access_token": self.api_key, **extra}

    def geocode(self, address: str) -> dict:
        result = self.http.get(
            f"{ATLAS_BASE}/places/geocode",
            params=self._auth_params(address=address),
            cache_key=f"mappls:geocode:{address}",
            cache_ttl=3600,
        )
        copy_results = result.get("copResults", {})
        return normalize_schema_version({
            "lat": copy_results.get("latitude"),
            "lon": copy_results.get("longitude"),
            "formatted_address": copy_results.get("formattedAddress"),
        })

    def reverse_geocode(self, lat: float, lon: float) -> dict:
        result = self.http.get(
            f"{ATLAS_BASE}/places/rev_geocode",
            params=self._auth_params(lat=lat, lng=lon),
            cache_key=f"mappls:rev_geocode:{lat}:{lon}",
            cache_ttl=3600,
        )
        results = result.get("results", [{}])
        first = results[0] if results else {}
        return normalize_schema_version({
            "address": first.get("formatted_address"),
            "locality": first.get("locality") or first.get("village") or first.get("subDistrict"),
        })

    def nearby_search(self, lat: float, lon: float, keywords: list, radius_m: int = 2000) -> list:
        pois = []
        for keyword in keywords:
            result = self.http.get(
                f"{ATLAS_BASE}/places/nearby/json",
                params=self._auth_params(keywords=keyword, refLocation=f"{lat},{lon}", radius=radius_m),
                cache_key=f"mappls:nearby:{lat}:{lon}:{keyword}:{radius_m}",
                cache_ttl=86400,
            )
            for item in result.get("suggestedLocations", []):
                pois.append(normalize_schema_version({
                    "name": item.get("placeName"),
                    "category": keyword,
                    "lat": item.get("latitude"),
                    "lon": item.get("longitude"),
                    "distance_m": item.get("distance"),
                    "source": "mappls",
                }))
        return pois

    def place_search(self, query: str, lat: Optional[float] = None, lon: Optional[float] = None) -> list:
        params = self._auth_params(query=query)
        if lat is not None and lon is not None:
            params["refLocation"] = f"{lat},{lon}"
        result = self.http.get(
            f"{ATLAS_BASE}/places/textsearch/json",
            params=params,
            cache_key=f"mappls:place_search:{query}:{lat}:{lon}",
            cache_ttl=3600,
        )
        return [
            normalize_schema_version({
                "name": item.get("placeName"),
                "lat": item.get("latitude"),
                "lon": item.get("longitude"),
                "source": "mappls",
            })
            for item in result.get("suggestedLocations", [])
        ]

    def route(self, src: tuple, dst: tuple, alternatives: bool = True) -> dict:
        result = self.http.get(
            f"{ROUTE_BASE}/direction/route_adv/driving/{src[1]},{src[0]};{dst[1]},{dst[0]}",
            params=self._auth_params(geometries="polyline", alternatives="true" if alternatives else "false", steps="false"),
            cache_key=f"mappls:route:{src}:{dst}:{alternatives}",
            cache_ttl=90,
        )
        routes = result.get("routes", [])
        normalized = [
            {
                "distance_km": r.get("distance", 0) / 1000.0,
                "duration_min": r.get("duration", 0) / 60.0,
                "congestion_level": r.get("congestion") or "unknown",
                "geometry": r.get("geometry"),
            }
            for r in routes
        ]
        best = normalized[0] if normalized else {}
        return normalize_schema_version({
            "best": best,
            "alternatives": normalized[1:],
        })

    def distance_matrix(self, origins: list, destinations: list) -> dict:
        origin_str = ";".join(f"{lon},{lat}" for lat, lon in origins)
        dest_str = ";".join(f"{lon},{lat}" for lat, lon in destinations)
        result = self.http.get(
            f"{ROUTE_BASE}/dm/distance_matrix/driving/{origin_str};{dest_str}",
            params=self._auth_params(),
            cache_key=f"mappls:dmatrix:{origin_str}:{dest_str}",
            cache_ttl=90,
        )
        return normalize_schema_version({"matrix": result.get("results", {})})


_client_lock = threading.Lock()
_client_singleton: Optional[MapplsClient] = None


def get_mappls_client() -> MapplsClient:
    global _client_singleton
    if _client_singleton is None:
        with _client_lock:
            if _client_singleton is None:
                _client_singleton = MapplsClient()
    return _client_singleton
