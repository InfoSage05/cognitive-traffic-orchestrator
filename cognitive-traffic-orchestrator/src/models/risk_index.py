import sqlite3
import pandas as pd
from datetime import datetime
import numpy as np
from src.models.db import get_connection

class RiskIndexCalculator:
    """
    Calculates an actual 0-100 Spatio-temporal Risk Index based on SQLite historical data.
    """
    def __init__(self, historical_data_path: str = None):
        pass

    def calculate_risk_index(self, current_corridor: str) -> float:
        """
        Aggregate historical data by (Corridor x Hour x Weekday).
        Calculate a 0-100 score based on the frequency of 'High' priority 
        and 'requires_road_closure' flags.
        """
        if not current_corridor or current_corridor == "Unknown Corridor":
            return 30.0 # Return baseline risk for unknown locations
            
        conn = get_connection()
        try:
            # Get current hour and weekday
            now = datetime.now()
            current_hour = now.hour
            current_weekday = now.weekday() # Monday=0, Sunday=6
            
            # Query historical events on the same corridor
            query = "SELECT start_datetime, priority, requires_road_closure FROM events WHERE corridor = ?"
            df = pd.read_sql_query(query, conn, params=(current_corridor,))
            
            if df.empty:
                return 40.0 # Return a moderate risk index if there's no data for the corridor
            
            # Parse start_datetime to datetime
            df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
            df = df.dropna(subset=['start_datetime'])
            
            # Extract hour and weekday
            df['hour'] = df['start_datetime'].dt.hour
            df['weekday'] = df['start_datetime'].dt.weekday
            
            # Filter for similar times (e.g. +/- 2 hours and same type of day: weekday vs weekend)
            is_weekend = 1 if current_weekday >= 5 else 0
            df['is_weekend'] = df['weekday'].apply(lambda w: 1 if w >= 5 else 0)
            
            time_block_df = df[
                (df['hour'].between(current_hour - 2, current_hour + 2)) & 
                (df['is_weekend'] == is_weekend)
            ]
            
            if time_block_df.empty:
                time_block_df = df # Fallback to all corridor events if block is empty
                
            # Calculation:
            total_events = len(time_block_df)
            high_priority_events = len(time_block_df[time_block_df['priority'].str.lower() == 'high'])
            closure_events = len(time_block_df[time_block_df['requires_road_closure'].astype(str).str.upper() == 'TRUE'])
            
            # Severity mapping: High priority = weight 1.5, Road closure = weight 2.0
            severe_score = (high_priority_events * 1.5 + closure_events * 2.0)
            max_possible_severe = total_events * 3.5 if total_events > 0 else 1.0
            
            ratio = severe_score / max_possible_severe if total_events > 0 else 0.0
            
            # Volume factor (log scale, caps at 50 events)
            volume_factor = min(np.log1p(total_events) / np.log1p(50), 1.0)
            
            # Risk score is a blend of severity ratio and historical volume factor
            risk_score = (ratio * 60.0) + (volume_factor * 40.0)
            
            return min(max(risk_score, 10.0), 100.0)
            
        except Exception as e:
            print(f"Error calculating risk index: {e}")
            return 50.0
        finally:
            conn.close()

    def calculate_route_risk(self, corridors: list, weights: list = None) -> dict:
        """
        Aggregates calculate_risk_index() across the corridors a route passes
        through, for use by MobilityAgent. Does not modify calculate_risk_index.
        """
        if not corridors:
            return {"overall_risk": 30.0, "per_corridor": {}, "schema_version": "1.0"}

        if weights is None:
            weights = [1.0] * len(corridors)

        per_corridor = {}
        weighted_sum = 0.0
        weight_total = 0.0
        for corridor, weight in zip(corridors, weights):
            score = self.calculate_risk_index(corridor)
            per_corridor[corridor] = score
            weighted_sum += score * weight
            weight_total += weight

        overall_risk = weighted_sum / weight_total if weight_total > 0 else 30.0
        return {
            "overall_risk": round(overall_risk, 1),
            "per_corridor": per_corridor,
            "schema_version": "1.0",
        }
