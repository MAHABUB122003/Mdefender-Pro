from src.database.mongodb_connection import MongoDB
from src.engine.ml_detector import MLDetector
from src.engine.rule_engine import RuleEngine
from src.engine.feature_extractor import FeatureExtractor
from src.engine.request_parser import RequestParser
from src.engine.decision_engine import DecisionEngine
from src.security.rate_limiter import RateLimiter
from src.security.ip_filter import IPFilter
from src.security.attack_blocker import AttackBlocker
from src.utils.logger import Logger
from src.utils.api_key import generate_api_key
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
        self.decision_engine = DecisionEngine(ml_detector=self.ml_detector)
        self.rate_limiter = RateLimiter()
        self.ip_filter = IPFilter()
        self.attack_blocker = AttackBlocker()
        self.logger = Logger()

    def _get_confidence_threshold(self):
        settings_doc = self.db.settings.find_one({'_type': 'waf_settings'})
        if settings_doc and 'confidence_threshold' in settings_doc:
            return float(settings_doc['confidence_threshold'])
        return 0.7

    def _hostname(self, url_or_host):
        value = (url_or_host or "").strip().lower()
        value = value.split("://")[-1]
        value = value.split("/")[0].split("?")[0].split("#")[0]
        if ":" in value:
            value = value.split(":")[0]
        return value

    def verify_api_key(self, api_key, domain=None):
        if not api_key:
            return None
        api_key = api_key.strip()
        
        # Check high-speed in-memory cache (TTL: 60s)
        cache_key = f"{api_key}::{domain or ''}"
        now_ts = datetime.now().timestamp()
        if hasattr(self, '_key_cache') and cache_key in self._key_cache:
            entry, exp = self._key_cache[cache_key]
            if now_ts < exp:
                return entry
        else:
            self._key_cache = {}

        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        record = self.db.api_keys.find_one({'key_hash': key_hash, 'status': 'active'})
        if record:
            user_id = str(record.get('user_id', ''))
            website_id = record.get('website_id')
            if domain and website_id:
                website = self.db.websites.find_one({'_id': website_id})
                if website:
                    expected = self._hostname(domain)
                    if expected and expected not in ("localhost", "127.0.0.1") and \
                       self._hostname(website.get("domain")) != expected and \
                       self._hostname(website.get("url")) != expected:
                        return None
            res_val = {'user_id': user_id, 'website_id': website_id, 'api_key': api_key}
            self._key_cache[cache_key] = (res_val, now_ts + 60)
            return res_val

        # Legacy fallback (user master account key)
        user = self.db.users.find_one({
            'api_key': api_key,
            '$or': [{'status': 'active'}, {'is_active': True}],
        })
        if user:
            user_id_str = str(user['_id'])
            expected = self._hostname(domain) if domain else "localhost"
            website = None
            if domain:
                website = self.db.websites.find_one({
                    'user_id': user_id_str,
                    '$or': [
                        {'domain': {'$regex': f"^{expected}", '$options': 'i'}},
                        {'url': {'$regex': f"://{expected}", '$options': 'i'}},
                        {'domain': expected},
                    ]
                })
            if not website:
                website = self.db.websites.find_one({'user_id': user_id_str})
            if not website:
                try:
                    import uuid
                    site_id = str(uuid.uuid4())
                    now = datetime.now()
                    site_name = domain or "WordPress Site"
                    website = {
                        "_id": site_id,
                        "user_id": user_id_str,
                        "name": site_name,
                        "url": f"http://{expected}" if expected else "http://localhost",
                        "domain": expected or "localhost",
                        "platform": "wordpress",
                        "status": "active",
                        "protection_enabled": True,
                        "waf_mode": "protect",
                        "malware_scanner": True,
                        "threat_level": "LOW",
                        "verified": True,
                        "connected_at": now,
                        "last_activity": now,
                        "created_at": now,
                        "updated_at": now,
                    }
                    self.db.websites.insert_one(website)
                    self.db.api_keys.insert_one({
                        "website_id": site_id,
                        "user_id": user_id_str,
                        "key_hash": key_hash,
                        "label": "wordpress_auto",
                        "created_at": now,
                        "status": "active",
                        "last_used": now,
                    })
                except Exception:
                    return None
            return {'user_id': user_id_str, 'website_id': website['_id'], 'api_key': api_key}
            
        return None

    def connect_website(self, data):
        # NOTE: Deprecated in favor of UserAPI.add_website for multitenant support.
        # Keeping minimal functionality for backward compatibility during transition.
        domain = data.get('domain')
        origin_server = data.get('origin_server')
        security_level = data.get('security_level', 'high')
        
        raw_key = generate_api_key()
        website_id = str(uuid.uuid4())
        
        client = {
            '_id': website_id,
            'domain': domain,
            'origin_server': origin_server,
            'security_level': security_level,
            'status': 'active',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        self.db.clients.insert_one(client)
        
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        self.db.api_keys.insert_one({
            'website_id': website_id,
            'user_id': None,
            'key_hash': key_hash,
            'created_at': datetime.now(),
            'status': 'active'
        })
        
        return {
            'status': 'success',
            'client_id': website_id,
            'api_key': raw_key,
            'message': 'Website connected successfully'
        }

    def analyze_request(self, request_data, user_id=None, domain=None, website_id=None):
        from bson import ObjectId
        
        ip = request_data.get('ip', '')
        url = request_data.get('url', '/')
        method = request_data.get('method', 'GET')
        user_agent = (request_data.get("headers") or {}).get("User-Agent", "")

        is_whitelisted = self.ip_filter.is_whitelisted(ip)
        is_blacklisted = self.attack_blocker.is_blacklisted(ip)
        is_rate_limited = self.rate_limiter.is_rate_limited(ip)

        if is_rate_limited:
            self.attack_blocker.auto_block(ip, 'Rate limit exceeded', 1)

        decision = self.decision_engine.evaluate(
            request_data,
            ip=ip,
            is_blacklisted=is_blacklisted,
            is_rate_limited=is_rate_limited,
            allowlist=is_whitelisted,
            user_id=user_id,
            website_id=website_id,
            domain=domain
        )

        is_blocked = decision['decision'] == 'BLOCK'
        self.rate_limiter.increment(ip)

        confidence = decision['confidence']
        attack_type = decision.get('attack_type')
        status = 'blocked' if is_blocked else 'allowed'
        
        log_entry = {
            'ip': ip,
            'url': url,
            'attack_type': attack_type or ('Normal' if not is_blocked else 'Suspicious'),
            'status': status,
            'confidence': confidence,
            'timestamp': datetime.now(),
            'details': {
                'ml_model_version': decision.get('ml_model_version'),
                'reason': decision['reason']
            },
            'user_id': user_id or '',
            'domain': domain or '',
            'website_id': website_id or '',
            'detection_source': 'rule' if 'rule' in decision['reason'].lower() else 'ml',
        }
        
        try:
            self.db.attacks.insert_one(log_entry)
            if website_id:
                self.db.waf_events.insert_one(log_entry.copy())
        except Exception:
            pass
            
        try:
            signals = decision.get("signals", {})
            detection_source = "combined"
            if signals.get("rule_matches"):
                detection_source = "rule"
            elif signals.get("ml_probability", 0) >= 0.6:
                detection_source = "ml"

            event = {
                "user_id": user_id or "",
                "website_id": website_id or "",
                "timestamp": datetime.now(),
                "source_ip": ip,
                "method": method,
                "endpoint": url,
                "attack_type": attack_type,
                "detection_source": detection_source,
                "risk_score": decision.get("risk_score", 0),
                "action": decision.get("action"),
                "status": decision.get("action"),
                "reference_id": decision.get("reference_id"),
                "user_agent": user_agent,
            }
            self.db.security_events.insert_one(event)
        except Exception:
            pass

        # Update statistics in DB
        if user_id:
            today = datetime.now().strftime('%Y-%m-%d')
            user_ref = ObjectId(user_id) if len(str(user_id)) == 24 else user_id
            try:
                user_doc = self.db.users.find_one({'_id': user_ref})
                if user_doc:
                    if user_doc.get('requests_today_date') != today:
                        self.db.users.update_one(
                            {'_id': user_ref},
                            {'$set': {'requests_today': 0, 'requests_today_date': today}}
                        )
                    inc_user = {'total_requests': 1, 'requests_today': 1}
                    if is_blocked:
                        inc_user['total_blocked'] = 1
                    self.db.users.update_one({'_id': user_ref}, {'$inc': inc_user})
            except Exception:
                pass

        if website_id:
            today = datetime.now().strftime('%Y-%m-%d')
            try:
                web_doc = self.db.websites.find_one({'_id': website_id})
                if web_doc:
                    if web_doc.get('requests_today_date') != today:
                        self.db.websites.update_one(
                            {'_id': website_id},
                            {'$set': {'requests_today': 0, 'blocked_today': 0, 'requests_today_date': today}}
                        )
                    inc_web = {'requests_today': 1}
                    if is_blocked:
                        inc_web['blocked_today'] = 1
                    self.db.websites.update_one(
                        {'_id': website_id},
                        {'$inc': inc_web, '$set': {'last_activity': datetime.now()}}
                    )
            except Exception:
                pass

        self.logger.logger.warning(f"Attack: {attack_type} | IP: {ip} | URL: {url} | Status: {status}")

        if is_blocked:
            return {
                'status': 'blocked',
                'attack_type': attack_type,
                'confidence': round(confidence, 2),
                'message': decision['reason'],
                'reference_id': decision['reference_id'],
                'threat_score': decision['risk_score'],
                'risk_level': decision['risk_level'],
                'category': attack_type,
                'ml_model_version': decision.get('ml_model_version', 'unknown')
            }
        else:
            return {
                'status': 'allowed',
                'attack_type': None,
                'confidence': round(confidence, 2),
                'message': 'Request allowed',
                'threat_score': decision['risk_score'],
                'risk_level': decision['risk_level'],
                'category': None,
                'ml_model_version': decision.get('ml_model_version', 'unknown')
            }

    def _infer_attack_type(self, features):
        keys = [
            ('has_sqli', 'SQL Injection'), ('sql_score', 'SQL Injection'),
            ('has_xss', 'XSS'), ('xss_score', 'XSS'),
            ('has_lfi', 'Local File Inclusion'), ('lfi_score', 'Local File Inclusion'),
            ('has_cmd_injection', 'Command Injection'), ('rce_score', 'Command Injection'),
            ('ssti_score', 'SSTI'), ('ssrf_score', 'SSRF'),
            ('has_csrf', 'CSRF'),
        ]
        for key, label in keys:
            if features.get(key, 0) > 0:
                return label
        return None

    def _risk_level(self, score):
        if score >= 80:
            return 'critical'
        if score >= 60:
            return 'high'
        if score >= 30:
            return 'medium'
        return 'low'

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

    def evaluate_request_fast(self, request_data, user_id=None, domain=None, website_id=None):
        from src.engine.decision_engine import DecisionEngine
        
        ip = request_data.get('ip', '')
        url = request_data.get('url', '/')
        method = request_data.get('method', 'GET')
        user_agent = (request_data.get("headers") or {}).get("User-Agent", "")

        is_whitelisted = self.ip_filter.is_whitelisted(ip)
        is_blacklisted = self.attack_blocker.is_blacklisted(ip)
        is_rate_limited = self.rate_limiter.is_rate_limited(ip)

        decision_engine = DecisionEngine(ml_detector=self.ml_detector)
        decision = decision_engine.evaluate(
            request_data,
            ip=ip,
            is_blacklisted=is_blacklisted,
            is_rate_limited=is_rate_limited,
            allowlist=is_whitelisted,
            user_id=user_id,
            website_id=website_id,
            domain=domain
        )

        is_blocked = decision['decision'] == 'BLOCK'
        confidence = decision['confidence']
        attack_type = decision.get('attack_type')
        status = 'blocked' if is_blocked else 'allowed'

        log_entry = {
            'ip': ip,
            'url': url,
            'attack_type': attack_type or ('Normal' if not is_blocked else 'Suspicious'),
            'status': status,
            'confidence': confidence,
            'timestamp': datetime.now(),
            'details': {
                'ml_model_version': decision.get('ml_model_version'),
                'reason': decision['reason']
            },
            'user_id': user_id or '',
            'domain': domain or '',
            'website_id': website_id or '',
            'detection_source': 'rule' if 'rule' in decision['reason'].lower() else 'ml',
        }

        signals = decision.get("signals", {})
        detection_source = "combined"
        if signals.get("rule_matches"):
            detection_source = "rule"
        elif signals.get("ml_probability", 0) >= 0.6:
            detection_source = "ml"

        event = {
            "user_id": user_id or "",
            "website_id": website_id or "",
            "timestamp": datetime.now(),
            "source_ip": ip,
            "method": method,
            "endpoint": url,
            "attack_type": attack_type,
            "detection_source": detection_source,
            "risk_score": decision.get("risk_score", 0),
            "action": decision.get("action"),
            "status": decision.get("action"),
            "reference_id": decision.get("reference_id"),
            "user_agent": user_agent,
        }

        return decision, log_entry, event, is_blocked, ip

    def async_save_logs(self, decision, log_entry, event, is_blocked, ip, user_id, website_id):
        from bson import ObjectId
        try:
            self.rate_limiter.increment(ip)
        except Exception: pass

        if is_blocked and decision.get('is_rate_limited'):
            try:
                self.attack_blocker.auto_block(ip, 'Rate limit exceeded', 1)
            except Exception: pass

        try:
            self.db.attacks.insert_one(log_entry)
            if website_id:
                self.db.waf_events.insert_one(log_entry.copy())
        except Exception: pass

        try:
            self.db.security_events.insert_one(event)
        except Exception: pass

        if user_id:
            today = datetime.now().strftime('%Y-%m-%d')
            user_ref = ObjectId(user_id) if len(str(user_id)) == 24 else user_id
            try:
                user_doc = self.db.users.find_one({'_id': user_ref})
                if user_doc:
                    if user_doc.get('requests_today_date') != today:
                        self.db.users.update_one(
                            {'_id': user_ref},
                            {'$set': {'requests_today': 0, 'requests_today_date': today}}
                        )
                    inc_user = {'total_requests': 1, 'requests_today': 1}
                    if is_blocked:
                        inc_user['total_blocked'] = 1
                    self.db.users.update_one({'_id': user_ref}, {'$inc': inc_user})
            except Exception: pass

        if website_id:
            today = datetime.now().strftime('%Y-%m-%d')
            try:
                web_doc = self.db.websites.find_one({'_id': website_id})
                if web_doc:
                    if web_doc.get('requests_today_date') != today:
                        self.db.websites.update_one(
                            {'_id': website_id},
                            {'$set': {'requests_today': 0, 'blocked_today': 0, 'requests_today_date': today}}
                        )
                    inc_web = {'requests_today': 1}
                    if is_blocked:
                        inc_web['blocked_today'] = 1
                    self.db.websites.update_one(
                        {'_id': website_id},
                        {'$inc': inc_web, '$set': {'last_activity': datetime.now()}}
                    )
            except Exception: pass

        try:
            self.logger.logger.warning(f"Attack logged: {decision.get('attack_type')} | IP: {ip} | Status: {'blocked' if is_blocked else 'allowed'}")
        except Exception: pass

