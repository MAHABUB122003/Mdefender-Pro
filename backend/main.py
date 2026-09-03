import io
import os
import sys
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import FastAPI, Request, Response, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
load_dotenv()

from src.database.mongodb_connection import MongoDB
from src.api.waf_api import WAFAPI
from src.api.malware_api import MalwareAPI
from src.api.admin_api import AdminAPI
from src.api.user_api import UserAPI
from src.api.finance_api import FinanceAPI
from src.api.notice_api import NoticeAPI
from src.security.auth import Auth
from src.security.ip_filter import IPFilter
from src.utils.logger import Logger
from src.engine.ml_detector import MLDetector
from src.engine.malware_detector import MalwareDetector
from src.ddos import DDoSConfig, DDoSMiddleware, ddos_router
from src.auth import auth_router
from src.auth.dependencies import get_current_user, get_current_admin, verify_csrf_token
from src.auth.cookie_service import CookieService
from src.auth.jwt_service import JWTService
from src.auth.audit_service import AuditService
from src.auth.config import AuthConfig
from src.api.v1.routes import get_v1_router

app = FastAPI(title="MDefender Pro", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    port = os.getenv('PORT', '8000')
    print("\n" + "="*45)
    print("🔒 MDefender Pro Backend Server Ready & Connected")
    print(f"🔗 API Endpoint: http://localhost:{port}/api")
    print(f"🌐 Frontend App: http://localhost:5173")
    print("="*45 + "\n")

auth_config = AuthConfig()

app.include_router(get_v1_router())

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
malware_api = MalwareAPI()
admin_api = AdminAPI()
user_api = UserAPI()
finance_api = FinanceAPI()
notice_api = NoticeAPI()
logger = Logger()
cookie_svc = CookieService()
jwt_svc = JWTService()
audit_svc = AuditService()
ml_detector = MLDetector()
malware_detector = MalwareDetector()

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


@app.middleware("http")
async def waf_self_protection_middleware(request: Request, call_next):
    path = request.url.path
    if (
        path.startswith("/api/v1/")
        or path.startswith("/api/")
        or path == "/api"
        or path == "/health"
        or path.startswith("/health/")
        or path.startswith("/docs")
        or path.startswith("/openapi.json")
        or path.startswith("/redoc")
    ):
        return await call_next(request)
        
    client_ip = get_client_ip(request)
    query_params = dict(request.query_params)
    
    req_payload = {
        'url': path,
        'query_string': request.url.query,
        'query_params': query_params,
        'ip': client_ip,
        'headers': dict(request.headers),
        'user_agent': request.headers.get('user-agent', ''),
        'method': request.method,
    }
    
    decision, log_entry, event, is_blocked, ip = waf_api.evaluate_request_fast(
        req_payload, user_id=None, domain='localhost', website_id=None
    )
    
    if is_blocked:
        forwarded_headers = dict(request.headers)
        claimed_ip = get_claimed_ip_from_headers(forwarded_headers) or client_ip
        
        try:
            waf_api.async_save_logs(decision, log_entry, event, is_blocked, ip, user_id=None, website_id=None)
        except Exception:
            pass
            
        block_html = _templates.TemplateResponse("block_page.html", {
            "request": request,
            "client_ip": claimed_ip,
            "real_ip": client_ip,
            "attack_type": decision.get('attack_type', 'Unknown'),
            "reason": f"Malicious payload detected (confidence: {decision.get('confidence', 0):.2f})",
            "reference_id": decision.get('reference_id', 'N/A'),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "website_name": "MDefender Pro Dashboard"
        })
        return HTMLResponse(content=block_html.body.decode('utf-8'), status_code=403)
        
    return await call_next(request)



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
        user_oid = None

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

@app.get("/health/ml")
async def health_ml():
    waf_status = ml_detector.get_status()
    malware_status = malware_detector.get_status()
    ok = bool(waf_status.get('loaded')) and bool(malware_status.get('loaded'))
    return {
        "status": "ok" if ok else "degraded",
        "waf": waf_status,
        "malware": malware_status,
    }

@app.get("/health/ml/waf")
async def health_ml_waf():
    status = ml_detector.get_status()
    return {"status": "ok" if status.get('loaded') else "degraded", **status}

@app.get("/health/ml/malware")
async def health_ml_malware():
    status = malware_detector.get_status()
    return {"status": "ok" if status.get('loaded') else "degraded", **status}

@app.get("/api/ml/status")
async def ml_status_api():
    """Public ML status used by WordPress plugin + dashboards. No secrets."""
    return {
        "waf": {
            "model": "mdefender-waf",
            "version": ml_detector.model_version,
            "loaded": ml_detector.is_loaded(),
            "threshold": ml_detector.threshold,
            "training_date": ml_detector.meta.get('training_date'),
        },
        "malware": {
            "model": "mdefender-malware",
            "version": malware_detector.model_version,
            "loaded": malware_detector.is_loaded(),
            "training_date": malware_detector.meta.get('training_date'),
        },
    }

@app.post("/api/scan")
async def scan_file(request: Request):
    """Malware scan endpoint. Accepts multipart 'file' or JSON {filename, content_base64}.

    Auth: Bearer API key (WordPress plugin) OR a valid admin/user session cookie
    (dashboards). Content is analyzed statically and is never executed.
    """
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    domain = request.query_params.get('domain', '')
    user_id = None
    website_id = None
    
    if api_key:
        auth_data = malware_api.verify_api_key(api_key, domain)
        if auth_data:
            user_id = auth_data.get('user_id')
            website_id = auth_data.get('website_id')
    else:
        session_user = None
        try:
            session_user = verify_user_token_compat(request)
        except HTTPException:
            pass
        if not session_user:
            try:
                verify_admin_token(request)
            except HTTPException:
                return JSONResponse(status_code=401, content={'status': 'error', 'message': 'Invalid API key or session'})
        else:
            user_id = str(session_user['_id'])

    client_ip = get_client_ip(request)

    content_type = request.headers.get('content-type', '')
    filename = ''
    content = b''

    if 'multipart/form-data' in content_type:
        form = await request.form()
        file = form.get('file')
        if file and hasattr(file, 'read'):
            filename = getattr(file, 'filename', '') or ''
            content = await file.read()
        else:
            return {'status': 'error', 'message': 'No file uploaded'}
    else:
        try:
            data = await request.json()
        except Exception:
            return {'status': 'error', 'message': 'Invalid JSON body'}
        filename = data.get('filename', '')
        b64 = data.get('content_base64', '')
        if not b64:
            return {'status': 'error', 'message': 'content_base64 is required'}
        import base64
        try:
            content = base64.b64decode(b64, validate=False)
        except Exception:
            return {'status': 'error', 'message': 'Invalid base64 content'}

    if len(content) > 10 * 1024 * 1024:
        return {'status': 'error', 'message': 'File exceeds maximum scan size (10MB)'}
    if not content:
        return {'status': 'error', 'message': 'Empty file'}

    return malware_api.scan(filename, content, ip=client_ip, domain=domain, user_id=user_id, website_id=website_id)


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
async def user_regenerate_key(request: Request, user: dict = Depends(verify_user_token_compat)):
    try:
        data = await request.json()
    except Exception:
        data = None
    return user_api.regenerate_api_key(user, data)

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

@app.get("/api/payment/config")
async def get_payment_configuration():
    from src.services.payment_service import PaymentService
    return PaymentService().get_payment_config()

@app.post("/api/payment/create-checkout-session")
async def create_stripe_checkout_session(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    data = await request.json()
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    frontend_url = data.get('frontend_url')
    service = PaymentService()
    return service.create_stripe_checkout_session(user, plan_id=plan, billing_cycle=cycle, frontend_url=frontend_url)

@app.post("/api/payment/verify-session")
async def verify_stripe_session(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    data = await request.json()
    session_id = data.get('session_id', '')
    service = PaymentService()
    return service.verify_stripe_session(session_id, user)

@app.post("/api/payment/stripe-webhook")
async def stripe_webhook(request: Request):
    from src.services.payment_service import PaymentService
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature', '')
    service = PaymentService()
    return service.handle_stripe_webhook(payload, sig_header)

@app.post("/api/payment/checkout")
async def process_payment_checkout(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    data = await request.json()
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    card = data.get('card', {})
    service = PaymentService()
    return service.process_card_checkout(user, plan_id=plan, billing_cycle=cycle, card_data=card)

@app.post("/api/payment/bank-transfer")
async def process_payment_bank_transfer(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    data = await request.json()
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    transfer_data = data.get('transfer_data', {})
    service = PaymentService()
    return service.process_bank_transfer(user, plan_id=plan, billing_cycle=cycle, transfer_data=transfer_data)

@app.post("/api/payment/wallet")
async def process_payment_wallet(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    data = await request.json()
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    wallet_data = data.get('wallet_data', {})
    service = PaymentService()
    return service.process_wallet_payment(user, plan_id=plan, billing_cycle=cycle, wallet_data=wallet_data)

@app.get("/api/payment/bkash/config")
async def get_bkash_config_endpoint():
    from src.services.bkash_service import BkashService
    return BkashService().get_bkash_config()

@app.post("/api/payment/bkash/create")
async def create_bkash_payment_endpoint(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.bkash_service import BkashService
    data = await request.json()
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    frontend_url = data.get('frontend_url')
    return BkashService().create_checkout_payment(user, plan_id=plan, billing_cycle=cycle, frontend_url=frontend_url)

@app.post("/api/payment/bkash/verify")
async def verify_bkash_payment_endpoint(request: Request, user: dict = Depends(verify_user_token_compat)):
    from src.services.bkash_service import BkashService
    data = await request.json()
    trx_id = data.get('trx_id', '')
    sender_mobile = data.get('sender_mobile', '')
    plan = data.get('plan', 'pro')
    cycle = data.get('billing_cycle', 'monthly')
    return BkashService().verify_trx_id(user, trx_id=trx_id, sender_mobile=sender_mobile, plan_id=plan, billing_cycle=cycle)

@app.get("/api/payment/history")
async def get_user_payment_history(user: dict = Depends(verify_user_token_compat)):
    from src.services.payment_service import PaymentService
    service = PaymentService()
    return service.get_user_payment_history(user)

@app.get("/api/user/logs")
async def user_get_logs(request: Request, user: dict = Depends(verify_user_token_compat)):
    params = dict(request.query_params)
    return user_api.get_user_logs(user, params)

@app.get("/api/user/rules")
async def user_get_rules(user: dict = Depends(verify_user_token_compat)):
    return user_api.get_user_rules(user)

@app.post("/api/user/rules")
async def user_create_rule(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    return user_api.create_user_rule(user, data)

@app.put("/api/user/rules")
async def user_update_rule(request: Request, user: dict = Depends(verify_user_token_compat)):
    rule_id = request.query_params.get('id')
    data = await request.json()
    return user_api.update_user_rule(user, rule_id, data)

@app.delete("/api/user/rules")
async def user_delete_rule(request: Request, user: dict = Depends(verify_user_token_compat)):
    rule_id = request.query_params.get('id')
    return user_api.delete_user_rule(user, rule_id)

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
    existing = db.blacklist.find_one({'ip': ip})
    if existing:
        return {'status': 'error', 'message': 'IP already blacklisted'}
    db.blacklist.insert_one({
        'ip': ip, 'reason': reason, 'type': 'permanent',
        'added_by': user.get('email', 'unknown'),
        'added_by_user_id': str(user['_id']),
        'blocked_at': datetime.now(),
    })
    return {'status': 'success', 'message': f'{ip} has been blocked'}

@app.get("/api/user/blacklist")
async def user_get_blacklist(user: dict = Depends(verify_user_token_compat)):
    user_id = str(user['_id'])
    blacklist = []
    for entry in db.blacklist.find({'added_by_user_id': user_id}).sort('blocked_at', -1):
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
        'added_by': user.get('email', 'unknown'),
        'added_by_user_id': str(user['_id']),
        'blocked_at': datetime.now(),
    })
    return {'status': 'success', 'message': f'IP {ip} blacklisted successfully'}

@app.delete("/api/user/blacklist")
async def user_delete_blacklist(request: Request, user: dict = Depends(verify_user_token_compat)):
    ip = request.query_params.get('ip', '')
    if not ip:
        return {'status': 'error', 'message': 'IP is required'}
    db.blacklist.delete_one({'ip': ip, 'added_by_user_id': str(user['_id'])})
    return {'status': 'success', 'message': f'IP {ip} removed from blacklist'}

@app.get("/api/user/whitelist")
async def user_get_whitelist(user: dict = Depends(verify_user_token_compat)):
    user_id = str(user['_id'])
    whitelist = []
    for entry in db.whitelist.find({'added_by_user_id': user_id}).sort('added_at', -1):
        whitelist.append({
            'id': str(entry['_id']),
            'ip': entry.get('ip', ''),
            'reason': entry.get('reason', ''),
            'added_at': entry['added_at'].strftime('%Y-%m-%d %H:%M:%S') if entry.get('added_at') else '',
            'added_by': entry.get('added_by', ''),
        })
    return whitelist

@app.post("/api/user/whitelist")
async def user_add_whitelist(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    ip = data.get('ip', '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    existing = db.whitelist.find_one({'ip': ip})
    if existing:
        return {'status': 'error', 'message': 'IP already whitelisted'}
    db.whitelist.insert_one({
        'ip': ip, 'reason': data.get('reason', 'Whitelisted by user'),
        'added_by': user.get('email', 'unknown'),
        'added_by_user_id': str(user['_id']),
        'added_at': datetime.now(),
    })
    return {'status': 'success', 'message': f'IP {ip} whitelisted successfully'}

@app.delete("/api/user/whitelist")
async def user_delete_whitelist(request: Request, user: dict = Depends(verify_user_token_compat)):
    ip = request.query_params.get('ip', '')
    if not ip:
        return {'status': 'error', 'message': 'IP is required'}
    db.whitelist.delete_one({'ip': ip, 'added_by_user_id': str(user['_id'])})
    return {'status': 'success', 'message': f'IP {ip} removed from whitelist'}

@app.get("/api/user/whois")
async def user_whois_lookup(ip: str, user: dict = Depends(verify_user_token_compat)):
    import requests
    geo_data = {}
    try:
        r = requests.get(f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query", timeout=4)
        if r.status_code == 200:
            geo_data = r.json()
    except Exception: pass

    raw_whois = "No whois record found."
    try:
        r = requests.get(f"https://stat.ripe.net/data/whois/data.json?resource={ip}", timeout=4)
        if r.status_code == 200:
            data = r.json()
            records = data.get('data', {}).get('records', [])
            output = ""
            for rec in records:
                for line in rec:
                    output += f"{line.get('key')}: {line.get('value')}\n"
                output += "\n" + "-"*40 + "\n\n"
            if output:
                raw_whois = output
    except Exception as e:
        raw_whois = f"Whois query failed: {str(e)}"

    return {
        'geo': geo_data,
        'raw': raw_whois
    }


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
async def analyze_request(request: Request, background_tasks: BackgroundTasks):
    try:
        api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        data = await request.json()
        domain = data.get('domain', '')
        auth_data = waf_api.verify_api_key(api_key, domain)
        if not auth_data:
            if domain == 'localhost' or domain == '127.0.0.1':
                pass
            else:
                return JSONResponse(status_code=401, content={'status': 'error', 'message': 'Invalid API key'})
        
        user_id = auth_data.get('user_id') if auth_data else None
        website_id = auth_data.get('website_id') if auth_data else None

        # Perform rule checking + ML score evaluation (extremely fast)
        decision, log_entry, event, is_blocked, ip = waf_api.evaluate_request_fast(
            data.get('request', {}), user_id=user_id, domain=domain, website_id=website_id
        )

        # Queue background audit log writes
        try:
            background_tasks.add_task(
                waf_api.async_save_logs, decision, log_entry, event, is_blocked, ip, user_id, website_id
            )
        except Exception:
            pass

        if is_blocked:
            return {
                'status': 'blocked',
                'attack_type': decision.get('attack_type', 'Malicious Attack'),
                'reason': decision.get('reason', 'Threat detected by WAF engine'),
                'confidence': round(decision.get('confidence', 0.95), 2),
                'reference_id': decision.get('reference_id', 'MDF-BLOCKED'),
                'threat_score': decision.get('risk_score', 80),
            }

        return {
            'status': 'allowed',
            'threat_score': decision.get('risk_score', 0),
            'reference_id': decision.get('reference_id'),
            'confidence': round(decision.get('confidence', 0.9), 2)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={'status': 'error', 'message': str(e)})

@app.get("/api/stats")
async def get_api_stats(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    domain = request.query_params.get('domain')
    auth_data = waf_api.verify_api_key(api_key, domain)
    if not auth_data:
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    return waf_api.get_stats(domain, user_id=auth_data.get('user_id'), website_id=auth_data.get('website_id'))

@app.post("/api/block")
async def block_ip_api(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = await request.json()
    auth_data = waf_api.verify_api_key(api_key, data.get('domain'))
    if not auth_data:
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    return waf_api.block_ip(data.get('ip'), data.get('reason'), user_id=auth_data.get('user_id'))

@app.get("/api/logs")
async def api_get_logs(request: Request):
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    domain = request.query_params.get('domain')
    auth_data = waf_api.verify_api_key(api_key, domain)
    if not auth_data:
        return JSONResponse(status_code=401, content={'error': 'Invalid API key'})
    params = dict(request.query_params)
    return waf_api.get_logs(params, user_id=auth_data.get('user_id'), website_id=auth_data.get('website_id'))


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
    print(f"\U0001f4ca Admin Dashboard: http://localhost:{os.getenv('PORT', '8000')}")
    print(f"\U0001f517 API Endpoint: http://localhost:{os.getenv('PORT', '8000')}/api")
    print("\nAuth Endpoints:")
    print("  POST /api/auth/register")
    print("  POST /api/auth/login")
    print("  POST /api/auth/verify-email")
    print("  POST /api/auth/forgot-password")
    print("  POST /api/auth/admin/login")
    print("="*40 + "\n")
    uvicorn.run("main:app", host='0.0.0.0', port=int(os.getenv('PORT', '8000')), reload=True)
