import asyncio
import time
import json
import hashlib
import os

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    psutil = None
    PSUTIL_AVAILABLE = False

from .redis_service import RedisService
from .config import DDoSConfig


class DynamicRateLimiter:
    def __init__(self):
        self.redis = RedisService()
        self.config = DDoSConfig()
        self._last_multiplier = 1.0

    async def get_system_metrics(self) -> dict:
        metrics = {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "active_connections": 0,
            "avg_response_time": 0.0,
            "timestamp": time.time(),
        }
        if PSUTIL_AVAILABLE and psutil is not None:
            try:
                metrics["cpu_percent"] = psutil.cpu_percent(interval=0.1)
                mem = psutil.virtual_memory()
                metrics["memory_percent"] = mem.percent
                try:
                    conns = psutil.net_connections(kind="inet")
                    metrics["active_connections"] = len([c for c in conns if c.status == "ESTABLISHED"])
                except (psutil.AccessDenied, PermissionError):
                    metrics["active_connections"] = 0
            except Exception:
                pass
        if self.redis.is_connected:
            try:
                key = "ddos:metrics:active_connections"
                conn_val = await self.redis.get_value(key)
                if conn_val is not None:
                    metrics["active_connections"] = float(conn_val)
                rt_key = "ddos:metrics:response_time"
                rt_val = await self.redis.get_value(rt_key)
                if rt_val is not None:
                    metrics["avg_response_time"] = float(rt_val)
            except Exception:
                pass
        return metrics

    async def should_reduce_limits(self) -> bool:
        metrics = await self.get_system_metrics()
        if metrics["cpu_percent"] > self.config.dynamic_limits.cpu_threshold:
            return True
        if metrics["memory_percent"] > self.config.dynamic_limits.memory_threshold:
            return True
        return False

    async def get_limit_multiplier(self) -> float:
        metrics = await self.get_system_metrics()
        cpu = metrics["cpu_percent"]
        memory = metrics["memory_percent"]
        cpu_excess = 0.0
        if cpu > self.config.dynamic_limits.cpu_threshold:
            cpu_excess = (cpu - self.config.dynamic_limits.cpu_threshold) / (100.0 - self.config.dynamic_limits.cpu_threshold)
        mem_excess = 0.0
        if memory > self.config.dynamic_limits.memory_threshold:
            mem_excess = (memory - self.config.dynamic_limits.memory_threshold) / (100.0 - self.config.dynamic_limits.memory_threshold)
        load = max(cpu_excess, mem_excess)
        if load <= 0:
            multiplier = 1.0
        else:
            max_reduction = self.config.dynamic_limits.max_reduction
            multiplier = 1.0 - (load * (1.0 - max_reduction))
        multiplier = max(max_reduction, min(1.0, multiplier))
        self._last_multiplier = multiplier
        if self.redis.is_connected:
            try:
                await self.redis.set_with_ttl("ddos:rate_limiter:multiplier", json.dumps(multiplier), 60)
            except Exception:
                pass
        return multiplier

    async def get_adjusted_limits(self, base_limits: dict) -> dict:
        multiplier = await self.get_limit_multiplier()
        adjusted = {}
        for key, value in base_limits.items():
            if isinstance(value, (int, float)):
                adjusted[key] = round(value * multiplier, 4)
            else:
                adjusted[key] = value
        adjusted["_multiplier"] = multiplier
        return adjusted

    async def get_metrics_history(self, limit: int = 60) -> list:
        metrics_list = []
        if self.redis.is_connected:
            try:
                key = "ddos:metrics:history"
                raw = await self.redis.get_value(key)
                if raw:
                    history = json.loads(raw)
                    if isinstance(history, list):
                        metrics_list = history[-limit:]
            except Exception:
                pass
        else:
            if not hasattr(self, "_metrics_history"):
                self._metrics_history = []
            metrics_list = self._metrics_history[-limit:]
        return metrics_list

    async def record_metrics(self) -> None:
        metrics = await self.get_system_metrics()
        metrics["multiplier"] = self._last_multiplier
        if self.redis.is_connected:
            try:
                key = "ddos:metrics:history"
                raw = await self.redis.get_value(key)
                if raw:
                    history = json.loads(raw)
                    if not isinstance(history, list):
                        history = []
                else:
                    history = []
                history.append(metrics)
                if len(history) > 60:
                    history = history[-60:]
                await self.redis.set_with_ttl(key, json.dumps(history), 3600)
                await self.redis.set_with_ttl("ddos:metrics:active_connections", str(metrics.get("active_connections", 0)), 60)
                await self.redis.set_with_ttl("ddos:metrics:response_time", str(metrics.get("avg_response_time", 0.0)), 60)
            except Exception:
                pass
        else:
            if not hasattr(self, "_metrics_history"):
                self._metrics_history = []
            self._metrics_history.append(metrics)
            if len(self._metrics_history) > 60:
                self._metrics_history = self._metrics_history[-60:]
