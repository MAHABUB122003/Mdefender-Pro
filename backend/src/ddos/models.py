from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import IntEnum


class BlockLevel(IntEnum):
    NONE = 0
    THROTTLE = 1
    TEMPORARY_BLOCK = 2
    CAPTCHA = 3
    BLOCKED = 4
    PERMANENT_BAN = 5


@dataclass
class TrafficMetrics:
    ip: str
    timestamp: float
    path: str
    method: str
    user_agent: str
    referrer: str
    request_size: int
    response_time: float = 0.0
    country: str = ''
    asn: str = ''
    fingerprint: str = ''
    session_id: str = ''


@dataclass
class IPReputation:
    ip: str
    score: float = 0.0
    total_requests: int = 0
    blocked_requests: int = 0
    failed_logins: int = 0
    not_found_count: int = 0
    suspicious_ua_count: int = 0
    first_seen: float = 0.0
    last_seen: float = 0.0
    block_level: int = 0
    block_expires: float = 0.0
    country: str = ''
    asn: str = ''
    tags: list = field(default_factory=list)


@dataclass
class BurstAlert:
    ip: str
    alert_type: str
    severity: str
    message: str
    timestamp: float = 0.0
    details: dict = field(default_factory=dict)


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_at: float
    retry_after: float = 0.0


@dataclass
class BlockDecision:
    blocked: bool
    level: int = 0
    reason: str = ''
    retry_after: float = 0.0
    challenge_type: str = ''


@dataclass
class SessionData:
    session_id: str
    ip: str
    request_count: int = 0
    first_request: float = 0.0
    last_request: float = 0.0
    paths_visited: list = field(default_factory=list)
    avg_interval: float = 0.0
    is_suspicious: bool = False
