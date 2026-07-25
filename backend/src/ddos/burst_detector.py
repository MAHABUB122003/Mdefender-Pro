import time
import json
import hashlib
from typing import Dict, List, Optional
from .redis_service import RedisService
from .config import DDoSConfig
from .models import BurstAlert


class BurstDetector:
    def __init__(self, redis_service: RedisService = None, config: DDoSConfig = None):
        self.redis = redis_service or RedisService()
        self.config = config or DDoSConfig()
        self._alerts: List[dict] = []

    async def analyze(self, ip: str, path: str, request_rate: float) -> dict:
        avg_rate_key = f"avg_rate:{ip}"
        avg_rate_str = await self.redis.get_value(avg_rate_key)
        avg_rate = float(avg_rate_str) if avg_rate_str else 0.0

        if avg_rate == 0.0:
            new_avg = request_rate
        else:
            new_avg = (avg_rate * 0.9) + (request_rate * 0.1)
        await self.redis.set_with_ttl(avg_rate_key, str(new_avg), 3600)

        is_burst = False
        severity = 'low'
        message = "Normal traffic"

        if avg_rate > 0 and request_rate > avg_rate * self.config.threshold_multiplier and request_rate >= self.config.min_requests:
            is_burst = True
            ratio = request_rate / avg_rate if avg_rate > 0 else 0

            if ratio > 10:
                severity = 'critical'
            elif ratio > 5:
                severity = 'high'
            elif ratio > 3:
                severity = 'medium'
            else:
                severity = 'low'

            message = f"Burst detected: {request_rate:.1f} req/s vs avg {avg_rate:.1f} req/s"

            burst_event = {
                'ip': ip,
                'path': path,
                'current_rate': request_rate,
                'avg_rate': avg_rate,
                'severity': severity,
                'timestamp': time.time()
            }

            await self.redis.add_to_sorted_set(
                f"burst_history:{ip}",
                json.dumps(burst_event),
                time.time()
            )

            alert = BurstAlert(
                ip=ip,
                alert_type='burst',
                severity=severity,
                message=message,
                timestamp=time.time(),
                details=burst_event
            )
            self._alerts.append(vars(alert))

            if len(self._alerts) > 1000:
                self._alerts = self._alerts[-1000:]

        return {
            'is_burst': is_burst,
            'severity': severity,
            'current_rate': request_rate,
            'avg_rate': avg_rate,
            'message': message
        }

    async def get_burst_history(self, ip: str) -> list:
        events = await self.redis.get_sorted_set_range(f"burst_history:{ip}", 0, -1)
        return [json.loads(e) for e in events] if events else []

    async def get_alerts(self, limit: int = 50) -> list:
        sorted_alerts = sorted(self._alerts, key=lambda x: x.get('timestamp', 0), reverse=True)
        return sorted_alerts[:limit]

    async def clear_alerts(self):
        self._alerts.clear()

    async def get_global_burst_status(self) -> dict:
        global_rate_key = "global_request_rate"
        global_rate_str = await self.redis.get_value(global_rate_key)
        current_global_rate = float(global_rate_str) if global_rate_str else 0.0

        global_avg_key = "global_avg_rate"
        global_avg_str = await self.redis.get_value(global_avg_key)
        avg_global_rate = float(global_avg_str) if global_avg_str else 0.0

        active_bursts = sum(1 for a in self._alerts if a.get('severity') in ['low', 'medium', 'high', 'critical'])

        return {
            'current_global_rate': current_global_rate,
            'avg_global_rate': avg_global_rate,
            'active_bursts_count': active_bursts,
            'total_alerts': len(self._alerts)
        }
