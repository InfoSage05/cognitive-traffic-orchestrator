import sqlite3
import pandas as pd
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'traffic_orchestrator.db'))
CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'Theme_2_dataset.csv'))
MIGRATIONS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'migrations'))

def get_connection():
    return sqlite3.connect(DB_PATH)

def run_migrations(conn):
    """Applies additive Phase 1 .sql migration files exactly once each.
    Never touches the legacy 'events' table; every migration file uses
    CREATE TABLE IF NOT EXISTS only, so re-running is always safe."""
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT)")
    cursor.execute("SELECT version FROM schema_migrations")
    applied = {row[0] for row in cursor.fetchall()}

    if not os.path.isdir(MIGRATIONS_DIR):
        return

    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if not filename.endswith('.sql') or filename in applied:
            continue
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_text = f.read()
        try:
            cursor.executescript(sql_text)
            cursor.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))",
                (filename,)
            )
            conn.commit()
            print(f"[MIGRATION] Applied {filename}")
        except Exception as e:
            conn.rollback()
            print(f"[MIGRATION] Failed to apply {filename}: {e}")
            raise

def init_db():
    """Initializes the database and loads the CSV data if not already loaded."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if table exists and has data
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
    table_exists = cursor.fetchone()
    
    if not table_exists:
        print("Initializing database table 'events' from CSV...")
        if os.path.exists(CSV_PATH):
            try:
                # Load CSV using pandas
                df = pd.read_csv(CSV_PATH, low_memory=False)
                # Normalize column names and save to SQLite
                df.to_sql('events', conn, if_exists='replace', index=False)
                print(f"Loaded {len(df)} rows into SQLite database.")
            except Exception as e:
                print(f"Error loading CSV to SQL: {e}")
        else:
            print(f"Warning: CSV file not found at {CSV_PATH}. Creating empty table schema.")
            # Create a basic schema if CSV is missing
            cursor.execute("""
                CREATE TABLE events (
                    id TEXT PRIMARY KEY,
                    event_type TEXT,
                    latitude REAL,
                    longitude REAL,
                    event_cause TEXT,
                    requires_road_closure TEXT,
                    start_datetime TEXT,
                    resolved_datetime TEXT,
                    corridor TEXT,
                    priority TEXT,
                    description TEXT,
                    reason_breakdown TEXT
                )
            """)
    run_migrations(conn)
    conn.commit()
    conn.close()

def insert_event(event: dict):
    """Inserts a new event into the database (representing simulated CCTV edge events)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    import uuid
    event_id = event.get('id', f"FKEV{uuid.uuid4().hex[:6].upper()}")
    
    cursor.execute("""
        INSERT INTO events (
            id, latitude, longitude, event_cause, requires_road_closure, 
            start_datetime, resolved_datetime, corridor, priority, description, reason_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        event.get('latitude'),
        event.get('longitude'),
        event.get('event_cause'),
        str(event.get('requires_road_closure', False)).upper(),
        event.get('timestamp') or event.get('start_datetime'),
        event.get('resolved_datetime'),
        event.get('corridor'),
        event.get('priority', 'Low'),
        event.get('description'),
        event.get('reason_breakdown')
    ))
    conn.commit()
    conn.close()
    return event_id
