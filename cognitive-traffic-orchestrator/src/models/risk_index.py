import pandas as pd
import random

class RiskIndexCalculator:
    """
    Calculates a 0-100 Spatio-temporal Risk Index.
    """
    def __init__(self, historical_data_path: str = None):
        # In a real scenario, this would load Theme_2_dataset.csv
        self.data_path = historical_data_path

    def calculate_risk_index(self, current_corridor: str) -> float:
        """
        Mock logic to aggregate historical data by (Corridor x Hour x Weekday).
        Returns a 0-100 score based on the frequency of 'High' priority 
        and 'requires_road_closure' flags.
        """
        # Mock calculation: returning a random risk score between 40 and 95
        # representing historical aggregation.
        base_risk = 50.0
        if current_corridor and "ORR" in current_corridor:
            base_risk += 20.0
        
        # Simulate High priority and road closure multipliers
        simulated_risk = base_risk + random.uniform(-10.0, 25.0)
        return min(max(simulated_risk, 0.0), 100.0)
