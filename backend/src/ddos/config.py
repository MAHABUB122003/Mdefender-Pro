import os
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from pathlib import Path


@dataclass
class RateLimitConfig:
    anonymous_rps: int = 10
    anonymous_rpm: int = 200
    anonymous_rph: int = 5000
    authenticated_rps: int = 30
    authenticated_rpm: int = 600
    authenticated_rph: int = 15000
    api_key_rps: int = 50
    api_key_rpm: int = 1000
    api_key_rph: int = 30000
    admin_rps: int = 100
    admin_rpm: int = 3000
    admin_rph: int = 60000


@dataclass
class ReputationConfig:
    initial_score: float = 0.0
    max_score: float = 100.0
    decay_rate: float = 0.5
    decay_interval: int = 300
    excess_request_penalty: float = 2.0
    invalid_request_penalty: float = 5.0
    not_found_penalty: float = 1.0
    login_failure_penalty: float = 10.0
    suspicious_ua_penalty: float = 3.0
    block_threshold: float = 50.0
    permanent_ban_threshold: float = 90.0


@dataclass
class BurstConfig:
    window_seconds: int = 10
    threshold_multiplier: float = 3.0
    min_requests: int = 50
    endpoint_threshold: int = 100
    concurrent_threshold: int = 200


@dataclass
class ProgressiveConfig:
    level1_delay: float = 0.5
    level2_duration: int = 60
    level3_duration: int = 300
    level4_duration: int = 3600
    escalation_enabled: bool = True
    escalation_threshold: int = 3


@dataclass
class GeoConfig:
    enabled: bool = False
    whitelist_countries: List[str] = field(default_factory=list)
    blacklist_countries: List[str] = field(default_factory=list)
    block_message: str = 'Access denied from your region'


@dataclass
class ASNConfig:
    enabled: bool = False
    whitelist: List[str] = field(default_factory=list)
    blacklist: List[str] = field(default_factory=list)


@dataclass
class ChallengeConfig:
    enabled: bool = True
    js_challenge: bool = True
    captcha_enabled: bool = True
    cookie_validation: bool = True
    challenge_duration: int = 300


@dataclass
class AlertConfig:
    enabled: bool = False
    email_enabled: bool = False
    email_recipients: List[str] = field(default_factory=list)
    slack_enabled: bool = False
    slack_webhook: str = ''
    discord_enabled: bool = False
    discord_webhook: str = ''
    telegram_enabled: bool = False
    telegram_bot_token: str = ''
    telegram_chat_id: str = ''
    webhook_enabled: bool = False
    webhook_url: str = ''
    alert_threshold: float = 50.0


@dataclass
class DynamicLimitConfig:
    enabled: bool = True
    cpu_threshold: float = 80.0
    memory_threshold: float = 85.0
    max_reduction: float = 0.5
    check_interval: int = 30


@dataclass
class SessionConfig:
    enabled: bool = True
    max_duration: int = 3600
    min_interval: float = 0.1
    suspicious_threshold: int = 1000
    tracking_enabled: bool = True


@dataclass
class UAConfig:
    block_empty_ua: bool = True
    block_known_attacks: bool = True
    block_headless: bool = True
    block_scanners: bool = True
    custom_blocked: List[str] = field(default_factory=list)


@dataclass
class FingerprintConfig:
    enabled: bool = True
    track_across_ips: bool = True
    suspicious_threshold: int = 5


@dataclass
class DDoSConfig:
    enabled: bool = True
    log_level: str = 'info'
    redis_url: str = 'redis://localhost:6379/0'
    use_redis: bool = True
    fallback_to_memory: bool = True
    rate_limits: RateLimitConfig = field(default_factory=RateLimitConfig)
    reputation: ReputationConfig = field(default_factory=ReputationConfig)
    burst: BurstConfig = field(default_factory=BurstConfig)
    progressive: ProgressiveConfig = field(default_factory=ProgressiveConfig)
    geo: GeoConfig = field(default_factory=GeoConfig)
    asn: ASNConfig = field(default_factory=ASNConfig)
    challenge: ChallengeConfig = field(default_factory=ChallengeConfig)
    alerts: AlertConfig = field(default_factory=AlertConfig)
    dynamic_limits: DynamicLimitConfig = field(default_factory=DynamicLimitConfig)
    session: SessionConfig = field(default_factory=SessionConfig)
    ua: UAConfig = field(default_factory=UAConfig)
    fingerprint: FingerprintConfig = field(default_factory=FingerprintConfig)
    whitelist_ips: List[str] = field(default_factory=lambda: ['127.0.0.1', '::1', 'localhost'])
    whitelist_paths: List[str] = field(default_factory=lambda: ['/health', '/api/admin/login'])
    blocked_user_agents: List[str] = field(default_factory=lambda: [
        'sqlmap', 'nikto', 'nmap', 'masscan', 'havij', 'w3af',
        'acunetix', 'netsparker', 'openvas', 'metasploit',
        'burpsuite', 'dirbuster', 'gobuster', 'ffuf',
    ])

    @classmethod
    def from_file(cls, path: str = None) -> 'DDoSConfig':
        if path is None:
            path = os.path.join(os.path.dirname(__file__), '..', '..', 'ddos_config.json')
        path = os.path.normpath(path)
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                return cls._from_dict(data)
            except Exception:
                pass
        return cls()

    @classmethod
    def _from_dict(cls, data: dict) -> 'DDoSConfig':
        config = cls()
        for key, value in data.items():
            if hasattr(config, key):
                attr = getattr(config, key)
                if hasattr(attr, '__dataclass_fields__'):
                    for k, v in value.items() if isinstance(value, dict) else []:
                        if hasattr(attr, k):
                            setattr(attr, k, v)
                else:
                    setattr(config, key, value)
        return config

    def save(self, path: str = None):
        if path is None:
            path = os.path.join(os.path.dirname(__file__), '..', '..', 'ddos_config.json')
        path = os.path.normpath(path)
        data = {}
        for field_name in self.__dataclass_fields__:
            val = getattr(self, field_name)
            if hasattr(val, '__dataclass_fields__'):
                data[field_name] = {
                    k: getattr(val, k) for k in val.__dataclass_fields__
                }
            else:
                data[field_name] = val
        with open(path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
