from unittest.mock import MagicMock

from src.ingestion.weather_ingestion import OpenWeatherClient


def test_current_weather_normalizes_response():
    http = MagicMock()
    http.get.return_value = {
        "weather": [{"main": "Rain"}],
        "main": {"temp": 24.5},
        "rain": {"1h": 3.2},
        "visibility": 8000,
        "wind": {"speed": 4.1},
    }
    client = OpenWeatherClient(api_key="key", http=http)

    result = client.current_weather(12.9, 77.6)

    assert result["condition"] == "Rain"
    assert result["temp_c"] == 24.5
    assert result["rain_mm_last_hour"] == 3.2
    assert result["schema_version"] == "1.0"


def test_current_weather_uses_cache_key():
    http = MagicMock()
    http.get.return_value = {"weather": [{}], "main": {}, "rain": {}, "wind": {}}
    client = OpenWeatherClient(api_key="key", http=http)

    client.current_weather(12.9, 77.6)

    _, kwargs = http.get.call_args
    assert kwargs["cache_key"] == "openweather:12.9:77.6"
