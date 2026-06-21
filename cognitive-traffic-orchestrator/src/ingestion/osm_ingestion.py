"""
OSM ingestion adapter (Overpass, Nominatim, OSRM). No API key required;
serves as the fallback provider behind the same normalized contract as
mappls_ingestion, so callers can swap providers without branching.
"""
from typing import Optional

from src import config
from src.ingestion.http_client import RateLimiter, RetryableHTTPClient, TTLCache, normalize_schema_version

CATEGORY_TO_OSM_TAGS = {
    "hospital": 'amenity=hospital',
    "police": 'amenity=police',
    "fuel": 'amenity=fuel',
    "parking": 'amenity=parking',
    "ev_charging": 'amenity=charging_station',
    "metro": 'station=subway',
    "bus_stop": 'highway=bus_stop',
    "pharmacy": 'amenity=pharmacy',
}


class OSMClient:
    def __init__(self, http: Optional[RetryableHTTPClient] = None,
                 nominatim_limiter: Optional[RateLimiter] = None):
        self.http = http or RetryableHTTPClient(cache=TTLCache())
        self._nominatim_limiter = nominatim_limiter or RateLimiter(max_calls=1, period_seconds=1.0)

    def overpass_query(self, lat: float, lon: float, tags: list, radius_m: int = 2000) -> list:
        clauses = []
        for tag in tags:
            osm_tag = CATEGORY_TO_OSM_TAGS.get(tag, tag)
            clauses.append(f'node[{osm_tag}](around:{radius_m},{lat},{lon});')
        query = f"[out:json];({''.join(clauses)});out;"
        result = self.http.post(
            config.OVERPASS_API_URL,
            data={"data": query},
        )
        pois = []
        for element in result.get("elements", []):
            tags_dict = element.get("tags", {})
            pois.append(normalize_schema_version({
                "name": tags_dict.get("name", "Unnamed"),
                "category": next((k for k in tags if CATEGORY_TO_OSM_TAGS.get(k, k).split("=")[0] in tags_dict), "unknown"),
                "lat": element.get("lat"),
                "lon": element.get("lon"),
                "distance_m": None,
                "source": "osm",
            }))
        return pois

    def reverse_geocode(self, lat: float, lon: float) -> dict:
        self._nominatim_limiter.acquire()
        result = self.http.get(
            f"{config.NOMINATIM_BASE_URL}/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": config.NOMINATIM_USER_AGENT},
            cache_key=f"osm:rev_geocode:{lat}:{lon}",
            cache_ttl=3600,
        )
        return normalize_schema_version({
            "address": result.get("display_name"),
            "locality": result.get("address", {}).get("suburb") or result.get("address", {}).get("city"),
        })

    def route(self, src: tuple, dst: tuple) -> dict:
        result = self.http.get(
            f"{config.OSRM_BASE_URL}/route/v1/driving/{src[1]},{src[0]};{dst[1]},{dst[0]}",
            params={"overview": "full", "geometries": "polyline", "alternatives": "true"},
            cache_key=f"osm:route:{src}:{dst}",
            cache_ttl=90,
        )
        routes = result.get("routes", [])
        normalized = [
            {
                "distance_km": r.get("distance", 0) / 1000.0,
                "duration_min": r.get("duration", 0) / 60.0,
                "congestion_level": None,
                "geometry": r.get("geometry"),
            }
            for r in routes
        ]
        best = normalized[0] if normalized else {}
        return normalize_schema_version({
            "best": best,
            "alternatives": normalized[1:],
        })
