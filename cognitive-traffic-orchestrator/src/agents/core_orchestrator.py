from src.agents.imputation_agent import MultilingualImputationAgent
from src.agents.spatial_agent import SpatialMappingAgent

class PipelineOrchestrator:
    """
    Manages inter-agent communications and sequential data flow (Loop 1).
    """
    def __init__(self):
        self.imputer = MultilingualImputationAgent()
        self.spatial = SpatialMappingAgent()

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
