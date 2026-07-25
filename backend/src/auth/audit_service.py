import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, List
from src.database.mongodb_connection import MongoDB


class AuditService:
    def __init__(self):
        self.db = MongoDB()

    def log(self, user_id: str, action: str, ip_address: str,
            user_agent: str = '', status: str = 'success',
            device: str = 'Unknown', browser: str = 'Unknown',
            os_name: str = 'Unknown', country: Optional[str] = None,
            details: Optional[dict] = None, request_id: str = ''):
        entry = {
            'user_id': user_id,
            'action': action,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'device': device,
            'browser': browser,
            'os': os_name,
            'country': country,
            'status': status,
            'details': details or {},
            'request_id': request_id,
            'timestamp': datetime.now(timezone.utc),
        }
        try:
            self.db.audit_logs.insert_one(entry)
        except Exception:
            pass

    def log_event(self, event_type: str, user_id: Optional[str] = None,
                  ip_address: str = 'system', details: Optional[dict] = None,
                  severity: str = 'info'):
        entry = {
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'severity': severity,
            'details': details or {},
            'timestamp': datetime.now(timezone.utc),
        }
        try:
            self.db.security_events.insert_one(entry)
        except Exception:
            pass

    def get_user_logs(self, user_id: str, limit: int = 100, skip: int = 0) -> List[Dict]:
        return list(self.db.audit_logs.find(
            {'user_id': user_id}
        ).sort('timestamp', -1).skip(skip).limit(limit))

    def get_all_logs(self, limit: int = 100, skip: int = 0,
                     action_filter: Optional[str] = None,
                     user_filter: Optional[str] = None) -> List[Dict]:
        query = {}
        if action_filter:
            query['action'] = action_filter
        if user_filter:
            query['user_id'] = user_filter
        return list(self.db.audit_logs.find(
            query
        ).sort('timestamp', -1).skip(skip).limit(limit))

    def get_security_events(self, limit: int = 100, severity: Optional[str] = None) -> List[Dict]:
        query = {}
        if severity:
            query['severity'] = severity
        return list(self.db.security_events.find(
            query
        ).sort('timestamp', -1).limit(limit))

    def cleanup_old_logs(self, days: int = 90):
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        self.db.audit_logs.delete_many({'timestamp': {'$lt': cutoff}})
        self.db.security_events.delete_many({'timestamp': {'$lt': cutoff}})
