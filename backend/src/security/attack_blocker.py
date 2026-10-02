import logging
from datetime import datetime, timedelta
from bson import ObjectId
from src.database.mongodb_connection import MongoDB

logger = logging.getLogger(__name__)


class AttackBlocker:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def record_attack(self, ip, attack_type, url='', user_id=None, website_id=None):
        u_str = str(user_id) if user_id else ""
        doc = {
            'ip': ip,
            'attack_type': attack_type,
            'url': url,
            'user_id': u_str,
            'website_id': str(website_id) if website_id else "",
            'timestamp': datetime.now(),
        }
        try:
            self.db.attack_attempts.insert_one(doc)
            logger.info("Recorded attack: %s [%s] from %s (user: %s)", url, attack_type, ip, u_str)
        except Exception as e:
            logger.error("Failed to record attack for %s: %s", ip, e)

    def get_attack_count(self, ip, hours=24, user_id=None):
        since = datetime.now() - timedelta(hours=hours)
        query = {
            'ip': ip,
            'timestamp': {'$gte': since}
        }
        if user_id:
            u_str = str(user_id)
            query['$or'] = [{'user_id': u_str}, {'user_id': {'$exists': False}}, {'user_id': None}, {'user_id': ''}]
        try:
            return self.db.attack_attempts.count_documents(query)
        except Exception as e:
            logger.error("Failed to count attacks for %s: %s", ip, e)
            return 0

    def should_auto_block(self, ip, threshold=10, hours=24, user_id=None):
        count = self.get_attack_count(ip, hours, user_id=user_id)
        return count >= threshold, count

    def auto_block(self, ip, reason='Auto-blocked: exceeded attack threshold', duration_hours=24, user_id=None, website_id=None):
        try:
            u_str = str(user_id) if user_id else ""
            exist_query = {'ip': ip}
            if u_str:
                exist_query['$or'] = [{'user_id': u_str}, {'added_by_user_id': u_str}, {'is_global': True}]
            
            existing = self.db.blacklist.find_one(exist_query)
            if existing:
                return False

            is_permanent = duration_hours is None or duration_hours <= 0
            expires_at = None if is_permanent else datetime.now() + timedelta(hours=duration_hours)
            block_type = 'permanent' if is_permanent else 'temporary'

            doc = {
                'ip': ip,
                'reason': reason,
                'blocked_at': datetime.now(),
                'created_at': datetime.now(),
                'type': block_type,
                'expires_at': expires_at,
                'auto_blocked': True,
                'user_id': u_str,
                'added_by_user_id': u_str,
                'website_id': str(website_id) if website_id else "",
            }
            self.db.blacklist.insert_one(doc)

            self.db.auto_blocks.insert_one({
                'ip': ip,
                'reason': reason,
                'blocked_at': datetime.now(),
                'expires_at': expires_at,
                'type': block_type,
                'user_id': u_str,
                'website_id': str(website_id) if website_id else "",
            })
            logger.warning("AUTO-BLOCKED IP: %s | user: %s | reason: %s | type: %s | expires: %s",
                          ip, u_str, reason, block_type, expires_at or 'never')
            
            # Sync to connected WordPress plugin origins immediately
            try:
                from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                push_instant_sync_to_wordpress(user_id=user_id, website_id=website_id)
            except Exception:
                pass

            return True
        except Exception as e:
            logger.error("Failed to auto-block %s: %s", ip, e)
            return False

    def check_and_auto_block(self, ip, threshold=10, window_hours=24, duration_hours=24, user_id=None, website_id=None):
        if self.is_blacklisted(ip, user_id=user_id):
            return False

        should_block, count = self.should_auto_block(ip, threshold=threshold, hours=window_hours, user_id=user_id)
        if should_block:
            return self.auto_block(
                ip,
                reason=f'Auto-blocked: {count} attack attempts within {window_hours}h',
                duration_hours=duration_hours,
                user_id=user_id,
                website_id=website_id
            )
        return False

    def is_blacklisted(self, ip, user_id=None):
        try:
            query = {'ip': ip}
            if user_id:
                u_str = str(user_id)
                query['$or'] = [{'user_id': u_str}, {'added_by_user_id': u_str}, {'is_global': True}, {'added_by_user_id': {'$exists': False}}]
            entry = self.db.blacklist.find_one(query)
            if not entry:
                return False
            expires_at = entry.get('expires_at')
            if expires_at is not None and expires_at < datetime.now():
                self.db.blacklist.delete_one({'_id': entry['_id']})
                return False
            return True
        except Exception as e:
            logger.error("Failed to check blacklist for %s: %s", ip, e)
            return False

    def cleanup_expired_blocks(self):
        now = datetime.now()
        try:
            result = self.db.blacklist.delete_many({
                'type': 'temporary',
                'expires_at': {'$lt': now}
            })
            return result.deleted_count
        except Exception as e:
            logger.error("Failed to cleanup expired blocks: %s", e)
            return 0

    def cleanup_old_attempts(self, days=30):
        cutoff = datetime.now() - timedelta(days=days)
        try:
            result = self.db.attack_attempts.delete_many({
                'timestamp': {'$lt': cutoff}
            })
            return result.deleted_count
        except Exception as e:
            logger.error("Failed to cleanup old attempts: %s", e)
            return 0

    def get_user_settings(self, user_id=None):
        u_str = str(user_id) if user_id else ""
        doc = None
        if u_str:
            doc = self.db.settings.find_one({'_type': 'user_security_config', 'user_id': u_str})
        if not doc:
            doc = self.db.settings.find_one({'_type': 'waf_settings'}) or {}
        return {
            'auto_block_enabled': doc.get('auto_block_enabled', True),
            'auto_block_threshold': int(doc.get('auto_block_threshold', 10)),
            'auto_block_window_hours': int(doc.get('auto_block_window_hours', 24)),
            'auto_block_duration_hours': int(doc.get('auto_block_duration_hours', 24)),
            'rate_limit_per_minute': int(doc.get('rate_limit_per_minute', 120)),
            'ddos_mitigation_enabled': doc.get('ddos_mitigation_enabled', True),
            'admin_bruteforce_protection': doc.get('admin_bruteforce_protection', True),
            'auto_block_permanent': doc.get('auto_block_permanent', False),
        }

    def save_user_settings(self, user_id, data):
        u_str = str(user_id)
        now_dt = datetime.now()
        update_data = {
            '_type': 'user_security_config',
            'user_id': u_str,
            'auto_block_enabled': bool(data.get('auto_block_enabled', True)),
            'auto_block_threshold': max(1, int(data.get('auto_block_threshold', 10))),
            'auto_block_window_hours': max(1, int(data.get('auto_block_window_hours', 24))),
            'auto_block_duration_hours': int(data.get('auto_block_duration_hours', 24)),
            'rate_limit_per_minute': max(10, int(data.get('rate_limit_per_minute', 120))),
            'ddos_mitigation_enabled': bool(data.get('ddos_mitigation_enabled', True)),
            'admin_bruteforce_protection': bool(data.get('admin_bruteforce_protection', True)),
            'auto_block_permanent': bool(data.get('auto_block_permanent', False)),
            'updated_at': now_dt,
        }
        self.db.settings.update_one(
            {'_type': 'user_security_config', 'user_id': u_str},
            {'$set': update_data},
            upsert=True
        )
        return {
            'auto_block_enabled': update_data['auto_block_enabled'],
            'auto_block_threshold': update_data['auto_block_threshold'],
            'auto_block_window_hours': update_data['auto_block_window_hours'],
            'auto_block_duration_hours': update_data['auto_block_duration_hours'],
            'rate_limit_per_minute': update_data['rate_limit_per_minute'],
            'ddos_mitigation_enabled': update_data['ddos_mitigation_enabled'],
            'admin_bruteforce_protection': update_data['admin_bruteforce_protection'],
            'auto_block_permanent': update_data['auto_block_permanent'],
            'updated_at': now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def get_settings(self):
        return self.get_user_settings(None)
