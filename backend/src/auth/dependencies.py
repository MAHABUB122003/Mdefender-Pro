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
    # Check Authorization header (SPA primary), Cookie (browser fallback), Query param
    header_token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    cookie_token = cookie_service.get_access_token(request)
    query_token = request.query_params.get('token', '').strip()

    # Priority 1: Authorization Header
    payload = None
    if header_token:
        payload = jwt_service.decode_access_token(header_token)

    # Priority 2: Cookie if header failed or not provided
    if not payload and cookie_token:
        payload = jwt_service.decode_access_token(cookie_token)

    # Priority 3: Query parameter
    if not payload and query_token:
        payload = jwt_service.decode_access_token(query_token)

    if not payload:
        if not header_token and not cookie_token and not query_token:
            raise HTTPException(status_code=401, detail='Not authenticated')
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
        user_oid = None

    # Try ObjectId lookup first (real MongoDB), then string lookup (in-memory fallback)
    user = None
    if user_oid:
        user = db.users.find_one({'_id': user_oid})
    if not user:
        user = db.users.find_one({'_id': payload['sub']})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')

    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account is deactivated')

    return {
        'id': str(user['_id']),
        'email': user['email'],
        'full_name': user.get('full_name', user.get('name', '')),
        'name': user.get('name', user.get('full_name', '')),
        'username': user.get('username'),
        'role': user.get('role', 'user'),
        'email_verified': user.get('email_verified', False),
        'mfa_enabled': user.get('mfa_enabled', False),
        'plan': user.get('plan', 'free'),
        'token_version': user.get('token_version', 0),
    }


async def get_current_admin(request: Request) -> str:
    header_token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    cookie_token = cookie_service.get_access_token(request)
    query_token = request.query_params.get('token', '').strip()

    payload = None
    if header_token:
        payload = jwt_service.decode_access_token(header_token)
    if not payload and cookie_token:
        payload = jwt_service.decode_access_token(cookie_token)
    if not payload and query_token:
        payload = jwt_service.decode_access_token(query_token)

    if not payload:
        if not header_token and not cookie_token and not query_token:
            raise HTTPException(status_code=401, detail='Not authenticated')
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
