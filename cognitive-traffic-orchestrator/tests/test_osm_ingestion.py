from unittest.mock import MagicMock

from src.ingestion.http_client import RateLimiter
from src.ingestion.osm_ingestion import OSMClient


def _client():
    http = MagicMock()
    limiter = MagicMock(spec=RateLimiter)
    return OSMClient(http=http, nominatim_limiter=limiter), http, limiter


def test_overpass_query_normalizes_pois():
    client, http, _ = _client()
    http.post.return_value = {
        "elements": [
            {"lat": 12.9, "lon": 77.6, "tags": {"name": "City Hospital", "amenity": "hospital"}},
        ]
    }

    pois = client.overpass_query(12.9, 77.6, ["hospital"])

    assert len(pois) == 1
    assert pois[0]["name"] == "City Hospital"
    assert pois[0]["source"] == "osm"
    assert pois[0]["schema_version"] == "1.0"


def test_reverse_geocode_uses_rate_limiter():
    client, http, limiter = _client()
    http.get.return_value = {"display_name": "Some Road", "address": {"suburb": "HSR"}}

    result = client.reverse_geocode(12.9, 77.6)

    limiter.acquire.assert_called_once()
    assert result["address"] == "Some Road"
    assert result["locality"] == "HSR"


def test_route_normalizes_response():
    client, http, _ = _client()
    http.get.return_value = {
        "routes": [{"distance": 4000, "duration": 300, "geometry": "xyz"}]
    }

    result = client.route((12.9, 77.6), (13.0, 77.5))

    assert result["best"]["distance_km"] == 4.0
    assert result["best"]["duration_min"] == 5.0
    assert result["best"]["congestion_level"] is None
