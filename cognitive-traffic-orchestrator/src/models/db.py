import sqlite3
import pandas as pd
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'traffic_orchestrator.db'))
CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'Theme_2_dataset.csv'))

def get_connection():
    return sqlite3.connect(DB_PATH)

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
