import secrets
import hashlib
import time
import random
import json
from . import redis_service
from . import config


class ChallengeManager:

    def __init__(self):
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    async def generate_js_challenge(self, ip):
        token = secrets.token_hex(16)
        nonce = secrets.token_hex(8)
        solution = hashlib.sha256(nonce.encode()).hexdigest()[:8]
        expires_at = time.time() + self.config.challenge.challenge_duration
        await self.redis.set_with_ttl(
            f'challenge:js:{ip}:{token}',
            json.dumps({'nonce': nonce, 'solution': solution, 'expires': expires_at}),
            self.config.challenge.challenge_duration,
        )
        challenge_html = (
            '<script>'
            f'var n="{nonce}";'
            'var h=0;for(var i=0;i<n.length;i++){h=((h<<5)-h)+n.charCodeAt(i);h|=0;}'
            f'var f=document.createElement("form");f.method="POST";f.action="/__ddos_verify";'
            'var t=document.createElement("input");t.type="hidden";t.name="token";t.value="' + token + '";f.appendChild(t);'
            'var s=document.createElement("input");s.type="hidden";s.name="solution";s.value=h.toString(16);f.appendChild(s);'
            'document.body.appendChild(f);f.submit();'
            '</script>'
        )
        return {
            'challenge_html': challenge_html,
            'token': token,
            'expires_at': expires_at,
        }

    async def verify_js_challenge(self, ip, token, solution):
        key = f'challenge:js:{ip}:{token}'
        raw = await self.redis.get_value(key)
        if not raw:
            return False
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return False
        if time.time() > data.get('expires', 0):
            await self.redis.delete_key(key)
            return False
        expected = hashlib.sha256(data['nonce'].encode()).hexdigest()[:8]
        if solution == data['solution'] or solution == expected:
            await self.redis.delete_key(key)
            await self.redis.set_with_ttl(f'challenge:passed:{ip}', '1', self.config.challenge.challenge_duration)
            return True
        return False

    async def generate_captcha_challenge(self, ip):
        token = secrets.token_hex(16)
        a = random.randint(1, 20)
        b = random.randint(1, 20)
        op = random.choice(['+', '-'])
        if op == '+':
            answer = str(a + b)
        else:
            if a < b:
                a, b = b, a
            answer = str(a - b)
        question = f'What is {a} {op} {b}?'
        expires_at = time.time() + self.config.challenge.challenge_duration
        await self.redis.set_with_ttl(
            f'challenge:cap:{ip}:{token}',
            json.dumps({'answer': answer, 'expires': expires_at}),
            self.config.challenge.challenge_duration,
        )
        return {'question': question, 'token': token, 'expires_at': expires_at}

    async def verify_captcha(self, ip, token, answer):
        key = f'challenge:cap:{ip}:{token}'
        raw = await self.redis.get_value(key)
        if not raw:
            return False
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return False
        if time.time() > data.get('expires', 0):
            await self.redis.delete_key(key)
            return False
        if str(answer).strip() == data['answer']:
            await self.redis.delete_key(key)
            await self.redis.set_with_ttl(f'challenge:passed:{ip}', '1', self.config.challenge.challenge_duration)
            return True
        return False

    async def validate_cookie(self, ip, cookie_value):
        if not cookie_value:
            return False
        stored = await self.redis.get_value(f'challenge:cookie:{ip}')
        if stored and cookie_value == stored:
            return True
        return await self.is_challenge_passed(ip)

    async def issue_cookie(self, ip):
        value = secrets.token_hex(32)
        await self.redis.set_with_ttl(f'challenge:cookie:{ip}', value, self.config.challenge.challenge_duration)
        await self.redis.set_with_ttl(f'challenge:passed:{ip}', '1', self.config.challenge.challenge_duration)
        return value

    async def is_challenge_passed(self, ip):
        return await self.redis.get_value(f'challenge:passed:{ip}') is not None
