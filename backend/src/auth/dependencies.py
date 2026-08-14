from datetime import datetime, timezone
from typing import Optional, Dict
from bson import ObjectId
from fastapi import Request, HTTPException, Response
from src.auth.jwt_service import JWTService
from src.auth.cookie_service import CookieService
from src.auth.csrf_service import CSRFService
from src.database.mongodb_connection import MongoDB
from src.auth.config import AuthConfig


jwt_service = JWTService()
cookie_service = CookieService()
csrf_service = CSRFService()
config = AuthConfig()
db = MongoDB()


async def get_current_user(request: Request) -> dict:
    token = cookie_service.get_access_token(request)

    if not token:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')

    payload = jwt_service.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    if payload.get('mfa_pending'):
        raise HTTPException(status_code=401, detail='MFA verification required')

    if payload.get('is_admin') or payload.get('role') == 'super_admin':
        return {
            'id': payload.get('sub', 'admin'),
            'email': payload.get('email', 'admin'),
            'full_name': 'Administrator',
            'username': payload.get('email', 'admin'),
            'role': 'super_admin',
            'email_verified': True,
            'mfa_enabled': False,
            'plan': 'enterprise',
            'is_admin': True,
        }

    try:
        user_oid = ObjectId(payload['sub'])
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid user ID')

    user = db.users.find_one({'_id': user_oid})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')

    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account is deactivated')

    return {
        'id': str(user['_id']),
        'email': user['email'],
        'full_name': user.get('full_name', ''),
        'username': user.get('username'),
        'role': user.get('role', 'user'),
        'email_verified': user.get('email_verified', False),
        'mfa_enabled': user.get('mfa_enabled', False),
        'plan': user.get('plan', 'free'),
        'token_version': user.get('token_version', 0),
    }


async def get_current_admin(request: Request) -> str:
    token = cookie_service.get_access_token(request)

    if not token:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')

    payload = jwt_service.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Admin access required')

    return payload.get('email', payload.get('sub', ''))


async def get_current_user_optional(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def verify_csrf_token(request: Request):
    csrf_cookie = cookie_service.get_csrf_token(request)
    csrf_header = cookie_service.get_csrf_from_header(request)

    if not csrf_cookie or not csrf_header:
        raise HTTPException(status_code=403, detail='CSRF token missing')

    if not csrf_service.validate_token(csrf_cookie, csrf_header):
        raise HTTPException(status_code=403, detail='Invalid CSRF token')
