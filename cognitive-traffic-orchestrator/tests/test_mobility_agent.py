from unittest.mock import MagicMock

from src.agents.mobility_agent import MobilityAgent
from src.ingestion.http_client import IngestionHTTPError


def _agent(mappls_route_result=None, mappls_raises=False):
    mappls = MagicMock()
    if mappls_raises:
        mappls.route.side_effect = IngestionHTTPError("boom")
    else:
        mappls.route.return_value = mappls_route_result or {
            "best": {"distance_km": 5.0, "duration_min": 12.0, "congestion_level": "moderate"},
            "alternatives": [],
        }
    osm = MagicMock()
    osm.route.return_value = {
        "best": {"distance_km": 5.5, "duration_min": 14.0, "congestion_level": None},
        "alternatives": [],
    }
    risk_calc = MagicMock()
    risk_calc.calculate_risk_index.return_value = 40.0
    predictor = MagicMock()
    predictor.predict_eta.return_value = 15.0
    spatial = MagicMock()
    spatial.process.return_value = {"corridor": "Mysore Road"}

    return MobilityAgent(
        mappls_client=mappls, osm_client=osm, risk_calc=risk_calc, predictor=predictor, spatial_agent=spatial,
    ), mappls, osm, risk_calc, predictor


def test_process_uses_mappls_route_when_available():
    agent, mappls, osm, risk_calc, predictor = _agent()

    result = agent.process((12.9, 77.6), (13.0, 77.5))

    mappls.route.assert_called_once()
    osm.route.assert_not_called()
    assert result["best_route"]["distance_km"] == 5.0
    assert result["best_route"]["corridor"] == "Mysore Road"
    assert result["best_route"]["risk_score"] == 40.0
    assert result["best_route"]["eta_minutes"] == 15.0
    assert result["schema_version"] == "1.0"


def test_process_falls_back_to_osm_on_mappls_failure():
    agent, mappls, osm, risk_calc, predictor = _agent(mappls_raises=True)

    result = agent.process((12.9, 77.6), (13.0, 77.5))

    osm.route.assert_called_once()
    assert result["best_route"]["distance_km"] == 5.5


def test_process_falls_back_to_haversine_estimate_when_both_providers_fail():
    agent, mappls, osm, risk_calc, predictor = _agent(mappls_raises=True)
    osm.route.side_effect = IngestionHTTPError("osm also down")

    result = agent.process((12.9, 77.6), (13.0, 77.5))

    assert result["best_route"]["distance_km"] > 0
    assert result["best_route"]["congestion_score"] == 40.0  # falls back to risk_score, "unknown" not in map
