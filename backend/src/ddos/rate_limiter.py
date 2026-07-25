import asyncio
import time
from typing import Any, Dict, List, Optional

from .redis_service import RedisService
from .config import DDoSConfig, RateLimitConfig
from .models import RateLimitResult


class RateLimiter:
    def __init__(self, config: DDoSConfig, storage: RedisService) -> None:
        self._config = config
        self._storage = storage
        self._limits = config.rate_limits

    def _get_limits(self, user_type: str) -> Dict[str, int]:
        mapping = {
            "anonymous": {
                "rps": self._limits.anonymous_rps,
                "rpm": self._limits.anonymous_rpm,
                "rph": self._limits.anonymous_rph,
            },
            "authenticated": {
                "rps": self._limits.authenticated_rps,
                "rpm": self._limits.authenticated_rpm,
                "rph": self._limits.authenticated_rph,
            },
            "api_key": {
                "rps": self._limits.api_key_rps,
                "rpm": self._limits.api_key_rpm,
                "rph": self._limits.api_key_rph,
            },
            "admin": {
                "rps": self._limits.admin_rps,
                "rpm": self._limits.admin_rpm,
                "rph": self._limits.admin_rph,
            },
        }
        return mapping.get(user_type, mapping["anonymous"])

    @staticmethod
    def _sliding_window_key(ip: str, user_type: str, window_name: str) -> str:
        return f"ratelimit:{ip}:{user_type}:{window_name}"

    @staticmethod
    def _unique_member(timestamp: float, ip: str) -> str:
        return f"{timestamp}:{ip}"

    async def check_rate_limit(
        self, ip: str, user_type: str = "anonymous"
    ) -> RateLimitResult:
        now = time.time()
        limits = self._get_limits(user_type)
        worst_result: Optional[RateLimitResult] = None

        windows = [
            ("rps", 1),
            ("rpm", 60),
            ("rph", 3600),
        ]

        for window_name, window_seconds in windows:
            max_requests = limits[window_name]
            min_score = now - window_seconds
            key = self._sliding_window_key(ip, user_type, window_name)

            count = await self._storage.get_sorted_set_count(key, min_score, now)

            if count >= max_requests:
                oldest_members = await self._storage.get_sorted_set_range(
                    key, min_score, now
                )
                retry_after = 0.0
                if oldest_members:
                    try:
                        oldest_ts = float(oldest_members[0].split(":")[0])
                        retry_after = max(0.0, oldest_ts + window_seconds - now)
                    except (ValueError, IndexError):
                        retry_after = 1.0

                result = RateLimitResult(
                    allowed=False,
                    limit=max_requests,
                    remaining=0,
                    reset_at=now + retry_after,
                    retry_after=round(retry_after, 2),
                )

                if worst_result is None or result.retry_after > worst_result.retry_after:
                    worst_result = result
            else:
                remaining = max(0, max_requests - count - 1)
                reset_at = now + window_seconds

                result = RateLimitResult(
                    allowed=True,
                    limit=max_requests,
                    remaining=remaining,
                    reset_at=reset_at,
                    retry_after=0.0,
                )

                if worst_result is None or (
                    not worst_result.allowed
                    and result.retry_after > worst_result.retry_after
                ):
                    worst_result = result

        if worst_result is None:
            return RateLimitResult(
                allowed=True,
                limit=limits["rps"],
                remaining=limits["rps"] - 1,
                reset_at=now + 1,
                retry_after=0.0,
            )

        if worst_result.allowed:
            member = self._unique_member(now, ip)
            for window_name, window_seconds in windows:
                key = self._sliding_window_key(ip, user_type, window_name)
                await self._storage.add_to_sorted_set(key, now, member)

            await self._cleanup_old_entries(ip, user_type, now)

        return worst_result

    async def get_remaining(self, ip: str, user_type: str = "anonymous") -> Dict[str, Any]:
        now = time.time()
        limits = self._get_limits(user_type)

        windows = [
            ("rps", 1),
            ("rpm", 60),
            ("rph", 3600),
        ]

        result: Dict[str, Any] = {
            "ip": ip,
            "user_type": user_type,
            "windows": {},
        }

        for window_name, window_seconds in windows:
            max_requests = limits[window_name]
            min_score = now - window_seconds
            key = self._sliding_window_key(ip, user_type, window_name)

            count = await self._storage.get_sorted_set_count(key, min_score, now)
            remaining = max(0, max_requests - count)

            result["windows"][window_name] = {
                "limit": max_requests,
                "remaining": remaining,
                "used": count,
                "window_seconds": window_seconds,
                "reset_at": round(now + window_seconds, 2),
            }

        return result

    async def reset_limits(self, ip: str) -> None:
        user_types = ["anonymous", "authenticated", "api_key", "admin"]
        windows = ["rps", "rpm", "rph"]

        for user_type in user_types:
            for window in windows:
                key = self._sliding_window_key(ip, user_type, window)
                await self._storage.delete_key(key)

    async def get_all_limits(self) -> List[Dict[str, Any]]:
        all_keys = await self._storage.get_keys("ratelimit:*")

        ip_user_map: Dict[str, set] = {}
        for key in all_keys:
            parts = key.split(":")
            if len(parts) >= 3:
                ip = parts[1]
                user_type = parts[2]
                composite = f"{ip}:{user_type}"
                if composite not in ip_user_map:
                    ip_user_map[composite] = set()
                ip_user_map[composite].add(user_type)

        results: List[Dict[str, Any]] = []
        now = time.time()

        for composite, user_types_set in ip_user_map.items():
            ip = composite.split(":")[0]
            for user_type in user_types_set:
                limits = self._get_limits(user_type)
                windows = [("rps", 1), ("rpm", 60), ("rph", 3600)]

                window_details: Dict[str, Any] = {}
                for window_name, window_seconds in windows:
                    max_requests = limits[window_name]
                    min_score = now - window_seconds
                    key = self._sliding_window_key(ip, user_type, window_name)
                    count = await self._storage.get_sorted_set_count(
                        key, min_score, now
                    )
                    window_details[window_name] = {
                        "limit": max_requests,
                        "current": count,
                        "remaining": max(0, max_requests - count),
                    }

                results.append(
                    {
                        "ip": ip,
                        "user_type": user_type,
                        "windows": window_details,
                    }
                )

        return results

    async def _cleanup_old_entries(
        self, ip: str, user_type: str, now: float
    ) -> None:
        windows = [("rps", 1), ("rpm", 60), ("rph", 3600)]
        for window_name, window_seconds in windows:
            key = self._sliding_window_key(ip, user_type, window_name)
            min_score = now - window_seconds - 60
            old_members = await self._storage.get_sorted_set_range(
                key, 0, min_score
            )
            for member in old_members:
                await self._storage.remove_from_sorted_set(key, member)
