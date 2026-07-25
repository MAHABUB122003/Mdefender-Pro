import io
import os
import sys
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
load_dotenv()

from src.database.mongodb_connection import MongoDB
from src.api.waf_api import WAFAPI
from src.api.admin_api import AdminAPI
from src.api.user_api import UserAPI
from src.api.finance_api import FinanceAPI
from src.api.notice_api import NoticeAPI
from src.security.auth import Auth
from src.security.ip_filter import IPFilter
from src.utils.logger import Logger
from src.ddos import DDoSConfig, DDoSMiddleware, ddos_router
from src.auth import auth_router
from src.auth.dependencies import get_current_user, get_current_admin, verify_csrf_token
from src.auth.cookie_service import CookieService
from src.auth.jwt_service import JWTService
from src.auth.audit_service import AuditService
from src.auth.config import AuthConfig

app = FastAPI(title="MDefender Pro", version="2.0.0")

auth_config = AuthConfig()

app.add_middleware(
    CORSMiddleware,
    allow_origins=auth_config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization", "Content-Type", "X-CSRF-Token",
        "X-Request-ID", "X-Forwarded-For",
    ],
)

try:
    ddos_config = DDoSConfig.from_file()
    app.add_middleware(DDoSMiddleware, config=ddos_config)
    app.include_router(ddos_router)
    print("[DDoS] Protection module loaded")
except Exception as e:
    print(f"[DDoS] Module load skipped: {e}")

db = MongoDB()
auth = Auth()
ip_filter = IPFilter()
waf_api = WAFAPI()
admin_api = AdminAPI()
user_api = UserAPI()
finance_api = FinanceAPI()
notice_api = NoticeAPI()
logger = Logger()
cookie_svc = CookieService()
jwt_svc = JWTService()
audit_svc = AuditService()

_templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
from fastapi.templating import Jinja2Templates
_templates = Jinja2Templates(directory=_templates_dir)

try:
    _config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')
    with open(_config_path, 'r') as _f:
        _cfg = json.load(_f)
    WHITELIST_LOCALHOST = _cfg.get('whitelist_localhost', False)
except Exception:
    WHITELIST_LOCALHOST = False

LOCAL_IPS = ['127.0.0.1', '::1', 'localhost']
if WHITELIST_LOCALHOST:
    for ip in LOCAL_IPS:
        ip_filter.add_to_whitelist(ip)
        try:
            db.blacklist.delete_one({'ip': ip})
        except:
            pass
    print("[MDefender] Localhost whitelisted (development mode)")
else:
    print("[MDefender] Localhost NOT whitelisted (production mode)")


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
        "font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    )
    response.headers['X-Request-ID'] = request.headers.get('X-Request-ID', secrets.token_urlsafe(16))
    return response


def get_client_ip(request: Request):
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'


def get_claimed_ip_from_headers(headers):
    if headers and headers.get('X-Forwarded-For'):
        return headers.get('X-Forwarded-For').split(',')[0].strip()
    return None


def verify_admin_token(request: Request):
    token = cookie_svc.get_access_token(request)
    if not token:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail='Unauthorized')
    payload = jwt_svc.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Admin access required')
    return payload.get('email', payload.get('sub', ''))


def verify_user_token_compat(request: Request):
    token = cookie_svc.get_access_token(request)
    if not token:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail='Unauthorized')
    payload = jwt_svc.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    if payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Admin token used for user endpoint')
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
        '_id': user['_id'],
        'id': str(user['_id']),
        'email': user['email'],
        'name': user.get('full_name', ''),
        'full_name': user.get('full_name', ''),
        'username': user.get('username'),
        'role': user.get('role', 'user'),
        'email_verified': user.get('email_verified', False),
        'plan': user.get('plan', 'free'),
        'websites': user.get('websites', []),
        'requests_today': user.get('requests_today', 0),
        'requests_today_date': user.get('requests_today_date', ''),
        'total_requests': user.get('total_requests', 0),
        'total_blocked': user.get('total_blocked', 0),
        'api_key': user.get('api_key', ''),
        'is_active': user.get('is_active', True),
        'created_at': user.get('created_at'),
        'last_login': user.get('last_login'),
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "MDefender Pro API", "version": "2.0.0", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])


@app.post("/api/admin/login-legacy")
async def admin_login_legacy(data: dict, request: Request, response: Response):
    from src.auth.login_service import LoginService
    login_svc = LoginService()
    result = login_svc.admin_login(
        username=data.get('username', ''),
        password=data.get('password', ''),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get('User-Agent', ''),
    )
    if not result['success']:
        return JSONResponse(status_code=401, content={'status': 'error', 'message': result['error']})
    csrf_token = secrets.token_urlsafe(32)
    cookie_svc.set_auth_cookies(
        response, result['access_token'], result['refresh_token'], csrf_token
    )
    return {'status': 'success', 'redirect': result.get('redirect', '/admin/dashboard'), 'csrf_token': csrf_token}


@app.post("/api/admin/logout-legacy")
async def admin_logout_legacy(request: Request, response: Response, user: str = Depends(get_current_admin)):
    cookie_svc.clear_auth_cookies(response)
    return {'status': 'success'}


@app.get("/api/admin/stats")
async def admin_stats(user: str = Depends(verify_admin_token)):
    return admin_api.get_stats()

@app.get("/api/admin/logs")
async def admin_get_logs(request: Request, user: str = Depends(verify_admin_token)):
    params = dict(request.query_params)
    return admin_api.get_logs(params)

@app.get("/api/admin/rules")
async def admin_get_rules(user: str = Depends(verify_admin_token)):
    return admin_api.get_rules()

@app.post("/api/admin/rules")
async def admin_create_rule(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.create_rule(data)

@app.put("/api/admin/rules")
async def admin_update_rule(request: Request, user: str = Depends(verify_admin_token)):
    rule_id = request.query_params.get('id')
    data = await request.json()
    return admin_api.update_rule(rule_id, data)

@app.delete("/api/admin/rules")
async def admin_delete_rule(request: Request, user: str = Depends(verify_admin_token)):
    rule_id = request.query_params.get('id')
    return admin_api.delete_rule(rule_id)

@app.get("/api/admin/clients")
async def admin_get_clients(user: str = Depends(verify_admin_token)):
    return admin_api.get_clients()

@app.post("/api/admin/clients")
async def admin_add_client(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.add_client(data)

@app.put("/api/admin/clients")
async def admin_update_client(request: Request, user: str = Depends(verify_admin_token)):
    client_id = request.query_params.get('id')
    data = await request.json()
    return admin_api.update_client(client_id, data)

@app.delete("/api/admin/clients")
async def admin_delete_client(request: Request, user: str = Depends(verify_admin_token)):
    client_id = request.query_params.get('id')
    return admin_api.delete_client(client_id)

@app.get("/api/admin/blacklist")
async def admin_get_blacklist(user: str = Depends(verify_admin_token)):
    return admin_api.get_blacklist()

@app.post("/api/admin/blacklist")
async def admin_add_blacklist(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.add_to_blacklist(data)

@app.delete("/api/admin/blacklist")
async def admin_delete_blacklist(request: Request, user: str = Depends(verify_admin_token)):
    ip = request.query_params.get('ip')
    return admin_api.remove_from_blacklist(ip)

@app.get("/api/admin/settings")
async def admin_get_settings(user: str = Depends(verify_admin_token)):
    return admin_api.get_settings()

@app.post("/api/admin/settings")
async def admin_update_settings(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.update_settings(data)

@app.post("/api/admin/change_password")
async def admin_change_password(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.change_password(data)

@app.post("/api/admin/clean_logs")
async def admin_clean_logs(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    days = data.get('days', 30)
    return admin_api.clean_logs(days)

@app.post("/api/admin/clean_all_logs")
async def admin_clean_all_logs(user: str = Depends(verify_admin_token)):
    return admin_api.clean_all_logs()

@app.post("/api/admin/reset_stats/{collection}")
async def admin_reset_stats(collection: str, user: str = Depends(verify_admin_token)):
    return admin_api.reset_stats(collection)

@app.post("/api/admin/clean_auto_blocks")
async def admin_clean_auto_blocks(user: str = Depends(verify_admin_token)):
    return admin_api.clean_auto_blocks()

@app.post("/api/admin/clean_attack_attempts")
async def admin_clean_attack_attempts(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    days = data.get('days', 30)
    return admin_api.clean_attack_attempts(days)

@app.get("/api/admin/auto_block_settings")
async def admin_auto_block_get_settings(user: str = Depends(verify_admin_token)):
    return admin_api.get_auto_block_settings()

@app.post("/api/admin/auto_block_settings")
async def admin_auto_block_update_settings(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    return admin_api.update_auto_block_settings(data)

@app.get("/api/admin/auto_block_stats")
async def admin_auto_block_stats(user: str = Depends(verify_admin_token)):
    return admin_api.get_auto_block_stats()


@app.get("/api/user/profile")
async def user_get_profile(user: dict = Depends(verify_user_token_compat)):
    return user_api.get_profile(user)

@app.put("/api/user/profile")
async def user_update_profile(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return user_api.update_profile(user, data)

@app.post("/api/user/change_password")
async def user_change_password(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return user_api.change_password(user, data)

@app.post("/api/user/regenerate_key")
async def user_regenerate_key(user: dict = Depends(verify_user_token_compat)):
    return user_api.regenerate_api_key(user)

@app.post("/api/user/websites")
async def user_add_website(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return user_api.add_website(user, data)

@app.delete("/api/user/websites")
async def user_remove_website(request: Request, user: dict = Depends(verify_user_token_compat)):
    website_id = request.query_params.get('id')
    return user_api.remove_website(user, website_id)

@app.get("/api/user/dashboard")
async def user_dashboard(user: dict = Depends(verify_user_token_compat)):
    return user_api.get_dashboard_stats(user)

@app.post("/api/user/upgrade-plan")
async def upgrade_user_plan(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    plan = data.get('plan', 'premium')
    days = data.get('days', 30)
    return user_api.upgrade_plan(user, plan=plan, days=days)

@app.post("/api/user/downgrade-plan")
async def downgrade_user_plan(user: dict = Depends(verify_user_token_compat)):
    return user_api.downgrade_plan(user)

@app.get("/api/user/logs")
async def user_get_logs(request: Request, user: dict = Depends(verify_user_token_compat)):
    params = dict(request.query_params)
    return user_api.get_user_logs(user, params)

@app.get("/api/user/rules")
async def user_get_rules(user: dict = Depends(verify_user_token_compat)):
    return user_api.get_user_rules(user)

@app.get("/api/user/ddos-status")
async def user_ddos_status(user: dict = Depends(verify_user_token_compat)):
    return user_api.get_ddos_status(user)

@app.post("/api/user/ddos-toggle")
async def user_ddos_toggle(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    enabled = data.get('enabled', True)
    return user_api.toggle_ddos_protection(user, enabled)

@app.post("/api/user/block-ip")
async def user_block_ip(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    ip = data.get('ip', '')
    reason = data.get('reason', 'Blocked by user')
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    db.blacklist.insert_one({
        'ip': ip, 'reason': reason, 'type': 'permanent',
        'added_by': user.get('email', 'unknown'), 'blocked_at': datetime.now(),
    })
    return {'status': 'success', 'message': f'{ip} has been blocked'}

@app.get("/api/user/blacklist")
async def user_get_blacklist(user: dict = Depends(verify_user_token_compat)):
    blacklist = []
    for entry in db.blacklist.find().sort('blocked_at', -1):
        blacklist.append({
            'id': str(entry['_id']),
            'ip': entry.get('ip', ''),
            'reason': entry.get('reason', ''),
            'blocked_at': entry['blocked_at'].strftime('%Y-%m-%d %H:%M:%S') if entry.get('blocked_at') else '',
            'type': entry.get('type', 'permanent'),
            'auto_blocked': entry.get('auto_blocked', False),
            'added_by': entry.get('added_by', ''),
        })
    return blacklist

@app.post("/api/user/blacklist")
async def user_add_blacklist(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    ip = data.get('ip', '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    existing = db.blacklist.find_one({'ip': ip})
    if existing:
        return {'status': 'error', 'message': 'IP already blacklisted'}
    db.blacklist.insert_one({
        'ip': ip, 'reason': data.get('reason', 'Blocked by user'),
        'type': data.get('type', 'permanent'),
        'added_by': user.get('email', 'unknown'), 'blocked_at': datetime.now(),
    })
    return {'status': 'success', 'message': f'IP {ip} blacklisted successfully'}

@app.delete("/api/user/blacklist")
async def user_delete_blacklist(request: Request, user: dict = Depends(verify_user_token_compat)):
    ip = request.query_params.get('ip', '')
    if not ip:
        return {'status': 'error', 'message': 'IP is required'}
    db.blacklist.delete_one({'ip': ip})
    return {'status': 'success', 'message': f'IP {ip} removed from blacklist'}


@app.get("/api/admin/users")
async def admin_get_users(user: str = Depends(verify_admin_token)):
    return user_api.get_all_users()

@app.put("/api/admin/users")
async def admin_update_user(request: Request, user: str = Depends(verify_admin_token)):
    user_id = request.query_params.get('id')
    data = await request.json()
    return user_api.admin_update_user(user_id, data)

@app.delete("/api/admin/users")
async def admin_delete_user(request: Request, user: str = Depends(verify_admin_token)):
    user_id = request.query_params.get('id')
    return user_api.admin_delete_user(user_id)

@app.get("/api/admin/user_stats")
async def admin_user_stats(user: str = Depends(verify_admin_token)):
    return user_api.admin_get_user_stats()

@app.get("/api/admin/roles")
async def get_roles(user: str = Depends(verify_admin_token)):
    return finance_api.get_all_roles()

@app.put("/api/admin/users/role")
async def admin_update_user_role(request: Request, user: str = Depends(verify_admin_token)):
    user_id = request.query_params.get('id')
    data = await request.json()
    return finance_api.update_user_role(user_id, data.get('role', ''), {'email': user, 'role': 'super_admin'})


@app.get("/api/finance/bank-accounts")
async def get_bank_accounts(user: dict = Depends(verify_user_token_compat)):
    return finance_api.get_bank_accounts(user)

@app.post("/api/finance/bank-accounts")
async def add_bank_account(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return finance_api.add_bank_account(data, user)

@app.put("/api/finance/bank-accounts")
async def update_bank_account(request: Request, user: dict = Depends(verify_user_token_compat)):
    account_id = request.query_params.get('id')
    data = await request.json()
    return finance_api.update_bank_account(account_id, data, user)

@app.delete("/api/finance/bank-accounts")
async def delete_bank_account(request: Request, user: dict = Depends(verify_user_token_compat)):
    account_id = request.query_params.get('id')
    return finance_api.delete_bank_account(account_id, user)

@app.get("/api/finance/transactions")
async def get_transactions(request: Request, user: dict = Depends(verify_user_token_compat)):
    params = dict(request.query_params)
    return finance_api.get_transactions(user, params)

@app.post("/api/finance/transactions")
async def add_transaction(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return finance_api.add_transaction(data, user)

@app.put("/api/finance/transactions")
async def update_transaction(request: Request, user: dict = Depends(verify_user_token_compat)):
    tx_id = request.query_params.get('id')
    data = await request.json()
    return finance_api.update_transaction(tx_id, data, user)

@app.delete("/api/finance/transactions")
async def delete_transaction(request: Request, user: dict = Depends(verify_user_token_compat)):
    tx_id = request.query_params.get('id')
    return finance_api.delete_transaction(tx_id, user)

@app.post("/api/finance/import")
async def import_transactions(request: Request, user: dict = Depends(verify_user_token_compat)):
    form = await request.form()
    file = form.get('file')
    mapping_str = form.get('mapping', '{}')
    bank_account_id = form.get('bank_account_id', '')
    try:
        mapping = json.loads(mapping_str)
    except:
        mapping = {}
    if bank_account_id:
        mapping['bank_account_id'] = bank_account_id
    if not file:
        return {'status': 'error', 'message': 'No file uploaded'}
    filename = file.filename
    content = await file.read()
    if filename.endswith('.csv'):
        file_content = content.decode('utf-8', errors='replace')
    else:
        file_content = content
    return finance_api.import_transactions(file_content, filename, mapping, user)

@app.get("/api/finance/categories")
async def get_categories(user: dict = Depends(verify_user_token_compat)):
    return finance_api.get_categories()

@app.get("/api/finance/summary")
async def get_finance_summary(request: Request, user: dict = Depends(verify_user_token_compat)):
    params = dict(request.query_params)
    return finance_api.get_finance_summary(user, params)


@app.get("/api/notices")
async def get_notices(user: dict = Depends(verify_user_token_compat)):
    return notice_api.get_notices()

@app.post("/api/notices")
async def add_notice(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return notice_api.add_notice(data, user)

@app.delete("/api/notices")
async def delete_notice(request: Request, user: dict = Depends(verify_user_token_compat)):
    notice_id = request.query_params.get('id')
    return notice_api.delete_notice(notice_id, user)


@app.post("/api/connect")
async def connect_website(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = await request.json()
    if not api_key:
        return JSONResponse(status_code=401, content={'status': 'error', 'message': 'API key is required'})
    client = db.clients.find_one({'api_key': api_key, 'status': 'active'})
    if client:
        return {'status': 'success', 'client_id': str(client['_id']), 'api_key': api_key, 'message': 'Website already connected'}
    result = waf_api.connect_website(data)
    return result

@app.post("/api/analyze")
async def analyze_request(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = await request.json()
    if not waf_api.verify_api_key(api_key, data.get('domain')):
        return JSONResponse(status_code=401, content={'status': 'error', 'message': 'Invalid API key'})
    result = waf_api.analyze_request(data.get('request', {}))
    if result['status'] == 'blocked':
        forwarded_headers = data['request'].get('headers', {})
        claimed_ip = get_claimed_ip_from_headers(forwarded_headers) or 'N/A'
        real_ip = data['request'].get('ip', 'unknown')
        block_html = _templates.TemplateResponse("block_page.html", {
            "request": request,
            "client_ip": claimed_ip,
            "real_ip": real_ip,
            "attack_type": result.get('attack_type', 'Unknown'),
            "reason": f"Malicious payload detected (confidence: {result.get('confidence', 0):.2f})",
            "reference_id": result.get('reference_id', 'N/A'),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "website_name": "MDefender Pro"
        })
        return {
            'status': 'blocked',
            'block_page': block_html.body.decode('utf-8'),
            'attack_type': result.get('attack_type')
        }
    return result

@app.get("/api/stats")
async def get_api_stats(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    domain = request.query_params.get('domain')
    if not waf_api.verify_api_key(api_key, domain):
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    return waf_api.get_stats(domain)

@app.post("/api/block")
async def block_ip_api(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = await request.json()
    if not waf_api.verify_api_key(api_key, data.get('domain')):
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    return waf_api.block_ip(data.get('ip'), data.get('reason'))

@app.get("/api/logs")
async def api_get_logs(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    domain = request.query_params.get('domain')
    if not waf_api.verify_api_key(api_key, domain):
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    params = dict(request.query_params)
    return waf_api.get_logs(params)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.log_error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={'status': 'error', 'message': 'Internal server error'}
    )


if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*40)
    print("\U0001f512 MDefender Pro Started Successfully")
    print("="*40)
    print(f"\U0001f4ca Admin Dashboard: http://localhost:8000")
    print(f"\U0001f517 API Endpoint: http://localhost:8000/api")
    print("\nAuth Endpoints:")
    print("  POST /api/auth/register")
    print("  POST /api/auth/login")
    print("  POST /api/auth/verify-email")
    print("  POST /api/auth/forgot-password")
    print("  POST /api/auth/admin/login")
    print("="*40 + "\n")
    uvicorn.run("main:app", host='0.0.0.0', port=8000, reload=True)
