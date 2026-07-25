from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
import re


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    confirm_password: str = Field(..., min_length=12, max_length=128)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if v is not None:
            if not re.match(r'^[a-zA-Z0-9_-]+$', v):
                raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters')
        return v

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        v = v.strip()
        if not re.match(r'^[a-zA-Z\u00C0-\u024F\s\'-]+$', v):
            raise ValueError('Full name contains invalid characters')
        return v


class LoginRequest(BaseModel):
    email_or_username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = False


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=64, max_length=128)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=64, max_length=128)
    password: str = Field(..., min_length=12, max_length=128)
    confirm_password: str = Field(..., min_length=12, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=12, max_length=128)
    confirm_password: str = Field(..., min_length=12, max_length=128)


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class EnableMFAResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: List[str]


class VerifyMFARequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    secret: Optional[str] = None


class VerifyMFASetupRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class DisableMFARequest(BaseModel):
    password: str
    code: str = Field(..., min_length=6, max_length=6)


class MFAChallengeRequest(BaseModel):
    temp_token: str = Field(..., min_length=1)
    code: str = Field(..., min_length=6, max_length=8)


class GoogleCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class UserProfileResponse(BaseModel):
    id: str
    full_name: str
    username: Optional[str]
    email: str
    email_verified: bool
    mfa_enabled: bool
    created_at: str
    last_login: Optional[str]


class SessionResponse(BaseModel):
    id: str
    device: str
    browser: str
    os: str
    ip_address: str
    location: Optional[str]
    created_at: str
    last_active: str
    is_current: bool


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    action: str
    ip_address: str
    user_agent: str
    device: str
    browser: str
    os: str
    country: Optional[str]
    status: str
    details: Optional[dict]
