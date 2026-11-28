from datetime import datetime, timezone
from typing import Optional, Dict
from bson import ObjectId
from fastapi import Request, HTTPException, Response, Depends
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


def _log_rbac_denial(owner_id: str, actor_email: str, method: str, path: str, reason: str):
    """Record blocked RBAC/IDOR attempts to audit_logs for Owner visibility."""
    try:
        db.audit_logs.insert_one({
            'user_id': owner_id,
            'user_email': actor_email,
            'action': f'RBAC Blocked: {method} {path} ({reason})',
            'status': 'blocked',
            'created_at': datetime.now(timezone.utc),
        })
    except Exception:
        pass


def _apply_team_workspace_context(request: Request, actor: dict) -> dict:
    """If X-Workspace-Owner header is set to another user's workspace, verify active
    team membership, enforce role permissions, and return the owner's workspace context."""
    req_method = (request.method or 'GET').upper()
    req_path = request.url.path or ''

    # Personal account/auth endpoints must ALWAYS operate on the actor's own account, never the Owner's
    actor_only_prefixes = (
        '/api/auth/change-password',
        '/api/auth/mfa/',
        '/api/auth/sessions',
        '/api/auth/logout',
        '/api/user/profile',
        '/api/user/change_password',
        '/api/user/2fa/',
    )
    if any(req_path.startswith(p) for p in actor_only_prefixes):
        return actor

    target_owner_id = (
        request.headers.get('X-Workspace-Owner', '').strip()
        or request.query_params.get('workspace_owner', '').strip()
    )
    actor_id = str(actor.get('id') or actor.get('_id') or '')
    if not target_owner_id or target_owner_id == actor_id:
        return actor

    actor_email = (actor.get('email') or '').lower().strip()
    or_filters = []
    if actor_id:
        or_filters.append({'member_user_id': actor_id})
    if actor_email:
        or_filters.append({'email': actor_email})
    if not or_filters:
        raise HTTPException(status_code=403, detail='Workspace access denied')

    membership = db.team_members.find_one({
        'owner_id': target_owner_id,
        'status': {'$ne': 'revoked'},
        '$or': or_filters,
    })
    if not membership:
        raise HTTPException(status_code=403, detail='You do not have active access to this workspace.')
    if membership.get('status') == 'suspended':
        raise HTTPException(status_code=403, detail='Your team access has been suspended by the Workspace Owner.')
    if membership.get('member_user_id') and str(membership['member_user_id']) != actor_id:
        raise HTTPException(status_code=403, detail='Workspace membership identity mismatch.')

    team_role = (membership.get('role_id') or 'auditor').lower()
    team_scope = membership.get('scope') or 'all'

    def _deny(detail: str):
        _log_rbac_denial(target_owner_id, actor_email, req_method, req_path, f'{team_role}: {detail}')
        raise HTTPException(status_code=403, detail=detail)

    # Enforce RBAC on switched team session
    if team_role == 'auditor' and req_method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        if not req_path.startswith('/api/auth/') and not req_path.startswith('/api/v1/team/workspaces'):
            _deny('Read-only Viewer role cannot modify workspace resources.')

    # Owner-only endpoints (blocked for ALL team roles on both GET and mutations where sensitive)
    if (
        '/api-keys' in req_path
        or req_path.endswith('/installation')
        or req_path.startswith('/api/user/regenerate_key')
        or req_path.startswith('/api/v1/websites/fleet/activity')
        or req_path.startswith('/api/auth/audit-logs')
    ):
        _deny('Activity logs, audit logs, and API key credentials are restricted to the Workspace Owner.')

    if req_method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        if (
            req_path.startswith('/api/v1/billing/checkout')
            or req_path.startswith('/api/v1/billing/change-plan')
            or req_path.startswith('/api/user/upgrade-plan')
            or req_path.startswith('/api/user/downgrade-plan')
        ):
            _deny('Billing and subscription changes are restricted to the Workspace Owner.')
        if (
            req_path.rstrip('/') == '/api/v1/websites'
            or req_path.rstrip('/') == '/api/user/websites'
            or (req_path.startswith('/api/v1/websites/') and req_method == 'DELETE')
        ):
            _deny('Adding or deleting websites is restricted to the Workspace Owner.')
        if req_path.startswith('/api/user/clean-logs') or req_path.startswith('/api/user/reset-stats'):
            _deny('Destructive log or stats resets are restricted to the Workspace Owner.')
        if team_role == 'devops':
            # WordPress Developer cannot alter WAF, IP/Country blocks, Hardening, 2FA, or Post-Hack
            sec_only_markers = ('/waf', '/blacklist', '/whitelist', '/country', '/hardening', '/2fa', '/post-hack', '/posthack', '/bot-shield', '/rate-limit')
            if any(m in req_path for m in sec_only_markers):
                _deny('WordPress Developer role cannot modify Security/WAF rules.')
        elif team_role == 'secops':
            # Security Manager cannot alter Plugins/Themes/Core updates or DB optimizer
            dev_only_markers = ('/plugins/', '/themes/', '/core/update', '/database/optimize', '/safe-update')
            if any(m in req_path for m in dev_only_markers):
                _deny('Security Manager role cannot modify WordPress plugins, themes, or database.')

    owner_doc = None
    if ObjectId.is_valid(target_owner_id):
        owner_doc = db.users.find_one({'_id': ObjectId(target_owner_id)})
    if not owner_doc:
        owner_doc = db.users.find_one({'_id': target_owner_id})
    if not owner_doc:
        raise HTTPException(status_code=404, detail='Workspace owner not found')

    from src.services.license_slot_service import LicenseSlotService
    lic_state = LicenseSlotService(db).resolve_user_license_state(owner_doc)
    effective_plan = lic_state.get('plan', 'free')
    owner_is_admin = owner_doc.get('role') in ('admin', 'super_admin') or bool(owner_doc.get('is_admin'))
    if (
        not owner_is_admin
        and not lic_state.get('is_paid')
        and not lic_state.get('is_trial_active')
        and not req_path.startswith('/api/auth/me')
        and not req_path.startswith('/api/v1/team/workspaces')
    ):
        _deny('Workspace trial or subscription has expired. Please ask the Workspace Owner to upgrade.')
    owner_id_str = str(owner_doc['_id'])
    owner_email = owner_doc.get('email', '')
    owner_name = owner_doc.get('workspace_name') or owner_doc.get('full_name') or owner_doc.get('name') or owner_email

    return {
        'id': owner_id_str,
        '_id': owner_id_str,
        'email': owner_email,
        'full_name': owner_name,
        'name': owner_name,
        'username': owner_doc.get('username'),
        'role': 'user',
        'is_admin': False,
        'is_owner': False,
        'permissions': actor.get('permissions', []),
        'email_verified': True,
        'mfa_enabled': owner_doc.get('mfa_enabled', False),
        'plan': effective_plan,
        'effective_plan': effective_plan,
        'is_paid': lic_state.get('is_paid', False),
        'payment_status': 'active' if lic_state.get('is_paid') else (owner_doc.get('payment_status') or 'trialing'),
        'is_trial_active': lic_state.get('is_trial_active', False),
        'trial_days_remaining': lic_state.get('trial_days_remaining', 0),
        'purchased_slots': lic_state.get('purchased_slots', 0),
        'api_key': '',
        'created_at': str(owner_doc.get('created_at', '')),
        'onboarded': True,
        'workspace_name': owner_name,
        'actor_id': actor_id,
        'actor_email': actor_email,
        'actor_name': actor.get('name') or actor.get('full_name') or actor_email,
        'own_workspace_name': actor.get('workspace_name') or f"{actor.get('name') or 'My'}'s Workspace",
        'team_member_context': True,
        'team_role': team_role,
        'team_scope': team_scope,
    }


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

    if payload.get('is_admin') or payload.get('role') in ('super_admin', 'admin', 'support_lead', 'support_agent'):
        # Fetch admin/support user from DB to get accurate role, permissions, and _id
        from src.auth.rbac import is_owner_user, resolve_user_permissions, SUPPORT_ROLES
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
                    ]
                })
        except Exception:
            pass
        admin_id = str(admin_user['_id']) if admin_user else admin_sub
        actual_role = (admin_user.get('role') if admin_user else payload.get('role')) or 'super_admin'
        if admin_user:
            actual_owner = is_owner_user(admin_user)
            actual_perms = resolve_user_permissions(admin_user)
            actual_name = admin_user.get('full_name') or admin_user.get('name') or 'Administrator'
        else:
            actual_owner = actual_role not in SUPPORT_ROLES
            actual_perms = ['*'] if actual_owner else []
            actual_name = 'Administrator'

        return _apply_team_workspace_context(request, {
            'id': admin_id,
            '_id': admin_id,
            'email': payload.get('email') or (admin_user.get('email') if admin_user else 'admin'),
            'full_name': actual_name,
            'name': actual_name,
            'username': payload.get('email') or (admin_user.get('username') if admin_user else 'admin'),
            'role': actual_role,
            'email_verified': True,
            'mfa_enabled': bool(admin_user.get('mfa_enabled', False)) if admin_user else False,
            'plan': 'enterprise',
            'is_admin': True,
            'is_owner': actual_owner,
            'permissions': actual_perms,
            'api_key': admin_user.get('api_key', '') if admin_user else '',
        })

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

    from src.services.license_slot_service import LicenseSlotService
    lic_service = LicenseSlotService(db)
    lic_state = lic_service.resolve_user_license_state(user)
    effective_plan = lic_state.get('plan', 'free')

    from src.auth.rbac import is_admin_panel_user, is_owner_user, resolve_user_permissions

    return _apply_team_workspace_context(request, {
        'id': user_id_str,
        '_id': user_id_str,
        'email': user['email'],
        'full_name': user.get('full_name', user.get('name', '')),
        'name': user.get('name', user.get('full_name', '')),
        'username': user.get('username'),
        'role': user.get('role', 'user'),
        'is_admin': is_admin_panel_user(user),
        'is_owner': is_owner_user(user),
        'permissions': resolve_user_permissions(user),
        'email_verified': user.get('email_verified', False),
        'mfa_enabled': user.get('mfa_enabled', False),
        'plan': effective_plan,
        'effective_plan': effective_plan,
        'is_paid': lic_state.get('is_paid', False),
        'payment_status': 'active' if lic_state.get('is_paid') else (user.get('payment_status') or 'trialing'),
        'is_trial_active': lic_state.get('is_trial_active', False),
        'trial_days_remaining': lic_state.get('trial_days_remaining', 0),
        'purchased_slots': lic_state.get('purchased_slots', 0),
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
    })


async def require_active_subscription(user: dict = Depends(get_current_user)) -> dict:
    """Zero-Trust Subscription Guard:
    Guarantees that expired or unpaid users CANNOT execute security actions,
    even if they tamper with browser console, localStorage, or DOM.
    Returns HTTP 402 Payment Required.
    """
    if user.get("is_admin") or user.get("role") in ("admin", "super_admin"):
        return user

    if user.get("is_paid") or user.get("is_trial_active"):
        return user

    raise HTTPException(
        status_code=402,
        detail="Subscription required. Your 14-day free trial or fleet subscription has expired. Please upgrade or renew to continue using MDefender Pro."
    )


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

    from src.auth.rbac import ADMIN_ROLES, has_permission

    if not payload.get('is_admin') and payload.get('role') not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail='Admin access required')

    return payload.get('email', payload.get('sub', ''))


def require_permission(permission: str):
    """Dependency factory that enforces granular Owner / Support Team RBAC."""
    async def _checker(request: Request) -> str:
        from src.auth.rbac import has_permission
        email = await get_current_admin(request)
        if email in ('admin', 'super_admin'):
            return email
        user_doc = db.users.find_one({'email': email})
        if not user_doc:
            # Fallback: check if token came from legacy env-admin
            return email
        if not has_permission(user_doc, permission):
            raise HTTPException(
                status_code=403,
                detail=f'Permission denied: requires "{permission}" access'
            )
        return email
    return _checker


async def get_current_user_optional(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return None
        raise


def verify_csrf_token(request: Request):
    csrf_cookie = cookie_service.get_csrf_token(request)
    csrf_header = cookie_service.get_csrf_from_header(request)

    if not csrf_cookie or not csrf_header:
        raise HTTPException(status_code=403, detail='CSRF token missing')

    if not csrf_service.validate_token(csrf_cookie, csrf_header):
        raise HTTPException(status_code=403, detail='Invalid CSRF token')
