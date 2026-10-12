"""A small in-memory sliding-window limiter for the public endpoints.

Counts are per process, which suits a single server. Behind a reverse proxy, run
uvicorn with --proxy-headers so client IPs are the visitors', not the proxy's.
"""

import threading
import time
from collections import deque

from fastapi import Request


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] > self.window:
            hits.popleft()
        return hits

    def is_blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key, time.monotonic())) >= self.limit

    def hit(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._recent(key, now).append(now)
            if len(self._hits) > 10_000:
                for stale in [k for k, hits in self._hits.items() if not hits or now - hits[-1] > self.window]:
                    del self._hits[stale]

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
