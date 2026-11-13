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
        # Support API Key authentication fallback
        raw_key = header_token or request.headers.get('X-API-Key', '').strip() or query_token
        if raw_key and len(raw_key) >= 16:
            user_by_key = db.users.find_one({'api_key': raw_key})
            if user_by_key:
                payload = {
                    'sub': str(user_by_key['_id']),
                    'email': user_by_key.get('email', ''),
                    'role': user_by_key.get('role', 'user'),
                    'is_admin': user_by_key.get('role') in ('admin', 'super_admin') or user_by_key.get('is_admin')
                }

    if not payload:
        if not header_token and not cookie_token and not query_token:
            raise HTTPException(status_code=401, detail='Not authenticated')
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    if payload.get('mfa_pending'):
        raise HTTPException(status_code=401, detail='MFA verification required')

    if payload.get('is_admin') or payload.get('role') == 'super_admin':
        # Fetch admin user from DB to get correct _id (needed for user_id matching on websites)
        admin_user = None
        admin_sub = payload.get('sub', '')
        try:
            if ObjectId.is_valid(admin_sub):
                admin_user = db.users.find_one({'_id': ObjectId(admin_sub)})
            if not admin_user:
                admin_user = db.users.find_one({'_id': admin_sub})
            if not admin_user:
                admin_user = db.users.find_one({
                    '$or': [
                        {'email': payload.get('email')},
                        {'username': payload.get('email')},
                        {'role': 'super_admin'},
                    ]
                })
        except Exception:
            pass
        admin_id = str(admin_user['_id']) if admin_user else admin_sub
        return {
            'id': admin_id,
            '_id': admin_id,
            'email': payload.get('email') or (admin_user.get('email') if admin_user else 'admin'),
            'full_name': 'Administrator',
            'username': payload.get('email') or (admin_user.get('username') if admin_user else 'admin'),
            'role': 'super_admin',
            'email_verified': True,
            'mfa_enabled': False,
            'plan': 'enterprise',
            'is_admin': True,
            'api_key': admin_user.get('api_key', '') if admin_user else '',
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

    user_id_str = str(user['_id'])
    websites_count = 0
    try:
        websites_count = db.websites.count_documents({
            '$or': [{'user_id': user_id_str}, {'user_id': user['_id']}]
        })
    except Exception:
        pass
    is_onboarded = bool(user.get('onboarded') or websites_count > 0)

    return {
        'id': user_id_str,
        '_id': user_id_str,
        'email': user['email'],
        'full_name': user.get('full_name', user.get('name', '')),
        'name': user.get('name', user.get('full_name', '')),
        'username': user.get('username'),
        'role': user.get('role', 'user'),
        'is_admin': user.get('role') == 'super_admin' or user.get('is_admin', False),
        'email_verified': user.get('email_verified', False),
        'mfa_enabled': user.get('mfa_enabled', False),
        'plan': user.get('plan', 'free'),
        'token_version': user.get('token_version', 0),
        'api_key': user.get('api_key', ''),
        'created_at': str(user.get('created_at', '')),
        'onboarded': is_onboarded,
        'websites_count': websites_count,
        'workspace_name': user.get('workspace_name', ''),
        'organization_type': user.get('organization_type', ''),
        'fleet_size': user.get('fleet_size', ''),
        'referral_source': user.get('referral_source', ''),
        'onboarding_step': user.get('onboarding_step', 'workspace' if not is_onboarded else 'completed'),
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
        # Support API Key authentication fallback
        raw_key = header_token or request.headers.get('X-API-Key', '').strip() or query_token
        if raw_key and len(raw_key) >= 16:
            user_by_key = db.users.find_one({'api_key': raw_key})
            if user_by_key:
                payload = {
                    'sub': str(user_by_key['_id']),
                    'email': user_by_key.get('email', ''),
                    'role': user_by_key.get('role', 'user'),
                    'is_admin': user_by_key.get('role') in ('admin', 'super_admin') or user_by_key.get('is_admin')
                }

    if not payload:
        if not header_token and not cookie_token and not query_token:
            raise HTTPException(status_code=401, detail='Not authenticated')
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    if payload.get('mfa_pending'):
        raise HTTPException(status_code=401, detail='MFA verification required')

    if not payload.get('is_admin') and payload.get('role') not in ('super_admin', 'admin'):
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
