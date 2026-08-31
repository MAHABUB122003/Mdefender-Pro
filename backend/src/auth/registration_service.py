import hmac as hmac_mod
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from bson import ObjectId
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.services.password_service import PasswordService
from src.services.email_service import EmailService
from src.auth.jwt_service import JWTService
from src.utils.logger import Logger
from src.utils.objectid import to_object_id
from src.utils.api_key import generate_api_key

UNIFORM_MESSAGE_IF_NOT_FOUND = 'If an account exists with this email, a verification link has been sent.'


class RegistrationService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.password_service = PasswordService()
        self.email_service = EmailService()
        self.jwt_service = JWTService()
        self.logger = Logger()

    def _log_audit(self, user_id: str, action: str, ip_address: str,
                   user_agent: str = '', status: str = 'success',
                   details: Optional[dict] = None):
        try:
            self.db.audit_logs.insert_one({
                'user_id': user_id,
                'action': action,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'device': 'Unknown',
                'browser': 'Unknown',
                'os': 'Unknown',
                'country': None,
                'status': status,
                'details': details or {},
                'request_id': '',
                'timestamp': datetime.now(timezone.utc),
            })
        except Exception:
            pass

    def _log_security_event(self, event_type: str, user_id: Optional[str] = None,
                            ip_address: str = 'system', severity: str = 'info',
                            details: Optional[dict] = None):
        try:
            self.db.security_events.insert_one({
                'event_type': event_type,
                'user_id': user_id,
                'ip_address': ip_address,
                'severity': severity,
                'details': details or {},
                'timestamp': datetime.now(timezone.utc),
            })
        except Exception:
            pass

    def _check_ip_verification_rate(self, ip_address: str) -> bool:
        if not ip_address or ip_address == 'unknown':
            return False
        cutoff = datetime.now(timezone.utc) - timedelta(
            minutes=self.config.VERIFY_EMAIL_IP_WINDOW_MINUTES
        )
        count = self.db.email_verification_tokens.count_documents({
            'request_ip': ip_address,
            'created_at': {'$gte': cutoff},
            'invalidated_reason': {'$ne': 'resend_new_token'},
        })
        if count >= self.config.VERIFY_EMAIL_IP_RATE_LIMIT:
            self._log_security_event(
                'verification_ip_rate_exceeded',
                ip_address=ip_address,
                severity='warning',
                details={'attempts': count, 'window': self.config.VERIFY_EMAIL_IP_WINDOW_MINUTES},
            )
            return True
        return False

    def _check_global_verification_rate(self) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(
            minutes=self.config.VERIFY_EMAIL_GLOBAL_WINDOW_MINUTES
        )
        count = self.db.email_verification_tokens.count_documents({
            'created_at': {'$gte': cutoff},
        })
        if count >= self.config.VERIFY_EMAIL_GLOBAL_RATE_LIMIT:
            self._log_security_event(
                'verification_global_rate_exceeded',
                severity='critical',
                details={'attempts': count, 'window': self.config.VERIFY_EMAIL_GLOBAL_WINDOW_MINUTES},
            )
            return True
        return False

    def _check_suspicious_verification_activity(self, email: str, ip_address: str) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        failed_count = self.db.audit_logs.count_documents({
            'action': 'email_verification_failed',
            'ip_address': ip_address,
            'timestamp': {'$gte': cutoff},
        })
        if failed_count >= self.config.VERIFICATION_SUSPICIOUS_THRESHOLD:
            self._log_security_event(
                'suspicious_verification_activity',
                ip_address=ip_address,
                severity='critical',
                details={
                    'email': email,
                    'failed_attempts': failed_count,
                    'action': 'multiple_failed_verifications',
                },
            )
            return True
        return False

    def _cleanup_old_tokens(self):
        try:
            self.db.email_verification_tokens.delete_many({
                '$or': [
                    {'expires_at': {'$lt': datetime.now(timezone.utc)}},
                    {'used': True, 'used_at': {'$lt': datetime.now(timezone.utc) - timedelta(hours=1)}},
                ]
            })
            self.db.audit_logs.delete_many({
                'action': 'email_verification_failed',
                'timestamp': {'$lt': datetime.now(timezone.utc) - timedelta(hours=1)},
            })
        except Exception:
            pass

    def register(self, full_name: str, email: str, password: str,
                 username: Optional[str] = None, ip_address: str = '',
                 user_agent: str = '') -> Dict:
        self._cleanup_old_tokens()

        normalized_email = email.strip().lower()

        email_validation = self.email_service.validate(normalized_email)
        if not email_validation['valid']:
            return {
                'success': False,
                'error': 'Invalid email',
                'details': email_validation['errors'],
            }

        normalized_email = email_validation['normalized_email']

        existing_user = self.db.users.find_one({
            '$or': [
                {'email': normalized_email},
            ]
        })
        if existing_user:
            if existing_user.get('email_verified', False):
                return {
                    'success': False,
                    'error': 'An account with this email already exists',
                }
            self.db.users.delete_one({'_id': existing_user['_id']})
            self.db.email_verification_tokens.delete_many({
                'email': normalized_email
            })

        if username:
            existing_username = self.db.users.find_one({
                'username': username.lower().strip()
            })
            if existing_username:
                return {
                    'success': False,
                    'error': 'This username is already taken',
                }

        password_validation = self.password_service.validate_strength(password)
        if not password_validation['valid']:
            return {
                'success': False,
                'error': 'Password does not meet security requirements',
                'details': password_validation['errors'],
            }

        password_hash = self.password_service.hash_password(password)

        verification_token = self.jwt_service.generate_email_verification_token(normalized_email)
        raw_token = self.jwt_service.extract_raw_token(verification_token)
        token_hash = self.jwt_service.hash_token(raw_token)

        api_key = generate_api_key()

        user_doc = {
            'full_name': full_name.strip(),
            'name': full_name.strip(),
            'email': normalized_email,
            'username': username.lower().strip() if username else None,
            'password_hash': password_hash,
            'api_key': api_key,
            'email_verified': False,
            'mfa_enabled': False,
            'mfa_secret': None,
            'google_id': None,
            'plan': 'free',
            'role': 'user',
            'is_active': True,
            'token_version': 0,
            'websites': [],
            'requests_today': 0,
            'requests_today_date': None,
            'total_requests': 0,
            'total_blocked': 0,
            'plan_expires': None,
            'ddos_enabled': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
            'last_login': None,
        }

        result = self.db.users.insert_one(user_doc)
        user_id = str(result.inserted_id) if hasattr(result, 'inserted_id') else user_doc.get('_id', '')

        self.db.email_verification_tokens.insert_one({
            'user_id': user_id,
            'token_hash': token_hash,
            'email': normalized_email,
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.EMAIL_VERIFICATION_EXPIRE_MINUTES
            ),
            'used': False,
            'request_ip': ip_address or 'unknown',
            'request_user_agent': user_agent[:200] if user_agent else '',
            'verification_attempts': 0,
        })

        self._log_audit(
            user_id=user_id,
            action='register',
            ip_address=ip_address,
            user_agent=user_agent,
            status='success',
            details={'email': normalized_email},
        )

        self.logger.log_info(f"New user registered: {normalized_email}")

        return {
            'success': True,
            'message': 'Registration successful. Please check your email to verify your account.',
            'verification_token': verification_token,
            'user_id': user_id,
        }

    def resend_verification(self, email: str, ip_address: str = '',
                            user_agent: str = '') -> Dict:
        self._cleanup_old_tokens()
        normalized_email = email.strip().lower()

        if self._check_ip_verification_rate(ip_address):
            return {
                'success': False,
                'error': 'Too many verification requests. Please try again later.',
            }

        if self._check_global_verification_rate():
            return {
                'success': False,
                'error': 'System is under high load. Please try again later.',
            }

        user = self.db.users.find_one({'email': normalized_email})

        if not user:
            return {
                'success': True,
                'message': UNIFORM_MESSAGE_IF_NOT_FOUND,
            }

        if user.get('email_verified'):
            return {
                'success': True,
                'message': 'Your email is already verified.',
            }

        recent_tokens = self.db.email_verification_tokens.count_documents({
            'email': normalized_email,
            'created_at': {
                '$gte': datetime.now(timezone.utc) - timedelta(
                    minutes=self.config.RESEND_VERIFICATION_WINDOW_MINUTES
                )
            }
        })

        if recent_tokens >= self.config.RESEND_VERIFICATION_RATE_LIMIT:
            self._log_security_event(
                'verification_resend_rate_exceeded',
                user_id=str(user['_id']),
                ip_address=ip_address,
                severity='warning',
                details={'email': normalized_email, 'attempts': recent_tokens},
            )
            return {
                'success': False,
                'error': 'Too many verification emails. Please try again later.',
            }

        self.db.email_verification_tokens.update_many(
            {'email': normalized_email, 'used': False},
            {'$set': {'used': True, 'invalidated_reason': 'resend_new_token'}}
        )

        verification_token = self.jwt_service.generate_email_verification_token(normalized_email)
        raw_token = self.jwt_service.extract_raw_token(verification_token)
        token_hash = self.jwt_service.hash_token(raw_token)

        self.db.email_verification_tokens.insert_one({
            'user_id': str(user['_id']),
            'token_hash': token_hash,
            'email': normalized_email,
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.EMAIL_VERIFICATION_EXPIRE_MINUTES
            ),
            'used': False,
            'request_ip': ip_address or 'unknown',
            'request_user_agent': user_agent[:200] if user_agent else '',
            'verification_attempts': 0,
        })

        self._log_audit(
            user_id=str(user['_id']),
            action='verification_email_resent',
            ip_address=ip_address,
            user_agent=user_agent,
            status='success',
            details={'email': normalized_email},
        )

        return {
            'success': True,
            'message': 'A new verification email has been sent.',
            'verification_token': verification_token,
        }

    def verify_email(self, token: str, ip_address: str = '',
                     user_agent: str = '') -> Dict:
        raw_token = self.jwt_service.extract_raw_token(token)

        token_hash = self.jwt_service.hash_token(raw_token)

        token_record = self.db.email_verification_tokens.find_one({
            'token_hash': token_hash,
        })

        if not token_record:
            return {
                'success': False,
                'error': 'Invalid verification token',
            }

        if token_record.get('used', False):
            return {
                'success': False,
                'error': 'This verification link has already been used. Please request a new one.',
            }

        expires_at = token_record['expires_at']
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return {
                'success': False,
                'error': 'Verification token has expired. Please request a new one.',
            }

        email = token_record['email']

        if self.jwt_service._hmac_key and '.' in token:
            if not self.jwt_service.verify_token_email_binding(token, email):
                self._log_security_event(
                    'email_token_binding_mismatch',
                    user_id=token_record['user_id'],
                    ip_address=ip_address,
                    severity='critical',
                    details={'email': email, 'reason': 'HMAC binding mismatch'},
                )
                return {
                    'success': False,
                    'error': 'Invalid verification token',
                }

        update_result = self.db.email_verification_tokens.update_one(
            {
                '_id': token_record['_id'],
                'used': False,
            },
            {
                '$set': {
                    'used': True,
                    'used_at': datetime.now(timezone.utc),
                    'used_ip': ip_address or 'unknown',
                    'used_user_agent': user_agent[:200] if user_agent else '',
                },
                '$inc': {'verification_attempts': 1},
            }
        )

        if update_result.modified_count == 0:
            return {
                'success': False,
                'error': 'This verification link has already been used. Please request a new one.',
            }

        self.db.users.update_one(
            {'_id': to_object_id(token_record['user_id'])},
            {'$set': {
                'email_verified': True,
                'updated_at': datetime.now(timezone.utc),
            }}
        )

        self._log_audit(
            user_id=token_record['user_id'],
            action='email_verified',
            ip_address=ip_address,
            user_agent=user_agent,
            status='success',
            details={'email': email},
        )

        self.logger.log_info(f"Email verified: {email}")

        return {
            'success': True,
            'message': 'Email verified successfully. You can now log in.',
        }

    def check_verification_status(self, email: str) -> Dict:
        normalized_email = email.strip().lower()
        user = self.db.users.find_one({'email': normalized_email})
        if not user:
            return {
                'success': False,
                'error': 'User not found',
            }
        return {
            'success': True,
            'email_verified': user.get('email_verified', False),
        }
