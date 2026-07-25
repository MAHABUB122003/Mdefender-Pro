import time
import asyncio
from typing import Dict, Any, Optional

from . import redis_service
from . import config


API_TYPE_LIMITS = {
    'public': {
        'rps': 'anonymous_rps',
        'rpm': 'anonymous_rpm',
        'rph': 'anonymous_rph',
    },
    'private': {
        'rps': 'authenticated_rps',
        'rpm': 'authenticated_rpm',
        'rph': 'authenticated_rph',
    },
    'admin': {
        'rps': 'admin_rps',
        'rpm': 'admin_rpm',
        'rph': 'admin_rph',
    },
    'partner': {
        'rps': 'api_key_rps',
        'rpm': 'api_key_rpm',
        'rph': 'api_key_rph',
    },
}


class APIProtection:
    def __init__(self) -> None:
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    def _get_limits_for_type(self, api_type: str) -> Dict[str, int]:
        type_keys = API_TYPE_LIMITS.get(api_type, API_TYPE_LIMITS['public'])
        rl = self.config.rate_limits
        return {
            'rps': getattr(rl, type_keys['rps']),
            'rpm': getattr(rl, type_keys['rpm']),
            'rph': getattr(rl, type_keys['rph']),
        }

    async def _get_custom_limits(self, api_key: str) -> Optional[Dict[str, int]]:
        data = await self.redis.get_hash(f"api_key:{api_key}:custom_limits")
        if not data:
            return None
        hourly = data.get('hourly_limit')
        daily = data.get('daily_limit')
        result: Dict[str, int] = {}
        if hourly is not None:
            result['hourly_limit'] = int(hourly)
        if daily is not None:
            result['daily_limit'] = int(daily)
        return result if result else None

    async def check_api_limit(self, api_key: str, api_type: str = 'public') -> Dict[str, Any]:
        now = time.time()
        limits = self._get_limits_for_type(api_type)

        custom = await self._get_custom_limits(api_key)
        hourly_limit = custom.get('hourly_limit', limits['rph']) if custom else limits['rph']
        daily_limit = custom.get('daily_limit', limits['rph'] * 24) if custom else limits['rph'] * 24

        hourly_key = f"api_usage:{api_key}:hourly"
        daily_key = f"api_usage:{api_key}:daily"

        hourly_count = await self.redis.get_counter(hourly_key)
        daily_count = await self.redis.get_counter(daily_key)

        hourly_reset = now + 3600 - (now % 3600)
        daily_reset = now + 86400 - (now % 86400)

        if hourly_count >= hourly_limit:
            return {
                'allowed': False,
                'remaining': 0,
                'limit': hourly_limit,
                'reset_at': hourly_reset,
            }

        if daily_count >= daily_limit:
            return {
                'allowed': False,
                'remaining': 0,
                'limit': daily_limit,
                'reset_at': daily_reset,
            }

        remaining = min(hourly_limit - hourly_count - 1, daily_limit - daily_count - 1)

        return {
            'allowed': True,
            'remaining': max(0, remaining),
            'limit': hourly_limit,
            'reset_at': hourly_reset,
        }

    async def record_api_usage(self, api_key: str, api_type: str = 'public') -> None:
        now = time.time()
        ttl_hourly = 3600 - int(now % 3600)
        ttl_daily = 86400 - int(now % 86400)

        await self.redis.increment_counter(f"api_usage:{api_key}:total")
        await self.redis.increment_counter(f"api_usage:{api_key}:hourly", ttl_hourly)
        await self.redis.increment_counter(f"api_usage:{api_key}:daily", ttl_daily)

        await self.redis.add_to_sorted_set(
            f"api_usage:{api_key}:recent", now, f"{now}:{api_type}"
        )

    async def get_api_usage(self, api_key: str) -> Dict[str, int]:
        total = await self.redis.get_counter(f"api_usage:{api_key}:total")
        hourly = await self.redis.get_counter(f"api_usage:{api_key}:hourly")
        daily = await self.redis.get_counter(f"api_usage:{api_key}:daily")

        return {
            'total': total,
            'hourly': hourly,
            'daily': daily,
        }

    async def reset_api_usage(self, api_key: str) -> None:
        await self.redis.delete_key(f"api_usage:{api_key}:total")
        await self.redis.delete_key(f"api_usage:{api_key}:hourly")
        await self.redis.delete_key(f"api_usage:{api_key}:daily")
        await self.redis.delete_key(f"api_usage:{api_key}:recent")

    async def validate_api_key(self, api_key: str) -> bool:
        if not api_key or len(api_key.strip()) == 0:
            return False

        key_data = await self.redis.get_hash(f"api_key:{api_key}")
        if key_data:
            return key_data.get('active', 'true') == 'true'

        value = await self.redis.get_value(f"api_key:{api_key}:exists")
        return value is not None and value != '0'

    async def get_quota_status(self, api_key: str) -> Dict[str, Any]:
        usage = await self.get_api_usage(api_key)

        key_data = await self.redis.get_hash(f"api_key:{api_key}")
        api_type = key_data.get('type', 'public') if key_data else 'public'

        limits = self._get_limits_for_type(api_type)
        custom = await self._get_custom_limits(api_key)

        hourly_limit = custom.get('hourly_limit', limits['rph']) if custom else limits['rph']
        daily_limit = custom.get('daily_limit', limits['rph'] * 24) if custom else limits['rph'] * 24

        now = time.time()
        hourly_reset = now + 3600 - (now % 3600)
        daily_reset = now + 86400 - (now % 86400)

        return {
            'api_key': api_key,
            'api_type': api_type,
            'usage': usage,
            'limits': {
                'rps': limits['rps'],
                'rpm': limits['rpm'],
                'hourly': hourly_limit,
                'daily': daily_limit,
            },
            'remaining': {
                'hourly': max(0, hourly_limit - usage['hourly']),
                'daily': max(0, daily_limit - usage['daily']),
            },
            'reset_at': {
                'hourly': hourly_reset,
                'daily': daily_reset,
            },
            'custom_limits': custom is not None,
        }

    async def set_quota(self, api_key: str, daily_limit: int, hourly_limit: int) -> None:
        mapping = {
            'daily_limit': str(daily_limit),
            'hourly_limit': str(hourly_limit),
            'updated_at': str(time.time()),
        }
        await self.redis.set_hash(f"api_key:{api_key}:custom_limits", mapping)
