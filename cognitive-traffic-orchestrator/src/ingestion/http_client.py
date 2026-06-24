"""
Shared retry/cache/rate-limit foundation for every ingestion adapter
(mappls_ingestion, osm_ingestion, weather_ingestion). No adapter should
reimplement these concerns directly.
"""
import threading
import time
from typing import Any, Optional

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

SCHEMA_VERSION = "1.0"


class IngestionHTTPError(Exception):
    """Raised when an HTTP call exhausts retries or returns a persistent 4xx/5xx."""


class _RetryableStatusError(Exception):
    """Internal signal for tenacity to retry on 5xx/429; never escapes this module."""


class TTLCache:
    """In-process, lazily-expiring cache. No background cleanup task."""

    def __init__(self, default_ttl_seconds: int = 300):
        self._default_ttl = default_ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.time() >= expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        with self._lock:
            self._store[key] = (value, time.time() + ttl)


class RateLimiter:
    """Blocking fixed-window limiter, e.g. for Nominatim's 1 req/sec policy."""

    def __init__(self, max_calls: int, period_seconds: float):
        self._max_calls = max_calls
        self._period = period_seconds
        self._lock = threading.Lock()
        self._call_times: list[float] = []

    def acquire(self) -> None:
        with self._lock:
            now = time.time()
            self._call_times = [t for t in self._call_times if now - t < self._period]
            if len(self._call_times) >= self._max_calls:
                sleep_for = self._period - (now - self._call_times[0])
                if sleep_for > 0:
                    time.sleep(sleep_for)
                now = time.time()
                self._call_times = [t for t in self._call_times if now - t < self._period]
            self._call_times.append(time.time())


def _is_retryable_status(response: requests.Response) -> bool:
    return response.status_code >= 500 or response.status_code == 429


class RetryableHTTPClient:
    """Thin wrapper around requests.Session with retry + optional TTL caching."""

    def __init__(self, cache: Optional[TTLCache] = None, rate_limiter: Optional[RateLimiter] = None):
        self._session = requests.Session()
        self._cache = cache or TTLCache()
        self._rate_limiter = rate_limiter

    @retry(
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout, _RetryableStatusError)),
        wait=wait_exponential(multiplier=1, max=30),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    def _request(self, method: str, url: str, **kwargs) -> dict:
        if self._rate_limiter is not None:
            self._rate_limiter.acquire()
        response = self._session.request(method, url, timeout=kwargs.pop("timeout", 10), **kwargs)
        if _is_retryable_status(response):
            raise _RetryableStatusError(f"Retryable HTTP {response.status_code} from {url}")
        if response.status_code >= 400:
            raise IngestionHTTPError(f"Non-retryable HTTP {response.status_code} from {url}: {response.text[:200]}")
        if not response.content:
            return {}
        return response.json()

    def get(
        self,
        url: str,
        *,
        params: Optional[dict] = None,
        headers: Optional[dict] = None,
        cache_key: Optional[str] = None,
        cache_ttl: Optional[int] = None,
        timeout: int = 10,
    ) -> dict:
        if cache_key is not None:
            cached = self._cache.get(cache_key)
            if cached is not None:
                return cached
        try:
            result = self._request("GET", url, params=params, headers=headers, timeout=timeout)
        except IngestionHTTPError:
            raise
        except (requests.ConnectionError, requests.Timeout, _RetryableStatusError) as exc:
            raise IngestionHTTPError(f"GET {url} failed after retries: {exc}") from exc
        if cache_key is not None:
            self._cache.set(cache_key, result, cache_ttl)
        return result

    def post(
        self,
        url: str,
        *,
        json: Optional[dict] = None,
        data: Optional[dict] = None,
        headers: Optional[dict] = None,
        timeout: int = 10,
    ) -> dict:
        try:
            return self._request("POST", url, json=json, data=data, headers=headers, timeout=timeout)
        except IngestionHTTPError:
            raise
        except (requests.ConnectionError, requests.Timeout, _RetryableStatusError) as exc:
            raise IngestionHTTPError(f"POST {url} failed after retries: {exc}") from exc


def normalize_schema_version(payload: dict, version: str = SCHEMA_VERSION) -> dict:
    payload["schema_version"] = version
    return payload
