import src.agents.mobility_agent as mobility_agent_module
import src.agents.nearby_intelligence_agent as nearby_agent_module
import src.agents.recommendation_agent as recommendation_agent_module
from src.agents.core_orchestrator import PipelineOrchestrator


def test_process_event_unaffected_by_new_methods():
    orchestrator = PipelineOrchestrator()

    result = orchestrator.process_event({
        "description": "accident happening",
        "latitude": 12.95,
        "longitude": 77.53,
    })

    assert result["event_cause"] == "accident"
    assert result["corridor"] == "Mysore Road"


def test_plan_route_delegates_to_mobility_agent(monkeypatch):
    class StubMobilityAgent:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def process(self, source, destination):
            return {"best_route": {"distance_km": 1.0}, "alternatives": [], "schema_version": "1.0"}

    monkeypatch.setattr(mobility_agent_module, "MobilityAgent", StubMobilityAgent)

    orchestrator = PipelineOrchestrator()
    result = orchestrator.plan_route((12.9, 77.6), (13.0, 77.5))

    assert result["best_route"]["distance_km"] == 1.0


def test_find_nearby_delegates_to_nearby_agent(monkeypatch):
    class StubNearbyAgent:
        def __init__(self, **kwargs):
            pass

        def process(self, lat, lon, categories=None):
            return {"pois": [{"name": "Test POI"}], "schema_version": "1.0"}

    monkeypatch.setattr(nearby_agent_module, "NearbyIntelligenceAgent", StubNearbyAgent)

    orchestrator = PipelineOrchestrator()
    result = orchestrator.find_nearby(12.9, 77.6)

    assert result["pois"][0]["name"] == "Test POI"


def test_recommend_action_delegates_to_recommendation_agent(monkeypatch):
    class StubRecommendationAgent:
        def __init__(self, **kwargs):
            pass

        def process(self, event):
            return {"risk_score": 50.0, "human_summary": "stub summary", "schema_version": "1.0"}

    monkeypatch.setattr(recommendation_agent_module, "RecommendationAgent", StubRecommendationAgent)

    orchestrator = PipelineOrchestrator()
    result = orchestrator.recommend_action({"corridor": "Mysore Road", "event_cause": "accident"})

    assert result["human_summary"] == "stub summary"


def test_wire_shared_models_passed_through_to_mobility_agent(monkeypatch):
    captured = {}

    class StubMobilityAgent:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def process(self, source, destination):
            return {"best_route": {}, "alternatives": [], "schema_version": "1.0"}

    monkeypatch.setattr(mobility_agent_module, "MobilityAgent", StubMobilityAgent)

    orchestrator = PipelineOrchestrator()
    sentinel_risk = object()
    sentinel_predictor = object()
    orchestrator.wire_shared_models(risk_calc=sentinel_risk, predictor=sentinel_predictor)
    orchestrator.plan_route((12.9, 77.6), (13.0, 77.5))

    assert captured["risk_calc"] is sentinel_risk
    assert captured["predictor"] is sentinel_predictor
