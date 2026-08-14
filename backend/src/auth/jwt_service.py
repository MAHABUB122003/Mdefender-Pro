import secrets
import hashlib
import hmac
import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

from jose import jwt, JWTError

from src.auth.config import AuthConfig


class JWTService:
    def __init__(self):
        self.config = AuthConfig()
        if not self.config.JWT_SECRET_KEY:
            self.config.JWT_SECRET_KEY = secrets.token_hex(32)
        self._hmac_key = self.config.HMAC_SECRET_KEY.encode('utf-8') if self.config.HMAC_SECRET_KEY else b''

    def _get_hmac_key(self) -> bytes:
        if self._hmac_key:
            return self._hmac_key
        return self.config.JWT_SECRET_KEY.encode('utf-8')

    def create_access_token(self, user_id: str, email: str, role: str = 'user',
                            extra_claims: Optional[Dict] = None) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            'sub': user_id,
            'email': email,
            'role': role,
            'type': 'access',
            'iat': now,
            'exp': now + timedelta(minutes=self.config.ACCESS_TOKEN_EXPIRE_MINUTES),
            'jti': secrets.token_urlsafe(32),
        }
        if extra_claims:
            payload.update(extra_claims)
        return jwt.encode(payload, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)

    def create_refresh_token(self, user_id: str, session_id: str,
                             token_version: int = 0) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            'sub': user_id,
            'session_id': session_id,
            'type': 'refresh',
            'token_version': token_version,
            'iat': now,
            'exp': now + timedelta(days=self.config.REFRESH_TOKEN_EXPIRE_DAYS),
            'jti': secrets.token_urlsafe(32),
        }
        return jwt.encode(payload, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[Dict]:
        try:
            payload = jwt.decode(
                token,
                self.config.JWT_SECRET_KEY,
                algorithms=[self.config.JWT_ALGORITHM]
            )
            return payload
        except JWTError:
            return None

    def decode_access_token(self, token: str) -> Optional[Dict]:
        payload = self.decode_token(token)
        if payload and payload.get('type') == 'access':
            return payload
        return None

    def decode_refresh_token(self, token: str) -> Optional[Dict]:
        payload = self.decode_token(token)
        if payload and payload.get('type') == 'refresh':
            return payload
        return None

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode('utf-8')).hexdigest()

    def generate_email_verification_token(self, email: str = '') -> str:
        raw_token = secrets.token_urlsafe(self.config.TOKEN_ENTROPY_BYTES)
        if email:
            bound = self._bind_token_to_email(raw_token, email)
            return f"{raw_token}.{bound}"
        return raw_token

    def _bind_token_to_email(self, token: str, email: str) -> str:
        payload = f"{token}:{email.lower().strip()}"
        sig = hmac.new(self._get_hmac_key(), payload.encode('utf-8'), hashlib.sha256).hexdigest()
        return sig[:16]

    def verify_token_email_binding(self, token_parts: str, email: str) -> bool:
        parts = token_parts.split('.', 1)
        if len(parts) != 2:
            return False
        raw_token, expected_sig = parts
        payload = f"{raw_token}:{email.lower().strip()}"
        computed_sig = hmac.new(self._get_hmac_key(), payload.encode('utf-8'), hashlib.sha256).hexdigest()[:16]
        return hmac.compare_digest(computed_sig, expected_sig)

    def extract_raw_token(self, full_token: str) -> str:
        parts = full_token.split('.', 1)
        return parts[0]

    @staticmethod
    def generate_password_reset_token() -> str:
        return secrets.token_urlsafe(48)

    @staticmethod
    def constant_time_compare(a: str, b: str) -> bool:
        return hmac.compare_digest(a.encode('utf-8'), b.encode('utf-8'))

    @staticmethod
    def generate_state_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_anti_phishing_code() -> str:
        return secrets.token_hex(4)
