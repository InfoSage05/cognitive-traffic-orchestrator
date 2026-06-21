import sqlite3
import pandas as pd
from src.models.db import get_connection

class NearestNeighborRAG:
    """
    Nearest-Neighbor RAG approach to find closest historical matches in the SQLite database.
    """
    def __init__(self):
        pass

    def recommend(self, event_cause: str, corridor: str) -> dict:
        """
        Given a new event, find the closest historical matches in the dataset based on 'event_cause' and 'corridor'.
        Calculates recommendation parameters (manpower, barricades) based on matching records.
        """
        conn = get_connection()
        try:
            # Query historical events matching cause or corridor
            query = """
                SELECT id, event_cause, corridor, requires_road_closure, priority, description 
                FROM events 
                WHERE event_cause = ? OR corridor = ?
                LIMIT 50
            """
            df = pd.read_sql_query(query, conn, params=(event_cause, corridor))
            
            if df.empty:
                return {
                    "event_cause": event_cause,
                    "corridor": corridor,
                    "barricade_needed": False,
                    "requires_road_closure": False,
                    "manpower": 1,
                    "similar_cases": [],
                    "reasoning": "Default baseline due to empty database matches."
                }
            
            # Calculate match score
            df['match_score'] = 0
            df.loc[df['event_cause'].str.lower() == event_cause.lower(), 'match_score'] += 5
            df.loc[df['corridor'].str.lower() == corridor.lower(), 'match_score'] += 3
            
            # Sort by match score descending
            df = df.sort_values(by='match_score', ascending=False)
            top_matches = df.head(3)
            
            # Average/aggregate variables to formulate recommendation
            closure_rate = (top_matches['requires_road_closure'].astype(str).str.upper() == 'TRUE').mean()
            requires_road_closure = True if closure_rate >= 0.5 else False
            
            # Barricade needed (derived from causes and road closure status)
            causes_needing_barricades = ['water_logging', 'waterlogging', 'accident', 'tree_fall', 'construction']
            has_barricade_cause = top_matches['event_cause'].str.lower().isin(causes_needing_barricades).any()
            
            barricade_needed = True if (requires_road_closure or has_barricade_cause) else False
            
            # Manpower recommendation
            high_priority_count = (top_matches['priority'].str.lower() == 'high').sum()
            
            if requires_road_closure:
                manpower = 4
            elif high_priority_count >= 2:
                manpower = 3
            else:
                manpower = 2
                
            similar_cases = top_matches[['id', 'event_cause', 'corridor', 'priority', 'requires_road_closure']].to_dict(orient='records')
            
            return {
                "event_cause": event_cause,
                "corridor": corridor,
                "barricade_needed": barricade_needed,
                "requires_road_closure": requires_road_closure,
                "manpower": manpower,
                "similar_cases": similar_cases,
                "reasoning": f"Based on {len(similar_cases)} historical similar cases in {corridor} with cause '{event_cause}'."
            }
            
        except Exception as e:
            print(f"Error during recommendation: {e}")
            return {
                "event_cause": event_cause,
                "corridor": corridor,
                "barricade_needed": False,
                "requires_road_closure": False,
                "manpower": 2,
                "similar_cases": [],
                "reasoning": "Fallback due to calculation error."
            }
        finally:
            conn.close()

    def validate_brief(self, recommendation: dict) -> dict:
        """
        Acts as an automated judge.
        Checks if 'barricade_needed' logically matches the 'requires_road_closure' status.
        If it fails, fallback to a safe default.
        """
        barricade = recommendation.get("barricade_needed", False)
        closure = recommendation.get("requires_road_closure", False)
        
        # Validation Check: If road closure is required, barricades MUST be set to True.
        if closure and not barricade:
            print("[VERIFICATION LOOP 2] Validation Failed: Road closure is required but barricade_needed was False. Forcing barricade_needed=True.")
            recommendation["barricade_needed"] = True
            recommendation["validation_status"] = "corrected"
            recommendation["verification_message"] = "Corrected: Barricades forced because road closure is active."
        else:
            recommendation["validation_status"] = "passed"
            recommendation["verification_message"] = "Verification passed."

        return recommendation

    def retrieve_similar_events(self, event_cause: str, corridor: str = None, limit: int = 10) -> list:
        """
        Returns raw similar historical events for use by mobility_agent /
        recommendation_agent, without the barricade/manpower business-rule
        layer applied in recommend(). Does not refactor or alter recommend()
        or validate_brief().
        """
        conn = get_connection()
        try:
            if corridor:
                query = """
                    SELECT id, event_cause, corridor, requires_road_closure, priority, description
                    FROM events
                    WHERE event_cause = ? OR corridor = ?
                    LIMIT ?
                """
                df = pd.read_sql_query(query, conn, params=(event_cause, corridor, limit))
            else:
                query = """
                    SELECT id, event_cause, corridor, requires_road_closure, priority, description
                    FROM events
                    WHERE event_cause = ?
                    LIMIT ?
                """
                df = pd.read_sql_query(query, conn, params=(event_cause, limit))
            return df.to_dict(orient="records")
        except Exception as e:
            print(f"Error retrieving similar events: {e}")
            return []
        finally:
            conn.close()
