from src.database.mongodb_connection import MongoDB
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import hashlib
import secrets

class UserAPI:
    def __init__(self):
        self.db = MongoDB()

    def _resolve_id(self, user_id):
        if isinstance(user_id, ObjectId):
            return user_id
        try:
            return ObjectId(user_id)
        except Exception:
            return user_id

    def register(self, data):
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()

        if not email or not password or not name:
            return {'status': 'error', 'message': 'Name, email and password are required'}
        if len(password) < 8:
            return {'status': 'error', 'message': 'Password must be at least 8 characters'}
        if '@' not in email:
            return {'status': 'error', 'message': 'Invalid email address'}

        existing = self.db.users.find_one({'email': email})
        if existing:
            return {'status': 'error', 'message': 'An account with this email already exists'}

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        api_key = 'md_' + secrets.token_hex(24)

        user = {
            'email': email,
            'name': name,
            'password_hash': password_hash,
            'api_key': api_key,
            'plan': 'free',
            'status': 'active',
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'last_login': None,
            'websites': [],
            'plan_expires': None,
            'requests_today': 0,
            'requests_today_date': None,
            'total_requests': 0,
            'total_blocked': 0,
        }

        result = self.db.users.insert_one(user)
        return {
            'status': 'success',
            'message': 'Account created successfully',
            'user_id': str(result.inserted_id),
            'api_key': api_key,
        }

    def login(self, email, password, ip='unknown'):
        email = email.strip().lower()
        user = self.db.users.find_one({'email': email})
        if not user:
            return {'status': 'error', 'message': 'Invalid email or password'}

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if user.get('password_hash') != password_hash:
            return {'status': 'error', 'message': 'Invalid email or password'}

        if user.get('status') == 'suspended':
            return {'status': 'error', 'message': 'Your account has been suspended. Contact support.'}

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.now()}}
        )

        token = str(uuid.uuid4())
        self.db.user_tokens.insert_one({
            'token': token,
            'user_id': str(user['_id']),
            'email': email,
            'created_at': datetime.now(),
            'ip': ip,
        })

        return {
            'status': 'success',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'plan': user.get('plan', 'free'),
                'api_key': user.get('api_key', ''),
            }
        }

    def verify_token(self, token):
        if not token:
            return None
        record = self.db.user_tokens.find_one({'token': token})
        if not record:
            return None
        user_id = record.get('user_id')
        if not user_id:
            return None
        user = self.db.users.find_one({'_id': self._resolve_id(user_id)})
        if not user or user.get('status') == 'suspended':
            return None
        return user

    def get_profile(self, user):
        return {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'plan': user.get('plan', 'free'),
            'api_key': user.get('api_key', ''),
            'status': user.get('status', 'active'),
            'created_at': user['created_at'].strftime('%Y-%m-%d %H:%M:%S') if user.get('created_at') else '',
            'last_login': user['last_login'].strftime('%Y-%m-%d %H:%M:%S') if user.get('last_login') else '',
            'plan_expires': user['plan_expires'].strftime('%Y-%m-%d %H:%M:%S') if user.get('plan_expires') else None,
            'websites': user.get('websites', []),
            'total_requests': user.get('total_requests', 0),
            'total_blocked': user.get('total_blocked', 0),
        }

    def regenerate_api_key(self, user):
        new_key = 'md_' + secrets.token_hex(24)
        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'api_key': new_key, 'updated_at': datetime.now()}}
        )
        return {'status': 'success', 'api_key': new_key, 'message': 'API key regenerated'}

    def add_website(self, user, data):
        domain = data.get('domain', '').strip()
        origin = data.get('origin_server', '').strip()
        if not domain:
            return {'status': 'error', 'message': 'Domain is required'}

        websites = user.get('websites', [])
        plan = user.get('plan', 'free')
        max_sites = 1 if plan == 'free' else 10

        if len(websites) >= max_sites:
            return {'status': 'error', 'message': f'Your {plan} plan allows up to {max_sites} website(s). Upgrade for more.'}

        if any(w['domain'] == domain for w in websites):
            return {'status': 'error', 'message': 'Domain already registered'}

        website = {
            'id': str(uuid.uuid4()),
            'domain': domain,
            'origin_server': origin,
            'status': 'active',
            'added_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'requests_today': 0,
            'blocked_today': 0,
        }

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$push': {'websites': website}}
        )

        return {'status': 'success', 'website': website, 'message': f'{domain} added successfully'}

    def remove_website(self, user, website_id):
        websites = user.get('websites', [])
        new_websites = [w for w in websites if w.get('id') != website_id]
        if len(new_websites) == len(websites):
            return {'status': 'error', 'message': 'Website not found'}

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'websites': new_websites}}
        )
        return {'status': 'success', 'message': 'Website removed'}

    def update_profile(self, user, data):
        updates = {}
        if 'name' in data:
            updates['name'] = data['name']
        updates['updated_at'] = datetime.now()

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': updates}
        )
        return {'status': 'success', 'message': 'Profile updated'}

    def change_password(self, user, data):
        old_pw = data.get('old_password', '')
        new_pw = data.get('new_password', '')
        if not old_pw or not new_pw:
            return {'status': 'error', 'message': 'Both passwords are required'}
        if len(new_pw) < 8:
            return {'status': 'error', 'message': 'New password must be at least 8 characters'}

        old_hash = hashlib.sha256(old_pw.encode()).hexdigest()
        if user.get('password_hash') != old_hash:
            return {'status': 'error', 'message': 'Current password is incorrect'}

        new_hash = hashlib.sha256(new_pw.encode()).hexdigest()
        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'password_hash': new_hash, 'updated_at': datetime.now()}}
        )
        return {'status': 'success', 'message': 'Password changed successfully'}

    def get_dashboard_stats(self, user):
        today = datetime.now().strftime('%Y-%m-%d')

        if user.get('requests_today_date') != today:
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'requests_today': 0, 'requests_today_date': today}}
            )
            user['requests_today'] = 0

        attack_logs = list(self.db.attacks.find(
            {'user_id': str(user['_id'])}
        ).sort('timestamp', -1).limit(20))

        logs = []
        for log in attack_logs:
            logs.append({
                'id': str(log.get('_id', '')),
                'ip': log.get('ip', ''),
                'url': log.get('url', ''),
                'attack_type': log.get('attack_type', 'Unknown'),
                'confidence': log.get('confidence', 0),
                'timestamp': log['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') else '',
                'status': log.get('status', 'blocked'),
                'domain': log.get('domain', ''),
            })

        websites = user.get('websites', [])

        return {
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'plan': user.get('plan', 'free'),
                'created_at': user['created_at'].strftime('%Y-%m-%d') if user.get('created_at') else '',
                'last_login': user['last_login'].strftime('%Y-%m-%d %H:%M:%S') if user.get('last_login') else '',
            },
            'api_key': user.get('api_key', ''),
            'plan': user.get('plan', 'free'),
            'requests_today': user.get('requests_today', 0),
            'total_requests': user.get('total_requests', 0),
            'total_blocked': user.get('total_blocked', 0),
            'websites_count': len(websites),
            'active_websites': len(websites),
            'websites': websites,
            'recent_activity': logs,
            'protection_status': 'active',
        }

    def get_all_users(self):
        users = []
        for u in self.db.users.find().sort('created_at', -1):
            users.append({
                'id': str(u['_id']),
                'email': u.get('email', ''),
                'name': u.get('name', ''),
                'plan': u.get('plan', 'free'),
                'status': u.get('status', 'active'),
                'api_key': u.get('api_key', ''),
                'created_at': u['created_at'].strftime('%Y-%m-%d %H:%M:%S') if u.get('created_at') else '',
                'last_login': u['last_login'].strftime('%Y-%m-%d %H:%M:%S') if u.get('last_login') else 'Never',
                'total_requests': u.get('total_requests', 0),
                'total_blocked': u.get('total_blocked', 0),
                'websites_count': len(u.get('websites', [])),
            })
        return users

    def admin_update_user(self, user_id, data):
        updates = {}
        for key in ['plan', 'status', 'name']:
            if key in data:
                updates[key] = data[key]
        if 'plan' in data and data['plan'] == 'premium':
            days = data.get('plan_days', 30)
            updates['plan_expires'] = datetime.now() + timedelta(days=days)
        updates['updated_at'] = datetime.now()
        self.db.users.update_one({'_id': self._resolve_id(user_id)}, {'$set': updates})
        return {'status': 'success', 'message': 'User updated'}

    def admin_delete_user(self, user_id):
        resolved = self._resolve_id(user_id)
        self.db.users.delete_one({'_id': resolved})
        self.db.user_tokens.delete_many({'user_id': str(user_id)})
        return {'status': 'success', 'message': 'User deleted'}

    def admin_get_user_stats(self):
        total = self.db.users.count_documents({})
        active = self.db.users.count_documents({'status': 'active'})
        free = self.db.users.count_documents({'plan': 'free'})
        premium = self.db.users.count_documents({'plan': 'premium'})
        total_requests = 0
        total_blocked = 0
        for u in self.db.users.find():
            total_requests += u.get('total_requests', 0)
            total_blocked += u.get('total_blocked', 0)
        return {
            'total_users': total,
            'active_users': active,
            'free_users': free,
            'premium_users': premium,
            'total_requests': total_requests,
            'total_blocked': total_blocked,
        }
