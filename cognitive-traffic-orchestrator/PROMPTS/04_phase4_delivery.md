# Phase 4: Streamlit UI & Hill-Climbing Loop

**Context:** We are building the final delivery dashboard and the Hill-Climbing logging mechanism (Loop 4).

**Tasks for Coding Agent:**
1. Write `src/app/main.py` using Streamlit.
2. Design a single-screen "Event Congestion Console" with a 3-panel layout:
   - Top/Left: A dynamic Map or Table showing the 0-100 Risk Index for active locations.
   - Top/Right: "Predictive Impact" showing LightGBM outputs (Duration, Impact).
   - Bottom/Right: "Prescriptive Dispatch" showing the RAG analog recommendations (Manpower, Barricades).
3. Connect the UI to `src/agents/core_orchestrator.py` to run live inferences.
4. Write `src/app/alert_channel.py`. Create a mock function that prints a JSON alert payload meant for police field officers.
5. **Hill-Climbing Step:** Add a button in Streamlit: "Log Operator Decision". When clicked, append the recommended action and the operator's actual chosen action to a local `feedback_log.csv` file to enable future system learning.