import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from bson import ObjectId
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.utils.objectid import to_object_id


class SessionService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()

    def create_session(self, user_id: str, ip_address: str, user_agent: str,
                       device_info: Optional[dict] = None) -> Dict:
        device_info = device_info or {}
        self._enforce_session_limit(user_id)

        session = {
            'user_id': user_id,
            'session_token': secrets.token_urlsafe(48),
            'ip_address': ip_address,
            'user_agent': user_agent,
            'device': device_info.get('device', 'Unknown'),
            'browser': device_info.get('browser', 'Unknown'),
            'os': device_info.get('os', 'Unknown'),
            'location': device_info.get('location', None),
            'created_at': datetime.now(timezone.utc),
            'last_active': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(days=self.config.REFRESH_TOKEN_EXPIRE_DAYS),
            'is_active': True,
        }

        result = self.db.sessions.insert_one(session)
        session['id'] = str(result.inserted_id) if hasattr(result, 'inserted_id') else session.get('_id', '')
        return session

    def get_session(self, session_id: str) -> Optional[Dict]:
        session_oid = to_object_id(session_id)
        if not session_oid:
            return None
        return self.db.sessions.find_one({
            '_id': session_oid,
            'is_active': True,
        })

    def get_user_sessions(self, user_id: str) -> List[Dict]:
        sessions = list(self.db.sessions.find({
            'user_id': user_id,
            'is_active': True,
        }).sort('last_active', -1))
        return sessions

    def update_session_activity(self, session_id: str):
        session_oid = to_object_id(session_id)
        if session_oid:
            self.db.sessions.update_one(
                {'_id': session_oid},
                {'$set': {'last_active': datetime.now(timezone.utc)}}
            )

    def invalidate_session(self, session_id: str):
        session_oid = to_object_id(session_id)
        if session_oid:
            self.db.sessions.update_one(
                {'_id': session_oid},
                {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
            )

    def invalidate_all_user_sessions(self, user_id: str, except_session_id: Optional[str] = None):
        query = {'user_id': user_id, 'is_active': True}
        if except_session_id:
            except_oid = to_object_id(except_session_id)
            if except_oid:
                query['_id'] = {'$ne': except_oid}
        self.db.sessions.update_many(
            query,
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )

    def cleanup_expired_sessions(self):
        self.db.sessions.update_many(
            {'expires_at': {'$lt': datetime.now(timezone.utc)}, 'is_active': True},
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )

    def _enforce_session_limit(self, user_id: str):
        sessions = list(self.db.sessions.find({
            'user_id': user_id,
            'is_active': True,
        }).sort('last_active', -1))

        if len(sessions) >= self.config.MAX_CONCURRENT_SESSIONS:
            sessions_to_expire = sessions[self.config.MAX_CONCURRENT_SESSIONS - 1:]
            for session in sessions_to_expire:
                self.invalidate_session(str(session['_id']))

    def parse_user_agent(self, user_agent: str) -> dict:
        ua = user_agent.lower()
        browser = 'Unknown'
        os_name = 'Unknown'
        device = 'Desktop'

        if 'chrome' in ua and 'edg' not in ua:
            browser = 'Chrome'
        elif 'firefox' in ua:
            browser = 'Firefox'
        elif 'safari' in ua and 'chrome' not in ua:
            browser = 'Safari'
        elif 'edg' in ua:
            browser = 'Edge'
        elif 'opera' in ua or 'opr' in ua:
            browser = 'Opera'

        if 'windows' in ua:
            os_name = 'Windows'
        elif 'mac os' in ua or 'macos' in ua:
            os_name = 'macOS'
        elif 'linux' in ua:
            os_name = 'Linux'
        elif 'android' in ua:
            os_name = 'Android'
            device = 'Mobile'
        elif 'iphone' in ua or 'ipad' in ua:
            os_name = 'iOS'
            device = 'Mobile' if 'iphone' in ua else 'Tablet'

        if 'mobile' in ua:
            device = 'Mobile'
        elif 'tablet' in ua:
            device = 'Tablet'

        return {
            'browser': browser,
            'os': os_name,
            'device': device,
        }
