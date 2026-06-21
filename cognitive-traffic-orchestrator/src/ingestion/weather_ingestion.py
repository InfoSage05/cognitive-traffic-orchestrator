"""OpenWeather ingestion adapter, used by recommendation_agent to correlate
weather conditions (e.g. rain) with traffic event causes (e.g. waterlogging)."""
from typing import Optional

from src import config
from src.ingestion.http_client import RetryableHTTPClient, TTLCache, normalize_schema_version

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


class OpenWeatherClient:
    def __init__(self, api_key: Optional[str] = None, http: Optional[RetryableHTTPClient] = None):
        self.api_key = api_key if api_key is not None else config.OPENWEATHER_API_KEY
        self.http = http or RetryableHTTPClient(cache=TTLCache())

    def current_weather(self, lat: float, lon: float) -> dict:
        result = self.http.get(
            BASE_URL,
            params={"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric"},
            cache_key=f"openweather:{lat}:{lon}",
            cache_ttl=600,
        )
        weather = (result.get("weather") or [{}])[0]
        main = result.get("main", {})
        rain = result.get("rain", {})
        wind = result.get("wind", {})
        return normalize_schema_version({
            "condition": weather.get("main"),
            "temp_c": main.get("temp"),
            "rain_mm_last_hour": rain.get("1h", 0.0),
            "visibility_m": result.get("visibility"),
            "wind_speed_ms": wind.get("speed"),
        })
