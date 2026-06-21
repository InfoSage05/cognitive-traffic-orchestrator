import time
from unittest.mock import MagicMock, patch

import pytest
import requests

from src.ingestion.http_client import IngestionHTTPError, RetryableHTTPClient, TTLCache


def test_ttl_cache_set_get():
    cache = TTLCache(default_ttl_seconds=10)
    cache.set("k", "v")
    assert cache.get("k") == "v"


def test_ttl_cache_expiry():
    cache = TTLCache(default_ttl_seconds=0)
    cache.set("k", "v", ttl_seconds=0)
    time.sleep(0.01)
    assert cache.get("k") is None


def test_ttl_cache_missing_key():
    cache = TTLCache()
    assert cache.get("nope") is None


def _mock_response(status_code=200, json_data=None, content=b"{}"):
    resp = MagicMock(spec=requests.Response)
    resp.status_code = status_code
    resp.content = content
    resp.json.return_value = json_data if json_data is not None else {}
    resp.text = "error body"
    return resp


def test_retryable_client_succeeds_first_try():
    client = RetryableHTTPClient()
    with patch.object(client._session, "request", return_value=_mock_response(200, {"ok": True})) as mock_req:
        result = client.get("http://example.com")
    assert result == {"ok": True}
    assert mock_req.call_count == 1


def test_retryable_client_retries_then_succeeds():
    client = RetryableHTTPClient()
    responses = [_mock_response(503), _mock_response(200, {"ok": True})]
    with patch.object(client._session, "request", side_effect=responses):
        with patch("time.sleep", return_value=None):
            result = client.get("http://example.com")
    assert result == {"ok": True}


def test_retryable_client_exhausts_retries_raises():
    client = RetryableHTTPClient()
    with patch.object(client._session, "request", return_value=_mock_response(503)):
        with patch("time.sleep", return_value=None):
            with pytest.raises(IngestionHTTPError):
                client.get("http://example.com")


def test_retryable_client_non_retryable_4xx_raises_immediately():
    client = RetryableHTTPClient()
    with patch.object(client._session, "request", return_value=_mock_response(404)) as mock_req:
        with pytest.raises(IngestionHTTPError):
            client.get("http://example.com")
    assert mock_req.call_count == 1


def test_get_uses_cache():
    client = RetryableHTTPClient()
    with patch.object(client._session, "request", return_value=_mock_response(200, {"v": 1})) as mock_req:
        client.get("http://example.com", cache_key="k1")
        client.get("http://example.com", cache_key="k1")
    assert mock_req.call_count == 1
