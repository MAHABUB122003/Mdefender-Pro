import asyncio
import time
import json
import hashlib

from .redis_service import RedisService
from .config import DDoSConfig


class RequestFingerprinter:
    def __init__(self):
        self.redis = RedisService()
        self.config = DDoSConfig()

    async def generate_fingerprint(self, headers: dict, user_agent: str, accept_language: str, accept_encoding: str, method: str, path: str) -> str:
        accept_header = headers.get("accept", "")
        connection_type = headers.get("connection", "")
        combined = f"{method}|{path}|{user_agent}|{accept_language}|{accept_encoding}|{accept_header}|{connection_type}"
        fp_hash = hashlib.sha256(combined.encode()).hexdigest()[:16]
        return fp_hash

    async def track_fingerprint(self, ip: str, fingerprint: str) -> bool:
        if not self.config.fingerprint.enabled:
            return False
        key = f"ddos:fp:{fingerprint}:ips"
        await self.redis.add_to_sorted_set(key, {ip: time.time()})
        if self.redis.is_connected:
            all_keys = await self.redis.get_keys(f"ddos:fp:{fingerprint}:ips")
            if all_keys:
                count = await self.redis.get_sorted_set_count(key)
                if count is None:
                    count = 0
                if self.config.fingerprint.track_across_ips and count >= self.config.fingerprint.suspicious_threshold:
                    return True
        else:
            if not hasattr(self, "_fp_ip_cache"):
                self._fp_ip_cache = {}
            if fingerprint not in self._fp_ip_cache:
                self._fp_ip_cache[fingerprint] = set()
            self._fp_ip_cache[fingerprint].add(ip)
            if len(self._fp_ip_cache[fingerprint]) >= self.config.fingerprint.suspicious_threshold:
                return True
        return False

    async def get_fingerprint_ips(self, fingerprint: str) -> list:
        key = f"ddos:fp:{fingerprint}:ips"
        if self.redis.is_connected:
            try:
                entries = await self.redis.get_sorted_set_range(key, 0, -1)
                if entries:
                    return [entry for entry in entries]
            except Exception:
                pass
        else:
            if hasattr(self, "_fp_ip_cache"):
                return list(self._fp_ip_cache.get(fingerprint, set()))
        return []

    async def get_suspicious_fingerprints(self) -> list:
        suspicious = []
        if self.redis.is_connected:
            try:
                keys = await self.redis.get_keys("ddos:fp:*:ips")
                if keys:
                    for key in keys:
                        parts = key.split(":")
                        if len(parts) >= 3:
                            fp = parts[2]
                            count = await self.redis.get_sorted_set_count(key)
                            if count is not None and count >= self.config.fingerprint.suspicious_threshold:
                                suspicious.append(fp)
            except Exception:
                pass
        else:
            if hasattr(self, "_fp_ip_cache"):
                for fp, ips in self._fp_ip_cache.items():
                    if len(ips) >= self.config.fingerprint.suspicious_threshold:
                        suspicious.append(fp)
        return suspicious

    async def is_suspicious(self, fingerprint: str) -> bool:
        key = f"ddos:fp:{fingerprint}:ips"
        if self.redis.is_connected:
            try:
                count = await self.redis.get_sorted_set_count(key)
                if count is None:
                    return False
                return count >= self.config.fingerprint.suspicious_threshold
            except Exception:
                return False
        else:
            if hasattr(self, "_fp_ip_cache"):
                ips = self._fp_ip_cache.get(fingerprint, set())
                return len(ips) >= self.config.fingerprint.suspicious_threshold
        return False

    async def get_fingerprint_stats(self, fingerprint: str) -> dict:
        key = f"ddos:fp:{fingerprint}:ips"
        stats = {
            "fingerprint": fingerprint,
            "ip_count": 0,
            "is_suspicious": False,
            "first_seen": 0,
            "last_seen": 0,
        }
        if self.redis.is_connected:
            try:
                count = await self.redis.get_sorted_set_count(key)
                if count is not None:
                    stats["ip_count"] = count
                stats["is_suspicious"] = count >= self.config.fingerprint.suspicious_threshold if count else False
                entries = await self.redis.get_sorted_set_range(key, 0, -1)
                if entries:
                    score_entries = await self.redis.get_sorted_set_range(key, 0, -1)
                    scores = []
                    for e in (score_entries or []):
                        if isinstance(e, dict) and "score" in e:
                            scores.append(e["score"])
                    if scores:
                        stats["first_seen"] = min(scores)
                        stats["last_seen"] = max(scores)
            except Exception:
                pass
        else:
            if hasattr(self, "_fp_ip_cache"):
                ips = self._fp_ip_cache.get(fingerprint, set())
                stats["ip_count"] = len(ips)
                stats["is_suspicious"] = len(ips) >= self.config.fingerprint.suspicious_threshold
        return stats
