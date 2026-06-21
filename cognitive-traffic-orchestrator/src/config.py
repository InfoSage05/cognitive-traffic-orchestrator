"""
Central env/config loader for the mobility-intelligence backend.
Loads `.env` (gitignored) once at import time; every ingestion module
reads its settings from here rather than touching os.environ directly.
"""
import os

from dotenv import load_dotenv

load_dotenv()

MAPPLS_API_KEY = os.environ.get("MAPPLS_API_KEY", "")
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")

OVERPASS_API_URL = os.environ.get("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
NOMINATIM_BASE_URL = os.environ.get("NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org")
OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "https://router.project-osrm.org")
NOMINATIM_USER_AGENT = os.environ.get(
    "NOMINATIM_USER_AGENT", "cognitive-traffic-orchestrator/1.0 (replace-with-contact-info)"
)

for _name, _value in (
    ("MAPPLS_API_KEY", MAPPLS_API_KEY),
    ("OPENWEATHER_API_KEY", OPENWEATHER_API_KEY),
):
    if not _value:
        print(f"[CONFIG] WARNING: {_name} is not set. Calls requiring it will fail until .env is configured.")
