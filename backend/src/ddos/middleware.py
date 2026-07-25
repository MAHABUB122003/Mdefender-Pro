import time
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, HTMLResponse
from .config import DDoSConfig
from .redis_service import RedisService
from .traffic_monitor import TrafficMonitor
from .rate_limiter import RateLimiter
from .reputation import ReputationEngine
from .burst_detector import BurstDetector
from .behavioral import BehavioralAnalyzer
from .progressive import ProgressiveBlocker
from .challenge import ChallengeManager
from .geo_protection import GeoProtection
from .asn_protection import ASNProtection
from .ua_analyzer import UAAnalyzer
from .fingerprint import RequestFingerprinter
from .session_tracker import SessionTracker
from .dynamic_limits import DynamicRateLimiter
from .api_protection import APIProtection
from .alert_service import AlertService
from .logging_service import DDoSLogger


BLOCK_PAGE_TEMPLATE = """<!DOCTYPE html>
<html><head><title>Access Denied</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}
.box{text-align:center;padding:48px;max-width:500px;background:#1e293b;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,.4)}
.icon{font-size:64px;margin-bottom:20px}
h1{font-size:24px;margin:0 0 12px;color:#f87171}
p{color:#94a3b8;line-height:1.6;margin:0 0 8px}
.code{font-family:monospace;color:#64748b;font-size:12px;margin-top:20px}
</style></head><body>
<div class="box">
<div class="icon">&#x1f6ab;</div>
<h1>Access Denied</h1>
<p>Your request has been blocked by MDefender DDoS Protection.</p>
<p>{reason}</p>
<div class="code">Reference: {ref_id}<br>Time: {timestamp}</div>
</div></body></html>"""


class DDoSMiddleware(BaseHTTPMiddleware):

    def __init__(self, app, config=None):
        super().__init__(app)
        self.config = config or DDoSConfig.from_file()
        self.redis = RedisService()
        self.monitor = TrafficMonitor(config=self.config, storage=self.redis)
        self.rate_limiter = RateLimiter(config=self.config, storage=self.redis)
        self.reputation = ReputationEngine(redis_service=self.redis, config=self.config)
        self.burst_detector = BurstDetector(redis_service=self.redis, config=self.config)
        self.behavioral = BehavioralAnalyzer(redis_service=self.redis, config=self.config)
        self.progressive = ProgressiveBlocker()
        self.challenge = ChallengeManager()
        self.geo = GeoProtection()
        self.asn = ASNProtection()
        self.ua_analyzer = UAAnalyzer()
        self.fingerprint = RequestFingerprinter()
        self.session_tracker = SessionTracker()
        self.dynamic = DynamicRateLimiter()
        self.api_protection = APIProtection()
        self.alerts = AlertService()
        self.logger = DDoSLogger()
        self._request_times = {}
        self._last_decay = time.time()
        self._initialized = True

    def _get_client_ip(self, request):
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.client.host if request.client else 'unknown'

    def _get_user_type(self, request):
        path = request.url.path
        if path.startswith('/api/admin'):
            return 'admin'
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
            if len(token) > 20:
                return 'api_key'
            return 'authenticated'
        return 'anonymous'

    def _is_whitelisted(self, ip, path):
        if ip in self.config.whitelist_ips:
            return True
        for wp in self.config.whitelist_paths:
            if path.startswith(wp):
                return True
        return False

    def _should_skip(self, path):
        skip_exts = ('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot')
        return any(path.lower().endswith(ext) for ext in skip_exts)

    async def dispatch(self, request, call_next):
        if not self.config.enabled:
            return await call_next(request)

        now = time.time()
        ip = self._get_client_ip(request)
        path = request.url.path
        method = request.method

        if self._should_skip(path):
            return await call_next(request)

        if self._is_whitelisted(ip, path):
            return await call_next(request)

        try:
            if now - self._last_decay > self.config.reputation.decay_interval:
                await self.reputation.decay_scores()
                self._last_decay = now
        except Exception:
            pass

        try:
            if await self.progressive.is_permanently_banned(ip):
                return await self._block_response(ip, 'Permanently banned', 5)
        except Exception:
            pass

        try:
            if await self.progressive.is_blocked(ip):
                return await self._block_response(ip, 'Temporarily blocked', 4)
        except Exception:
            pass

        try:
            if await self.progressive.is_throttled(ip):
                delay = await self.progressive.get_throttle_delay(ip)
                if delay > 0:
                    time.sleep(min(delay, 2.0))
        except Exception:
            pass

        try:
            country = request.headers.get('CF-IPCountry', '') or request.headers.get('X-Country', '')
            geo_check = await self.geo.check(ip, country)
            if not geo_check['allowed']:
                await self.logger.log_blocked(ip, path, geo_check['reason'], 3)
                return await self._block_response(ip, geo_check['reason'], 3)
        except Exception:
            pass

        try:
            asn = request.headers.get('X-ASN', '')
            asn_check = await self.asn.check(ip, asn)
            if not asn_check['allowed']:
                await self.logger.log_blocked(ip, path, asn_check['reason'], 3)
                return await self._block_response(ip, asn_check['reason'], 3)
        except Exception:
            pass

        user_agent = request.headers.get('User-Agent', '')
        try:
            ua_result = await self.ua_analyzer.analyze(user_agent)
            if ua_result['is_known_attack_tool'] or ua_result['threat_level'] == 'critical':
                await self.reputation.record_violation(ip, 'suspicious_ua')
                await self.logger.log_attack(ip, 'malicious_ua', 'high', path, {'ua': user_agent})
                return await self._block_response(ip, 'Malicious user agent detected', 4)
        except Exception:
            pass

        try:
            interval = now - self._request_times.get(ip, now)
            self._request_times[ip] = now
            headers_dict = dict(request.headers)
            behavioral_result = await self.behavioral.analyze(ip, path, headers_dict, user_agent, interval)
            if behavioral_result.get('is_suspicious'):
                score = behavioral_result.get('risk_score', 0)
                if score >= 80:
                    await self.reputation.record_violation(ip, 'invalid_request', score / 10)
        except Exception:
            pass

        try:
            rate_check = await self.rate_limiter.check_rate_limit(ip, self._get_user_type(request))
            if not rate_check.allowed:
                await self.reputation.record_violation(ip, 'excess_requests')
                await self.logger.log_rate_limit(ip, 'sliding_window', '1s')
                return JSONResponse(
                    status_code=429,
                    content={'error': 'Rate limit exceeded', 'retry_after': rate_check.retry_after},
                    headers={'Retry-After': str(int(rate_check.retry_after) + 1), 'X-RateLimit-Limit': str(rate_check.limit)},
                )
        except Exception:
            pass

        try:
            burst_status = await self.burst_detector.analyze(ip, path, await self.monitor.get_request_rate(ip, 10))
            if burst_status.get('is_burst') and burst_status.get('severity') in ('high', 'critical'):
                await self.alerts.send_alert('burst', burst_status['severity'],
                    f"Burst detected from {ip}: {burst_status.get('message', '')}")
                await self.reputation.record_violation(ip, 'excess_requests', 5.0)
        except Exception:
            pass

        try:
            block_eval = await self.progressive.evaluate(ip, await self._get_reputation_score(ip))
            if block_eval['blocked']:
                await self._apply_progressive_action(ip, block_eval)
                return await self._block_response(ip, block_eval['reason'], block_eval['level'])
            if block_eval['action'] == 'throttle':
                await self.progressive.apply_throttle(ip)
        except Exception:
            pass

        start_time = time.time()
        try:
            response = await call_next(request)
        except Exception:
            response = JSONResponse(status_code=500, content={'error': 'Internal server error'})

        response_time = time.time() - start_time

        try:
            content_length = int(request.headers.get('content-length', 0))
            referrer = request.headers.get('Referer', '')
            metrics = type('Metrics', (), {
                'ip': ip, 'timestamp': now, 'path': path, 'method': method,
                'user_agent': user_agent, 'referrer': referrer,
                'request_size': content_length, 'response_time': response_time,
                'country': country if 'country' in dir() else '',
                'asn': asn if 'asn' in dir() else '',
            })()
            await self.monitor.record(metrics)
        except Exception:
            pass

        try:
            status = response.status_code if hasattr(response, 'status_code') else 200
            if status == 404:
                await self.reputation.record_violation(ip, 'not_found')
            elif status >= 400 and status != 429:
                await self.reputation.record_violation(ip, 'invalid_request', 1.0)
        except Exception:
            pass

        return response

    async def _get_reputation_score(self, ip):
        try:
            rep = await self.reputation.get_reputation(ip)
            return rep.get('score', 0) if isinstance(rep, dict) else 0
        except Exception:
            return 0

    async def _apply_progressive_action(self, ip, block_eval):
        level = block_eval['level']
        try:
            if level == 1:
                await self.progressive.apply_throttle(ip)
            elif level == 2:
                await self.progressive.apply_temp_block(ip)
            elif level == 3:
                await self.progressive.apply_captcha(ip)
            elif level == 4:
                await self.progressive.apply_block(ip)
            elif level == 5:
                await self.progressive.apply_permanent_ban(ip)
            await self.alerts.send_alert('progressive_block', 'warning',
                f"Progressive block level {level} applied to {ip}: {block_eval['reason']}")
        except Exception:
            pass

    async def _block_response(self, ip, reason, level):
        import hashlib
        ref_id = hashlib.md5(f'{ip}:{time.time()}'.encode()).hexdigest()[:12]
        await self.logger.log_blocked(ip, '', reason, level)
        try:
            await self.alerts.send_alert('blocked', 'warning', f"Blocked {ip}: {reason} (level {level})")
        except Exception:
            pass
        html = BLOCK_PAGE_TEMPLATE.format(reason=reason, ref_id=ref_id, timestamp=time.strftime('%Y-%m-%d %H:%M:%S'))
        return HTMLResponse(content=html, status_code=403)
