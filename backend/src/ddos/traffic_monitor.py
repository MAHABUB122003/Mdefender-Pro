import asyncio
import time
import json
from typing import Dict, List, Optional, Any

from .redis_service import RedisService
from .config import DDoSConfig
from .models import TrafficMetrics


class TrafficMonitor:
    def __init__(self, config: DDoSConfig, storage: RedisService) -> None:
        self._config = config
        self._storage = storage
        self._in_memory_requests: List[TrafficMetrics] = []
        self._in_memory_lock = asyncio.Lock()
        self._total_requests = 0
        self._total_bytes = 0
        self._total_response_time = 0.0

    @staticmethod
    def _window_key(prefix: str, identifier: str, window_seconds: int) -> str:
        return f"traffic:{prefix}:{identifier}:w{window_seconds}"

    @staticmethod
    def _stats_key(name: str) -> str:
        return f"traffic:stats:{name}"

    @staticmethod
    def _endpoint_counter_key(path: str) -> str:
        normalized = path.rstrip("/").lower() or "/"
        return f"traffic:endpoints:{normalized}:count"

    @staticmethod
    def _ip_counter_key(ip: str) -> str:
        return f"traffic:ips:{ip}:count"

    async def record(self, metrics: TrafficMetrics) -> None:
        now = metrics.timestamp or time.time()
        unique_member = f"{now}:{metrics.ip}:{id(metrics)}"

        await self._storage.add_to_sorted_set(
            "traffic:global:requests", now, unique_member
        )

        ip_key = self._window_key("ip", metrics.ip, 86400)
        await self._storage.add_to_sorted_set(ip_key, now, unique_member)

        endpoint = metrics.path.rstrip("/").lower() or "/"
        ep_key = self._window_key("endpoint", endpoint, 86400)
        await self._storage.add_to_sorted_set(ep_key, now, unique_member)

        await self._storage.increment_counter("traffic:stats:total_requests")
        await self._storage.increment_counter("traffic:stats:total_bytes", ttl=86400)

        ip_counter = self._ip_counter_key(metrics.ip)
        await self._storage.increment_counter(ip_counter, ttl=86400)

        ep_counter = self._endpoint_counter_key(endpoint)
        await self._storage.increment_counter(ep_counter, ttl=86400)

        await self._storage.set_hash(
            f"traffic:last_request:{metrics.ip}",
            {
                "path": metrics.path,
                "method": metrics.method,
                "user_agent": metrics.user_agent or "",
                "referrer": metrics.referrer or "",
                "timestamp": str(now),
            },
        )

        self._total_requests += 1
        self._total_bytes += metrics.request_size
        self._total_response_time += metrics.response_time

    async def get_request_rate(self, ip: str, window_seconds: int) -> int:
        now = time.time()
        min_score = now - window_seconds

        per_window = [1, 10, 60, 300]
        chosen = min(w for w in per_window if w >= window_seconds) if window_seconds > 0 else 1

        key = self._window_key("ip", ip, chosen)
        count = await self._storage.get_sorted_set_count(key, min_score, now)
        return count

    async def get_global_rate(self, window_seconds: int) -> int:
        now = time.time()
        min_score = now - window_seconds

        per_window = [1, 10, 60, 300]
        chosen = min(w for w in per_window if w >= window_seconds) if window_seconds > 0 else 1

        all_members = await self._storage.get_sorted_set_range(
            "traffic:global:requests", min_score, now
        )
        return len(all_members)

    async def get_endpoint_rate(self, path: str, window_seconds: int) -> int:
        now = time.time()
        min_score = now - window_seconds
        endpoint = path.rstrip("/").lower() or "/"

        per_window = [1, 10, 60, 300]
        chosen = min(w for w in per_window if w >= window_seconds) if window_seconds > 0 else 1

        key = self._window_key("endpoint", endpoint, chosen)
        count = await self._storage.get_sorted_set_count(key, min_score, now)
        return count

    async def get_stats(self) -> Dict[str, Any]:
        now = time.time()

        r1s = await self._get_rolling_count("traffic:global:requests", 1)
        r10s = await self._get_rolling_count("traffic:global:requests", 10)
        r1m = await self._get_rolling_count("traffic:global:requests", 60)
        r5m = await self._get_rolling_count("traffic:global:requests", 300)

        total_requests = await self._storage.get_counter("traffic:stats:total_requests")

        avg_response = (
            self._total_response_time / self._total_requests
            if self._total_requests > 0
            else 0.0
        )

        return {
            "requests_per_second": r1s,
            "requests_per_10s": r10s,
            "requests_per_minute": r1m,
            "requests_per_5min": r5m,
            "total_requests": total_requests,
            "total_bytes": self._total_bytes,
            "avg_response_time": round(avg_response, 4),
            "timestamp": now,
        }

    async def get_top_ips(self, limit: int = 20) -> List[Dict[str, Any]]:
        keys = await self._storage.get_keys("traffic:ips:*:count")
        ip_counts: List[Dict[str, Any]] = []

        for key in keys:
            ip = key.split("traffic:ips:")[1].rsplit(":count", 1)[0]
            count = await self._storage.get_counter(key)
            last_req = await self._storage.get_hash(f"traffic:last_request:{ip}")
            ip_counts.append(
                {
                    "ip": ip,
                    "request_count": count,
                    "last_path": last_req.get("path", ""),
                    "last_method": last_req.get("method", ""),
                    "last_user_agent": last_req.get("user_agent", ""),
                    "last_timestamp": float(last_req.get("timestamp", 0)),
                }
            )

        ip_counts.sort(key=lambda x: x["request_count"], reverse=True)
        return ip_counts[:limit]

    async def get_top_endpoints(self, limit: int = 20) -> List[Dict[str, Any]]:
        keys = await self._storage.get_keys("traffic:endpoints:*:count")
        ep_counts: List[Dict[str, Any]] = []

        for key in keys:
            endpoint = key.split("traffic:endpoints:")[1].rsplit(":count", 1)[0]
            count = await self._storage.get_counter(key)
            ep_counts.append({"endpoint": endpoint, "hit_count": count})

        ep_counts.sort(key=lambda x: x["hit_count"], reverse=True)
        return ep_counts[:limit]

    async def get_traffic_timeline(
        self, window_seconds: int = 300, bucket_size: int = 5
    ) -> List[Dict[str, Any]]:
        now = time.time()
        start = now - window_seconds
        all_members = await self._storage.get_sorted_set_range(
            "traffic:global:requests", start, now
        )

        timestamps: List[float] = []
        for member in all_members:
            try:
                ts_str = member.split(":")[0]
                timestamps.append(float(ts_str))
            except (ValueError, IndexError):
                continue

        timestamps.sort()

        buckets: Dict[int, int] = {}
        for ts in timestamps:
            bucket_start = int((ts - start) / bucket_size) * bucket_size + start
            bucket_key = int(bucket_start * 1000)
            buckets[bucket_key] = buckets.get(bucket_key, 0) + 1

        timeline: List[Dict[str, Any]] = []
        bucket_time = start
        while bucket_time < now:
            bucket_key = int(bucket_time * 1000)
            timeline.append(
                {
                    "timestamp": bucket_key,
                    "time": bucket_time,
                    "count": buckets.get(bucket_key, 0),
                }
            )
            bucket_time += bucket_size

        return timeline

    async def _get_rolling_count(self, key: str, window_seconds: int) -> int:
        now = time.time()
        min_score = now - window_seconds
        return await self._storage.get_sorted_set_count(key, min_score, now)
