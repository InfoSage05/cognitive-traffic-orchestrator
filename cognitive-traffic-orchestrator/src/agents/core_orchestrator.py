from src.agents.imputation_agent import MultilingualImputationAgent
from src.agents.spatial_agent import SpatialMappingAgent

class PipelineOrchestrator:
    """
    Manages inter-agent communications and sequential data flow (Loop 1).
    """
    def __init__(self):
        self.imputer = MultilingualImputationAgent()
        self.spatial = SpatialMappingAgent()
        self._mobility = None
        self._nearby = None
        self._recommender = None
        self._shared = {}

    def process_event(self, raw_data: dict) -> dict:
        """
        Ingests raw data, passes it sequentially through the ImputationAgent
        then the SpatialAgent, and outputs a clean, structured payload.
        """
        # Step 1: Text Imputation
        imputed_data = self.imputer.process(raw_data)

        # Step 2: Spatial Resolution
        cleaned_payload = self.spatial.process(imputed_data)

        return cleaned_payload

    def wire_shared_models(self, risk_calc=None, predictor=None, rag=None) -> None:
        """
        Stashes already-loaded model singletons so the lazily-constructed
        mobility/nearby/recommendation agents reuse them instead of
        constructing (and re-loading/re-training) fresh instances.
        """
        if risk_calc is not None:
            self._shared["risk_calc"] = risk_calc
        if predictor is not None:
            self._shared["predictor"] = predictor
        if rag is not None:
            self._shared["rag"] = rag

    def plan_route(self, source: tuple, destination: tuple) -> dict:
        if self._mobility is None:
            from src.agents.mobility_agent import MobilityAgent
            self._mobility = MobilityAgent(
                risk_calc=self._shared.get("risk_calc"),
                predictor=self._shared.get("predictor"),
                spatial_agent=self.spatial,
            )
        return self._mobility.process(source, destination)

    def find_nearby(self, lat: float, lon: float, categories: list = None) -> dict:
        if self._nearby is None:
            from src.agents.nearby_intelligence_agent import NearbyIntelligenceAgent
            self._nearby = NearbyIntelligenceAgent()
        return self._nearby.process(lat, lon, categories)

    def recommend_action(self, event: dict) -> dict:
        if self._recommender is None:
            from src.agents.recommendation_agent import RecommendationAgent
            self._recommender = RecommendationAgent(
                risk_calc=self._shared.get("risk_calc"),
                predictor=self._shared.get("predictor"),
                rag=self._shared.get("rag"),
                mobility_agent=self._mobility,
            )
        return self._recommender.process(event)
