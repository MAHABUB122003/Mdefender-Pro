import time
import json
import hashlib
from typing import Dict, List, Optional
from .redis_service import RedisService
from .config import DDoSConfig


class BehavioralAnalyzer:
    def __init__(self, redis_service: RedisService = None, config: DDoSConfig = None):
        self.redis = redis_service or RedisService()
        self.config = config or DDoSConfig()

    async def analyze(self, ip: str, path: str, headers: dict, user_agent: str, interval: float) -> dict:
        detections = []
        risk_score = 0

        profile_key = f"behavior:{ip}"
        profile = await self.redis.get_hash(profile_key)

        if not profile:
            profile = {
                'total_requests': '0',
                'unique_paths': '0',
                'total_interval': '0',
                'missing_headers_count': '0',
                'empty_ua_count': '0',
                'risk_score': '0'
            }

        total_requests = int(profile.get('total_requests', '0')) + 1
        profile['total_requests'] = str(total_requests)

        total_interval = float(profile.get('total_interval', '0')) + interval
        profile['total_interval'] = str(total_interval)

        path_hash = hashlib.md5(path.encode()).hexdigest()
        await self.redis.add_to_sorted_set(f"behavior_paths:{ip}", path_hash, time.time())
        unique_paths = await self.redis.get_sorted_set_range(f"behavior_paths:{ip}", 0, -1)
        profile['unique_paths'] = str(len(unique_paths) if unique_paths else 0)

        if not user_agent or user_agent.strip() == '':
            detections.append('empty_ua')
            risk_score += 25
            empty_ua_count = int(profile.get('empty_ua_count', '0')) + 1
            profile['empty_ua_count'] = str(empty_ua_count)

        required_headers = ['accept', 'accept-language', 'accept-encoding']
        header_keys_lower = [k.lower() for k in headers.keys()]
        missing_count = sum(1 for h in required_headers if h not in header_keys_lower)
        if missing_count > 0:
            detections.append('missing_headers')
            risk_score += missing_count * 10
            missing_headers_count = int(profile.get('missing_headers_count', '0')) + missing_count
            profile['missing_headers_count'] = str(missing_headers_count)

        if interval < 0.1:
            detections.append('impossible_speed')
            risk_score += 30

        path_counter_key = f"behavior_path_counter:{ip}:{path_hash}"
        path_count_str = await self.redis.get_value(path_counter_key)
        path_count = int(path_count_str) if path_count_str else 0
        path_count += 1
        await self.redis.set_with_ttl(path_counter_key, str(path_count), 300)

        if path_count > 10:
            detections.append('repeated_requests')
            risk_score += 20

        unique_path_count = int(profile.get('unique_paths', '0'))
        if total_requests > 5 and unique_path_count > total_requests * 0.8:
            detections.append('scanning')
            risk_score += 25

        if total_requests > 10 and unique_path_count > total_requests * 0.95:
            detections.append('random_urls')
            risk_score += 30

        risk_score = min(risk_score, 100)

        profile['risk_score'] = str(risk_score)
        await self.redis.set_hash(profile_key, profile)
        await self.redis.set_with_ttl(profile_key, json.dumps(profile), 3600)

        is_suspicious = risk_score >= 50 or len(detections) >= 2

        return {
            'risk_score': risk_score,
            'detections': detections,
            'is_suspicious': is_suspicious
        }

    async def get_risk_score(self, ip: str) -> float:
        profile = await self.redis.get_hash(f"behavior:{ip}")
        if profile:
            return float(profile.get('risk_score', '0'))
        return 0.0

    async def get_behavior_profile(self, ip: str) -> dict:
        profile = await self.redis.get_hash(f"behavior:{ip}")
        if not profile:
            return {
                'total_requests': 0,
                'unique_paths': 0,
                'avg_interval': 0.0,
                'missing_headers_count': 0,
                'empty_ua_count': 0,
                'risk_score': 0.0
            }

        total_requests = int(profile.get('total_requests', '0'))
        total_interval = float(profile.get('total_interval', '0'))
        avg_interval = total_interval / total_requests if total_requests > 0 else 0.0

        return {
            'total_requests': total_requests,
            'unique_paths': int(profile.get('unique_paths', '0')),
            'avg_interval': avg_interval,
            'missing_headers_count': int(profile.get('missing_headers_count', '0')),
            'empty_ua_count': int(profile.get('empty_ua_count', '0')),
            'risk_score': float(profile.get('risk_score', '0'))
        }

    async def reset_profile(self, ip: str):
        await self.redis.delete_key(f"behavior:{ip}")
        await self.redis.delete_key(f"behavior_paths:{ip}")
