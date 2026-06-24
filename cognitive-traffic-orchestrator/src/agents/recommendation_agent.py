"""
RecommendationAgent: composes RiskIndexCalculator, LightGBMPredictor,
NearestNeighborRAG, and (optionally) MobilityAgent into a human-readable
recommendation. Reuses recommend()/validate_brief() as-is, never alters them.
"""
from src.models.analogue_recommender import NearestNeighborRAG
from src.models.predictor import LightGBMPredictor
from src.models.risk_index import RiskIndexCalculator


class RecommendationAgent:
    def __init__(self, risk_calc=None, predictor=None, rag=None, mobility_agent=None):
        self.risk_calc = risk_calc or RiskIndexCalculator()
        self.predictor = predictor or LightGBMPredictor()
        self.rag = rag or NearestNeighborRAG()
        self.mobility_agent = mobility_agent

    def _build_human_summary(self, risk_score: float, duration_hours: float, rec: dict, route_info: dict = None) -> str:
        parts = []
        if risk_score >= 70:
            parts.append("Heavy congestion/risk detected.")
        elif risk_score >= 40:
            parts.append("Moderate congestion/risk detected.")
        else:
            parts.append("Low risk conditions.")

        parts.append(f"Estimated clearance time: {duration_hours:.1f} hours.")

        if rec.get("barricade_needed"):
            parts.append(f"Barricades required, dispatch {rec.get('manpower', 2)} officers.")
        else:
            parts.append(f"No barricades required, dispatch {rec.get('manpower', 2)} officers.")

        if route_info:
            best = route_info.get("best_route", {})
            if best.get("eta_minutes") is not None:
                parts.append(f"Alternative route ETA: {best['eta_minutes']:.0f} minutes.")

        return " ".join(parts)

    def process(self, event: dict) -> dict:
        corridor = event.get("corridor")
        event_cause = event.get("event_cause")

        risk_score = self.risk_calc.calculate_risk_index(corridor)
        duration_hours = self.predictor.predict(event)
        raw_rec = self.rag.recommend(event_cause, corridor)
        rec = self.rag.validate_brief(raw_rec)

        route_info = None
        source = event.get("source")
        destination = event.get("destination")
        if self.mobility_agent is not None and source and destination:
            route_info = self.mobility_agent.process(tuple(source), tuple(destination))

        human_summary = self._build_human_summary(risk_score, duration_hours, rec, route_info)

        result = {
            "risk_score": round(float(risk_score), 1),
            "predicted_duration_hours": round(float(duration_hours), 2),
            "dispatch_recommendation": rec,
            "human_summary": human_summary,
            "schema_version": "1.0",
        }
        if route_info is not None:
            result["route_info"] = route_info
        return result
