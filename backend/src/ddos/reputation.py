import time
import json
from typing import List, Optional

from .redis_service import RedisService
from .config import DDoSConfig
from .models import IPReputation


class ReputationEngine:
    def __init__(self, redis_service: RedisService = None, config: DDoSConfig = None) -> None:
        self.redis = redis_service or RedisService()
        self.config = config or DDoSConfig()
        self._cache = {}

    async def get_reputation(self, ip: str) -> dict:
        key = f"rep:{ip}"
        try:
            data = await self.redis.get_hash(key)
            if data:
                return {
                    "ip": data.get("ip", ip),
                    "score": float(data.get("score", 0.0)),
                    "total_requests": int(data.get("total_requests", 0)),
                    "blocked_requests": int(data.get("blocked_requests", 0)),
                    "failed_logins": int(data.get("failed_logins", 0)),
                    "not_found_count": int(data.get("not_found_count", 0)),
                    "suspicious_ua_count": int(data.get("suspicious_ua_count", 0)),
                    "first_seen": float(data.get("first_seen", 0.0)),
                    "last_seen": float(data.get("last_seen", 0.0)),
                    "block_level": int(data.get("block_level", 0)),
                    "block_expires": float(data.get("block_expires", 0.0)),
                    "country": data.get("country", ""),
                    "asn": data.get("asn", ""),
                    "tags": json.loads(data.get("tags", "[]")),
                }
        except Exception:
            pass

        if ip in self._cache:
            return self._cache[ip].copy()

        return {
            "ip": ip,
            "score": self.config.reputation.initial_score,
            "total_requests": 0,
            "blocked_requests": 0,
            "failed_logins": 0,
            "not_found_count": 0,
            "suspicious_ua_count": 0,
            "first_seen": 0.0,
            "last_seen": 0.0,
            "block_level": 0,
            "block_expires": 0.0,
            "country": "",
            "asn": "",
            "tags": [],
        }

    async def record_violation(
        self, ip: str, violation_type: str, penalty: float = None
    ) -> None:
        rep = await self.get_reputation(ip)
        rc = self.config.reputation

        penalty_map = {
            "excess_requests": rc.excess_request_penalty,
            "invalid_request": rc.invalid_request_penalty,
            "not_found": rc.not_found_penalty,
            "login_failure": rc.login_failure_penalty,
            "suspicious_ua": rc.suspicious_ua_penalty,
        }

        applied_penalty = penalty if penalty is not None else penalty_map.get(
            violation_type, rc.excess_request_penalty
        )

        rep["score"] = min(rep["score"] + applied_penalty, rc.max_score)
        rep["total_requests"] += 1
        rep["last_seen"] = time.time()

        if rep["first_seen"] == 0.0:
            rep["first_seen"] = rep["last_seen"]

        count_field_map = {
            "not_found": "not_found_count",
            "login_failure": "failed_logins",
            "suspicious_ua": "suspicious_ua_count",
        }
        field = count_field_map.get(violation_type)
        if field:
            rep[field] += 1

        if violation_type in ("invalid_request",):
            rep["blocked_requests"] += 1

        tags = rep.get("tags", [])
        if violation_type not in tags:
            tags.append(violation_type)
            rep["tags"] = tags

        mapping = {
            "ip": rep["ip"],
            "score": str(rep["score"]),
            "total_requests": str(rep["total_requests"]),
            "blocked_requests": str(rep["blocked_requests"]),
            "failed_logins": str(rep["failed_logins"]),
            "not_found_count": str(rep["not_found_count"]),
            "suspicious_ua_count": str(rep["suspicious_ua_count"]),
            "first_seen": str(rep["first_seen"]),
            "last_seen": str(rep["last_seen"]),
            "block_level": str(rep["block_level"]),
            "block_expires": str(rep["block_expires"]),
            "country": rep["country"],
            "asn": rep["asn"],
            "tags": json.dumps(rep["tags"]),
        }

        key = f"rep:{ip}"
        try:
            await self.redis.set_hash(key, mapping)
        except Exception:
            pass

        self._cache[ip] = rep.copy()

        if rep["score"] >= rc.block_threshold and rep["block_level"] == 0:
            await self.set_block_level(ip, 2, rc.progressive.level2_duration)

    async def decay_scores(self) -> None:
        rc = self.config.reputation
        keys = await self.redis.get_keys("rep:*")

        for key in keys:
            if not key.startswith("rep:"):
                continue

            data = await self.redis.get_hash(key)
            if not data:
                continue

            score = float(data.get("score", 0.0))
            new_score = max(score - rc.decay_rate, 0.0)

            mapping = {"score": str(new_score)}
            await self.redis.set_hash(key, mapping)

            ip = key[4:]
            if ip in self._cache:
                self._cache[ip]["score"] = new_score

    async def should_block(self, ip: str) -> bool:
        rep = await self.get_reputation(ip)
        return rep["score"] >= self.config.reputation.block_threshold

    async def get_block_level(self, ip: str) -> int:
        rep = await self.get_reputation(ip)
        score = rep["score"]

        if score >= 90:
            return 5
        elif score >= 80:
            return 4
        elif score >= 60:
            return 3
        elif score >= 40:
            return 2
        elif score >= 20:
            return 1
        return 0

    async def set_block_level(
        self, ip: str, level: int, duration: int = 0
    ) -> None:
        rep = await self.get_reputation(ip)

        if duration == 0:
            pc = self.config.progressive
            duration_map = {
                1: int(pc.level1_delay * 60),
                2: pc.level2_duration,
                3: pc.level3_duration,
                4: pc.level4_duration,
                5: 86400 * 365,
            }
            duration = duration_map.get(level, pc.level2_duration)

        rep["block_level"] = level
        rep["block_expires"] = time.time() + duration if duration > 0 else 0.0

        mapping = {
            "block_level": str(rep["block_level"]),
            "block_expires": str(rep["block_expires"]),
        }

        key = f"rep:{ip}"
        try:
            await self.redis.set_hash(key, mapping)
        except Exception:
            pass

        self._cache[ip] = rep.copy()

    async def is_blocked(self, ip: str) -> bool:
        rep = await self.get_reputation(ip)

        if rep["block_level"] <= 0:
            return False

        if rep["block_expires"] > 0 and time.time() > rep["block_expires"]:
            await self.set_block_level(ip, 0, 0)
            return False

        return rep["block_level"] > 0

    async def unblock_ip(self, ip: str) -> None:
        rep = await self.get_reputation(ip)

        rep["block_level"] = 0
        rep["block_expires"] = 0.0
        rep["score"] = max(rep["score"] * 0.5, 0.0)

        mapping = {
            "block_level": "0",
            "block_expires": "0.0",
            "score": str(rep["score"]),
        }

        key = f"rep:{ip}"
        try:
            await self.redis.set_hash(key, mapping)
        except Exception:
            pass

        self._cache[ip] = rep.copy()

    async def get_top_offenders(self, limit: int = 20) -> List[dict]:
        all_reps = await self.get_all_reputations()
        all_reps.sort(key=lambda r: r.get("score", 0), reverse=True)
        return all_reps[:limit]

    async def get_all_reputations(self) -> List[dict]:
        keys = await self.redis.get_keys("rep:*")
        results = []

        for key in keys:
            if not key.startswith("rep:"):
                continue

            data = await self.redis.get_hash(key)
            if not data:
                continue

            rep = {
                "ip": data.get("ip", key[4:]),
                "score": float(data.get("score", 0.0)),
                "total_requests": int(data.get("total_requests", 0)),
                "blocked_requests": int(data.get("blocked_requests", 0)),
                "failed_logins": int(data.get("failed_logins", 0)),
                "not_found_count": int(data.get("not_found_count", 0)),
                "suspicious_ua_count": int(data.get("suspicious_ua_count", 0)),
                "first_seen": float(data.get("first_seen", 0.0)),
                "last_seen": float(data.get("last_seen", 0.0)),
                "block_level": int(data.get("block_level", 0)),
                "block_expires": float(data.get("block_expires", 0.0)),
                "country": data.get("country", ""),
                "asn": data.get("asn", ""),
                "tags": json.loads(data.get("tags", "[]")),
            }
            results.append(rep)

        for ip, cached in self._cache.items():
            key = f"rep:{ip}"
            key_found = any(r["ip"] == ip for r in results)
            if not key_found:
                results.append(cached.copy())

        return results
