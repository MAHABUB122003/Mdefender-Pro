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
        if not ip:
            return False
        from src.security.ip_filter import IPFilter
        if not hasattr(self, '_ip_filter'):
            self._ip_filter = IPFilter()
        return self._ip_filter.is_blacklisted(ip, user_id=user_id)

    def unblock_ip(self, ip, user_id=None):
        try:
            u_str = str(user_id) if user_id else ""
            query = {'ip': ip}
            if u_str:
                from bson import ObjectId
                u_conds = [{'user_id': u_str}, {'added_by_user_id': u_str}]
                if ObjectId.is_valid(u_str):
                    u_conds.append({'user_id': ObjectId(u_str)})
                    u_conds.append({'added_by_user_id': ObjectId(u_str)})
                query['$or'] = u_conds
            
            self.db.blacklist.delete_many(query)
            self.db.auto_blocks.delete_many({'ip': ip})
            self.db.attack_attempts.delete_many({'ip': ip})
            try:
                from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
                push_instant_sync_to_wordpress(user_id=user_id)
            except Exception:
                pass
            return True
        except Exception as e:
            logger.error("Failed to unblock %s: %s", ip, e)
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
        import time
        now_ts = time.time()
        if not hasattr(self, '_settings_cache'):
            self._settings_cache = {}
        cached, exp = self._settings_cache.get(u_str, (None, 0))
        if now_ts < exp and cached is not None:
            return cached

        doc = None
        if u_str:
            doc = self.db.settings.find_one({'_type': 'user_security_config', 'user_id': u_str})
        if not doc:
            doc = self.db.settings.find_one({'_type': 'waf_settings'}) or {}
        res = {
            'auto_block_enabled': doc.get('auto_block_enabled', True),
            'auto_block_threshold': int(doc.get('auto_block_threshold', 10)),
            'auto_block_window_hours': int(doc.get('auto_block_window_hours', 24)),
            'auto_block_duration_hours': int(doc.get('auto_block_duration_hours', 24)),
            'rate_limit_per_minute': int(doc.get('rate_limit_per_minute', 120)),
            'ddos_mitigation_enabled': doc.get('ddos_mitigation_enabled', True),
            'admin_bruteforce_protection': doc.get('admin_bruteforce_protection', True),
            'auto_block_permanent': doc.get('auto_block_permanent', False),
            'hold_press_enabled': bool(doc.get('hold_press_enabled', False)),
            'hold_press_duration_ms': int(doc.get('hold_press_duration_ms', 2000)),
            'turnstile_enabled': bool(doc.get('turnstile_enabled', False)),
            'turnstile_mode': doc.get('turnstile_mode', 'forms'),
            'turnstile_theme': doc.get('turnstile_theme', 'auto'),
            'turnstile_site_key': doc.get('turnstile_site_key', ''),
            'turnstile_secret_key': doc.get('turnstile_secret_key', ''),
            'two_factor_enabled': bool(doc.get('two_factor_enabled', False)),
            'two_factor_scope': str(doc.get('two_factor_scope', 'all')),
            'two_factor_roles': str(doc.get('two_factor_roles', 'admins')),
            'two_factor_method_totp': bool(doc.get('two_factor_method_totp', True)),
            'two_factor_method_email': bool(doc.get('two_factor_method_email', True)),
            'two_factor_method_backup': bool(doc.get('two_factor_method_backup', True)),
            'two_factor_max_attempts': int(doc.get('two_factor_max_attempts', 3)),
            'two_factor_lockout_hours': int(doc.get('two_factor_lockout_hours', 24)),
            'two_factor_remember_days': int(doc.get('two_factor_remember_days', 0)),
            'two_factor_domain_overrides': doc.get('two_factor_domain_overrides', {}),
        }
        self._settings_cache[u_str] = (res, now_ts + 60.0)
        return res

    def save_user_settings(self, user_id, data):
        u_str = str(user_id)
        now_dt = datetime.now()
        existing = self.get_user_settings(user_id)

        def _val(key, default, cast_fn=None):
            raw = data[key] if (data and key in data) else existing.get(key, default)
            if cast_fn:
                try:
                    return cast_fn(raw)
                except Exception:
                    return default
            return raw

        update_data = {
            '_type': 'user_security_config',
            'user_id': u_str,
            'auto_block_enabled': bool(_val('auto_block_enabled', True)),
            'auto_block_threshold': max(1, _val('auto_block_threshold', 10, int)),
            'auto_block_window_hours': max(1, _val('auto_block_window_hours', 24, int)),
            'auto_block_duration_hours': _val('auto_block_duration_hours', 24, int),
            'rate_limit_per_minute': max(10, _val('rate_limit_per_minute', 120, int)),
            'ddos_mitigation_enabled': bool(_val('ddos_mitigation_enabled', True)),
            'admin_bruteforce_protection': bool(_val('admin_bruteforce_protection', True)),
            'auto_block_permanent': bool(_val('auto_block_permanent', False)),
            'hold_press_enabled': bool(_val('hold_press_enabled', False)),
            'hold_press_duration_ms': _val('hold_press_duration_ms', 2000, int),
            'turnstile_enabled': bool(_val('turnstile_enabled', False)),
            'turnstile_mode': str(_val('turnstile_mode', 'forms')),
            'turnstile_theme': str(_val('turnstile_theme', 'auto')),
            'turnstile_site_key': str(_val('turnstile_site_key', '')),
            'turnstile_secret_key': str(_val('turnstile_secret_key', '')),
            'two_factor_enabled': bool(_val('two_factor_enabled', False)),
            'two_factor_scope': str(_val('two_factor_scope', 'all')),
            'two_factor_roles': str(_val('two_factor_roles', 'admins')),
            'two_factor_method_totp': bool(_val('two_factor_method_totp', True)),
            'two_factor_method_email': bool(_val('two_factor_method_email', True)),
            'two_factor_method_backup': bool(_val('two_factor_method_backup', True)),
            'two_factor_max_attempts': max(1, _val('two_factor_max_attempts', 3, int)),
            'two_factor_lockout_hours': max(1, _val('two_factor_lockout_hours', 24, int)),
            'two_factor_remember_days': _val('two_factor_remember_days', 0, int),
            'two_factor_domain_overrides': _val('two_factor_domain_overrides', {}),
            'updated_at': now_dt,
        }
        self.db.settings.update_one(
            {'_type': 'user_security_config', 'user_id': u_str},
            {'$set': update_data},
            upsert=True
        )
        if hasattr(self, '_settings_cache'):
            self._settings_cache.clear()

        # Synchronize security settings to user websites collection
        scope = update_data['two_factor_scope']
        tf_enabled = update_data['two_factor_enabled']
        site_updates = {
            'login_two_factor': tf_enabled,
            'two_factor_roles': update_data['two_factor_roles'],
            'hold_press_enabled': update_data['hold_press_enabled'],
            'hold_press_duration_ms': update_data['hold_press_duration_ms'],
            'turnstile_enabled': update_data['turnstile_enabled'],
            'turnstile_mode': update_data['turnstile_mode'],
            'turnstile_theme': update_data['turnstile_theme'],
        }
        if scope == 'all':
            self.db.websites.update_many(
                {'$or': [{'user_id': u_str}, {'added_by_user_id': u_str}]},
                {'$set': site_updates}
            )
        else:
            self.db.websites.update_one(
                {'$and': [{'$or': [{'_id': scope}, {'domain': scope}, {'id': scope}]}, {'$or': [{'user_id': u_str}, {'added_by_user_id': u_str}]}]},
                {'$set': site_updates}
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
            'hold_press_enabled': update_data['hold_press_enabled'],
            'hold_press_duration_ms': update_data['hold_press_duration_ms'],
            'turnstile_enabled': update_data['turnstile_enabled'],
            'turnstile_mode': update_data['turnstile_mode'],
            'turnstile_theme': update_data['turnstile_theme'],
            'turnstile_site_key': update_data['turnstile_site_key'],
            'turnstile_secret_key': update_data['turnstile_secret_key'],
            'two_factor_enabled': update_data['two_factor_enabled'],
            'two_factor_scope': update_data['two_factor_scope'],
            'two_factor_roles': update_data['two_factor_roles'],
            'two_factor_method_totp': update_data['two_factor_method_totp'],
            'two_factor_method_email': update_data['two_factor_method_email'],
            'two_factor_method_backup': update_data['two_factor_method_backup'],
            'two_factor_max_attempts': update_data['two_factor_max_attempts'],
            'two_factor_lockout_hours': update_data['two_factor_lockout_hours'],
            'two_factor_remember_days': update_data['two_factor_remember_days'],
            'two_factor_domain_overrides': update_data['two_factor_domain_overrides'],
            'updated_at': now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def get_settings(self):
        return self.get_user_settings(None)
