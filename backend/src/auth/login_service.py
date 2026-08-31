from datetime import datetime, timezone
from typing import Dict, Optional
import secrets
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.services.password_service import PasswordService
from src.auth.jwt_service import JWTService
from src.auth.session_service import SessionService
from src.auth.brute_force_service import BruteForceService
from src.auth.audit_service import AuditService
from src.utils.logger import Logger
from src.utils.api_key import generate_api_key


class LoginService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.password_service = PasswordService()
        self.jwt_service = JWTService()
        self.session_service = SessionService()
        self.brute_force = BruteForceService()
        self.audit = AuditService()
        self.logger = Logger()

    def login(self, email_or_username: str, password: str,
              ip_address: str = '', user_agent: str = '',
              remember_me: bool = False) -> Dict:
        identifier = email_or_username.strip().lower()

        is_locked, remaining_minutes, is_permanent = self.brute_force.is_locked_out(identifier)
        if is_locked:
            if is_permanent:
                msg = 'Account has been permanently locked due to repeated security violations. Please contact support.'
            else:
                msg = f'Account is temporarily locked. Please try again in {remaining_minutes} minutes.'
            self.audit.log_event(
                'login_blocked_lockout',
                user_id=identifier,
                ip_address=ip_address,
                details={'reason': 'account_locked', 'permanent': is_permanent},
                severity='warning'
            )
            return {
                'success': False,
                'error': msg,
            }

        user = self._find_user(identifier)
        if not user:
            self.brute_force.record_failed_attempt(identifier, ip_address, user_agent)
            self.audit.log_event(
                'login_failed_user_not_found',
                ip_address=ip_address,
                details={'identifier': identifier},
                severity='info'
            )
            return {
                'success': False,
                'error': 'Invalid email/username or password',
            }

        user_id = str(user['_id'])

        if not user.get('is_active', True):
            return {
                'success': False,
                'error': 'Account has been deactivated. Please contact support.',
            }

        if not user.get('email_verified', False):
            return {
                'success': False,
                'error': 'Please verify your email before logging in.',
                'email_not_verified': True,
            }

        password_hash = user.get('password_hash', '')
        if not self.password_service.verify_password(password, password_hash):
            result = self.brute_force.record_failed_attempt(
                identifier, ip_address, user_agent
            )
            self.audit.log_event(
                'login_failed_wrong_password',
                user_id=user_id,
                ip_address=ip_address,
                details={'attempts': result['attempt_count']},
                severity='warning' if result['attempt_count'] >= 3 else 'info'
            )
            if result['is_locked']:
                return {
                    'success': False,
                    'error': f'Account locked after too many failed attempts. '
                             f'{"Permanently locked." if result["is_permanent"] else f"Try again in {result["lockout_minutes"]} minutes."}',
                    'locked': True,
                    'permanent': result.get('is_permanent', False),
                }
            return {
                'success': False,
                'error': 'Invalid email/username or password',
            }

        if user.get('mfa_enabled') and user.get('mfa_secret'):
            return {
                'success': False,
                'mfa_required': True,
                'message': 'Please enter your 2FA code',
                'temp_token': self.jwt_service.create_access_token(
                    user_id, user['email'], role=user.get('role', 'user'),
                    extra_claims={'mfa_pending': True}
                ),
            }

        return self._complete_login(user, ip_address, user_agent, remember_me)

    def verify_mfa_and_login(self, temp_token: str, code: str,
                             ip_address: str = '', user_agent: str = '',
                             remember_me: bool = False) -> Dict:
        payload = self.jwt_service.decode_access_token(temp_token)
        if not payload or not payload.get('mfa_pending'):
            return {
                'success': False,
                'error': 'Invalid or expired session. Please login again.',
            }

        from bson import ObjectId
        user_id = payload['sub']
        try:
            user_oid = ObjectId(user_id)
        except Exception:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {
                'success': False,
                'error': 'User not found',
            }

        identifier = user.get('email', user_id)
        is_locked, remaining_minutes, is_permanent = self.brute_force.is_locked_out(identifier)
        if is_locked:
            return {
                'success': False,
                'error': 'Account is temporarily locked due to too many failed attempts.',
            }

        import pyotp
        totp = pyotp.TOTP(user['mfa_secret'])
        if not totp.verify(code, valid_window=1):
            self.brute_force.record_failed_attempt(
                identifier, ip_address, user_agent,
                metadata={'type': 'mfa'}
            )
            return {
                'success': False,
                'error': 'Invalid MFA code. Please try again.',
            }

        self.brute_force.record_successful_login(identifier)
        return self._complete_login(user, ip_address, user_agent, remember_me)

    def _complete_login(self, user: dict, ip_address: str, user_agent: str,
                        remember_me: bool) -> Dict:
        user_id = str(user['_id'])
        identifier = user.get('email', user_id)

        self.brute_force.record_successful_login(identifier)

        api_key = user.get('api_key')
        if not api_key:
            api_key = generate_api_key()
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'api_key': api_key, 'updated_at': datetime.now(timezone.utc)}}
            )

        session_info = self.session_service.parse_user_agent(user_agent)
        session = self.session_service.create_session(
            user_id, ip_address, user_agent, session_info
        )

        access_token = self.jwt_service.create_access_token(
            user_id, user['email'], role=user.get('role', 'user')
        )
        refresh_token = self.jwt_service.create_refresh_token(
            user_id, str(session['_id']),
            token_version=user.get('token_version', 0)
        )

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.now(timezone.utc)}}
        )

        self.audit.log(
            user_id=user_id,
            action='login',
            ip_address=ip_address,
            user_agent=user_agent,
            device=session_info.get('device', 'Unknown'),
            browser=session_info.get('browser', 'Unknown'),
            os_name=session_info.get('os', 'Unknown'),
            status='success',
        )

        self.logger.log_info(f"User logged in: {user['email']} from {ip_address}")

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
                'api_key': api_key,
            },
        }

    def _find_user(self, identifier: str):
        user = self.db.users.find_one({'email': identifier})
        if user:
            return user
        user = self.db.users.find_one({'username': identifier})
        return user

    def admin_login(self, username: str, password: str,
                    ip_address: str = '', user_agent: str = '') -> Dict:
        identifier = f"admin:{username.lower()}"

        is_locked, remaining_minutes, is_permanent = self.brute_force.is_locked_out(identifier)
        if is_locked:
            return {
                'success': False,
                'error': f'Admin account locked. {"Permanently." if is_permanent else f"Try again in {remaining_minutes} minutes."}',
            }

        from src.security.auth import Auth
        auth = Auth()
        if not auth.verify_admin(username, password, ip_address):
            self.brute_force.record_failed_attempt(identifier, ip_address, user_agent)
            return {
                'success': False,
                'error': 'Invalid credentials',
            }

        self.brute_force.record_successful_login(identifier)

        admin_id = f"admin_{username}"
        access_token = self.jwt_service.create_access_token(
            admin_id, username, role='super_admin',
            extra_claims={'is_admin': True}
        )
        refresh_token = self.jwt_service.create_refresh_token(
            admin_id, f"admin_session_{secrets.token_urlsafe(16)}"
        )

        self.audit.log(
            user_id=admin_id,
            action='admin_login',
            ip_address=ip_address,
            user_agent=user_agent,
            status='success',
        )

        return {
            'success': True,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'redirect': '/admin/dashboard',
        }
