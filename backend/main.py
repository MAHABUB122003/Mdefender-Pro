import io
import os
import sys
import json
from datetime import datetime, timedelta
from typing import Optional

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
from src.security.auth import Auth
from src.security.ip_filter import IPFilter
from src.utils.logger import Logger

app = FastAPI(title="MDefender Pro", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = MongoDB()
auth = Auth()
ip_filter = IPFilter()
waf_api = WAFAPI()
admin_api = AdminAPI()
user_api = UserAPI()
logger = Logger()

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

# Token storage (simple in-memory for demo)
_tokens = {}

def get_client_ip(request: Request):
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'

def get_claimed_ip_from_headers(headers):
    if headers and headers.get('X-Forwarded-For'):
        return headers.get('X-Forwarded-For').split(',')[0].strip()
    return None

def verify_token(request: Request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token or token not in _tokens:
        raise HTTPException(status_code=401, detail='Unauthorized')
    return _tokens[token]


# === Auth Routes ===

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/admin/login")
async def admin_login(data: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else 'unknown'
    if auth.verify_admin(data.username, data.password, client_ip):
        import uuid
        token = str(uuid.uuid4())
        _tokens[token] = data.username
        return {'status': 'success', 'token': token, 'redirect': '/admin/dashboard'}
    return JSONResponse(status_code=401, content={'status': 'error', 'message': 'Invalid credentials'})

@app.post("/api/admin/logout")
async def admin_logout(request: Request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    _tokens.pop(token, None)
    return {'status': 'success'}


# === Admin Dashboard Routes ===

@app.get("/api/admin/stats")
async def admin_stats(user: str = Depends(verify_token)):
    return admin_api.get_stats()

@app.get("/api/admin/logs")
async def admin_get_logs(request: Request, user: str = Depends(verify_token)):
    params = dict(request.query_params)
    return admin_api.get_logs(params)

@app.get("/api/admin/rules")
async def admin_get_rules(user: str = Depends(verify_token)):
    return admin_api.get_rules()

@app.post("/api/admin/rules")
async def admin_create_rule(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.create_rule(data)

@app.put("/api/admin/rules")
async def admin_update_rule(request: Request, user: str = Depends(verify_token)):
    rule_id = request.query_params.get('id')
    data = await request.json()
    return admin_api.update_rule(rule_id, data)

@app.delete("/api/admin/rules")
async def admin_delete_rule(request: Request, user: str = Depends(verify_token)):
    rule_id = request.query_params.get('id')
    return admin_api.delete_rule(rule_id)

@app.get("/api/admin/clients")
async def admin_get_clients(user: str = Depends(verify_token)):
    return admin_api.get_clients()

@app.post("/api/admin/clients")
async def admin_add_client(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.add_client(data)

@app.put("/api/admin/clients")
async def admin_update_client(request: Request, user: str = Depends(verify_token)):
    client_id = request.query_params.get('id')
    data = await request.json()
    return admin_api.update_client(client_id, data)

@app.delete("/api/admin/clients")
async def admin_delete_client(request: Request, user: str = Depends(verify_token)):
    client_id = request.query_params.get('id')
    return admin_api.delete_client(client_id)

@app.get("/api/admin/blacklist")
async def admin_get_blacklist(user: str = Depends(verify_token)):
    return admin_api.get_blacklist()

@app.post("/api/admin/blacklist")
async def admin_add_blacklist(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.add_to_blacklist(data)

@app.delete("/api/admin/blacklist")
async def admin_delete_blacklist(request: Request, user: str = Depends(verify_token)):
    ip = request.query_params.get('ip')
    return admin_api.remove_from_blacklist(ip)

@app.get("/api/admin/settings")
async def admin_get_settings(user: str = Depends(verify_token)):
    return admin_api.get_settings()

@app.post("/api/admin/settings")
async def admin_update_settings(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.update_settings(data)

@app.post("/api/admin/change_password")
async def admin_change_password(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.change_password(data)

@app.post("/api/admin/clean_logs")
async def admin_clean_logs(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    days = data.get('days', 30)
    return admin_api.clean_logs(days)

@app.post("/api/admin/clean_all_logs")
async def admin_clean_all_logs(user: str = Depends(verify_token)):
    return admin_api.clean_all_logs()

@app.post("/api/admin/reset_stats/{collection}")
async def admin_reset_stats(collection: str, user: str = Depends(verify_token)):
    return admin_api.reset_stats(collection)

@app.post("/api/admin/clean_auto_blocks")
async def admin_clean_auto_blocks(user: str = Depends(verify_token)):
    return admin_api.clean_auto_blocks()

@app.post("/api/admin/clean_attack_attempts")
async def admin_clean_attack_attempts(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    days = data.get('days', 30)
    return admin_api.clean_attack_attempts(days)

@app.get("/api/admin/auto_block_settings")
async def admin_auto_block_get_settings(user: str = Depends(verify_token)):
    return admin_api.get_auto_block_settings()

@app.post("/api/admin/auto_block_settings")
async def admin_auto_block_update_settings(request: Request, user: str = Depends(verify_token)):
    data = await request.json()
    return admin_api.update_auto_block_settings(data)

@app.get("/api/admin/auto_block_stats")
async def admin_auto_block_stats(user: str = Depends(verify_token)):
    return admin_api.get_auto_block_stats()


# === User Token Verification ===

def verify_user_token(request: Request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail='Unauthorized')
    user = user_api.verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    return user


# === User Auth Routes ===

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@app.post("/api/user/register")
async def user_register(data: UserRegisterRequest):
    return user_api.register({'name': data.name, 'email': data.email, 'password': data.password})

class UserLoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/user/login")
async def user_login(data: UserLoginRequest, request: Request):
    client_ip = request.client.host if request.client else 'unknown'
    return user_api.login(data.email, data.password, client_ip)


# === User Profile Routes ===

@app.get("/api/user/profile")
async def user_get_profile(user: dict = Depends(verify_user_token)):
    return user_api.get_profile(user)

@app.put("/api/user/profile")
async def user_update_profile(request: Request, user: dict = Depends(verify_user_token)):
    data = await request.json()
    return user_api.update_profile(user, data)

@app.post("/api/user/change_password")
async def user_change_password(request: Request, user: dict = Depends(verify_user_token)):
    data = await request.json()
    return user_api.change_password(user, data)


# === User API Key Routes ===

@app.post("/api/user/regenerate_key")
async def user_regenerate_key(user: dict = Depends(verify_user_token)):
    return user_api.regenerate_api_key(user)


# === User Website Routes ===

@app.post("/api/user/websites")
async def user_add_website(request: Request, user: dict = Depends(verify_user_token)):
    data = await request.json()
    return user_api.add_website(user, data)

@app.delete("/api/user/websites")
async def user_remove_website(request: Request, user: dict = Depends(verify_user_token)):
    website_id = request.query_params.get('id')
    return user_api.remove_website(user, website_id)


# === User Dashboard Route ===

@app.get("/api/user/dashboard")
async def user_dashboard(user: dict = Depends(verify_user_token)):
    return user_api.get_dashboard_stats(user)


# === Admin User Management Routes ===

@app.get("/api/admin/users")
async def admin_get_users(user: str = Depends(verify_token)):
    return user_api.get_all_users()

@app.put("/api/admin/users")
async def admin_update_user(request: Request, user: str = Depends(verify_token)):
    user_id = request.query_params.get('id')
    data = await request.json()
    return user_api.admin_update_user(user_id, data)

@app.delete("/api/admin/users")
async def admin_delete_user(request: Request, user: str = Depends(verify_token)):
    user_id = request.query_params.get('id')
    return user_api.admin_delete_user(user_id)

@app.get("/api/admin/user_stats")
async def admin_user_stats(user: str = Depends(verify_token)):
    return user_api.admin_get_user_stats()


# === WAF API Routes (for client integration) ===

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


if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*40)
    print("\U0001f512 MDefender Pro Started Successfully")
    print("="*40)
    print(f"\U0001f4ca Admin Dashboard: http://localhost:8000")
    print(f"\U0001f517 API Endpoint: http://localhost:8000/api")
    print("\nDefault Admin Login:")
    print("Username: admin")
    print("Password: admin123")
    print("\n\u26a0\ufe0f  Please change password immediately!")
    print("="*40 + "\n")
    uvicorn.run("main:app", host='0.0.0.0', port=8000, reload=True)
