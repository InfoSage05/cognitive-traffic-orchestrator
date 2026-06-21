import sqlite3

from src.models.db import run_migrations

EXPECTED_TABLES = {
    "traffic_events", "traffic_snapshots", "poi_cache", "routes",
    "route_alternatives", "mobility_recommendations", "emergency_resources",
}


def _table_names(conn):
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}


def test_run_migrations_on_fresh_db(tmp_path):
    db_path = str(tmp_path / "fresh.db")
    conn = sqlite3.connect(db_path)
    run_migrations(conn)

    tables = _table_names(conn)
    assert EXPECTED_TABLES.issubset(tables)
    assert "schema_migrations" in tables
    conn.close()


def test_run_migrations_preserves_legacy_events_table(tmp_path):
    db_path = str(tmp_path / "legacy.db")
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE events (id TEXT, latitude REAL, longitude REAL)")
    conn.execute("INSERT INTO events VALUES ('EV1', 12.9, 77.6)")
    conn.commit()

    run_migrations(conn)

    cursor = conn.execute("SELECT COUNT(*) FROM events")
    assert cursor.fetchone()[0] == 1
    cursor = conn.execute("PRAGMA table_info(events)")
    columns = {row[1] for row in cursor.fetchall()}
    assert columns == {"id", "latitude", "longitude"}
    conn.close()


def test_run_migrations_idempotent(tmp_path):
    db_path = str(tmp_path / "idempotent.db")
    conn = sqlite3.connect(db_path)

    run_migrations(conn)
    run_migrations(conn)

    cursor = conn.execute("SELECT version, COUNT(*) FROM schema_migrations GROUP BY version")
    rows = cursor.fetchall()
    for _, count in rows:
        assert count == 1
    conn.close()
