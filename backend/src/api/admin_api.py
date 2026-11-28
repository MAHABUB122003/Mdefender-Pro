from src.database.mongodb_connection import MongoDB
from src.engine.rule_engine import RuleEngine
from src.engine.ml_detector import MLDetector
from src.engine.malware_detector import MalwareDetector
from src.security.auth import Auth
from src.security.attack_blocker import AttackBlocker
from src.security.ip_filter import IPFilter
from src.utils.logger import Logger
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import uuid
import hashlib
import logging
import math

_log = logging.getLogger(__name__)

class AdminAPI:
    def __init__(self):
        self.db = MongoDB()
        self.rule_engine = RuleEngine()
        self.auth = Auth()
        self.logger = Logger()
        self.attack_blocker = AttackBlocker()
        self.ml_detector = MLDetector()
        self.malware_detector = MalwareDetector()
        self.ip_filter = IPFilter()

    def get_stats(self):
        total_requests = self.db.requests.count_documents({})
        total_attacks = self.db.attacks.count_documents({})
        attack_types_raw = list(self.db.attacks.aggregate([
            {'$group': {'_id': '$attack_type', 'count': {'$sum': 1}}}
        ]))
        attack_types = [item['_id'] for item in attack_types_raw]
        attack_counts = [item['count'] for item in attack_types_raw]
        top_attackers = list(self.db.attacks.aggregate([
            {'$group': {'_id': '$ip', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10}
        ]))
        recent_logs = list(self.db.attacks.find().sort('timestamp', -1).limit(10))
        for log in recent_logs:
            if '_id' in log:
                log['_id'] = str(log['_id'])
            if 'timestamp' in log and log['timestamp']:
                log['timestamp'] = log['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        malware_total = self.db.malware_scans.count_documents({})
        malware_verdicts_raw = list(self.db.malware_scans.aggregate([
            {'$group': {'_id': '$verdict', 'count': {'$sum': 1}}}
        ]))
        malware_verdicts = {item['_id'] or 'unknown': item['count'] for item in malware_verdicts_raw}
        malware_families_raw = list(self.db.malware_scans.aggregate([
            {'$match': {'verdict': 'malicious', 'family': {'$ne': None}}},
            {'$group': {'_id': '$family', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10},
        ]))
        recent_scans = list(self.db.malware_scans.find().sort('timestamp', -1).limit(10))
        for log in recent_scans:
            if '_id' in log:
                log['_id'] = str(log['_id'])
            ts = log.get('timestamp')
            if isinstance(ts, datetime):
                log['timestamp'] = ts.strftime('%Y-%m-%d %H:%M:%S')
            elif ts is None:
                log['timestamp'] = ''

        detection_sources_raw = list(self.db.attacks.aggregate([
            {'$group': {'_id': '$detection_source', 'count': {'$sum': 1}}}
        ]))
        detection_sources = {
            (item['_id'] or 'rule'): item['count'] for item in detection_sources_raw
        }
        ml_detections = sum(count for key, count in detection_sources.items() if key == 'ml')
        ml_categories_raw = list(self.db.attacks.aggregate([
            {'$match': {'detection_source': 'ml'}},
            {'$group': {'_id': '$attack_type', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10},
        ]))
        waf_status = self.ml_detector.get_status()
        malware_status = self.malware_detector.get_status()
        return {
            'total_requests': total_requests,
            'total_attacks_blocked': total_attacks,
            'active_clients': self.db.clients.count_documents({'status': 'active'}),
            'blacklisted_ips': self.db.blacklist.count_documents({}),
            'attack_types': attack_types,
            'attack_counts': attack_counts,
            'top_attackers': [{'ip': item['_id'], 'count': item['count']} for item in top_attackers],
            'recent_logs': recent_logs,
            'malware': {
                'total_scans': malware_total,
                'verdicts': malware_verdicts,
                'top_families': [{'family': item['_id'], 'count': item['count']} for item in malware_families_raw],
                'recent_scans': recent_scans,
            },
            'ml': {
                'waf': {
                    'loaded': waf_status.get('loaded'),
                    'model_version': waf_status.get('model_version'),
                    'threshold': waf_status.get('threshold'),
                    'n_category_classes': waf_status.get('n_category_classes'),
                    'training_date': waf_status.get('training_date'),
                },
                'malware_model': {
                    'loaded': malware_status.get('loaded'),
                    'model_version': malware_status.get('model_version'),
                    'n_family_classes': malware_status.get('n_family_classes'),
                    'training_date': malware_status.get('training_date'),
                },
                'detection_sources': detection_sources,
                'ml_detections': ml_detections,
                'ml_categories': [{'category': item['_id'], 'count': item['count']} for item in ml_categories_raw],
            },
        }

    def get_rules(self):
        rules = []
        for i, rule in enumerate(self.rule_engine.default_rules):
            rules.append({
                'id': str(i),
                'name': rule.get('name', ''),
                'pattern': rule.get('pattern', ''),
                'action': rule.get('action', 'block'),
                'severity': rule.get('severity', 'medium'),
                'enabled': rule.get('enabled', True),
                'created_at': rule.get('created_at', '').isoformat() if rule.get('created_at') else ''
            })
        return rules

    def create_rule(self, data):
        rule = {
            'name': data.get('name'),
            'pattern': data.get('pattern'),
            'action': data.get('action', 'block'),
            'severity': data.get('severity', 'medium'),
            'enabled': True,
            'created_at': datetime.now()
        }
        self.rule_engine.add_rule(rule)
        return {'status': 'success', 'message': 'Rule created successfully'}

    def update_rule(self, rule_id, data):
        try:
            index = int(rule_id)
            self.rule_engine.update_rule(index, data)
            return {'status': 'success', 'message': 'Rule updated successfully'}
        except (ValueError, IndexError):
            return {'status': 'error', 'message': 'Invalid rule ID'}

    def delete_rule(self, rule_id):
        try:
            index = int(rule_id)
            self.rule_engine.delete_rule(index)
            return {'status': 'success', 'message': 'Rule deleted successfully'}
        except (ValueError, IndexError):
            return {'status': 'error', 'message': 'Invalid rule ID'}

    def get_clients(self):
        clients = []
        for client in self.db.clients.find():
            clients.append({
                'id': str(client['_id']),
                'domain': client.get('domain', ''),
                'origin_server': client.get('origin_server', ''),
                'security_level': client.get('security_level', 'high'),
                'api_key': client.get('api_key', ''),
                'status': client.get('status', 'active'),
                'created_at': client['created_at'].strftime('%Y-%m-%d %H:%M:%S') if client.get('created_at') else '',
                'settings': client.get('settings', {})
            })
        return clients

    def add_client(self, data):
        api_key = hashlib.sha256(f"{data.get('domain')}{datetime.now()}{uuid.uuid4()}".encode()).hexdigest()[:32]
        client = {
            'domain': data.get('domain'),
            'origin_server': data.get('origin_server'),
            'security_level': data.get('security_level', 'high'),
            'api_key': api_key,
            'status': 'active',
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'settings': {
                'block_sqli': True,
                'block_xss': True,
                'block_lfi': True,
                'block_cmd_injection': True,
                'confidence_threshold': 0.7
            }
        }
        result = self.db.clients.insert_one(client)
        return {'status': 'success', 'id': str(result.inserted_id), 'api_key': api_key, 'message': 'Client added successfully'}

    def update_client(self, client_id, data):
        try:
            oid = ObjectId(client_id)
            update_data = {k: v for k, v in data.items() if k not in ['id', '_id']}
            update_data['updated_at'] = datetime.now()
            self.db.clients.update_one({'_id': oid}, {'$set': update_data})
            return {'status': 'success', 'message': 'Client updated successfully'}
        except:
            return {'status': 'error', 'message': 'Invalid client ID'}

    def delete_client(self, client_id):
        try:
            oid = ObjectId(client_id)
            self.db.clients.delete_one({'_id': oid})
            return {'status': 'success', 'message': 'Client deleted successfully'}
        except:
            return {'status': 'error', 'message': 'Invalid client ID'}

    def get_settings(self):
        settings_doc = self.db.settings.find_one({'_type': 'waf_settings'})
        if not settings_doc:
            return {
                'security_level': 'high',
                'confidence_threshold': 0.7,
                'rate_limit': 100,
                'learning_mode': False,
                'log_retention_days': 30,
                'email_alerts': False,
                'smtp_server': '',
                'smtp_port': 587,
                'smtp_username': '',
                'smtp_password': '',
                'alert_email': '',
                'block_logo': '',
                'block_message': 'This request has been blocked by Web Application Firewall',
                'block_colors': '#667eea,#764ba2'
            }
        settings_doc.pop('_id', None)
        settings_doc.pop('_type', None)
        return settings_doc

    def update_settings(self, data):
        self.db.settings.update_one(
            {'_type': 'waf_settings'},
            {'$set': {**data, '_type': 'waf_settings'}},
            upsert=True
        )
        self._reload_proxy_settings()
        return {'status': 'success', 'message': 'Settings updated successfully'}

    def _reload_proxy_settings(self):
        try:
            import requests as http_client
            r = http_client.post('http://localhost:3000/_waf_reload', timeout=2)
            if r.status_code == 200:
                _log.info("Proxy settings reloaded successfully")
            else:
                _log.warning("Proxy reload returned status %d", r.status_code)
        except Exception as e:
            _log.warning("Failed to reload proxy settings (proxy may not be running): %s", e)

    def change_password(self, data):
        old_password = data.get('old_password') or ''
        new_password = data.get('new_password') or ''
        email = (data.get('email') or '').strip()
        ip = data.get('ip', 'unknown')

        if len(new_password) < 6:
            return {'status': 'error', 'message': 'New password must be at least 6 characters'}

        if email and email != 'admin':
            user_doc = self.db.users.find_one({'email': email})
            if user_doc:
                import bcrypt
                pw_hash = user_doc.get('password_hash') or user_doc.get('password') or ''
                if not pw_hash:
                    return {'status': 'error', 'message': 'Account uses SSO/OAuth login'}
                valid = False
                try:
                    valid = bcrypt.checkpw(old_password.encode('utf-8'), pw_hash.encode('utf-8'))
                except Exception:
                    valid = False
                if not valid:
                    return {'status': 'error', 'message': 'Current password is incorrect'}
                new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                self.db.users.update_one(
                    {'_id': user_doc['_id']},
                    {'$set': {'password_hash': new_hash, 'updated_at': datetime.now()}}
                )
                return {'status': 'success', 'message': 'Password changed successfully'}

        if self.auth.verify_admin('admin', old_password, ip):
            self.auth.update_password('admin', new_password)
            return {'status': 'success', 'message': 'Password changed successfully'}
        return {'status': 'error', 'message': 'Current password is incorrect'}

    def clean_logs(self, days=30):
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(days=days)
        try:
            result = self.db.attacks.delete_many({'timestamp': {'$lt': cutoff}})
            self.db.requests.delete_many({'timestamp': {'$lt': cutoff}})
            return {'status': 'success', 'deleted': result.deleted_count, 'message': f'Deleted {result.deleted_count} logs older than {days} days'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def clean_all_logs(self):
        try:
            attacks_count = self.db.attacks.count_documents({})
            requests_count = self.db.requests.count_documents({})
            self.db.attacks.delete_many({})
            self.db.requests.delete_many({})
            return {'status': 'success', 'deleted': attacks_count + requests_count, 'message': f'Deleted all {attacks_count} attack logs and {requests_count} request logs'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def clean_auto_blocks(self):
        count = self.attack_blocker.cleanup_expired_blocks()
        return {'status': 'success', 'removed': count, 'message': f'Removed {count} expired auto-blocks'}

    def clean_attack_attempts(self, days=30):
        count = self.attack_blocker.cleanup_old_attempts(days)
        return {'status': 'success', 'removed': count, 'message': f'Removed {count} attack attempts older than {days} days'}

    def reset_stats(self, collection=None):
        try:
            if collection == 'attacks':
                count = self.db.attacks.count_documents({})
                self.db.attacks.delete_many({})
                return {'status': 'success', 'message': f'Reset {count} attack records'}
            elif collection == 'requests':
                count = self.db.requests.count_documents({})
                self.db.requests.delete_many({})
                return {'status': 'success', 'message': f'Reset {count} request records'}
            elif collection == 'all':
                a = self.db.attacks.count_documents({})
                r = self.db.requests.count_documents({})
                self.db.attacks.delete_many({})
                self.db.requests.delete_many({})
                self.db.attack_attempts.delete_many({})
                return {'status': 'success', 'message': f'Reset all stats: {a} attacks, {r} requests'}
            return {'status': 'error', 'message': 'Invalid collection'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def get_auto_block_settings(self):
        return self.attack_blocker.get_settings()

    def update_auto_block_settings(self, data):
        self.db.settings.update_one(
            {'_type': 'waf_settings'},
            {'$set': {
                'auto_block_enabled': data.get('auto_block_enabled', True),
                'auto_block_threshold': data.get('auto_block_threshold', 20),
                'auto_block_window_hours': data.get('auto_block_window_hours', 24),
                'auto_block_duration_hours': data.get('auto_block_duration_hours', 24),
            }},
            upsert=True
        )
        self._reload_proxy_settings()
        return {'status': 'success', 'message': 'Auto-block settings updated'}

    def get_auto_block_stats(self):
        try:
            from datetime import timedelta
            since_24h = datetime.now() - timedelta(hours=24)
            total_blocked = self.db.blacklist.count_documents({'auto_blocked': True})
            temp_blocked = self.db.blacklist.count_documents({'auto_blocked': True, 'type': 'temporary'})
            permanent_blocked = self.db.blacklist.count_documents({'auto_blocked': True, 'type': 'permanent'})
            attack_attempts_24h = self.db.attack_attempts.count_documents({
                'timestamp': {'$gte': since_24h}
            })
            return {
                'total_auto_blocked': total_blocked,
                'temp_blocked': temp_blocked,
                'permanent_blocked': permanent_blocked,
                'attack_attempts_24h': attack_attempts_24h
            }
        except Exception:
            return {'total_auto_blocked': 0, 'temp_blocked': 0, 'permanent_blocked': 0, 'attack_attempts_24h': 0}
