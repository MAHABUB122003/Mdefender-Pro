import re
import time
import json
from . import redis_service
from . import config


KNOWN_ATTACK_TOOLS = [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'havij', 'w3af',
    'acunetix', 'netsparker', 'openvas', 'metasploit',
    'burpsuite', 'dirbuster', 'gobuster', 'ffuf', 'whatweb',
    'wpscan', 'arachni', 'skipfish', 'wapiti', 'zmeu',
]

HEADLESS_SIGNATURES = [
    'phantomjs', 'headlesschrome', 'headless', 'puppeteer',
    'playwright', 'selenium', 'webdriver', 'casperjs', 'slimerjs',
]

SCANNER_SIGNATURES = [
    'scan', 'crawler', 'spider', 'bot', 'grabber', 'harvest',
    'spambot', 'download', 'extract', 'collector',
]

HEADER_PATTERNS = [
    re.compile(r'python|go-http|java|perl|ruby|libwww|wget|curl', re.I),
]


class UAAnalyzer:

    def __init__(self):
        self.redis = redis_service.RedisService()
        self.config = config.DDoSConfig()

    async def analyze(self, user_agent):
        ua = (user_agent or '').strip()
        detections = []
        is_empty = not ua
        is_attack = False
        is_headless = False
        is_scanner = False
        is_custom_blocked = False

        if is_empty:
            detections.append('empty_ua')

        if self.config.ua.block_empty_ua and is_empty:
            is_attack = True

        ua_lower = ua.lower()
        for tool in KNOWN_ATTACK_TOOLS:
            if tool in ua_lower:
                detections.append(f'attack_tool:{tool}')
                is_attack = True
                break

        for sig in HEADLESS_SIGNATURES:
            if sig in ua_lower:
                detections.append(f'headless:{sig}')
                is_headless = True
                break

        for sig in SCANNER_SIGNATURES:
            if sig in ua_lower:
                detections.append(f'scanner:{sig}')
                is_scanner = True
                break

        for pattern in HEADER_PATTERNS:
            if pattern.search(ua):
                detections.append('script_ua')
                break

        for blocked in self.config.ua.custom_blocked:
            if blocked.lower() in ua_lower:
                detections.append(f'custom_blocked:{blocked}')
                is_custom_blocked = True
                break

        threat_level = 'none'
        if len(detections) >= 3 or is_attack:
            threat_level = 'critical'
        elif len(detections) >= 2:
            threat_level = 'high'
        elif is_headless or is_scanner:
            threat_level = 'medium'
        elif len(detections) == 1:
            threat_level = 'low'

        is_suspicious = threat_level in ('low', 'medium', 'high', 'critical')

        if is_suspicious:
            try:
                key = f'ua_stats:{threat_level}'
                await self.redis.increment_counter(key, 86400)
            except Exception:
                pass

        return {
            'is_suspicious': is_suspicious,
            'threat_level': threat_level,
            'detections': detections,
            'is_empty': is_empty,
            'is_known_attack_tool': is_attack,
            'is_headless_browser': is_headless,
            'is_scanner': is_scanner,
            'is_custom_blocked': is_custom_blocked,
            'user_agent': ua,
        }

    async def get_stats(self):
        stats = {}
        for level in ('low', 'medium', 'high', 'critical'):
            try:
                val = await self.redis.get_counter(f'ua_stats:{level}')
                stats[level] = val or 0
            except Exception:
                stats[level] = 0
        return stats
