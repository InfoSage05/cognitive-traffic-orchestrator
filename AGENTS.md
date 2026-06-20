# 🤖 AGENTS.md: Cognitive Traffic Orchestrator Master Plan

## 📌 Project Overview
We are building the **Cognitive Traffic Orchestrator**, a scalable AI pipeline designed to solve unplanned traffic gridlock in Bengaluru. The system processes highly sparse, multilingual municipal data (`Theme_2_dataset.csv`) alongside simulated live CCTV feeds. 

## 🔄 The Loop Engineering Architecture
This project strictly implements LangChain's Loop Engineering principles:
1. **Event-Driven Loop (Loop 3):** An OpenVINO Edge-IoT simulator triggers the system asynchronously when anomalies (e.g., breakdowns) are detected.
2. **Core Agent Loop (Loop 1):** Interacting computing units (Imputation Agent, Spatial Agent) clean raw data, translate regional Kannada text, and resolve missing geospatial fields.
3. **Verification Loop (Loop 2):** Analytical models and RAG nearest-neighbor indices propose deployment briefs, which are validated by a deterministic grader before output.
4. **Hill-Climbing Loop (Loop 4):** Operator feedback is logged to continuously refine the RAG similarity weights.

## 📂 Codebase Structure Initialization Prompt
*Coding Agent Instructions:* Before executing any phases, strictly initialize the following directory structure and populate `requirements.txt`.

```text
cognitive-traffic-orchestrator/
├── data/
│   └── Theme_2_dataset.csv
├── PROMPTS/
├── src/
│   ├── edge/
│   │   ├── __init__.py
│   │   └── openvino_inference.py      # Simulates HF CCTV video anomaly detection
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── core_orchestrator.py       # Manages inter-agent communications
│   │   ├── imputation_agent.py        # Cleans Kannada/English text & fills NULLs
│   │   └── spatial_agent.py           # Validates clusters against corridor/zone paths
│   ├── models/
│   │   ├── __init__.py
│   │   ├── risk_index.py              # Direction 1: Spatio-temporal 0-100 Risk Score
│   │   ├── predictor.py               # Direction 2: LightGBM Duration/Impact Model
│   │   └── analogue_recommender.py    # Direction 3: Nearest-Neighbor SOP Matcher
│   └── app/
│       ├── main.py                    # Streamlit Console Hub
│       └── alert_channel.py           # Mock SMS/Mobile Push notification spoke
├── requirements.txt                   # pandas, lightgbm, scikit-learn, streamlit, langchain
└── README.md 




## 2. The Step-by-Step Prompt Folder

Create a folder named `PROMPTS/` and save the following four files inside it. You will feed these to your coding agent one at a time.

#### File: `PROMPTS/01_phase1_ingestion.md`
```markdown
# Phase 1: Event-Driven Ingestion Engine

**Context:** We need to set up the event trigger (Loop 3) that wakes up our agentic system.

**Tasks for Coding Agent:**
1. Read the `requirements.txt` and ensure all data science and UI libraries are present.
2. Write `src/edge/openvino_inference.py`. 
3. Inside this file, create a class `MockEdgePerceptionStream`.
4. The class must simulate an OpenVINO runtime analyzing a Hugging Face CCTV dataset (e.g., 'iisc-aim/BMD-45').
5. It should have a `stream_events()` generator that periodically yields a structured JSON dictionary: `{"latitude": 13.04, "longitude": 77.51, "event_cause": "vehicle_breakdown", "timestamp": "current_time"}`.
6. This payload must be pristine (no NULL values) to represent the advantage of Edge-IoT perception.