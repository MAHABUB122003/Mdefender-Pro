import io
import os
import sys
import json
import secrets
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import FastAPI, Request, Response, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
load_dotenv()

from src.database.mongodb_connection import MongoDB
from src.api.waf_api import WAFAPI
from src.api.malware_api import MalwareAPI
from src.api.admin_api import AdminAPI
from src.api.user_api import UserAPI
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
    print("MDefender Pro Backend Server Ready & Connected")
    print(f"API Endpoint: http://localhost:{port}/api")
    print(f"Frontend App: http://localhost:5173")
    print("="*45 + "\n")

auth_config = AuthConfig()

app.include_router(get_v1_router())
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

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
        
    resolved_full_name = user.get('full_name') or user.get('name') or user.get('username') or ''
    resolved_username = user.get('username') or (user.get('email', '').split('@')[0] if user.get('email') else '')
    
    return {
        '_id': user['_id'],
        'id': str(user['_id']),
        'email': user.get('email', ''),
        'name': resolved_full_name,
        'full_name': resolved_full_name,
        'username': resolved_username,
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
    try:
        data = await request.json()
    except Exception:
        data = {}
    try:
        res = user_api.add_website(user, data)
        status_code = 200 if res.get('status') != 'error' else 400
        return JSONResponse(status_code=status_code, content=res)
    except Exception as e:
        print(f"[Error] user_add_website exception: {e}")
        return JSONResponse(status_code=400, content={'status': 'error', 'message': str(e)})

@app.delete("/api/user/websites")
async def user_remove_website(request: Request, user: dict = Depends(verify_user_token_compat)):
    try:
        website_id = request.query_params.get('id')
        res = user_api.remove_website(user, website_id)
        status_code = 200 if res.get('status') != 'error' else 400
        return JSONResponse(status_code=status_code, content=res)
    except Exception as e:
        print(f"[Error] user_remove_website exception: {e}")
        return JSONResponse(status_code=400, content={'status': 'error', 'message': str(e)})

@app.get("/api/user/dashboard")
async def user_dashboard(request: Request, user: dict = Depends(verify_user_token_compat)):
    try:
        website_id = request.query_params.get('website_id')
        res = user_api.get_dashboard_stats(user, website_id=website_id)
        return JSONResponse(status_code=200, content=res)
    except Exception as e:
        print(f"[Error] user_dashboard exception: {e}")
        return JSONResponse(status_code=500, content={'status': 'error', 'message': str(e)})

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

@app.post("/api/user/clean-logs")
async def user_clean_logs(request: Request, user: dict = Depends(verify_user_token_compat)):
    try:
        data = await request.json()
    except Exception:
        data = {}
    return user_api.clean_user_logs(user, data)

@app.post("/api/user/reset-stats")
async def user_reset_stats(request: Request, user: dict = Depends(verify_user_token_compat)):
    try:
        data = await request.json()
    except Exception:
        data = {}
    return user_api.reset_user_stats(user, data)

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
    ip = data.get('ip', '').strip()
    reason = data.get('reason', 'Blocked by user')
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    
    user_id_str = str(user['_id'])
    user_email = user.get('email', 'unknown')
    
    existing = db.blacklist.find_one({'ip': ip})
    if existing:
        db.blacklist.update_one({'_id': existing['_id']}, {'$set': {
            'reason': reason,
            'type': data.get('type', 'permanent'),
            'added_by': user_email,
            'added_by_user_id': user_id_str,
            'user_id': user_id_str,
            'blocked_at': datetime.now(),
        }})
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=user['_id'])
        return {'status': 'success', 'message': f'{ip} has been updated in blacklist'}
    
    db.blacklist.insert_one({
        'ip': ip,
        'reason': reason,
        'type': data.get('type', 'permanent'),
        'added_by': user_email,
        'added_by_user_id': user_id_str,
        'user_id': user_id_str,
        'blocked_at': datetime.now(),
        'is_global': False,
    })
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'{ip} has been blocked'}

@app.get("/api/user/blacklist")
async def user_get_blacklist(user: dict = Depends(verify_user_token_compat)):
    from bson import ObjectId
    user_id_str = str(user['_id'])
    user_email = user.get('email', '')
    now = datetime.now()
    
    conds = [
        {'added_by_user_id': user_id_str},
        {'user_id': user_id_str},
    ]
    if user_email:
        conds.append({'added_by': user_email})
    if ObjectId.is_valid(user_id_str):
        conds.append({'added_by_user_id': ObjectId(user_id_str)})
        conds.append({'user_id': ObjectId(user_id_str)})
    
    query = {'$or': conds}
    
    blacklist = []
    for entry in db.blacklist.find(query).sort('blocked_at', -1):
        exp = entry.get('expires_at')
        is_expired = False
        if exp and isinstance(exp, datetime) and exp <= now:
            is_expired = True
            
        dur_type = entry.get('duration') or entry.get('type') or ('permanent' if not exp else 'temporary')
        blacklist.append({
            'id': str(entry['_id']),
            'ip': entry.get('ip', ''),
            'reason': entry.get('reason', ''),
            'blocked_at': entry['blocked_at'].strftime('%Y-%m-%d %H:%M:%S') if entry.get('blocked_at') and hasattr(entry['blocked_at'], 'strftime') else str(entry.get('blocked_at', '')),
            'expires_at': exp.strftime('%Y-%m-%d %H:%M:%S') if exp and hasattr(exp, 'strftime') else (str(exp) if exp else None),
            'type': dur_type,
            'duration': dur_type,
            'is_expired': is_expired,
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
    
    from bson import ObjectId
    user_id_str = str(user['_id'])
    user_email = user.get('email', 'unknown')
    
    # Calculate duration & expiration
    duration_input = str(data.get('duration') or data.get('type') or 'permanent').strip().lower()
    now = datetime.now()
    expires_at = None
    duration_label = 'permanent'
    
    if duration_input in ('1d', '1 day', '24h', '24', '1_day', '1_days'):
        expires_at = now + timedelta(days=1)
        duration_label = '1 Day'
    elif duration_input in ('2d', '2 days', '48h', '48', '2_day', '2_days'):
        expires_at = now + timedelta(days=2)
        duration_label = '2 Days'
    elif duration_input in ('7d', '7 days', '168h', '168', '1w', '1 week', '7_day', '7_days'):
        expires_at = now + timedelta(days=7)
        duration_label = '7 Days'
    elif duration_input in ('30d', '30 days', '720h', '720', '1m', '1 month', '30_day', '30_days'):
        expires_at = now + timedelta(days=30)
        duration_label = '30 Days'
    elif 'hour' in duration_input or duration_input.endswith('h'):
        try:
            hrs = int(''.join(filter(str.isdigit, duration_input)) or '24')
            expires_at = now + timedelta(hours=hrs)
            duration_label = f'{hrs} Hours'
        except Exception:
            expires_at = now + timedelta(days=1)
            duration_label = '1 Day'
    elif duration_input in ('temporary', 'temp'):
        expires_at = now + timedelta(days=1)
        duration_label = '1 Day'
    else:
        expires_at = None
        duration_label = 'Permanent'
    
    payload = {
        'ip': ip,
        'reason': data.get('reason', 'Blocked by user'),
        'type': duration_label,
        'duration': duration_label,
        'expires_at': expires_at,
        'added_by': user_email,
        'added_by_user_id': user_id_str,
        'user_id': user_id_str,
        'blocked_at': now,
        'is_global': False,
    }
    
    match_conds = [{'ip': ip, 'user_id': user_id_str}, {'ip': ip, 'added_by_user_id': user_id_str}]
    if ObjectId.is_valid(user_id_str):
        match_conds.append({'ip': ip, 'user_id': ObjectId(user_id_str)})
    existing = db.blacklist.find_one({'$or': match_conds}) or db.blacklist.find_one({'ip': ip})
    if existing:
        db.blacklist.update_one({'_id': existing['_id']}, {'$set': payload})
        from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
        push_instant_sync_to_wordpress(user_id=user['_id'])
        return {'status': 'success', 'message': f'IP {ip} updated in blacklist ({duration_label})'}
        
    db.blacklist.insert_one(payload)
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'IP {ip} blacklisted successfully ({duration_label})'}

@app.delete("/api/user/blacklist")
async def user_delete_blacklist(request: Request, user: dict = Depends(verify_user_token_compat)):
    from bson import ObjectId
    ip = request.query_params.get('ip', '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP is required'}
    
    user_id_str = str(user['_id'])
    user_email = user.get('email', '')
    
    del_conds = [
        {'added_by_user_id': user_id_str},
        {'user_id': user_id_str},
        {'added_by_user_id': {'$exists': False}},
        {'added_by_user_id': None},
    ]
    if user_email:
        del_conds.append({'added_by': user_email})
    if ObjectId.is_valid(user_id_str):
        del_conds.append({'added_by_user_id': ObjectId(user_id_str)})
        del_conds.append({'user_id': ObjectId(user_id_str)})
    
    db.blacklist.delete_many({
        'ip': ip,
        '$or': del_conds
    })
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
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
    import socket
    import re
    from bson import ObjectId

    ip = (ip or '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}

    # 1. Reverse DNS Hostname
    hostname = ''
    try:
        hostname = socket.gethostbyaddr(ip)[0]
    except Exception:
        hostname = 'No PTR record'

    # 2. Rich Geolocation & Network Intelligence
    geo_data = {}
    try:
        r = requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query",
            timeout=4
        )
        if r.status_code == 200:
            geo_data = r.json()
    except Exception:
        pass

    if not geo_data.get('reverse') and hostname != 'No PTR record':
        geo_data['reverse'] = hostname

    # 3. Official RIR WHOIS Records & Key Extraction
    raw_whois = "No whois record found."
    parsed_whois = {
        'netname': '',
        'inetnum': '',
        'cidr': '',
        'abuse_email': '',
        'organization': '',
        'country': '',
        'source': '',
        'last_modified': '',
    }

    try:
        r = requests.get(f"https://stat.ripe.net/data/whois/data.json?resource={ip}", timeout=5)
        if r.status_code == 200:
            data = r.json()
            records = data.get('data', {}).get('records', [])
            output = ""
            for rec in records:
                for line in rec:
                    k = (line.get('key') or '').strip().lower()
                    v = (line.get('value') or '').strip()
                    output += f"{line.get('key')}: {v}\n"

                    # Auto-extract key fields
                    if k in ('netname', 'net-name') and not parsed_whois['netname']:
                        parsed_whois['netname'] = v
                    elif k in ('inetnum', 'inet6num', 'cidr', 'route') and not parsed_whois['inetnum']:
                        parsed_whois['inetnum'] = v
                    elif k in ('abuse-mailbox', 'e-mail', 'abuse-email', 'notify') and not parsed_whois['abuse_email']:
                        emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', v)
                        if emails:
                            parsed_whois['abuse_email'] = emails[0]
                    elif k in ('org-name', 'organization', 'descr') and not parsed_whois['organization']:
                        parsed_whois['organization'] = v
                    elif k in ('country', 'country-code') and not parsed_whois['country']:
                        parsed_whois['country'] = v.upper()
                    elif k in ('source', 'source-rir') and not parsed_whois['source']:
                        parsed_whois['source'] = v.upper()
                    elif k in ('last-modified', 'changed') and not parsed_whois['last_modified']:
                        parsed_whois['last_modified'] = v

                output += "\n" + "-"*40 + "\n\n"

            if output:
                raw_whois = output
    except Exception as e:
        raw_whois = f"Whois query failed: {str(e)}"

    # 4. Local User Attack History for this IP
    u_str = str(user['_id'])
    user_cond = {'$or': [{'user_id': u_str}, {'added_by_user_id': u_str}]}

    attack_query = {'$and': [{'ip': ip}, user_cond]}
    local_attacks_count = db.attacks.count_documents(attack_query)
    recent_attacks = list(db.attacks.find(attack_query).sort('timestamp', -1).limit(5))

    attack_history = []
    for a in recent_attacks:
        attack_history.append({
            'url': a.get('url', '/'),
            'attack_type': a.get('attack_type', 'Attack Attempt'),
            'status': a.get('status', 'blocked'),
            'timestamp': a['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if a.get('timestamp') and hasattr(a['timestamp'], 'strftime') else str(a.get('timestamp', '')),
            'confidence': a.get('confidence', 1.0),
        })

    # 5. Blacklist & Geo-Block Status Checks
    is_blacklisted = ip_filter.is_blacklisted(ip, user_id=u_str)
    is_geo_blocked, geo_info = ip_filter.is_country_blocked(ip, user_id=u_str)

    # 6. Calculate Threat Score & Risk Assessment
    threat_score = 0
    threat_level = "Low"
    threat_reasons = []

    if local_attacks_count > 0:
        threat_score += min(50, local_attacks_count * 15)
        threat_reasons.append(f"Recorded {local_attacks_count} attack attempt(s) on your websites")

    if is_blacklisted:
        threat_score = max(threat_score, 90)
        threat_reasons.append("IP is in your active Blacklist")

    if is_geo_blocked:
        threat_score = max(threat_score, 85)
        threat_reasons.append(f"Origin country ({geo_info.get('country_name')}) is restricted by policy")

    if geo_data.get('proxy'):
        threat_score += 25
        threat_reasons.append("Known Proxy / VPN exit node")

    if geo_data.get('hosting'):
        threat_score += 15
        threat_reasons.append("Datacenter / Cloud Hosting IP (common for automated bots)")

    threat_score = min(100, max(5, threat_score))
    if threat_score >= 80:
        threat_level = "Critical / High Risk"
    elif threat_score >= 50:
        threat_level = "Suspicious"
    elif threat_score >= 25:
        threat_level = "Moderate"
    else:
        threat_level = "Clean / Low Risk"

    return {
        'status': 'success',
        'ip': ip,
        'hostname': hostname,
        'geo': geo_data,
        'parsed_whois': parsed_whois,
        'threat_assessment': {
            'score': threat_score,
            'level': threat_level,
            'reasons': threat_reasons,
            'is_blacklisted': is_blacklisted,
            'is_geo_blocked': is_geo_blocked,
            'is_proxy': bool(geo_data.get('proxy')),
            'is_hosting': bool(geo_data.get('hosting')),
            'is_mobile': bool(geo_data.get('mobile')),
        },
        'user_attack_history': {
            'total_attacks': local_attacks_count,
            'recent_attacks': attack_history,
        },
        'raw': raw_whois
    }


@app.get("/api/user/country-blocks")
async def user_get_country_blocks(user: dict = Depends(verify_user_token_compat)):
    from bson import ObjectId
    u_str = str(user['_id'])
    conds = [
        {'user_id': u_str},
        {'added_by_user_id': u_str},
    ]
    if ObjectId.is_valid(u_str):
        conds.append({'user_id': ObjectId(u_str)})
        conds.append({'added_by_user_id': ObjectId(u_str)})
    blocks = list(db.country_blocks.find({'$or': conds}).sort('created_at', -1))
    for b in blocks:
        b['_id'] = str(b['_id'])
        if isinstance(b.get('created_at'), datetime):
            b['created_at'] = b['created_at'].strftime("%Y-%m-%d %H:%M:%S")
    return {'status': 'success', 'country_blocks': blocks}


@app.post("/api/user/country-blocks")
async def user_add_country_block(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    code = (data.get('country_code') or '').strip().upper()
    name = (data.get('country_name') or code).strip()
    reason = data.get('reason', 'Geo-restricted by administrator')
    if not code:
        return {'status': 'error', 'message': 'Country code is required'}
    
    from bson import ObjectId
    u_str = str(user['_id'])
    exist_conds = [{'country_code': code, 'user_id': u_str}, {'country_code': code, 'added_by_user_id': u_str}]
    if ObjectId.is_valid(u_str):
        exist_conds.append({'country_code': code, 'user_id': ObjectId(u_str)})
    existing = db.country_blocks.find_one({'$or': exist_conds})
    if existing:
        return {'status': 'error', 'message': f'Country {name} ({code}) is already blocked'}
    
    doc = {
        'user_id': u_str,
        'added_by_user_id': u_str,
        'country_code': code,
        'country_name': name,
        'reason': reason,
        'created_at': datetime.now()
    }
    db.country_blocks.insert_one(doc)
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'Country {name} ({code}) blocked successfully'}


@app.delete("/api/user/country-blocks")
async def user_delete_country_block(request: Request, user: dict = Depends(verify_user_token_compat)):
    code = (request.query_params.get('code') or '').strip().upper()
    if not code:
        return {'status': 'error', 'message': 'Country code is required'}
    from bson import ObjectId
    u_str = str(user['_id'])
    del_conds = [{'user_id': u_str}, {'added_by_user_id': u_str}]
    if ObjectId.is_valid(u_str):
        del_conds.append({'user_id': ObjectId(u_str)})
        del_conds.append({'added_by_user_id': ObjectId(u_str)})
    db.country_blocks.delete_many({'country_code': code, '$or': del_conds})
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'Country {code} unblocked successfully'}


# ==================== USER SECURITY CONFIG & AUTO-BLOCK POLICIES ====================

@app.get("/api/user/security-config")
@app.get("/api/v1/user/security-config")
async def user_get_security_config(user: dict = Depends(verify_user_token_compat)):
    from src.security.attack_blocker import AttackBlocker
    ab = AttackBlocker(db)
    config = ab.get_user_settings(user['_id'])
    return {'status': 'success', 'config': config}


@app.post("/api/user/security-config")
@app.post("/api/v1/user/security-config")
async def user_save_security_config(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    from src.security.attack_blocker import AttackBlocker
    ab = AttackBlocker(db)
    saved = ab.save_user_settings(user['_id'], data)
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': 'Security policy updated and synchronized across all protected websites.', 'config': saved}


@app.get("/api/user/auto-blocks")
@app.get("/api/v1/user/auto-blocks")
async def user_get_auto_blocks(user: dict = Depends(verify_user_token_compat)):
    from bson import ObjectId
    u_str = str(user['_id'])
    conds = [
        {'user_id': u_str},
        {'added_by_user_id': u_str},
    ]
    if ObjectId.is_valid(u_str):
        conds.append({'user_id': ObjectId(u_str)})
        conds.append({'added_by_user_id': ObjectId(u_str)})
    
    query = {
        'auto_blocked': True,
        '$or': conds
    }
    
    now = datetime.now()
    records = list(db.blacklist.find(query).sort('blocked_at', -1))
    results = []
    for r in records:
        exp = r.get('expires_at')
        is_active = exp is None or exp > now
        if is_active:
            results.append({
                'id': str(r.get('_id', '')),
                'ip': r.get('ip', ''),
                'reason': r.get('reason', 'Auto-blocked: attack threshold exceeded'),
                'type': r.get('type', 'temporary'),
                'blocked_at': r.get('blocked_at').strftime("%Y-%m-%d %H:%M:%S") if isinstance(r.get('blocked_at'), datetime) else str(r.get('blocked_at', '')),
                'expires_at': r.get('expires_at').strftime("%Y-%m-%d %H:%M:%S") if isinstance(r.get('expires_at'), datetime) else ('Never (Permanent)' if r.get('type') == 'permanent' else 'Expired'),
            })
    return {'status': 'success', 'auto_blocks': results, 'total': len(results)}


@app.delete("/api/user/auto-blocks")
@app.delete("/api/v1/user/auto-blocks")
async def user_delete_auto_block(request: Request, user: dict = Depends(verify_user_token_compat)):
    ip = (request.query_params.get('ip') or '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    from bson import ObjectId
    u_str = str(user['_id'])
    del_conds = [{'user_id': u_str}, {'added_by_user_id': u_str}]
    if ObjectId.is_valid(u_str):
        del_conds.append({'user_id': ObjectId(u_str)})
        del_conds.append({'added_by_user_id': ObjectId(u_str)})
    
    db.blacklist.delete_many({'ip': ip, 'auto_blocked': True, '$or': del_conds})
    db.auto_blocks.delete_many({'ip': ip, '$or': del_conds})
    
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'IP {ip} unblocked and removed from auto-block blacklist.'}


@app.post("/api/user/auto-blocks/promote")
@app.post("/api/v1/user/auto-blocks/promote")
async def user_promote_auto_block(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    ip = (data.get('ip') or '').strip()
    if not ip:
        return {'status': 'error', 'message': 'IP address is required'}
    from bson import ObjectId
    u_str = str(user['_id'])
    u_conds = [{'user_id': u_str}, {'added_by_user_id': u_str}]
    if ObjectId.is_valid(u_str):
        u_conds.append({'user_id': ObjectId(u_str)})
        u_conds.append({'added_by_user_id': ObjectId(u_str)})
    
    db.blacklist.update_many(
        {'ip': ip, '$or': u_conds},
        {'$set': {
            'type': 'permanent',
            'expires_at': None,
            'reason': 'Promoted to Permanent Blacklist by Administrator',
            'updated_at': datetime.now()
        }}
    )
    from src.api.v1.wordpress_api import push_instant_sync_to_wordpress
    push_instant_sync_to_wordpress(user_id=user['_id'])
    return {'status': 'success', 'message': f'IP {ip} promoted to permanent blacklist.'}


# ==================== WEBSITE SECURITY AUDIT & PORT SCANNER ====================

@app.post("/api/user/security-audit")
@app.post("/api/v1/user/security-audit")
async def user_security_audit(request: Request, user: dict = Depends(verify_user_token_compat)):
    data = await request.json()
    url = (data.get('url') or '').strip()
    if not url:
        return {'status': 'error', 'message': 'Website URL is required'}
    
    try:
        from src.services.security_scanner_service import SecurityScannerService
        scanner = SecurityScannerService()
        audit_report = await asyncio.to_thread(scanner.run_full_audit, url)
        return {'status': 'success', 'audit': audit_report}
    except Exception as e:
        return {'status': 'error', 'message': f'Failed to perform security audit: {str(e)}'}


@app.get("/api/admin/users")
async def admin_get_users(user: str = Depends(verify_admin_token)):
    return user_api.get_all_users()

@app.post("/api/admin/users")
async def admin_create_user(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    from src.api.v1.admin_api import CreateUserBody, create_user_account
    body = CreateUserBody(**data)
    return await create_user_account(body, admin_email=user)

@app.post("/api/admin/users/gift-plan")
async def admin_gift_plan_legacy(request: Request, user: str = Depends(verify_admin_token)):
    data = await request.json()
    from src.api.v1.admin_api import GiftPlanBody, gift_user_plan
    body = GiftPlanBody(**data)
    return await gift_user_plan(body, admin_email=user)

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


@app.get("/api/wordpress/plugin")
@app.get("/api/download/wp-plugin")
@app.get("/downloads/mdefender-pro.zip")
async def download_wp_plugin_alias():
    from fastapi.responses import FileResponse
    from pathlib import Path
    zip_path = Path(os.getenv(
        "WAF_PLUGIN_ZIP_PATH",
        str(Path(__file__).resolve().parent / "downloads" / "mdefender-pro.zip")
    )).resolve()
    if not zip_path.is_file():
        raise HTTPException(status_code=404, detail="Plugin package not built yet")
    return FileResponse(
        zip_path,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="mdefender-pro.zip"'},
    )


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
