from src.database.mongodb_connection import MongoDB
from src.engine.ml_detector import MLDetector
from src.engine.rule_engine import RuleEngine
from src.engine.feature_extractor import FeatureExtractor
from src.engine.request_parser import RequestParser
from src.security.rate_limiter import RateLimiter
from src.security.ip_filter import IPFilter
from src.security.attack_blocker import AttackBlocker
from src.utils.logger import Logger
from datetime import datetime
import uuid
import hashlib
import logging

_log = logging.getLogger(__name__)


class WAFAPI:
    def __init__(self):
        self.db = MongoDB()
        self.ml_detector = MLDetector()
        self.rule_engine = RuleEngine()
        self.feature_extractor = FeatureExtractor()
        self.request_parser = RequestParser()
        self.rate_limiter = RateLimiter()
        self.ip_filter = IPFilter()
        self.attack_blocker = AttackBlocker()
        self.logger = Logger()

    def _get_confidence_threshold(self):
        settings_doc = self.db.settings.find_one({'_type': 'waf_settings'})
        if settings_doc and 'confidence_threshold' in settings_doc:
            return float(settings_doc['confidence_threshold'])
        return 0.7

    def verify_api_key(self, api_key, domain):
        if not api_key or not domain:
            return False
        client = self.db.clients.find_one({
            'domain': domain,
            'api_key': api_key,
            'status': 'active'
        })
        return client is not None

    def connect_website(self, data):
        domain = data.get('domain')
        origin_server = data.get('origin_server')
        security_level = data.get('security_level', 'high')
        api_key = hashlib.sha256(f"{domain}{datetime.now()}{uuid.uuid4()}".encode()).hexdigest()[:32]
        client = {
            'domain': domain,
            'origin_server': origin_server,
            'security_level': security_level,
            'api_key': api_key,
            'status': 'active',
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'settings': {
                'block_sqli': True,
                'block_xss': True,
                'block_lfi': True,
                'block_cmd_injection': True,
                'block_csrf': True,
                'confidence_threshold': 0.7
            }
        }
        result = self.db.clients.insert_one(client)
        return {
            'status': 'success',
            'client_id': str(result.inserted_id),
            'api_key': api_key,
            'message': 'Website connected successfully'
        }

    def analyze_request(self, request_data):
        ip = request_data.get('ip', '')
        url = request_data.get('url', '/')
        method = request_data.get('method', 'GET')
        settings = self.attack_blocker.get_settings()
        threshold = settings.get('auto_block_threshold', 20)
        window = settings.get('auto_block_window_hours', 24)
        duration = settings.get('auto_block_duration_hours', 24)
        confidence_threshold = self._get_confidence_threshold()

        if self.ip_filter.is_whitelisted(ip):
            return {'status': 'allowed', 'attack_type': None, 'confidence': 0.0, 'message': 'Whitelisted IP bypassed'}
        if self.attack_blocker.is_blacklisted(ip):
            self.logger.log_attack(ip, url, 'Auto-Blocked IP', 'blocked', 1.0)
            return {'status': 'blocked', 'attack_type': 'Blacklisted IP', 'confidence': 1.0, 'message': 'IP is blacklisted', 'reference_id': str(uuid.uuid4())[:8]}
        if self.rate_limiter.is_rate_limited(ip):
            self.attack_blocker.auto_block(ip, 'Rate limit exceeded', 1)
            self.logger.log_attack(ip, url, 'Rate Limiting', 'blocked', 1.0)
            return {'status': 'blocked', 'attack_type': 'Rate Limiting', 'confidence': 1.0, 'message': 'Rate limit exceeded', 'reference_id': str(uuid.uuid4())[:8]}

        parsed = self.request_parser.parse(request_data)
        features = self.feature_extractor.extract_features(parsed)
        rule_matches = self.rule_engine.check_rules(parsed)

        if rule_matches:
            attack_type = rule_matches[0]['rule_name']
            confidence = 0.9
            self.attack_blocker.record_attack(ip, attack_type, url)
            if settings.get('auto_block_enabled', True):
                self.attack_blocker.check_and_auto_block(ip, threshold, window, duration)
            self.logger.log_attack(ip, url, attack_type, 'blocked', confidence)
            self.rate_limiter.increment(ip)
            return {'status': 'blocked', 'attack_type': attack_type, 'confidence': confidence, 'message': f"Blocked by rule: {attack_type}", 'reference_id': str(uuid.uuid4())[:8], 'rule_matched': rule_matches[0]['rule_name']}

        ml_confidence = 0.0
        attack_type = None
        attack_keys = ['sql_score', 'xss_score', 'lfi_score', 'rce_score', 'ssti_score', 'ssrf_score']
        has_attack_signal = any(features.get(k, 0) > 0 for k in attack_keys)
        if has_attack_signal:
            ml_confidence = self.ml_detector.predict(features)
        if ml_confidence >= confidence_threshold:
            attack_type = self.ml_detector.get_attack_type(features) or 'Suspicious'
            confidence = ml_confidence
            self.attack_blocker.record_attack(ip, attack_type, url)
            if settings.get('auto_block_enabled', True):
                self.attack_blocker.check_and_auto_block(ip, threshold, window, duration)
            self.logger.log_attack(ip, url, attack_type, 'blocked', confidence)
            self.rate_limiter.increment(ip)
            return {'status': 'blocked', 'attack_type': attack_type, 'confidence': round(confidence, 2), 'message': f"ML model detected {attack_type} (confidence: {confidence:.2f})", 'reference_id': str(uuid.uuid4())[:8]}

        self.logger.log_request(ip, url, method, 'allowed')
        self.rate_limiter.increment(ip)
        return {'status': 'allowed', 'attack_type': None, 'confidence': round(ml_confidence, 2), 'message': 'Request allowed'}

    def _serialize_doc(self, doc):
        if not doc:
            return doc
        result = {}
        for k, v in doc.items():
            if k == '_id':
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.strftime('%Y-%m-%d %H:%M:%S')
            else:
                result[k] = v
        return result

    def get_stats(self, domain=None):
        if domain:
            client = self.db.clients.find_one({'domain': domain})
            if not client:
                return {'error': 'Domain not found'}
        total_requests = self.db.requests.count_documents({})
        total_attacks = self.db.attacks.count_documents({})
        attack_types_pipeline = [{'$group': {'_id': '$attack_type', 'count': {'$sum': 1}}}]
        attack_types_raw = list(self.db.attacks.aggregate(attack_types_pipeline))
        attack_types = {item['_id']: item['count'] for item in attack_types_raw}
        top_attackers = list(self.db.attacks.aggregate([
            {'$group': {'_id': '$ip', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10}
        ]))
        recent_logs = []
        for log in self.db.attacks.find().sort('timestamp', -1).limit(10):
            recent_logs.append(self._serialize_doc(log))
        return {
            'total_requests': total_requests,
            'total_attacks_blocked': total_attacks,
            'attack_types': list(attack_types.keys()),
            'attack_counts': list(attack_types.values()),
            'top_attackers': [{'ip': item['_id'], 'count': item['count']} for item in top_attackers],
            'active_clients': self.db.clients.count_documents({'status': 'active'}),
            'blacklisted_ips': self.db.blacklist.count_documents({}),
            'recent_logs': recent_logs
        }

    def block_ip(self, ip, reason):
        existing = self.db.blacklist.find_one({'ip': ip})
        if existing:
            return {'status': 'error', 'message': 'IP already blacklisted'}
        self.db.blacklist.insert_one({
            'ip': ip,
            'reason': reason or 'Blocked via API',
            'blocked_at': datetime.now(),
            'type': 'permanent',
            'auto_blocked': False
        })
        self.ip_filter.add_to_blacklist(ip)
        return {'status': 'success', 'message': 'IP blocked successfully'}

    def get_logs(self, params):
        page = int(params.get('page', 1))
        limit = int(params.get('limit', 50))
        attack_type = params.get('attack_type')
        query = {}
        if attack_type:
            query['attack_type'] = attack_type
        total = self.db.attacks.count_documents(query)
        logs = list(self.db.attacks.find(query)
            .sort('timestamp', -1)
            .skip((page - 1) * limit)
            .limit(limit))
        return {
            'total': total,
            'page': page,
            'logs': [{
                'ip': log.get('ip'),
                'url': log.get('url'),
                'attack_type': log.get('attack_type'),
                'timestamp': log.get('timestamp').strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') else None,
                'status': log.get('status'),
                'confidence': log.get('confidence')
            } for log in logs]
        }
