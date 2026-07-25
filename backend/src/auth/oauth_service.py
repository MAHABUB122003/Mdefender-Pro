import secrets
from datetime import datetime, timezone
from typing import Dict, Optional
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.auth.jwt_service import JWTService
from src.auth.session_service import SessionService
from src.auth.brute_force_service import BruteForceService
from src.auth.audit_service import AuditService
from src.utils.logger import Logger


class OAuthService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.jwt_service = JWTService()
        self.session_service = SessionService()
        self.brute_force = BruteForceService()
        self.audit = AuditService()
        self.logger = Logger()

    def get_google_auth_url(self, state: Optional[str] = None) -> str:
        if not state:
            state = secrets.token_urlsafe(32)

        params = {
            'client_id': self.config.GOOGLE_CLIENT_ID,
            'redirect_uri': self.config.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent',
        }

        query_string = '&'.join(f'{k}={v}' for k, v in params.items())
        return f'https://accounts.google.com/o/oauth2/v2/auth?{query_string}'

    def handle_google_callback(self, code: str, ip_address: str = '',
                               user_agent: str = '') -> Dict:
        try:
            import httpx
            token_response = httpx.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code': code,
                    'client_id': self.config.GOOGLE_CLIENT_ID,
                    'client_secret': self.config.GOOGLE_CLIENT_SECRET,
                    'redirect_uri': self.config.GOOGLE_REDIRECT_URI,
                    'grant_type': 'authorization_code',
                },
                timeout=10
            )

            if token_response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to authenticate with Google',
                }

            tokens = token_response.json()
            access_token = tokens.get('access_token')

            user_info_response = httpx.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )

            if user_info_response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to fetch user info from Google',
                }

            google_user = user_info_response.json()
            google_id = google_user.get('id')
            email = google_user.get('email', '').lower()
            name = google_user.get('name', '')
            picture = google_user.get('picture', '')

            return self._process_google_user(
                google_id, email, name, picture,
                ip_address, user_agent
            )

        except ImportError:
            return {
                'success': False,
                'error': 'HTTP client not available. Install httpx: pip install httpx',
            }
        except Exception as e:
            self.logger.log_error(f"Google OAuth error: {e}")
            return {
                'success': False,
                'error': 'Authentication failed',
            }

    def _process_google_user(self, google_id: str, email: str, name: str,
                             picture: str, ip_address: str,
                             user_agent: str) -> Dict:
        user = self.db.users.find_one({'google_id': google_id})

        if not user:
            user = self.db.users.find_one({'email': email})

            if user:
                self.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'google_id': google_id,
                        'updated_at': datetime.now(timezone.utc),
                    }}
                )
                user['google_id'] = google_id
            else:
                user_doc = {
                    'full_name': name,
                    'email': email,
                    'username': None,
                    'password_hash': '',
                    'email_verified': True,
                    'mfa_enabled': False,
                    'mfa_secret': None,
                    'google_id': google_id,
                    'profile_picture': picture,
                    'plan': 'free',
                    'role': 'user',
                    'is_active': True,
                    'token_version': 0,
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc),
                    'last_login': datetime.now(timezone.utc),
                }
                result = self.db.users.insert_one(user_doc)
                user = user_doc
                user['_id'] = result.inserted_id

        if not user.get('is_active', True):
            return {
                'success': False,
                'error': 'Account has been deactivated',
            }

        user_id = str(user['_id'])

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.now(timezone.utc)}}
        )

        session_info = self.session_service.parse_user_agent(user_agent)
        session = self.session_service.create_session(
            user_id, ip_address, user_agent, session_info
        )

        access_token = self.jwt_service.create_access_token(
            user_id, user['email'], role=user.get('role', 'user'),
            extra_claims={'provider': 'google'}
        )
        refresh_token = self.jwt_service.create_refresh_token(
            user_id, str(session['_id']),
            token_version=user.get('token_version', 0)
        )

        self.audit.log(
            user_id=user_id,
            action='google_login',
            ip_address=ip_address,
            user_agent=user_agent,
            device=session_info.get('device', 'Unknown'),
            browser=session_info.get('browser', 'Unknown'),
            os_name=session_info.get('os', 'Unknown'),
            status='success',
        )

        return {
            'success': True,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user_id,
                'email': user['email'],
                'full_name': user.get('full_name', ''),
                'username': user.get('username'),
                'role': user.get('role', 'user'),
            },
            'is_new_user': user.get('created_at') == user.get('last_login'),
        }
