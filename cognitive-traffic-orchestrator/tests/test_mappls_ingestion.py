from unittest.mock import MagicMock

import pytest

from src.ingestion.mappls_ingestion import MapplsAuthError, MapplsClient


def _client():
    http = MagicMock()
    return MapplsClient(api_key="static-key-123", http=http), http


def test_geocode_sends_access_token_param():
    client, http = _client()
    http.get.return_value = {
        "copResults": {"latitude": 12.9, "longitude": 77.6, "formattedAddress": "Some Place"}
    }

    result = client.geocode("Some Place")

    _, kwargs = http.get.call_args
    assert kwargs["params"]["access_token"] == "static-key-123"
    assert result["lat"] == 12.9
    assert result["lon"] == 77.6
    assert result["formatted_address"] == "Some Place"
    assert result["schema_version"] == "1.0"


def test_missing_api_key_raises_auth_error():
    http = MagicMock()
    client = MapplsClient(api_key="", http=http)

    with pytest.raises(MapplsAuthError):
        client.geocode("Some Place")

    http.get.assert_not_called()


def test_nearby_search_sends_access_token_and_normalizes():
    client, http = _client()
    http.get.return_value = {
        "suggestedLocations": [
            {"placeName": "City Hospital", "latitude": 12.9, "longitude": 77.6, "distance": 500},
        ]
    }

    pois = client.nearby_search(12.9, 77.6, ["hospital"])

    _, kwargs = http.get.call_args
    assert kwargs["params"]["access_token"] == "static-key-123"
    assert pois[0]["name"] == "City Hospital"
    assert pois[0]["source"] == "mappls"


def test_route_normalizes_response():
    client, http = _client()
    http.get.return_value = {
        "routes": [
            {"distance": 5000, "duration": 600, "congestion": "moderate", "geometry": "abc"},
            {"distance": 6000, "duration": 700, "congestion": "low", "geometry": "def"},
        ]
    }

    result = client.route((12.9, 77.6), (13.0, 77.5))

    _, kwargs = http.get.call_args
    assert kwargs["params"]["access_token"] == "static-key-123"
    assert result["best"]["distance_km"] == 5.0
    assert result["best"]["duration_min"] == 10.0
    assert len(result["alternatives"]) == 1


def test_distance_matrix_sends_access_token():
    client, http = _client()
    http.get.return_value = {"results": {"foo": "bar"}}

    result = client.distance_matrix([(12.9, 77.6)], [(13.0, 77.5)])

    _, kwargs = http.get.call_args
    assert kwargs["params"]["access_token"] == "static-key-123"
    assert result["matrix"] == {"foo": "bar"}
