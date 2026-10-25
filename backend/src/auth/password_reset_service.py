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
        import secrets
        normalized_email = email.strip().lower()
        user = self.db.users.find_one({'email': normalized_email})

        if not user:
            pending = self.db.pending_registrations.find_one({'email': normalized_email})
            if pending:
                return {
                    'success': False,
                    'error': 'This email has a pending registration that has not been verified yet. Please verify your email first.',
                }
            return {
                'success': False,
                'error': 'No registered account found with this email address. Please check your email or register.',
            }

        if not user.get('email_verified', False):
            return {
                'success': False,
                'error': 'Your account has not been activated yet. Please complete your registration verification first.',
            }

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        reset_token = self.jwt_service.generate_password_reset_token()
        token_hash = self.jwt_service.hash_token(reset_token)

        self.db.password_reset_otps.update_many(
            {'user_id': str(user['_id']), 'used': False},
            {'$set': {'used': True}}
        )

        self.db.password_reset_otps.update_one(
            {'email': normalized_email},
            {'$set': {
                'user_id': str(user['_id']),
                'email': normalized_email,
                'otp_code': otp_code,
                'reset_token': reset_token,
                'token_hash': token_hash,
                'created_at': datetime.now(timezone.utc),
                'expires_at': datetime.now(timezone.utc) + timedelta(
                    minutes=self.config.PASSWORD_RESET_EXPIRE_MINUTES
                ),
                'used': False,
                'attempts': 0,
            }},
            upsert=True
        )

        self.db.password_reset_tokens.insert_one({
            'user_id': str(user['_id']),
            'token_hash': token_hash,
            'otp_code': otp_code,
            'email': normalized_email,
            'created_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(
                minutes=self.config.PASSWORD_RESET_EXPIRE_MINUTES
            ),
            'used': False,
        })

        user_name = user.get('username') or user.get('full_name') or user.get('name') or ''

        self.logger.log_info(f"Password reset OTP generated for: {normalized_email}")

        return {
            'success': True,
            'message': 'If an account exists with this email, a 6-digit verification code has been sent.',
            'reset_token': reset_token,
            'otp_code': otp_code,
            'email': normalized_email,
            'user_name': user_name,
        }

    def verify_otp(self, email: str, otp: str) -> Dict:
        code = otp.strip()
        normalized_email = email.strip().lower()

        record = self.db.password_reset_otps.find_one({'email': normalized_email, 'used': False})
        if not record:
            return {
                'success': False,
                'error': 'No active password reset request found for this email.',
            }

        expires_at = record['expires_at']
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return {
                'success': False,
                'error': 'The verification code has expired. Please click Resend Code.',
            }

        match_record = {'_id': record['_id']} if '_id' in record else {'email': record['email']}

        if code != record.get('otp_code') and code != record.get('reset_token'):
            self.db.password_reset_otps.update_one(
                match_record,
                {'$inc': {'attempts': 1}}
            )
            if record.get('attempts', 0) >= 4:
                return {
                    'success': False,
                    'error': 'Too many failed verification attempts. Please request a new reset code.',
                }
            return {
                'success': False,
                'error': 'Invalid 6-digit code. Please check your email and try again.',
            }

        return {
            'success': True,
            'message': 'Verification code verified successfully. Please enter your new password.',
            'reset_token': record.get('reset_token'),
        }

    def reset_password(self, token: str = None, new_password: str = '',
                       email: str = '', otp: str = '') -> Dict:
        code = (otp or token or '').strip()
        normalized_email = email.strip().lower() if email else ''

        # 1. Check password_reset_otps
        record = None
        if normalized_email:
            record = self.db.password_reset_otps.find_one({'email': normalized_email, 'used': False})
        elif len(code) == 6 and code.isdigit():
            record = self.db.password_reset_otps.find_one({'otp_code': code, 'used': False})

        # Check if code was already used
        if not record:
            already_used = self.db.password_reset_otps.find_one({
                '$or': [{'otp_code': code}, {'reset_token': code}],
                'used': True
            })
            if already_used:
                return {
                    'success': False,
                    'error': 'This verification code has already been used. Please request a new code.',
                }

        if record:
            match_record = {'_id': record['_id']} if '_id' in record else {'email': record['email']}

            if code != record.get('otp_code') and code != record.get('reset_token'):
                self.db.password_reset_otps.update_one(
                    match_record,
                    {'$inc': {'attempts': 1}}
                )
                if record.get('attempts', 0) >= 4:
                    return {
                        'success': False,
                        'error': 'Too many failed verification attempts. Please request a new reset code.',
                    }
                return {
                    'success': False,
                    'error': 'Invalid 6-digit reset code. Please check and try again.',
                }

            expires_at = record['expires_at']
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                return {
                    'success': False,
                    'error': 'Reset code has expired. Please request a new one.',
                }

            password_validation = self.password_service.validate_strength(new_password)
            if not password_validation['valid']:
                return {
                    'success': False,
                    'error': 'Password does not meet security requirements',
                    'details': password_validation['errors'],
                }

            password_hash = self.password_service.hash_password(new_password)
            user_id = record['user_id']

            self.db.users.update_one(
                {'$or': [{'_id': to_object_id(user_id)}, {'email': record.get('email')}]},
                {'$set': {
                    'password_hash': password_hash,
                    'updated_at': datetime.now(timezone.utc),
                },
                '$inc': {'token_version': 1}}
            )

            # Invalidate in both password_reset_otps and password_reset_tokens
            self.db.password_reset_otps.update_many(
                {'$or': [{'email': record.get('email')}, {'user_id': user_id}]},
                {'$set': {'used': True, 'used_at': datetime.now(timezone.utc)}}
            )
            self.db.password_reset_tokens.update_many(
                {'$or': [{'email': record.get('email')}, {'user_id': user_id}]},
                {'$set': {'used': True, 'used_at': datetime.now(timezone.utc)}}
            )

            self.db.refresh_tokens.update_many(
                {'user_id': user_id},
                {'$set': {'revoked': True}}
            )

            self.db.sessions.update_many(
                {'user_id': user_id, 'is_active': True},
                {'$set': {'is_active': False, 'invalidated_at': datetime.now(timezone.utc)}}
            )

            self.logger.log_info(f"Password reset successfully for user: {user_id}")

            return {
                'success': True,
                'message': 'Password reset successful! You can now log in with your new password.',
            }

        # 2. Fallback: check legacy password_reset_tokens
        token_hash = self.jwt_service.hash_token(code)
        token_record = self.db.password_reset_tokens.find_one({
            '$or': [{'token_hash': token_hash}, {'otp_code': code}],
            'used': False,
        })

        if not token_record:
            return {
                'success': False,
                'error': 'Invalid or expired password reset code/token. Please request a new one.',
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

        self.db.password_reset_tokens.update_one(
            {'_id': token_record['_id']},
            {'$set': {'used': True, 'used_at': datetime.now(timezone.utc)}}
        )

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
