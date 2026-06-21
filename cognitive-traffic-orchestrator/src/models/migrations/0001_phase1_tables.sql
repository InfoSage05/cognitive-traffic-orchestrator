-- Phase 1 mobility-intelligence tables. Additive only: CREATE TABLE IF NOT EXISTS
-- exclusively, never ALTER/DROP, and never touches the legacy `events` table.
--
-- traffic_events: normalized ingestion-side staging records, agent-facing.
-- traffic_snapshots: point-in-time corridor/route speed & congestion readings (time series),
--   distinct from traffic_events (which is per-incident, not periodic).
-- poi_cache: cross-restart cache of raw normalized POI lookups (Mappls/OSM), keyed by
--   source+category+coords, refreshed on TTL expiry by nearby_intelligence_agent.
-- emergency_resources: curated/derived subset of poi_cache materialized for
--   dispatch-relevant lookups (hospital/police/fuel) -- distinct table, not a view,
--   so it can be queried fast during an emergency-mode flow without re-filtering poi_cache.

CREATE TABLE IF NOT EXISTS traffic_events (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    lat REAL,
    lon REAL,
    cause TEXT,
    corridor TEXT,
    priority TEXT,
    requires_closure INTEGER,
    start_time TEXT,
    source TEXT,
    schema_version TEXT,
    ingested_at TEXT
);

CREATE TABLE IF NOT EXISTS traffic_snapshots (
    id TEXT PRIMARY KEY,
    corridor TEXT,
    route_id TEXT,
    congestion_level TEXT,
    avg_speed_kmh REAL,
    recorded_at TEXT
);

CREATE TABLE IF NOT EXISTS poi_cache (
    id TEXT PRIMARY KEY,
    source TEXT,
    category TEXT,
    lat REAL,
    lon REAL,
    name TEXT,
    distance_m REAL,
    payload TEXT,
    fetched_at TEXT
);

CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    source_lat REAL,
    source_lon REAL,
    dest_lat REAL,
    dest_lon REAL,
    distance_km REAL,
    duration_min REAL,
    eta_minutes REAL,
    risk_score REAL,
    congestion_score REAL,
    corridor TEXT,
    provider TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS route_alternatives (
    id TEXT PRIMARY KEY,
    route_id TEXT,
    distance_km REAL,
    duration_min REAL,
    congestion_level TEXT,
    rank INTEGER
);

CREATE TABLE IF NOT EXISTS mobility_recommendations (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    risk_score REAL,
    predicted_duration_hours REAL,
    barricade_needed INTEGER,
    manpower INTEGER,
    human_summary TEXT,
    validation_status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS emergency_resources (
    id TEXT PRIMARY KEY,
    category TEXT,
    name TEXT,
    lat REAL,
    lon REAL,
    distance_m REAL,
    source TEXT,
    refreshed_at TEXT
);
