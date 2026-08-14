import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class AuthConfig:
    JWT_SECRET_KEY: str = field(default_factory=lambda: os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', '')))
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_COOKIE: str = 'mdefender_refresh'
    ACCESS_TOKEN_COOKIE: str = 'mdefender_access'
    CSRF_COOKIE: str = 'mdefender_csrf'
    CSRF_HEADER: str = 'X-CSRF-Token'

    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 15
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15
    RESEND_VERIFICATION_RATE_LIMIT: int = 3
    RESEND_VERIFICATION_WINDOW_MINUTES: int = 60
    VERIFY_EMAIL_IP_RATE_LIMIT: int = 10
    VERIFY_EMAIL_IP_WINDOW_MINUTES: int = 60
    VERIFY_EMAIL_GLOBAL_RATE_LIMIT: int = 50
    VERIFY_EMAIL_GLOBAL_WINDOW_MINUTES: int = 60
    TOKEN_ENTROPY_BYTES: int = 64
    HMAC_SECRET_KEY: str = field(default_factory=lambda: os.getenv('HMAC_SECRET_KEY', os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', ''))))
    VERIFICATION_SUSPICIOUS_THRESHOLD: int = 5

    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    PROGRESSIVE_DELAY_BASE: int = 2
    PROGRESSIVE_DELAY_MAX_SECONDS: int = 300
    PERMANENT_LOCKOUT_THRESHOLD: int = 20

    MAX_CONCURRENT_SESSIONS: int = 5

    GOOGLE_CLIENT_ID: str = field(default_factory=lambda: os.getenv('GOOGLE_CLIENT_ID', ''))
    GOOGLE_CLIENT_SECRET: str = field(default_factory=lambda: os.getenv('GOOGLE_CLIENT_SECRET', ''))
    GOOGLE_REDIRECT_URI: str = field(default_factory=lambda: os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5173/auth/google/callback'))

    FRONTEND_URL: str = field(default_factory=lambda: os.getenv('FRONTEND_URL', 'http://localhost:5173'))

    SMTP_SERVER: str = field(default_factory=lambda: os.getenv('SMTP_SERVER', ''))
    SMTP_PORT: int = field(default_factory=lambda: int(os.getenv('SMTP_PORT', '587')))
    SMTP_USERNAME: str = field(default_factory=lambda: os.getenv('SMTP_USERNAME', ''))
    SMTP_PASSWORD: str = field(default_factory=lambda: os.getenv('SMTP_PASSWORD', ''))
    SMTP_FROM_EMAIL: str = field(default_factory=lambda: os.getenv('SMTP_FROM_EMAIL', os.getenv('SMTP_USERNAME', '')))
    SMTP_FROM_NAME: str = 'MDefender Pro'

    CORS_ORIGINS: list = field(default_factory=lambda: [
        origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',') if origin.strip()
    ])

    COOKIE_SECURE: bool = field(default_factory=lambda: os.getenv('COOKIE_SECURE', 'false').lower() == 'true')
    COOKIE_DOMAIN: str = field(default_factory=lambda: os.getenv('COOKIE_DOMAIN', ''))
    COOKIE_SAMESITE: str = 'strict'

    MFA_ISSUER_NAME: str = 'MDefender Pro'
    MFA_CODE_VALIDITY_SECONDS: int = 30
    MFA_BACKUP_CODES_COUNT: int = 10

    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 100
