import secrets
import asyncio
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import JSONResponse

from src.auth.config import AuthConfig
from src.auth.models import (
    RegisterRequest, LoginRequest, AdminLoginRequest, VerifyEmailRequest,
    ResendVerificationRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, ChangeEmailRequest, VerifyMFASetupRequest,
    DisableMFARequest, MFAChallengeRequest, GoogleCallbackRequest,
)
from src.auth.registration_service import RegistrationService
from src.auth.login_service import LoginService
from src.auth.password_reset_service import PasswordResetService
from src.auth.oauth_service import OAuthService
from src.auth.mfa_service import MFAService
from src.auth.session_service import SessionService
from src.auth.brute_force_service import BruteForceService
from src.auth.audit_service import AuditService
from src.auth.jwt_service import JWTService
from src.auth.cookie_service import CookieService
from src.auth.csrf_service import CSRFService
from src.auth.email_sender import AuthEmailService
from src.auth.dependencies import get_current_user, get_current_admin, verify_csrf_token
from src.database.mongodb_connection import MongoDB
from src.utils.objectid import to_object_id

auth_router = APIRouter()
config = AuthConfig()
registration_service = RegistrationService()
login_service = LoginService()
password_reset_service = PasswordResetService()
oauth_service = OAuthService()
mfa_service = MFAService()
session_service = SessionService()
brute_force = BruteForceService()
audit_service = AuditService()
jwt_service = JWTService()
cookie_service = CookieService()
csrf_service = CSRFService()
email_sender = AuthEmailService()
db = MongoDB()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'


def get_user_agent(request: Request) -> str:
    return request.headers.get('User-Agent', 'Unknown')


# ─── Registration ───

@auth_router.post('/register')
async def register(data: RegisterRequest, request: Request):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match')

    ip = get_client_ip(request)
    ua = get_user_agent(request)

    result = registration_service.register(
        full_name=data.full_name,
        email=data.email,
        password=data.password,
        username=data.username,
        ip_address=ip,
        user_agent=ua,
    )

    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    verification_token = result.get('verification_token', '')
    frontend_url = config.FRONTEND_URL
    smtp_configured = bool(config.SMTP_SERVER and config.SMTP_USERNAME)

    anti_phishing_code = jwt_service.generate_anti_phishing_code()
    asyncio.create_task(
        asyncio.to_thread(
            email_sender.send_verification_email,
            data.email, verification_token, frontend_url, anti_phishing_code
        )
    )

    response_data = {
        'status': 'success',
        'message': result['message'],
    }
    if not smtp_configured:
        response_data['verification_token'] = verification_token
        response_data['verification_url'] = f'{frontend_url}/auth/verify-email?token={verification_token}&email={data.email}'

    return response_data


# ─── Email Verification ───

@auth_router.post('/verify-email')
async def verify_email(data: VerifyEmailRequest, request: Request):
    ip = get_client_ip(request)
    ua = get_user_agent(request)

    result = registration_service.verify_email(
        data.token, ip_address=ip, user_agent=ua
    )
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return {'status': 'success', 'message': result['message']}


@auth_router.post('/resend-verification')
async def resend_verification(data: ResendVerificationRequest, request: Request):
    ip = get_client_ip(request)
    ua = get_user_agent(request)

    result = registration_service.resend_verification(
        data.email, ip_address=ip, user_agent=ua
    )
    if not result['success']:
        raise HTTPException(status_code=429, detail=result['error'])

    if result.get('verification_token'):
        verification_token = result['verification_token']
        frontend_url = config.FRONTEND_URL
        anti_phishing_code = jwt_service.generate_anti_phishing_code()
        asyncio.create_task(
            asyncio.to_thread(
                email_sender.send_verification_email,
                data.email, verification_token, frontend_url, anti_phishing_code
            )
        )

    return {'status': 'success', 'message': result['message']}


# ─── Login ───

@auth_router.post('/login')
async def login(data: LoginRequest, request: Request, response: Response):
    result = login_service.login(
        email_or_username=data.email_or_username,
        password=data.password,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        remember_me=data.remember_me,
    )

    if not result['success']:
        status_code = 401
        if result.get('locked'):
            status_code = 423
        elif result.get('mfa_required'):
            status_code = 200
        return JSONResponse(status_code=status_code, content={
            'status': 'error',
            'message': result.get('error') or result.get('message', 'Login failed'),
            'mfa_required': result.get('mfa_required', False),
            'temp_token': result.get('temp_token'),
            'email_not_verified': result.get('email_not_verified', False),
        })

    csrf_token = secrets.token_urlsafe(32)
    cookie_service.set_auth_cookies(
        response, result['access_token'], result['refresh_token'],
        csrf_token, data.remember_me
    )

    return {
        'status': 'success',
        'user': result['user'],
        'access_token': result['access_token'],
        'refresh_token': result['refresh_token'],
        'csrf_token': csrf_token,
    }


@auth_router.post('/mfa/verify')
async def verify_mfa(data: MFAChallengeRequest, request: Request, response: Response):
    result = login_service.verify_mfa_and_login(
        temp_token=data.temp_token,
        code=data.code,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    if not result['success']:
        raise HTTPException(status_code=401, detail=result['error'])

    csrf_token = secrets.token_urlsafe(32)
    cookie_service.set_auth_cookies(
        response, result['access_token'], result['refresh_token'],
        csrf_token
    )

    return {
        'status': 'success',
        'user': result['user'],
        'access_token': result['access_token'],
        'refresh_token': result['refresh_token'],
        'csrf_token': csrf_token,
    }


# ─── Admin Login ───

@auth_router.post('/admin/login')
async def admin_login(data: AdminLoginRequest, request: Request, response: Response):
    result = login_service.admin_login(
        username=data.username,
        password=data.password,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    if not result['success']:
        status_code = 423 if 'locked' in result.get('error', '').lower() else 401
        return JSONResponse(status_code=status_code, content={
            'status': 'error',
            'message': result['error'],
        })

    csrf_token = secrets.token_urlsafe(32)
    cookie_service.set_auth_cookies(
        response, result['access_token'], result['refresh_token'],
        csrf_token
    )

    return {
        'status': 'success',
        'redirect': result.get('redirect', '/admin/dashboard'),
        'access_token': result['access_token'],
        'refresh_token': result['refresh_token'],
        'csrf_token': csrf_token,
    }


# ─── Token Refresh ───

@auth_router.post('/refresh')
async def refresh_token(request: Request, response: Response):
    refresh_token = cookie_service.get_refresh_token(request)

    if not refresh_token:
        refresh_token_from_header = request.headers.get('X-Refresh-Token', '')
        if refresh_token_from_header:
            refresh_token = refresh_token_from_header

    if not refresh_token:
        raise HTTPException(status_code=401, detail='Refresh token not found')

    payload = jwt_service.decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired refresh token')

    user_id = payload['sub']
    token_version = payload.get('token_version', 0)

    is_admin = payload.get('is_admin', False) or payload.get('role') == 'super_admin'

    if is_admin:
        new_access_token = jwt_service.create_access_token(
            user_id, payload.get('email', user_id), role='super_admin',
            extra_claims={'is_admin': True}
        )
        new_refresh_token = jwt_service.create_refresh_token(
            user_id, payload.get('session_id', ''),
            token_version=token_version
        )
    else:
        user = db.users.find_one({'_id': to_object_id(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')

        if not user.get('is_active', True):
            raise HTTPException(status_code=403, detail='Account deactivated')

        stored_version = user.get('token_version', 0)
        if token_version < stored_version:
            raise HTTPException(status_code=401, detail='Token revoked. Please login again.')

        new_access_token = jwt_service.create_access_token(
            user_id, user['email'], role=user.get('role', 'user')
        )
        new_refresh_token = jwt_service.create_refresh_token(
            user_id, payload.get('session_id', ''),
            token_version=stored_version
        )

    csrf_token = secrets.token_urlsafe(32)
    cookie_service.set_access_token(response, new_access_token)
    cookie_service.set_refresh_token(response, new_refresh_token)
    cookie_service.set_csrf_token(response, csrf_token)

    return {
        'status': 'success',
        'access_token': new_access_token,
        'refresh_token': new_refresh_token,
        'csrf_token': csrf_token,
    }


# ─── Logout ───

@auth_router.post('/logout')
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    refresh_token = cookie_service.get_refresh_token(request)
    if refresh_token:
        payload = jwt_service.decode_refresh_token(refresh_token)
        if payload and payload.get('session_id'):
            session_service.invalidate_session(payload['session_id'])

    cookie_service.clear_auth_cookies(response)

    audit_service.log(
        user_id=user['id'],
        action='logout',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
    )

    return {'status': 'success', 'message': 'Logged out successfully'}


@auth_router.post('/logout-all')
async def logout_all(request: Request, response: Response, user: dict = Depends(get_current_user)):
    session_service.invalidate_all_user_sessions(user['id'])

    db.refresh_tokens.update_many(
        {'user_id': user['id']},
        {'$set': {'revoked': True}}
    )

    cookie_service.clear_auth_cookies(response)

    audit_service.log(
        user_id=user['id'],
        action='logout_all',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
    )

    return {'status': 'success', 'message': 'Logged out from all devices'}


# ─── Current User ───

@auth_router.get('/me')
async def get_me(user: dict = Depends(get_current_user)):
    return {
        'status': 'success',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'full_name': user['full_name'],
            'username': user['username'],
            'role': user['role'],
            'email_verified': user['email_verified'],
            'mfa_enabled': user['mfa_enabled'],
            'plan': user.get('plan', 'free'),
        }
    }


# ─── Forgot Password ───

@auth_router.post('/forgot-password')
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    result = password_reset_service.forgot_password(data.email)

    if result.get('reset_token'):
        reset_token = result['reset_token']
        frontend_url = config.FRONTEND_URL
        asyncio.create_task(
            asyncio.to_thread(
                email_sender.send_password_reset_email,
                data.email, reset_token, frontend_url
            )
        )

    return {'status': 'success', 'message': result['message']}


# ─── Reset Password ───

@auth_router.post('/reset-password')
async def reset_password(data: ResetPasswordRequest):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match')

    result = password_reset_service.reset_password(data.token, data.password)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    return {'status': 'success', 'message': result['message']}


# ─── Change Password ───

@auth_router.post('/change-password')
async def change_password(data: ChangePasswordRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match')

    result = password_reset_service.change_password(
        user['id'], data.current_password, data.new_password
    )
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    response = JSONResponse(content={'status': 'success', 'message': result['message']})
    cookie_service.clear_auth_cookies(response)

    audit_service.log(
        user_id=user['id'],
        action='password_changed',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
    )

    return response


# ─── Change Email ───

@auth_router.post('/change-email')
async def change_email(data: ChangeEmailRequest, request: Request,
                       user: dict = Depends(get_current_user)):
    result = password_reset_service.change_email(
        user['id'], data.new_email, data.password
    )
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    if result.get('verification_token'):
        verification_token = result['verification_token']
        frontend_url = config.FRONTEND_URL
        anti_phishing_code = jwt_service.generate_anti_phishing_code()
        asyncio.create_task(
            asyncio.to_thread(
                email_sender.send_verification_email,
                data.new_email, verification_token, frontend_url, anti_phishing_code
            )
        )

    audit_service.log(
        user_id=user['id'],
        action='email_changed',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
        details={'new_email': data.new_email},
    )

    return {'status': 'success', 'message': result['message']}


# ─── MFA Setup ───

@auth_router.post('/mfa/enable')
async def enable_mfa(user: dict = Depends(get_current_user)):
    result = mfa_service.setup_mfa(user['id'], user['email'])
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return {
        'status': 'success',
        'secret': result['secret'],
        'qr_code': result['qr_code'],
        'qr_code_url': result['qr_code_url'],
        'backup_codes': result['backup_codes'],
    }


@auth_router.post('/mfa/verify-setup')
async def verify_mfa_setup(data: VerifyMFASetupRequest,
                           request: Request,
                           user: dict = Depends(get_current_user)):
    result = mfa_service.verify_and_enable_mfa(user['id'], data.code)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    audit_service.log(
        user_id=user['id'],
        action='mfa_enabled',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
    )

    return {'status': 'success', 'message': result['message']}


@auth_router.post('/mfa/disable')
async def disable_mfa(data: DisableMFARequest, request: Request,
                      user: dict = Depends(get_current_user)):
    result = mfa_service.disable_mfa(user['id'], data.password, data.code)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])

    audit_service.log(
        user_id=user['id'],
        action='mfa_disabled',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        status='success',
    )

    return {'status': 'success', 'message': result['message']}


@auth_router.get('/mfa/status')
async def get_mfa_status(user: dict = Depends(get_current_user)):
    status = mfa_service.get_mfa_status(user['id'])
    return {'status': 'success', 'mfa_enabled': status['enabled']}


@auth_router.post('/mfa/regenerate-backup-codes')
async def regenerate_backup_codes(request: Request,
                                  user: dict = Depends(get_current_user)):
    from src.auth.models import DisableMFARequest as RegenRequest
    body = await request.json()
    password = body.get('password', '')

    result = mfa_service.regenerate_backup_codes(user['id'], password)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return {
        'status': 'success',
        'backup_codes': result['backup_codes'],
    }


# ─── Google OAuth ───

@auth_router.get('/google/url')
async def get_google_auth_url(state: Optional[str] = None):
    url = oauth_service.get_google_auth_url(state)
    return {'url': url}


@auth_router.post('/google/callback')
async def google_callback(data: GoogleCallbackRequest, request: Request,
                          response: Response):
    result = oauth_service.handle_google_callback(
        data.code,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    if not result['success']:
        raise HTTPException(status_code=401, detail=result['error'])

    csrf_token = secrets.token_urlsafe(32)
    cookie_service.set_auth_cookies(
        response, result['access_token'], result['refresh_token'],
        csrf_token
    )

    return {
        'status': 'success',
        'user': result['user'],
        'access_token': result['access_token'],
        'refresh_token': result['refresh_token'],
        'csrf_token': csrf_token,
    }


# ─── Sessions ───

@auth_router.get('/sessions')
async def get_sessions(user: dict = Depends(get_current_user), request: Request = None):
    sessions = session_service.get_user_sessions(user['id'])
    current_token = cookie_service.get_refresh_token(request) if request else None
    current_session_id = None
    if current_token:
        payload = jwt_service.decode_refresh_token(current_token)
        if payload:
            current_session_id = payload.get('session_id')

    result = []
    for s in sessions:
        result.append({
            'id': str(s['_id']),
            'device': s.get('device', 'Unknown'),
            'browser': s.get('browser', 'Unknown'),
            'os': s.get('os', 'Unknown'),
            'ip_address': s.get('ip_address', ''),
            'location': s.get('location'),
            'created_at': s.get('created_at', '').isoformat() if isinstance(s.get('created_at'), datetime) else str(s.get('created_at', '')),
            'last_active': s.get('last_active', '').isoformat() if isinstance(s.get('last_active'), datetime) else str(s.get('last_active', '')),
            'is_current': str(s['_id']) == current_session_id,
        })

    return {'status': 'success', 'sessions': result}


@auth_router.delete('/sessions/{session_id}')
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    session = session_service.get_session(session_id)
    if not session or session.get('user_id') != user['id']:
        raise HTTPException(status_code=404, detail='Session not found')

    session_service.invalidate_session(session_id)
    return {'status': 'success', 'message': 'Session terminated'}


@auth_router.delete('/sessions')
async def delete_all_sessions(request: Request, response: Response,
                              user: dict = Depends(get_current_user)):
    session_service.invalidate_all_user_sessions(user['id'])
    cookie_service.clear_auth_cookies(response)
    return {'status': 'success', 'message': 'All sessions terminated'}


# ─── Profile ───

@auth_router.get('/profile')
async def get_profile(user: dict = Depends(get_current_user)):
    user_doc = db.users.find_one({'_id': to_object_id(user['id'])})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    return {
        'status': 'success',
        'user': {
            'id': user['id'],
            'full_name': user_doc.get('full_name', ''),
            'username': user_doc.get('username'),
            'email': user_doc['email'],
            'email_verified': user_doc.get('email_verified', False),
            'mfa_enabled': user_doc.get('mfa_enabled', False),
            'plan': user_doc.get('plan', 'free'),
            'api_key': user_doc.get('api_key', ''),
            'created_at': user_doc.get('created_at', '').isoformat() if isinstance(user_doc.get('created_at'), datetime) else str(user_doc.get('created_at', '')),
            'last_login': user_doc.get('last_login', '').isoformat() if isinstance(user_doc.get('last_login'), datetime) else str(user_doc.get('last_login', '')),
        }
    }


@auth_router.put('/profile')
async def update_profile(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    allowed_fields = {'full_name', 'username'}
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail='No valid fields to update')

    if 'username' in update_data:
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', update_data['username']):
            raise HTTPException(status_code=400, detail='Invalid username format')
        existing = db.users.find_one({
            'username': update_data['username'],
            '_id': {'$ne': to_object_id(user['id'])}
        })
        if existing:
            raise HTTPException(status_code=400, detail='Username already taken')

    update_data['updated_at'] = datetime.now(timezone.utc)
    db.users.update_one({'_id': to_object_id(user['id'])}, {'$set': update_data})

    return {'status': 'success', 'message': 'Profile updated'}


# ─── Audit Logs ───

@auth_router.get('/audit-logs')
async def get_audit_logs(user: dict = Depends(get_current_user),
                         limit: int = 50, skip: int = 0):
    logs = audit_service.get_user_logs(user['id'], limit, skip)
    result = []
    for log in logs:
        result.append({
            'id': str(log.get('_id', '')),
            'timestamp': log.get('timestamp', '').isoformat() if isinstance(log.get('timestamp'), datetime) else str(log.get('timestamp', '')),
            'action': log.get('action', ''),
            'ip_address': log.get('ip_address', ''),
            'device': log.get('device', ''),
            'browser': log.get('browser', ''),
            'os': log.get('os', ''),
            'status': log.get('status', ''),
        })
    return {'status': 'success', 'logs': result}


# ─── Admin Routes ───

@auth_router.get('/admin/users')
async def admin_get_users(admin: str = Depends(get_current_admin)):
    users = list(db.users.find().sort('created_at', -1))
    result = []
    for u in users:
        result.append({
            'id': str(u['_id']),
            'full_name': u.get('full_name', ''),
            'username': u.get('username'),
            'email': u.get('email', ''),
            'email_verified': u.get('email_verified', False),
            'mfa_enabled': u.get('mfa_enabled', False),
            'plan': u.get('plan', 'free'),
            'role': u.get('role', 'user'),
            'is_active': u.get('is_active', True),
            'created_at': u.get('created_at', '').isoformat() if isinstance(u.get('created_at'), datetime) else '',
            'last_login': u.get('last_login', '').isoformat() if isinstance(u.get('last_login'), datetime) else '',
        })
    return {'status': 'success', 'users': result}


@auth_router.get('/admin/sessions')
async def admin_get_all_sessions(admin: str = Depends(get_current_admin)):
    sessions = list(db.sessions.find({'is_active': True}).sort('last_active', -1))
    result = []
    for s in sessions:
        user = db.users.find_one({'_id': to_object_id(s.get('user_id', ''))})
        result.append({
            'id': str(s['_id']),
            'user_email': user.get('email', 'unknown') if user else 'unknown',
            'device': s.get('device', 'Unknown'),
            'browser': s.get('browser', 'Unknown'),
            'os': s.get('os', 'Unknown'),
            'ip_address': s.get('ip_address', ''),
            'created_at': s.get('created_at', '').isoformat() if isinstance(s.get('created_at'), datetime) else '',
            'last_active': s.get('last_active', '').isoformat() if isinstance(s.get('last_active'), datetime) else '',
        })
    return {'status': 'success', 'sessions': result}


@auth_router.post('/admin/force-logout/{user_id}')
async def admin_force_logout(user_id: str, admin: str = Depends(get_current_admin)):
    user_oid = to_object_id(user_id)
    if not user_oid:
        raise HTTPException(status_code=400, detail='Invalid user ID')
    session_service.invalidate_all_user_sessions(user_id)
    db.refresh_tokens.update_many(
        {'user_id': user_id},
        {'$set': {'revoked': True}}
    )
    return {'status': 'success', 'message': f'All sessions for user {user_id} terminated'}


@auth_router.post('/admin/disable-user/{user_id}')
async def admin_disable_user(user_id: str, admin: str = Depends(get_current_admin)):
    user_oid = to_object_id(user_id)
    if not user_oid:
        raise HTTPException(status_code=400, detail='Invalid user ID')
    db.users.update_one(
        {'_id': user_oid},
        {'$set': {'is_active': False}}
    )
    session_service.invalidate_all_user_sessions(user_id)
    return {'status': 'success', 'message': 'User disabled'}


@auth_router.post('/admin/enable-user/{user_id}')
async def admin_enable_user(user_id: str, admin: str = Depends(get_current_admin)):
    user_oid = to_object_id(user_id)
    if not user_oid:
        raise HTTPException(status_code=400, detail='Invalid user ID')
    db.users.update_one(
        {'_id': user_oid},
        {'$set': {'is_active': True}}
    )
    return {'status': 'success', 'message': 'User enabled'}


@auth_router.post('/admin/unlock-user')
async def admin_unlock_user(request: Request, admin: str = Depends(get_current_admin)):
    data = await request.json()
    identifier = data.get('email_or_username', '')
    brute_force.unlock_account(identifier)
    return {'status': 'success', 'message': 'Account unlocked'}


@auth_router.post('/admin/reset-mfa/{user_id}')
async def admin_reset_mfa(user_id: str, admin: str = Depends(get_current_admin)):
    user_oid = to_object_id(user_id)
    if not user_oid:
        raise HTTPException(status_code=400, detail='Invalid user ID')
    db.users.update_one(
        {'_id': user_oid},
        {'$set': {'mfa_enabled': False, 'mfa_secret': None}}
    )
    db.mfa_secrets.delete_one({'user_id': user_id})
    return {'status': 'success', 'message': 'MFA reset'}


@auth_router.get('/admin/locked-accounts')
async def admin_get_locked_accounts(admin: str = Depends(get_current_admin)):
    locked = brute_force.get_all_locked_accounts()
    result = []
    for l in locked:
        result.append({
            'identifier': l.get('identifier', ''),
            'ip_address': l.get('ip', ''),
            'locked_at': l.get('locked_at', '').isoformat() if isinstance(l.get('locked_at'), datetime) else '',
            'permanent': l.get('permanent_lockout', False),
            'attempts': brute_force._count_recent_attempts(l.get('identifier', '')),
        })
    return {'status': 'success', 'locked': result}


@auth_router.get('/admin/audit-logs')
async def admin_get_audit_logs(admin: str = Depends(get_current_admin),
                               limit: int = 100, skip: int = 0,
                               action: Optional[str] = None,
                               user_id: Optional[str] = None):
    logs = audit_service.get_all_logs(limit, skip, action, user_id)
    result = []
    for log in logs:
        result.append({
            'id': str(log.get('_id', '')),
            'user_id': log.get('user_id', ''),
            'timestamp': log.get('timestamp', '').isoformat() if isinstance(log.get('timestamp'), datetime) else '',
            'action': log.get('action', ''),
            'ip_address': log.get('ip_address', ''),
            'device': log.get('device', ''),
            'browser': log.get('browser', ''),
            'os': log.get('os', ''),
            'status': log.get('status', ''),
            'details': log.get('details', {}),
        })
    return {'status': 'success', 'logs': result}


@auth_router.get('/admin/security-events')
async def admin_get_security_events(admin: str = Depends(get_current_admin),
                                    limit: int = 100,
                                    severity: Optional[str] = None):
    events = audit_service.get_security_events(limit, severity)
    result = []
    for e in events:
        result.append({
            'id': str(e.get('_id', '')),
            'event_type': e.get('event_type', ''),
            'user_id': e.get('user_id', ''),
            'ip_address': e.get('ip_address', ''),
            'severity': e.get('severity', ''),
            'details': e.get('details', {}),
            'timestamp': e.get('timestamp', '').isoformat() if isinstance(e.get('timestamp'), datetime) else '',
        })
    return {'status': 'success', 'events': result}


@auth_router.post('/admin/verify-email/{user_id}')
async def admin_verify_email(user_id: str, admin: str = Depends(get_current_admin)):
    user_oid = to_object_id(user_id)
    if not user_oid:
        raise HTTPException(status_code=400, detail='Invalid user ID')
    user = db.users.find_one({'_id': user_oid})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    db.users.update_one(
        {'_id': user_oid},
        {'$set': {'email_verified': True, 'updated_at': datetime.now(timezone.utc)}}
    )
    return {'status': 'success', 'message': f'Email verified for user {user.get("email", user_id)}'}


@auth_router.post('/admin/verify-email-by-email')
async def admin_verify_email_by_email(request: Request, admin: str = Depends(get_current_admin)):
    data = await request.json()
    email = data.get('email', '').strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail='Email is required')
    user = db.users.find_one({'email': email})
    if not user:
        raise HTTPException(status_code=404, detail='User not found with this email')
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'email_verified': True, 'updated_at': datetime.now(timezone.utc)}}
    )
    return {'status': 'success', 'message': f'Email verified for {email}'}
