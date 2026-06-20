# Phase 1: Event-Driven Ingestion Engine

**Context:** We need to set up the event trigger (Loop 3) that wakes up our agentic system.

**Tasks for Coding Agent:**
1. Read the `requirements.txt` and ensure all data science and UI libraries are present.
2. Write `src/edge/openvino_inference.py`. 
3. Inside this file, create a class `MockEdgePerceptionStream`.
4. The class must simulate an OpenVINO runtime analyzing a Hugging Face CCTV dataset (e.g., 'iisc-aim/BMD-45').
5. It should have a `stream_events()` generator that periodically yields a structured JSON dictionary: `{"latitude": 13.04, "longitude": 77.51, "event_cause": "vehicle_breakdown", "timestamp": "current_time"}`.
6. This payload must be pristine (no NULL values) to represent the advantage of Edge-IoT perception.
