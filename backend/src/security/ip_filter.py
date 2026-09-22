from src.database.mongodb_connection import MongoDB
from datetime import datetime, timedelta

class IPFilter:
    def __init__(self):
        self.db = MongoDB()
        self._whitelist = set()

    def is_blacklisted(self, ip, user_id=None):
        if not ip:
            return False
        from bson import ObjectId
        query = {'ip': ip}
        if user_id:
            u_str = str(user_id)
            or_conditions = [
                {'added_by_user_id': u_str},
                {'user_id': u_str},
                {'is_global': True},
                {'added_by_user_id': {'$exists': False}},
                {'added_by_user_id': None},
            ]
            if ObjectId.is_valid(u_str):
                or_conditions.append({'added_by_user_id': ObjectId(u_str)})
                or_conditions.append({'user_id': ObjectId(u_str)})
            query = {
                'ip': ip,
                '$or': or_conditions
            }
        entry = self.db.blacklist.find_one(query)
        if not entry:
            return False
        expires_at = entry.get('expires_at')
        if expires_at is not None and hasattr(expires_at, '__gt__') and expires_at < datetime.now():
            self.db.blacklist.delete_one({'_id': entry['_id']})
            return False
        return True

    def add_to_blacklist(self, ip, duration_hours=None):
        existing = self.db.blacklist.find_one({'ip': ip})
        if not existing:
            expires_at = None if (duration_hours is None or duration_hours <= 0) else datetime.now() + timedelta(hours=duration_hours)
            self.db.blacklist.insert_one({
                'ip': ip,
                'reason': 'Auto-blocked by rate limiter',
                'blocked_at': datetime.now(),
                'type': 'permanent' if expires_at is None else 'temporary',
                'expires_at': expires_at,
                'auto_blocked': True
            })

    def remove_from_blacklist(self, ip):
        self.db.blacklist.delete_one({'ip': ip})

    def auto_block(self, ip, reason='Suspicious activity', duration_hours=1):
        self.add_to_blacklist(ip, duration_hours)
        self.db.blacklist.update_one(
            {'ip': ip},
            {'$set': {'reason': reason, 'auto_blocked': True}}
        )

    def add_to_whitelist(self, ip):
        self._whitelist.add(ip)

    def is_whitelisted(self, ip):
        if ip in self._whitelist:
            return True
        entry = self.db.whitelist.find_one({'ip': ip})
        if entry:
            return True
        return False

    def get_blacklist(self):
        return list(self.db.blacklist.find().sort('blocked_at', -1))

    def get_ip_country(self, ip):
        if not ip or ip in ('127.0.0.1', 'localhost', '::1') or ip.startswith(('192.168.', '10.', '172.16.')):
            return {'country_code': 'LOCAL', 'country_name': 'Local Network'}
        
        if not hasattr(self, '_geo_cache'):
            self._geo_cache = {}

        now_ts = datetime.now().timestamp()
        if ip in self._geo_cache:
            entry, exp = self._geo_cache[ip]
            if now_ts < exp:
                return entry

        try:
            import requests
            r = requests.get(f"http://ip-api.com/json/{ip}?fields=status,country,countryCode", timeout=1.5)
            if r.status_code == 200:
                data = r.json()
                if data.get('status') == 'success':
                    val = {
                        'country_code': (data.get('countryCode') or '').upper(),
                        'country_name': data.get('country') or ''
                    }
                    self._geo_cache[ip] = (val, now_ts + 3600)
                    return val
        except Exception:
            pass

        return {'country_code': 'UNKNOWN', 'country_name': 'Unknown'}

    def is_country_blocked(self, ip, user_id=None):
        geo = self.get_ip_country(ip)
        cc = geo.get('country_code', '')
        if not cc or cc in ('LOCAL', 'UNKNOWN'):
            return False, geo
        
        from bson import ObjectId
        query = {'country_code': cc}
        if user_id:
            u_str = str(user_id)
            or_conditions = [
                {'user_id': u_str},
                {'added_by_user_id': u_str},
                {'is_global': True}
            ]
            if ObjectId.is_valid(u_str):
                or_conditions.append({'user_id': ObjectId(u_str)})
                or_conditions.append({'added_by_user_id': ObjectId(u_str)})
            query['$or'] = or_conditions
            
        entry = self.db.country_blocks.find_one(query)
        if entry:
            return True, {
                'country_code': cc,
                'country_name': entry.get('country_name') or geo.get('country_name', cc),
                'reason': entry.get('reason', 'Geo-blocked')
            }
        return False, geo
