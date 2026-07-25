import time
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from ..database.mongodb_connection import MongoDB
from .config import DDoSConfig
from .redis_service import RedisService
from .traffic_monitor import TrafficMonitor
from .rate_limiter import RateLimiter
from .reputation import ReputationEngine
from .burst_detector import BurstDetector
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

router = APIRouter(prefix='/api/admin/ddos', tags=['DDoS Protection'])

config = DDoSConfig.from_file()
redis = RedisService()
monitor = TrafficMonitor(config=config, storage=redis)
rate_limiter = RateLimiter(config=config, storage=redis)
reputation = ReputationEngine(redis_service=redis, config=config)
burst_detector = BurstDetector(redis_service=redis, config=config)
progressive = ProgressiveBlocker()
challenge_mgr = ChallengeManager()
geo = GeoProtection()
asn = ASNProtection()
ua_analyzer = UAAnalyzer()
fingerprinter = RequestFingerprinter()
session_tracker = SessionTracker()
dynamic = DynamicRateLimiter()
api_protection = APIProtection()
alerts = AlertService()
ddos_logger = DDoSLogger()


def _verify_admin(request: Request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail='Unauthorized')
    return token


@router.get('/dashboard')
async def ddos_dashboard(request: Request, user=Depends(_verify_admin)):
    try:
        stats = await monitor.get_stats()
        top_ips = await monitor.get_top_ips(10)
        top_endpoints = await monitor.get_top_endpoints(10)
        top_offenders = await reputation.get_top_offenders(10)
        alerts_list = await alerts.get_alert_history(20)
        session_stats = await session_tracker.get_session_stats()
        system_metrics = await dynamic.get_system_metrics()
        active_sessions = len(await session_tracker.get_active_sessions())
        blocked_count = 0
        try:
            db = MongoDB()
            blocked_count = db.ddos_blocked.count_documents({}) if hasattr(db, 'ddos_blocked') else 0
        except Exception:
            pass
        return {
            'status': 'success',
            'stats': stats,
            'top_ips': top_ips,
            'top_endpoints': top_endpoints,
            'top_offenders': top_offenders,
            'alerts': alerts_list,
            'session_stats': session_stats,
            'system_metrics': system_metrics,
            'active_sessions': active_sessions,
            'blocked_count': blocked_count,
        }
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/stats')
async def get_ddos_stats(request: Request, user=Depends(_verify_admin)):
    try:
        stats = await monitor.get_stats()
        return {'status': 'success', 'stats': stats}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/traffic/timeline')
async def get_traffic_timeline(request: Request, user=Depends(_verify_admin)):
    try:
        window = int(request.query_params.get('window', 300))
        bucket = int(request.query_params.get('bucket', 5))
        timeline = await monitor.get_traffic_timeline(window, bucket)
        return {'status': 'success', 'timeline': timeline}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/top-ips')
async def get_top_ips(request: Request, user=Depends(_verify_admin)):
    try:
        limit = int(request.query_params.get('limit', 20))
        ips = await monitor.get_top_ips(limit)
        return {'status': 'success', 'ips': ips}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/top-endpoints')
async def get_top_endpoints(request: Request, user=Depends(_verify_admin)):
    try:
        limit = int(request.query_params.get('limit', 20))
        endpoints = await monitor.get_top_endpoints(limit)
        return {'status': 'success', 'endpoints': endpoints}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/reputation')
async def get_reputations(request: Request, user=Depends(_verify_admin)):
    try:
        reputations = await reputation.get_all_reputations()
        return {'status': 'success', 'reputations': reputations}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/reputation/{ip}')
async def get_ip_reputation(ip: str, request: Request, user=Depends(_verify_admin)):
    try:
        rep = await reputation.get_reputation(ip)
        return {'status': 'success', 'reputation': rep}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.post('/reputation/block')
async def block_ip_reputation(request: Request, user=Depends(_verify_admin)):
    try:
        data = await request.json()
        ip = data.get('ip')
        level = data.get('level', 4)
        duration = data.get('duration', 3600)
        if not ip:
            raise HTTPException(status_code=400, detail='IP required')
        await progressive.apply_block(ip, duration) if level == 4 else None
        await progressive.apply_permanent_ban(ip) if level == 5 else None
        await reputation.set_block_level(ip, level, duration)
        return {'status': 'success', 'message': f'IP {ip} blocked at level {level}'}
    except HTTPException:
        raise
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.post('/reputation/unblock')
async def unblock_ip(request: Request, user=Depends(_verify_admin)):
    try:
        data = await request.json()
        ip = data.get('ip')
        if not ip:
            raise HTTPException(status_code=400, detail='IP required')
        await progressive.remove_block(ip)
        await reputation.unblock_ip(ip)
        return {'status': 'success', 'message': f'IP {ip} unblocked'}
    except HTTPException:
        raise
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/blocks')
async def get_blocks(request: Request, user=Depends(_verify_admin)):
    try:
        blocked = await progressive.get_block_info('_all_')
        return {'status': 'success', 'blocks': blocked}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/alerts')
async def get_alerts(request: Request, user=Depends(_verify_admin)):
    try:
        limit = int(request.query_params.get('limit', 50))
        alert_list = await alerts.get_alert_history(limit)
        return {'status': 'success', 'alerts': alert_list}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.post('/alerts/clear')
async def clear_alerts(request: Request, user=Depends(_verify_admin)):
    try:
        await alerts.clear_alert_history()
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/sessions')
async def get_sessions(request: Request, user=Depends(_verify_admin)):
    try:
        sessions = await session_tracker.get_active_sessions()
        return {'status': 'success', 'sessions': sessions}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/sessions/stats')
async def get_session_stats(request: Request, user=Depends(_verify_admin)):
    try:
        stats = await session_tracker.get_session_stats()
        return {'status': 'success', 'stats': stats}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/system')
async def get_system_metrics(request: Request, user=Depends(_verify_admin)):
    try:
        metrics = await dynamic.get_system_metrics()
        return {'status': 'success', 'metrics': metrics}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/system/history')
async def get_metrics_history(request: Request, user=Depends(_verify_admin)):
    try:
        limit = int(request.query_params.get('limit', 60))
        history = await dynamic.get_metrics_history(limit)
        return {'status': 'success', 'history': history}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/config')
async def get_ddos_config(request: Request, user=Depends(_verify_admin)):
    try:
        return {
            'status': 'success',
            'config': {
                'enabled': config.enabled,
                'rate_limits': {
                    'anonymous_rps': config.rate_limits.anonymous_rps,
                    'anonymous_rpm': config.rate_limits.anonymous_rpm,
                    'authenticated_rps': config.rate_limits.authenticated_rps,
                    'api_key_rps': config.rate_limits.api_key_rps,
                },
                'reputation': {
                    'block_threshold': config.reputation.block_threshold,
                    'decay_rate': config.reputation.decay_rate,
                    'permanent_ban_threshold': config.reputation.permanent_ban_threshold,
                },
                'geo': await geo.get_config(),
                'asn': await asn.get_config(),
                'challenge': {
                    'enabled': config.challenge.enabled,
                    'js_challenge': config.challenge.js_challenge,
                    'captcha_enabled': config.challenge.captcha_enabled,
                },
                'alerts': {
                    'enabled': config.alerts.enabled,
                    'slack_enabled': config.alerts.slack_enabled,
                    'discord_enabled': config.alerts.discord_enabled,
                },
                'dynamic_limits': {
                    'enabled': config.dynamic_limits.enabled,
                    'cpu_threshold': config.dynamic_limits.cpu_threshold,
                    'memory_threshold': config.dynamic_limits.memory_threshold,
                },
            },
        }
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.post('/config')
async def update_ddos_config(request: Request, user=Depends(_verify_admin)):
    try:
        data = await request.json()
        if 'rate_limits' in data:
            for k, v in data['rate_limits'].items():
                if hasattr(config.rate_limits, k):
                    setattr(config.rate_limits, k, v)
        if 'reputation' in data:
            for k, v in data['reputation'].items():
                if hasattr(config.reputation, k):
                    setattr(config.reputation, k, v)
        if 'geo' in data:
            await geo.set_config(data['geo'])
        if 'asn' in data:
            await asn.set_config(data['asn'])
        if 'challenge' in data:
            for k, v in data['challenge'].items():
                if hasattr(config.challenge, k):
                    setattr(config.challenge, k, v)
        if 'enabled' in data:
            config.enabled = data['enabled']
        config.save()
        return {'status': 'success', 'message': 'Configuration updated'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/logs')
async def get_ddos_logs(request: Request, user=Depends(_verify_admin)):
    try:
        log_type = request.query_params.get('type', 'blocked')
        limit = int(request.query_params.get('limit', 100))
        offset = int(request.query_params.get('offset', 0))
        if log_type == 'blocked':
            logs = await ddos_logger.get_blocked_logs(limit, offset)
        elif log_type == 'attacks':
            logs = await ddos_logger.get_attack_logs(limit, offset)
        elif log_type == 'rate_limits':
            logs = await ddos_logger.get_rate_limit_logs(limit, offset)
        else:
            logs = []
        return {'status': 'success', 'logs': logs}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/logs/stats')
async def get_log_stats(request: Request, user=Depends(_verify_admin)):
    try:
        stats = await ddos_logger.get_stats()
        return {'status': 'success', 'stats': stats}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.post('/logs/cleanup')
async def cleanup_logs(request: Request, user=Depends(_verify_admin)):
    try:
        data = await request.json()
        days = data.get('days', 30)
        await ddos_logger.cleanup_old_logs(days)
        return {'status': 'success', 'message': f'Logs older than {days} days cleaned'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/bursts')
async def get_bursts(request: Request, user=Depends(_verify_admin)):
    try:
        alerts_list = await burst_detector.get_alerts(50)
        status = await burst_detector.get_global_burst_status()
        return {'status': 'success', 'alerts': alerts_list, 'global_status': status}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/ua/stats')
async def get_ua_stats(request: Request, user=Depends(_verify_admin)):
    try:
        stats = await ua_analyzer.get_stats()
        return {'status': 'success', 'stats': stats}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@router.get('/fingerprints/suspicious')
async def get_suspicious_fingerprints(request: Request, user=Depends(_verify_admin)):
    try:
        fps = await fingerprinter.get_suspicious_fingerprints()
        return {'status': 'success', 'fingerprints': fps}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}
