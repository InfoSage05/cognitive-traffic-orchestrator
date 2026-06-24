import sqlite3

from src.ingestion.traffic_ingestion import TrafficEventSource


def _seed_events_table(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute(
        """CREATE TABLE events (
            id TEXT, latitude REAL, longitude REAL, event_cause TEXT, corridor TEXT,
            priority TEXT, requires_road_closure TEXT, start_datetime TEXT,
            resolved_datetime TEXT, description TEXT, reason_breakdown TEXT,
            extra_col_1 TEXT, extra_col_2 TEXT
        )"""
    )
    conn.execute(
        "INSERT INTO events VALUES ('EV1', 12.9, 77.6, 'waterlogging', 'Mysore Road', "
        "'High', '1', '2024-01-01 10:00:00', '2024-01-01 12:00:00', 'desc', 'reason', 'x', 'y')"
    )
    conn.execute(
        "INSERT INTO events VALUES ('EV2', 13.0, 77.5, 'accident', 'Hosur Road', "
        "'Low', 'FALSE', '2024-01-02 09:00:00', '2024-01-02 09:30:00', 'desc2', 'reason2', 'x', 'y')"
    )
    conn.commit()
    conn.close()


def test_fetch_recent_normalizes_rows(tmp_path):
    db_path = str(tmp_path / "events.db")
    _seed_events_table(db_path)
    source = TrafficEventSource(conn_factory=lambda: sqlite3.connect(db_path))

    results = source.fetch_recent(limit=10)

    assert len(results) == 2
    by_id = {r["event_id"]: r for r in results}
    assert by_id["EV1"]["requires_closure"] is True
    assert by_id["EV2"]["requires_closure"] is False
    assert by_id["EV1"]["source"] == "historical_csv"
    assert by_id["EV1"]["schema_version"] == "1.0"


def test_fetch_recent_filters_by_corridor(tmp_path):
    db_path = str(tmp_path / "events.db")
    _seed_events_table(db_path)
    source = TrafficEventSource(conn_factory=lambda: sqlite3.connect(db_path))

    results = source.fetch_recent(corridor="Mysore Road", limit=10)

    assert len(results) == 1
    assert results[0]["corridor"] == "Mysore Road"
