from unittest.mock import MagicMock

from src.agents.nearby_intelligence_agent import NearbyIntelligenceAgent
from src.ingestion.http_client import IngestionHTTPError
from src.models import mobility_store


def test_process_returns_cached_pois_without_calling_apis(monkeypatch):
    monkeypatch.setattr(mobility_store, "get_cached_pois", lambda *a, **k: [{"name": "Cached Hospital", "category": "hospital"}])
    upsert_calls = []
    monkeypatch.setattr(mobility_store, "upsert_poi_cache", lambda pois: upsert_calls.append(pois))
    monkeypatch.setattr(mobility_store, "upsert_emergency_resources", lambda res: None)

    mappls = MagicMock()
    osm = MagicMock()
    agent = NearbyIntelligenceAgent(mappls_client=mappls, osm_client=osm)

    result = agent.process(12.9, 77.6, categories=["hospital"])

    mappls.nearby_search.assert_not_called()
    osm.overpass_query.assert_not_called()
    assert result["pois"][0]["name"] == "Cached Hospital"
    assert result["schema_version"] == "1.0"


def test_process_falls_back_to_osm_when_mappls_empty(monkeypatch):
    monkeypatch.setattr(mobility_store, "get_cached_pois", lambda *a, **k: None)
    monkeypatch.setattr(mobility_store, "upsert_poi_cache", lambda pois: None)
    monkeypatch.setattr(mobility_store, "upsert_emergency_resources", lambda res: None)

    mappls = MagicMock()
    mappls.nearby_search.return_value = []
    osm = MagicMock()
    osm.overpass_query.return_value = [{"name": "OSM Police Station", "category": "police", "source": "osm"}]
    agent = NearbyIntelligenceAgent(mappls_client=mappls, osm_client=osm)

    result = agent.process(12.9, 77.6, categories=["police"])

    osm.overpass_query.assert_called_once()
    assert result["pois"][0]["name"] == "OSM Police Station"


def test_process_handles_mappls_error_gracefully(monkeypatch):
    monkeypatch.setattr(mobility_store, "get_cached_pois", lambda *a, **k: None)
    monkeypatch.setattr(mobility_store, "upsert_poi_cache", lambda pois: None)
    monkeypatch.setattr(mobility_store, "upsert_emergency_resources", lambda res: None)

    mappls = MagicMock()
    mappls.nearby_search.side_effect = IngestionHTTPError("boom")
    osm = MagicMock()
    osm.overpass_query.return_value = []
    agent = NearbyIntelligenceAgent(mappls_client=mappls, osm_client=osm)

    result = agent.process(12.9, 77.6, categories=["fuel"])

    assert result["pois"] == []
