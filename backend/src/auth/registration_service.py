import secrets
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


class RegistrationService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.password_service = PasswordService()
        self.email_service = EmailService()
        self.jwt_service = JWTService()
        self.logger = Logger()

    def register(self, full_name: str, email: str, password: str,
                 username: Optional[str] = None, ip_address: str = '',
                 user_agent: str = '') -> Dict:
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

        verification_token = self.jwt_service.generate_email_verification_token()
        token_hash = self.jwt_service.hash_token(verification_token)

        user_doc = {
            'full_name': full_name.strip(),
            'email': normalized_email,
            'username': username.lower().strip() if username else None,
            'password_hash': password_hash,
            'email_verified': False,
            'mfa_enabled': False,
            'mfa_secret': None,
            'google_id': None,
            'plan': 'free',
            'role': 'user',
            'is_active': True,
            'token_version': 0,
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
        })

        self.logger.log_info(f"New user registered: {normalized_email}")

        return {
            'success': True,
            'message': 'Registration successful. Please check your email to verify your account.',
            'verification_token': verification_token,
            'user_id': user_id,
        }

    def resend_verification(self, email: str, ip_address: str = '') -> Dict:
        normalized_email = email.strip().lower()
        user = self.db.users.find_one({'email': normalized_email})

        if not user:
            return {
                'success': True,
                'message': 'If an account exists with this email, a verification link has been sent.',
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
            return {
                'success': False,
                'error': 'Too many verification emails. Please try again later.',
            }

        self.db.email_verification_tokens.update_many(
            {'email': normalized_email, 'used': False},
            {'$set': {'used': True}}
        )

        verification_token = self.jwt_service.generate_email_verification_token()
        token_hash = self.jwt_service.hash_token(verification_token)

        self.db.email_verification_tokens.insert_one({
            'user_id': str(user['_id']),
            'token_hash': token_hash,
            'email': normalized_email,
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.EMAIL_VERIFICATION_EXPIRE_MINUTES
            ),
            'used': False,
        })

        return {
            'success': True,
            'message': 'A new verification email has been sent.',
            'verification_token': verification_token,
        }

    def verify_email(self, token: str) -> Dict:
        token_hash = self.jwt_service.hash_token(token)

        token_record = self.db.email_verification_tokens.find_one({
            'token_hash': token_hash,
            'used': False,
        })

        if not token_record:
            return {
                'success': False,
                'error': 'Invalid or already used verification token',
            }

        expires_at = token_record['expires_at']
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return {
                'success': False,
                'error': 'Verification token has expired. Please request a new one.',
            }

        self.db.users.update_one(
            {'_id': to_object_id(token_record['user_id'])},
            {'$set': {
                'email_verified': True,
                'updated_at': datetime.now(timezone.utc),
            }}
        )

        self.db.email_verification_tokens.update_one(
            {'_id': token_record['_id']},
            {'$set': {'used': True}}
        )

        self.logger.log_info(f"Email verified: {token_record['email']}")

        return {
            'success': True,
            'message': 'Email verified successfully. You can now log in.',
        }
