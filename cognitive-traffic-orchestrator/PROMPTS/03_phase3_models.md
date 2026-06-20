# Phase 3: Analytical Matrix & Verification

**Context:** We are implementing the predictive models and the Verification Loop (Loop 2).

**Tasks for Coding Agent:**
1. Write `src/models/risk_index.py`. Implement logic to aggregate historical data by (Corridor x Hour x Weekday). Calculate a 0-100 Spatio-temporal Risk Index based on the frequency of 'High' priority and 'requires_road_closure' flags.
2. Write `src/models/predictor.py`. Implement a LightGBM regressor. Train it strictly on Nov-Feb data to predict 'duration_hours' (resolved_datetime - start_datetime) and test on Mar-Apr data. Handle missing datetimes gracefully.
3. Write `src/models/analogue_recommender.py`. Implement a Nearest-Neighbor RAG approach. Given a new event, find the closest historical matches in the dataset based on 'event_cause' and 'corridor'.
4. **Verification Step:** Inside `analogue_recommender.py`, add a `validate_brief()` function that acts as an automated judge. It must check if the recommended 'barricade_needed' flag logically matches the 'requires_road_closure' status. If it fails, fallback to a safe default.