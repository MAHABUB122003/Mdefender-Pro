import asyncio
import time
import json
import hashlib

from .redis_service import RedisService
from .config import DDoSConfig


class SessionTracker:
    def __init__(self):
        self.redis = RedisService()
        self.config = DDoSConfig()
        if not self.redis.is_connected:
            self._sessions_cache = {}
            self._suspicious_cache = set()

    async def create_or_update_session(self, ip: str, path: str, user_agent: str, interval: float) -> dict:
        raw = f"{ip}|{user_agent}"
        session_id = hashlib.sha256(raw.encode()).hexdigest()[:24]
        now = time.time()
        key = f"ddos:session:{ip}"

        existing = await self.get_session(ip)
        if existing and existing.get("session_id") == session_id:
            request_count = existing.get("request_count", 0) + 1
            old_avg = existing.get("avg_interval", 0)
            old_count = existing.get("request_count", 1)
            if old_count + 1 > 0:
                new_avg = ((old_avg * old_count) + interval) / (old_count + 1)
            else:
                new_avg = interval
            paths = existing.get("_paths_list", [])
            if path not in paths:
                paths.append(path)
            data = {
                "session_id": session_id,
                "ip": ip,
                "request_count": request_count,
                "avg_interval": round(new_avg, 4),
                "paths_list": paths,
                "paths_count": len(paths),
                "first_seen": existing.get("first_seen", now),
                "last_seen": now,
                "duration": round(now - existing.get("first_seen", now), 2),
                "_paths_list": paths,
            }
        else:
            data = {
                "session_id": session_id,
                "ip": ip,
                "request_count": 1,
                "avg_interval": round(interval, 4),
                "paths_list": [path],
                "paths_count": 1,
                "first_seen": now,
                "last_seen": now,
                "duration": 0,
                "_paths_list": [path],
            }

        is_sus = await self._check_suspicious(data)
        data["is_suspicious"] = is_sus

        if self.redis.is_connected:
            ttl = self.config.session.max_duration
            serializable = {k: v for k, v in data.items() if k != "_paths_list"}
            serializable["paths_list"] = json.dumps(data.get("_paths_list", []))
            await self.redis.set_with_ttl(key, json.dumps(serializable), int(ttl))
        else:
            data_serializable = {k: v for k, v in data.items() if k != "_paths_list"}
            data_serializable["paths_list"] = json.dumps(data.get("_paths_list", []))
            self._sessions_cache[ip] = data_serializable
            if is_sus:
                self._suspicious_cache.add(ip)

        return {
            "session_id": data["session_id"],
            "request_count": data["request_count"],
            "avg_interval": data["avg_interval"],
            "is_suspicious": data.get("is_suspicious", False),
            "paths_count": data["paths_count"],
            "duration": data["duration"],
        }

    async def get_session(self, ip: str) -> dict:
        key = f"ddos:session:{ip}"
        if self.redis.is_connected:
            try:
                raw = await self.redis.get_value(key)
                if raw:
                    data = json.loads(raw)
                    if isinstance(data.get("paths_list"), str):
                        data["_paths_list"] = json.loads(data["paths_list"])
                    else:
                        data["_paths_list"] = data.get("paths_list", [])
                    return data
            except Exception:
                pass
        else:
            if ip in self._sessions_cache:
                data = self._sessions_cache[ip].copy()
                if isinstance(data.get("paths_list"), str):
                    data["_paths_list"] = json.loads(data["paths_list"])
                else:
                    data["_paths_list"] = data.get("paths_list", [])
                return data
        return None

    async def _check_suspicious(self, data: dict) -> bool:
        if not self.config.session.tracking_enabled:
            return False
        request_count = data.get("request_count", 0)
        avg_interval = data.get("avg_interval", 999)
        paths_list = data.get("_paths_list", data.get("paths_list", []))
        if isinstance(paths_list, str):
            try:
                paths_list = json.loads(paths_list)
            except Exception:
                paths_list = []
        if avg_interval < self.config.session.min_interval:
            return True
        if request_count > self.config.session.suspicious_threshold:
            return True
        if len(paths_list) == 1 and request_count > 10:
            return True
        return False

    async def is_suspicious_session(self, ip: str) -> bool:
        session = await self.get_session(ip)
        if not session:
            return False
        is_sus = await self._check_suspicious(session)
        return is_sus

    async def get_active_sessions(self) -> list:
        sessions = []
        now = time.time()
        max_dur = self.config.session.max_duration
        if self.redis.is_connected:
            try:
                keys = await self.redis.get_keys("ddos:session:*")
                if keys:
                    for key in keys:
                        try:
                            raw = await self.redis.get_value(key)
                            if raw:
                                data = json.loads(raw)
                                first_seen = data.get("first_seen", 0)
                                if now - first_seen <= max_dur:
                                    sessions.append(data)
                        except Exception:
                            continue
            except Exception:
                pass
        else:
            for ip, data in self._sessions_cache.items():
                first_seen = data.get("first_seen", 0)
                if now - first_seen <= max_dur:
                    sessions.append(data)
        return sessions

    async def cleanup_expired(self) -> int:
        cleaned = 0
        now = time.time()
        max_dur = self.config.session.max_duration
        if self.redis.is_connected:
            try:
                keys = await self.redis.get_keys("ddos:session:*")
                if keys:
                    for key in keys:
                        try:
                            raw = await self.redis.get_value(key)
                            if raw:
                                data = json.loads(raw)
                                first_seen = data.get("first_seen", 0)
                                if now - first_seen > max_dur:
                                    await self.redis.delete_key(key)
                                    cleaned += 1
                        except Exception:
                            continue
            except Exception:
                pass
        else:
            expired_ips = []
            for ip, data in self._sessions_cache.items():
                first_seen = data.get("first_seen", 0)
                if now - first_seen > max_dur:
                    expired_ips.append(ip)
            for ip in expired_ips:
                del self._sessions_cache[ip]
                self._suspicious_cache.discard(ip)
                cleaned += 1
        return cleaned

    async def get_session_stats(self) -> dict:
        now = time.time()
        max_dur = self.config.session.max_duration
        total = 0
        active = 0
        suspicious = 0
        if self.redis.is_connected:
            try:
                keys = await self.redis.get_keys("ddos:session:*")
                if keys:
                    total = len(keys)
                    for key in keys:
                        try:
                            raw = await self.redis.get_value(key)
                            if raw:
                                data = json.loads(raw)
                                first_seen = data.get("first_seen", 0)
                                if now - first_seen <= max_dur:
                                    active += 1
                                    is_sus = await self._check_suspicious(data)
                                    if is_sus:
                                        suspicious += 1
                        except Exception:
                            continue
            except Exception:
                pass
        else:
            total = len(self._sessions_cache)
            for ip, data in self._sessions_cache.items():
                first_seen = data.get("first_seen", 0)
                if now - first_seen <= max_dur:
                    active += 1
            suspicious = len(self._suspicious_cache)
        return {
            "total_sessions": total,
            "active_sessions": active,
            "suspicious_count": suspicious,
        }
