from datetime import datetime, timedelta, timezone
from typing import Dict
from bson import ObjectId
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig
from src.auth.jwt_service import JWTService
from src.services.password_service import PasswordService
from src.utils.logger import Logger
from src.utils.objectid import to_object_id


class PasswordResetService:
    def __init__(self):
        self.db = MongoDB()
        self.config = AuthConfig()
        self.jwt_service = JWTService()
        self.password_service = PasswordService()
        self.logger = Logger()

    def forgot_password(self, email: str) -> Dict:
        normalized_email = email.strip().lower()
        user = self.db.users.find_one({'email': normalized_email})

        if not user:
            return {
                'success': True,
                'message': 'If an account exists with this email, a password reset link has been sent.',
            }

        self.db.password_reset_tokens.update_many(
            {'user_id': str(user['_id']), 'used': False},
            {'$set': {'used': True}}
        )

        reset_token = self.jwt_service.generate_password_reset_token()
        token_hash = self.jwt_service.hash_token(reset_token)

        self.db.password_reset_tokens.insert_one({
            'user_id': str(user['_id']),
            'token_hash': token_hash,
            'email': normalized_email,
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.PASSWORD_RESET_EXPIRE_MINUTES
            ),
            'used': False,
        })

        self.logger.log_info(f"Password reset requested for: {normalized_email}")

        return {
            'success': True,
            'message': 'If an account exists with this email, a password reset link has been sent.',
            'reset_token': reset_token,
        }

    def reset_password(self, token: str, new_password: str) -> Dict:
        token_hash = self.jwt_service.hash_token(token)

        update_result = self.db.password_reset_tokens.update_one(
            {
                'token_hash': token_hash,
                'used': False,
            },
            {
                '$set': {
                    'used': True,
                    'used_at': datetime.now(timezone.utc),
                }
            }
        )

        if update_result.modified_count == 0:
            return {
                'success': False,
                'error': 'Invalid or already used reset token',
            }

        token_record = self.db.password_reset_tokens.find_one({
            'token_hash': token_hash,
        })

        if not token_record:
            return {
                'success': False,
                'error': 'Invalid reset token',
            }

        expires_at = token_record['expires_at']
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return {
                'success': False,
                'error': 'Reset token has expired. Please request a new one.',
            }

        password_validation = self.password_service.validate_strength(new_password)
        if not password_validation['valid']:
            return {
                'success': False,
                'error': 'Password does not meet security requirements',
                'details': password_validation['errors'],
            }

        password_hash = self.password_service.hash_password(new_password)
        user_id = token_record['user_id']

        self.db.users.update_one(
            {'_id': to_object_id(user_id)},
            {'$set': {
                'password_hash': password_hash,
                'updated_at': datetime.now(timezone.utc),
            },
            '$inc': {'token_version': 1}}
        )

        self.db.refresh_tokens.update_many(
            {'user_id': user_id},
            {'$set': {'revoked': True}}
        )

        self.db.sessions.update_many(
            {'user_id': user_id, 'is_active': True},
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )

        self.logger.log_info(f"Password reset completed for user: {user_id}")

        return {
            'success': True,
            'message': 'Password reset successful. Please log in with your new password.',
        }

    def change_password(self, user_id: str, current_password: str,
                        new_password: str) -> Dict:
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {
                'success': False,
                'error': 'User not found',
            }

        if not self.password_service.verify_password(current_password, user.get('password_hash', '')):
            return {
                'success': False,
                'error': 'Current password is incorrect',
            }

        if current_password == new_password:
            return {
                'success': False,
                'error': 'New password must be different from current password',
            }

        password_validation = self.password_service.validate_strength(new_password)
        if not password_validation['valid']:
            return {
                'success': False,
                'error': 'Password does not meet security requirements',
                'details': password_validation['errors'],
            }

        password_hash = self.password_service.hash_password(new_password)

        self.db.users.update_one(
            {'_id': user_oid},
            {'$set': {
                'password_hash': password_hash,
                'updated_at': datetime.now(timezone.utc),
            },
            '$inc': {'token_version': 1}}
        )

        self.db.refresh_tokens.update_many(
            {'user_id': user_id},
            {'$set': {'revoked': True}}
        )

        self.db.sessions.update_many(
            {'user_id': user_id, 'is_active': True},
            {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
        )

        self.logger.log_info(f"Password changed for user: {user_id}")

        return {
            'success': True,
            'message': 'Password changed successfully. Please log in again.',
        }

    def change_email(self, user_id: str, new_email: str, password: str) -> Dict:
        normalized_email = new_email.strip().lower()
        user_oid = to_object_id(user_id)
        if not user_oid:
            return {'success': False, 'error': 'Invalid user ID'}
        user = self.db.users.find_one({'_id': user_oid})
        if not user:
            return {
                'success': False,
                'error': 'User not found',
            }

        if not self.password_service.verify_password(password, user.get('password_hash', '')):
            return {
                'success': False,
                'error': 'Password is incorrect',
            }

        existing = self.db.users.find_one({'email': normalized_email})
        if existing and str(existing['_id']) != user_id:
            return {
                'success': False,
                'error': 'An account with this email already exists',
            }

        from src.services.email_service import EmailService
        email_service = EmailService()
        email_validation = email_service.validate(normalized_email)
        if not email_validation['valid']:
            return {
                'success': False,
                'error': 'Invalid email address',
                'details': email_validation['errors'],
            }

        self.db.users.update_one(
            {'_id': user_oid},
            {'$set': {
                'email': email_validation['normalized_email'],
                'email_verified': False,
                'updated_at': datetime.now(timezone.utc),
            }}
        )

        verification_token = self.jwt_service.generate_email_verification_token(email_validation['normalized_email'])
        raw_token = self.jwt_service.extract_raw_token(verification_token)
        token_hash = self.jwt_service.hash_token(raw_token)

        self.db.email_verification_tokens.insert_one({
            'user_id': user_id,
            'token_hash': token_hash,
            'email': email_validation['normalized_email'],
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.EMAIL_VERIFICATION_EXPIRE_MINUTES
            ),
            'used': False,
            'request_ip': 'account_change',
            'request_user_agent': '',
            'verification_attempts': 0,
        })

        return {
            'success': True,
            'message': 'Email changed. Please verify your new email address.',
            'verification_token': verification_token,
        }
