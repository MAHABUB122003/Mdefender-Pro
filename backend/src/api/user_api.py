from src.database.mongodb_connection import MongoDB
from src.engine.rule_engine import RuleEngine
from src.services.password_service import PasswordService
from src.services.email_service import EmailService
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import hashlib
import secrets
import logging

logger = logging.getLogger('mdefender.auth')


class UserAPI:
    def __init__(self):
        self.db = MongoDB()
        self.rule_engine = RuleEngine()
        self.password_service = PasswordService()
        self.email_service = EmailService()

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
        confirm_password = data.get('confirmPassword', data.get('confirm_password', ''))
        name = data.get('name', '').strip()

        # --- Step 1: Required fields ---
        if not email or not password or not name:
            return {'status': 'error', 'message': 'Name, email and password are required'}

        # --- Step 2: Password confirmation ---
        if confirm_password and password != confirm_password:
            return {'status': 'error', 'message': 'Passwords do not match'}

        # --- Step 3: Email validation (RFC syntax + MX records + disposable) ---
        email_result = self.email_service.validate(email)
        if not email_result['valid']:
            first_error = email_result['errors'][0]
            logger.warning(f"Email validation failed: {email} — {first_error}")
            return {'status': 'error', 'message': first_error}
        email = email_result['normalized_email']

        # --- Step 4: Password strength validation (enterprise policy) ---
        pw_result = self.password_service.validate_strength(password)
        if not pw_result['valid']:
            first_error = pw_result['errors'][0]
            logger.warning(f"Password validation failed for {email} — {first_error}")
            return {'status': 'error', 'message': first_error}

        # --- Step 5: Duplicate email check ---
        existing = self.db.users.find_one({'email': email})
        if existing:
            logger.warning(f"Duplicate registration attempt: {email}")
            return {'status': 'error', 'message': 'An account with this email already exists'}

        # --- Step 6: Hash password with bcrypt ---
        password_hash = self.password_service.hash_password(password)
        api_key = 'md_' + secrets.token_hex(24)

        user = {
            'email': email,
            'name': name,
            'password_hash': password_hash,
            'api_key': api_key,
            'plan': 'free',
            'role': 'readonly',
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
        logger.info(f"New user registered: {email}")
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
            logger.warning(f"Login failed (unknown email): {email} from {ip}")
            return {'status': 'error', 'message': 'Invalid email or password'}

        stored_hash = user.get('password_hash', '')
        authenticated = False

        # --- Path A: bcrypt hash (new format) ---
        if self.password_service.is_bcrypt_hash(stored_hash):
            authenticated = self.password_service.verify_password(password, stored_hash)

        # --- Path B: SHA-256 hash (legacy format) — verify then migrate ---
        elif self.password_service.is_sha256_hash(stored_hash):
            legacy_hash = hashlib.sha256(password.encode()).hexdigest()
            if legacy_hash == stored_hash:
                authenticated = True
                # Migrate to bcrypt on successful login
                new_hash = self.password_service.hash_password(password)
                self.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {'password_hash': new_hash, 'updated_at': datetime.now()}}
                )
                logger.info(f"Migrated password hash to bcrypt for: {email}")

        # --- Path C: Unknown hash format — reject ---
        else:
            logger.error(f"Unknown hash format for user: {email}")

        if not authenticated:
            logger.warning(f"Login failed (wrong password): {email} from {ip}")
            return {'status': 'error', 'message': 'Invalid email or password'}

        if user.get('status') == 'suspended':
            logger.warning(f"Login blocked (suspended account): {email}")
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

        logger.info(f"User logged in: {email} from {ip}")
        return {
            'status': 'success',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'plan': user.get('plan', 'free'),
                'role': user.get('role', 'readonly'),
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
            'role': user.get('role', 'readonly'),
            'api_key': user.get('api_key', ''),
            'status': user.get('status', 'active'),
            'created_at': user['created_at'].strftime('%Y-%m-%d %H:%M:%S') if user.get('created_at') else '',
            'last_login': user['last_login'].strftime('%Y-%m-%d %H:%M:%S') if user.get('last_login') else '',
            'plan_expires': user['plan_expires'].strftime('%Y-%m-%d %H:%M:%S') if user.get('plan_expires') else None,
            'websites': list(self.db.websites.find({'user_id': str(user['_id'])})),
            'total_requests': user.get('total_requests', 0),
            'total_blocked': user.get('total_blocked', 0),
        }

    def regenerate_api_key(self, user, data=None):
        if data and data.get('website_id'):
            website_id = data.get('website_id')
            website = self.db.websites.find_one({'_id': website_id, 'user_id': str(user['_id'])})
            if not website:
                return {'status': 'error', 'message': 'Website not found'}
            
            raw_key = 'mdf_live_' + secrets.token_hex(24)
            key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
            
            # Delete old keys
            self.db.api_keys.delete_many({'website_id': website_id})
            
            self.db.api_keys.insert_one({
                'website_id': website_id,
                'user_id': str(user['_id']),
                'key_hash': key_hash,
                'created_at': datetime.now(),
                'status': 'active'
            })
            return {'status': 'success', 'api_key': raw_key, 'message': 'Website API key regenerated'}
        else:
            # Legacy account-level key for compatibility
            new_key = 'md_' + secrets.token_hex(24)
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'api_key': new_key, 'updated_at': datetime.now()}}
            )
            return {'status': 'success', 'api_key': new_key, 'message': 'Account API key regenerated'}

    def add_website(self, user, data):
        domain = data.get('domain', '').strip()
        origin = data.get('origin_server', '').strip()
        platform = data.get('platform', 'Other').strip()
        if not domain:
            return {'status': 'error', 'message': 'Domain is required'}

        user_id_str = str(user['_id'])
        plan = user.get('plan', 'free')
        max_sites = 1 if plan == 'free' else 10

        current_websites_count = self.db.websites.count_documents({'user_id': user_id_str})

        if current_websites_count >= max_sites:
            return {'status': 'error', 'message': f'Your {plan} plan allows up to {max_sites} website(s). Upgrade for more.'}

        if self.db.websites.find_one({'domain': domain}):
            return {'status': 'error', 'message': 'Domain already registered'}

        website_id = str(uuid.uuid4())
        website = {
            '_id': website_id,
            'user_id': user_id_str,
            'domain': domain,
            'platform': platform,
            'origin_server': origin,
            'status': 'active',
            'added_at': datetime.now(),
            'requests_today': 0,
            'blocked_today': 0,
            'waf_mode': 'protect',
            'malware_scanner': 'active',
            'threat_level': 'LOW',
        }
        self.db.websites.insert_one(website)

        # Generate scoped API Key
        raw_key = 'mdf_live_' + secrets.token_hex(24)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        self.db.api_keys.insert_one({
            'website_id': website_id,
            'user_id': user_id_str,
            'key_hash': key_hash,
            'created_at': datetime.now(),
            'status': 'active'
        })

        return {'status': 'success', 'website': website, 'api_key': raw_key, 'message': f'{domain} added successfully'}

    def remove_website(self, user, website_id):
        user_id_str = str(user['_id'])
        result = self.db.websites.delete_one({'_id': website_id, 'user_id': user_id_str})
        if result.deleted_count == 0:
            return {'status': 'error', 'message': 'Website not found'}
        
        self.db.api_keys.delete_many({'website_id': website_id})
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

        # --- Validate new password strength ---
        pw_result = self.password_service.validate_strength(new_pw)
        if not pw_result['valid']:
            return {'status': 'error', 'message': pw_result['errors'][0]}

        # --- Verify current password ---
        stored_hash = user.get('password_hash', '')
        old_valid = False

        if self.password_service.is_bcrypt_hash(stored_hash):
            old_valid = self.password_service.verify_password(old_pw, stored_hash)
        elif self.password_service.is_sha256_hash(stored_hash):
            # Legacy SHA-256 verification
            old_valid = (hashlib.sha256(old_pw.encode()).hexdigest() == stored_hash)

        if not old_valid:
            return {'status': 'error', 'message': 'Current password is incorrect'}

        # --- Hash new password with bcrypt ---
        new_hash = self.password_service.hash_password(new_pw)
        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'password_hash': new_hash, 'updated_at': datetime.now()}}
        )
        logger.info(f"Password changed for: {user.get('email', 'unknown')}")
        return {'status': 'success', 'message': 'Password changed successfully'}

    def get_dashboard_stats(self, user):
        today = datetime.now().strftime('%Y-%m-%d')

        if user.get('requests_today_date') != today:
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'requests_today': 0, 'requests_today_date': today}}
            )
            user['requests_today'] = 0

        user_id_str = str(user['_id'])

        attack_logs = list(self.db.attacks.find(
            {'user_id': user_id_str}
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

        attack_type_map = {}
        attacker_ip_map = {}
        all_attacks = list(self.db.attacks.find({'user_id': user_id_str}))
        for a in all_attacks:
            atype = a.get('attack_type', 'Unknown')
            attack_type_map[atype] = attack_type_map.get(atype, 0) + 1
            ip = a.get('ip', '')
            if ip:
                attacker_ip_map[ip] = attacker_ip_map.get(ip, 0) + 1

        attack_types = list(attack_type_map.keys())
        attack_counts = [attack_type_map[k] for k in attack_types]

        top_attackers = sorted(
            [{'ip': ip, 'count': count} for ip, count in attacker_ip_map.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:10]

        daily_requests = []
        for i in range(7):
            day = datetime.now() - timedelta(days=6 - i)
            day_str = day.strftime('%Y-%m-%d')
            count = self.db.attacks.count_documents({
                'user_id': user_id_str,
                'timestamp': {
                    '$gte': datetime.strptime(day_str, '%Y-%m-%d'),
                    '$lt': datetime.strptime(day_str, '%Y-%m-%d') + timedelta(days=1),
                }
            })
            daily_requests.append(count)

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
            'attack_types': attack_types,
            'attack_counts': attack_counts,
            'daily_requests': daily_requests,
            'top_attackers': top_attackers,
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
                'role': u.get('role', 'readonly'),
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
        for key in ['plan', 'status', 'name', 'role']:
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

    def upgrade_plan(self, user, plan='premium', days=30):
        current_plan = user.get('plan', 'free')
        if current_plan == 'premium':
            return {'status': 'error', 'message': 'Your account is already on Premium plan'}

        expiry = datetime.now() + timedelta(days=days)
        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'plan': plan,
                'plan_expires': expiry,
                'updated_at': datetime.now(),
            }}
        )
        return {
            'status': 'success',
            'message': f'Upgraded to {plan} plan successfully!',
            'plan': plan,
            'plan_expires': expiry.strftime('%Y-%m-%d %H:%M:%S'),
        }

    def downgrade_plan(self, user):
        current_plan = user.get('plan', 'free')
        if current_plan == 'free':
            return {'status': 'error', 'message': 'Your account is already on Free plan'}

        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'plan': 'free',
                'plan_expires': None,
                'role': 'readonly',
                'updated_at': datetime.now(),
            }}
        )
        return {
            'status': 'success',
            'message': 'Downgraded to Free plan. Premium features are now locked.',
            'plan': 'free',
        }

    def get_user_logs(self, user, params):
        page = int(params.get('page', 1))
        per_page = int(params.get('limit', 20))
        search = params.get('search', '')
        ip_filter = params.get('ip', '')
        attack_type = params.get('attack_type', '')
        date_from = params.get('date_from', '')
        date_to = params.get('date_to', '')
        user_id_str = str(user['_id'])
        query = {'user_id': user_id_str}
        if search:
            search_conditions = [
                {'ip': {'$regex': search, '$options': 'i'}},
                {'url': {'$regex': search, '$options': 'i'}},
                {'attack_type': {'$regex': search, '$options': 'i'}},
            ]
            query = {'$and': [query, {'$or': search_conditions}]}
        if ip_filter:
            query['ip'] = ip_filter
        if attack_type:
            query['attack_type'] = attack_type
        if date_from or date_to:
            query['timestamp'] = {}
            if date_from:
                try:
                    query['timestamp']['$gte'] = datetime.strptime(date_from, '%Y-%m-%d')
                except: pass
            if date_to:
                try:
                    query['timestamp']['$lte'] = datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S')
                except: pass
        total = self.db.attacks.count_documents(query)
        logs = list(self.db.attacks.find(query)
            .sort('timestamp', -1)
            .skip((page - 1) * per_page)
            .limit(per_page))
        result_logs = []
        for i, log in enumerate(logs):
            result_logs.append({
                'id': str(log.get('_id', i)),
                'ip': log.get('ip', ''),
                'url': log.get('url', ''),
                'attack_type': log.get('attack_type', 'Unknown'),
                'status': log.get('status', 'blocked'),
                'timestamp': log['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') else '',
                'confidence': log.get('confidence', 0),
                'method': log.get('method', 'GET'),
                'user_agent': log.get('user_agent', ''),
                'rule_matched': log.get('rule_matched', ''),
            })
        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page if total > 0 else 1,
            'logs': result_logs,
        }

    def get_user_rules(self, user):
        rules = []
        for i, rule in enumerate(self.rule_engine.default_rules):
            rules.append({
                'id': str(i + 1),
                'name': rule.get('name', ''),
                'description': rule.get('description', ''),
                'pattern': rule.get('pattern', ''),
                'type': rule.get('type', ''),
                'action': rule.get('action', 'block'),
                'enabled': rule.get('enabled', True),
                'severity': rule.get('severity', 'medium'),
            })
        return rules

    def toggle_ddos_protection(self, user, enabled):
        self.db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'ddos_enabled': enabled, 'updated_at': datetime.now()}}
        )
        return {'status': 'success', 'ddos_enabled': enabled, 'message': f'DDoS protection {"enabled" if enabled else "disabled"}'}

    def get_ddos_status(self, user):
        return {
            'status': 'success',
            'ddos_enabled': user.get('ddos_enabled', True),
        }
