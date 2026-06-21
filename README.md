# Cognitive Traffic Orchestrator

- `cognitive-traffic-orchestrator/` — Python pipeline (ingestion agents, risk/predictor/RAG models, SQLite warehouse), exposed via a Streamlit console (`src/app/main.py`) and a FastAPI JSON API (`src/app/api.py`). See its [README](cognitive-traffic-orchestrator/README.md).
- `frontend/` — React/Vite dashboard that consumes the FastAPI API. See its [README](frontend/README.md).
