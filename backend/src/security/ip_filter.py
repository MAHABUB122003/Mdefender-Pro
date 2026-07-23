from src.database.mongodb_connection import MongoDB
from datetime import datetime, timedelta

class IPFilter:
    def __init__(self):
        self.db = MongoDB()
        self._whitelist = set()

    def is_blacklisted(self, ip):
        entry = self.db.blacklist.find_one({'ip': ip})
        if not entry:
            return False
        expires_at = entry.get('expires_at')
        if expires_at is not None and expires_at < datetime.now():
            self.db.blacklist.delete_one({'ip': ip})
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
        return ip in self._whitelist

    def get_blacklist(self):
        return list(self.db.blacklist.find().sort('blocked_at', -1))
