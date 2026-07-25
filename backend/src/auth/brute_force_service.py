import time
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.utils.logger import Logger


class BruteForceService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.logger = Logger()

    def record_failed_attempt(self, identifier: str, ip: str, user_agent: str = '',
                              metadata: Optional[dict] = None) -> Dict:
        now = datetime.now(timezone.utc)
        self.db.failed_logins.insert_one({
            'identifier': identifier,
            'ip': ip,
            'user_agent': user_agent,
            'timestamp': now,
            'metadata': metadata or {},
        })

        count = self._count_recent_attempts(identifier)
        is_locked = False
        lockout_minutes = 0
        is_permanent = False

        if count >= self.config.PERMANENT_LOCKOUT_THRESHOLD:
            is_locked = True
            is_permanent = True
            lockout_minutes = 43200
            self._set_lockout(identifier, lockout_minutes, permanent=True)
            self.logger.log_warning(
                f"PERMANENT LOCKOUT: {identifier} after {count} failed attempts from {ip}"
            )
        elif count >= self.config.MAX_FAILED_LOGIN_ATTEMPTS:
            is_locked = True
            delay_multiplier = math.pow(
                self.config.PROGRESSIVE_DELAY_BASE,
                count - self.config.MAX_FAILED_LOGIN_ATTEMPTS
            )
            lockout_minutes = min(
                int(self.config.LOCKOUT_DURATION_MINUTES * delay_multiplier),
                self.config.PROGRESSIVE_DELAY_MAX_SECONDS // 60
            )
            self._set_lockout(identifier, lockout_minutes)
            self.logger.log_warning(
                f"ACCOUNT LOCKED: {identifier} for {lockout_minutes} min "
                f"after {count} failed attempts from {ip}"
            )

        return {
            'attempt_count': count,
            'is_locked': is_locked,
            'lockout_minutes': lockout_minutes,
            'is_permanent': is_permanent,
            'remaining_attempts': max(0, self.config.MAX_FAILED_LOGIN_ATTEMPTS - count),
        }

    def record_successful_login(self, identifier: str):
        self.db.failed_logins.delete_many({
            'identifier': identifier,
        })

    def is_locked_out(self, identifier: str) -> Tuple[bool, int, bool]:
        record = self.db.failed_logins.find_one({
            'identifier': identifier,
            'locked': True,
        })
        if not record:
            return False, 0, False

        lockout_until = record.get('lockout_until')
        is_permanent = record.get('permanent_lockout', False)

        if is_permanent:
            return True, 0, True

        if lockout_until:
            if isinstance(lockout_until, datetime):
                if lockout_until > datetime.now(timezone.utc):
                    remaining = int((lockout_until - datetime.now(timezone.utc)).total_seconds() / 60)
                    return True, remaining, False
                else:
                    self.db.failed_logins.update_one(
                        {'_id': record['_id']},
                        {'$unset': {'locked': '', 'lockout_until': ''}}
                    )
                    return False, 0, False

        return False, 0, False

    def record_successful_login_check(self, identifier: str):
        self.db.failed_logins.update_many(
            {'identifier': identifier},
            {'$unset': {'locked': '', 'lockout_until': ''}}
        )

    def _count_recent_attempts(self, identifier: str) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(
            minutes=self.config.LOCKOUT_DURATION_MINUTES * 5
        )
        return self.db.failed_logins.count_documents({
            'identifier': identifier,
            'timestamp': {'$gte': cutoff},
        })

    def _set_lockout(self, identifier: str, duration_minutes: int, permanent: bool = False):
        lockout_until = None
        if not permanent:
            lockout_until = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)

        self.db.failed_logins.update_many(
            {'identifier': identifier, 'locked': {'$ne': True}},
            {'$set': {
                'locked': True,
                'lockout_until': lockout_until,
                'permanent_lockout': permanent,
                'locked_at': datetime.now(timezone.utc),
            }}
        )

    def get_failed_attempts(self, identifier: str) -> list:
        attempts = list(self.db.failed_logins.find(
            {'identifier': identifier}
        ).sort('timestamp', -1).limit(50))
        return attempts

    def clear_failed_attempts(self, identifier: str):
        self.db.failed_logins.delete_many({'identifier': identifier})

    def get_all_locked_accounts(self) -> list:
        locked = list(self.db.failed_logins.find({
            'locked': True,
        }).sort('locked_at', -1))
        return locked

    def unlock_account(self, identifier: str):
        self.db.failed_logins.update_many(
            {'identifier': identifier},
            {'$unset': {'locked': '', 'lockout_until': '', 'permanent_lockout': ''}}
        )
