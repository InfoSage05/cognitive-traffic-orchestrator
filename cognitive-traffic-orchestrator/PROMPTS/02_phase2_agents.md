# Phase 2: Core Interacting Computing Units

**Context:** We are building the Core Agent Loop (Loop 1) to handle the chaotic, sparse data from `Theme_2_dataset.csv`.

**Tasks for Coding Agent:**
1. Write `src/agents/imputation_agent.py`. Create the `MultilingualImputationAgent` class. It must accept a dictionary (representing a row of data). It should look at the 'description' field. Write logic (using simple regex or mock translation functions) to detect local languages (like Kannada) or phrases like "Starting problem" and map them to standard 'event_cause' and 'reason_breakdown' categories, replacing NULLs.
2. Write `src/agents/spatial_agent.py`. Create the `SpatialMappingAgent` class. It should take coordinates and map them to the closest of the 22 known 'corridors' (e.g., ORR East 1, Tumkur Road), filling in missing 'corridor' fields.
3. Write `src/agents/core_orchestrator.py`. Create a `PipelineOrchestrator` that ingests raw data, passes it sequentially through the ImputationAgent then the SpatialAgent, and outputs a clean, structured payload.