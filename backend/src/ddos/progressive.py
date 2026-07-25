import time
from . import redis_service
from . import config


class ProgressiveBlocker:

    LEVEL_DURATIONS = {
        1: 'level1_delay',
        2: 'level2_duration',
        3: 'level3_duration',
        4: 'level4_duration',
        5: 315360000,
    }

    def __init__(self):
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    async def evaluate(self, ip, reputation_score, request_rate=0):
        existing = await self.get_block_info(ip)
        if existing.get('active'):
            return {
                'level': existing['level'],
                'blocked': True,
                'reason': existing.get('reason', 'Active block'),
                'retry_after': existing.get('ttl', 0),
                'action': 'block',
            }
        level = 0
        if reputation_score >= 90:
            level = 5
        elif reputation_score >= 80:
            level = 4
        elif reputation_score >= 60:
            level = 3
        elif reputation_score >= 40:
            level = 2
        elif reputation_score >= 20:
            level = 1
        actions = {0: 'allow', 1: 'throttle', 2: 'temp_block', 3: 'captcha', 4: 'block', 5: 'permanent_ban'}
        reasons = {
            0: 'Clean',
            1: 'Throttled due to elevated traffic',
            2: 'Temporarily blocked due to suspicious activity',
            3: 'CAPTCHA verification required',
            4: 'Blocked due to repeated violations',
            5: 'Permanently banned',
        }
        if level == 0:
            return {'level': 0, 'blocked': False, 'reason': '', 'retry_after': 0, 'action': 'allow'}
        delay = self._get_duration(level)
        return {
            'level': level,
            'blocked': level >= 2,
            'reason': reasons.get(level, ''),
            'retry_after': delay,
            'action': actions.get(level, 'allow'),
        }

    def _get_duration(self, level):
        if level == 1:
            return self.config.progressive.level1_delay
        attr = self.LEVEL_DURATIONS.get(level)
        if attr and hasattr(self.config.progressive, attr):
            return getattr(self.config.progressive, attr)
        return 60

    async def apply_throttle(self, ip, delay=None):
        d = delay or self.config.progressive.level1_delay
        await self.redis.set_with_ttl(f'throttle:{ip}', str(d), int(d) + 60)

    async def apply_temp_block(self, ip, duration=None):
        d = duration or self.config.progressive.level2_duration
        await self.redis.set_with_ttl(f'block:{ip}', '1', d)

    async def apply_captcha(self, ip, duration=None):
        d = duration or self.config.progressive.level3_duration
        await self.redis.set_with_ttl(f'captcha:{ip}', '1', d)

    async def apply_block(self, ip, duration=None):
        d = duration or self.config.progressive.level4_duration
        await self.redis.set_with_ttl(f'blocked:{ip}', '1', d)

    async def apply_permanent_ban(self, ip):
        await self.redis.set_with_ttl(f'banned:{ip}', '1', 315360000)

    async def is_throttled(self, ip):
        return await self.redis.get_value(f'throttle:{ip}') is not None

    async def is_blocked(self, ip):
        if await self.redis.get_value(f'blocked:{ip}'):
            return True
        if await self.redis.get_value(f'block:{ip}'):
            return True
        return False

    async def requires_captcha(self, ip):
        return await self.redis.get_value(f'captcha:{ip}') is not None

    async def is_permanently_banned(self, ip):
        return await self.redis.get_value(f'banned:{ip}') is not None

    async def remove_block(self, ip):
        for prefix in ['throttle:', 'block:', 'captcha:', 'blocked:', 'banned:']:
            await self.redis.delete_key(f'{prefix}{ip}')

    async def get_block_info(self, ip):
        for prefix, level in [('banned:', 5), ('blocked:', 4), ('captcha:', 3), ('block:', 2), ('throttle:', 1)]:
            val = await self.redis.get_value(f'{prefix}{ip}')
            if val is not None:
                return {'active': True, 'level': level, 'reason': f'Level {level} block', 'ttl': 0}
        return {'active': False, 'level': 0}

    async def get_throttle_delay(self, ip):
        val = await self.redis.get_value(f'throttle:{ip}')
        if val:
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
        return 0.0
