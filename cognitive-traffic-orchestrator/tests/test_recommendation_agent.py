from unittest.mock import MagicMock

from src.agents.recommendation_agent import RecommendationAgent


def _agent():
    risk_calc = MagicMock()
    risk_calc.calculate_risk_index.return_value = 75.0
    predictor = MagicMock()
    predictor.predict.return_value = 2.5
    rag = MagicMock()
    rag.recommend.return_value = {"barricade_needed": True, "manpower": 4, "requires_road_closure": True}
    rag.validate_brief.side_effect = lambda rec: {**rec, "validation_status": "passed"}

    return RecommendationAgent(risk_calc=risk_calc, predictor=predictor, rag=rag), risk_calc, predictor, rag


def test_process_builds_recommendation_without_route():
    agent, risk_calc, predictor, rag = _agent()

    result = agent.process({"corridor": "Mysore Road", "event_cause": "waterlogging"})

    assert result["risk_score"] == 75.0
    assert result["predicted_duration_hours"] == 2.5
    assert result["dispatch_recommendation"]["barricade_needed"] is True
    assert "Heavy congestion" in result["human_summary"]
    assert "route_info" not in result
    assert result["schema_version"] == "1.0"


def test_process_includes_route_info_when_mobility_agent_and_coords_present():
    mobility_agent = MagicMock()
    mobility_agent.process.return_value = {"best_route": {"eta_minutes": 22.0}}
    risk_calc = MagicMock()
    risk_calc.calculate_risk_index.return_value = 30.0
    predictor = MagicMock()
    predictor.predict.return_value = 1.0
    rag = MagicMock()
    rag.recommend.return_value = {"barricade_needed": False, "manpower": 2}
    rag.validate_brief.side_effect = lambda rec: rec

    agent = RecommendationAgent(risk_calc=risk_calc, predictor=predictor, rag=rag, mobility_agent=mobility_agent)

    result = agent.process({
        "corridor": "Hosur Road", "event_cause": "accident",
        "source": (12.9, 77.6), "destination": (13.0, 77.5),
    })

    mobility_agent.process.assert_called_once_with((12.9, 77.6), (13.0, 77.5))
    assert "route_info" in result
    assert "22 minutes" in result["human_summary"]
