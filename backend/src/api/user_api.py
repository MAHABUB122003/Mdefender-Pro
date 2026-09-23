from src.database.mongodb_connection import MongoDB
from src.engine.rule_engine import RuleEngine
from src.services.password_service import PasswordService
from src.services.email_service import EmailService
from src.utils.api_key import generate_api_key
from datetime import datetime, timedelta
from bson import ObjectId
import re
import uuid
import hashlib
import logging

logger = logging.getLogger('mdefender.auth')


class UserAPI:
    def __init__(self):
        self.db = MongoDB()
        self.rule_engine = RuleEngine()
        self.password_service = PasswordService()
        self.email_service = EmailService()

    @staticmethod
    def _format_dt(val, fmt='%Y-%m-%d %H:%M:%S', default=''):
        if not val:
            return default
        if hasattr(val, 'strftime'):
            try:
                return val.strftime(fmt)
            except Exception:
                return str(val)
        return str(val)

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
        api_key = generate_api_key()

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

        api_key = user.get('api_key', '')
        if not api_key:
            api_key = generate_api_key()
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'api_key': api_key, 'updated_at': datetime.now()}}
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
                'name': user.get('name', user.get('full_name', '')),
                'plan': user.get('plan', 'free'),
                'role': user.get('role', 'readonly'),
                'api_key': api_key,
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
            'name': user.get('name', user.get('full_name', '')),
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
            
            raw_key = generate_api_key()
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
            new_key = generate_api_key()
            user_id_str = str(user['_id'])
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'api_key': new_key, 'updated_at': datetime.now()}}
            )
            # Revoke all auto-generated website api keys that were created using the old master key
            self.db.api_keys.delete_many({
                'user_id': user_id_str,
                'label': 'wordpress_auto'
            })
            return {'status': 'success', 'api_key': new_key, 'message': 'Account API key regenerated'}

    def add_website(self, user, data):
        domain = data.get('domain', '').strip()
        origin = data.get('origin_server', '').strip()
        platform = data.get('platform', 'WordPress').strip()
        if not domain:
            return {'status': 'error', 'message': 'Domain is required'}

        # Normalize domain: remove protocol, trailing slashes, and path
        domain = re.sub(r'^https?:\/\/', '', domain, flags=re.IGNORECASE).strip('/')
        domain = domain.split('/')[0].strip().lower()
        if not domain:
            return {'status': 'error', 'message': 'Invalid domain format'}

        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)
        plan = user.get('plan', 'free')
        
        # Allow up to 5 websites for free tier testing, 100 for premium
        max_sites = 5 if plan == 'free' else 100

        current_websites_count = self.db.websites.count_documents({
            '$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]
        })

        if current_websites_count >= max_sites:
            return {'status': 'error', 'message': f'Your {plan} plan allows up to {max_sites} website(s). Upgrade to Premium to connect more domains.'}

        # Check if already added by this user
        existing_site = self.db.websites.find_one({
            '$and': [
                {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]},
                {'$or': [{'domain': domain}, {'url': domain}, {'name': domain}]}
            ]
        })
        if existing_site:
            return {'status': 'error', 'message': f'Domain "{domain}" is already connected to your account.'}

        orphan_site = self.db.websites.find_one({
            '$or': [{'domain': domain}, {'url': domain}]
        })

        now_dt = datetime.now()
        now_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')

        update_fields = {
            'user_id': user_id_str,
            'domain': domain,
            'name': domain,
            'url': domain,
            'platform': platform,
            'origin_server': origin,
            'status': 'active',
            'added_at': now_dt,
            'connected_at': now_dt,
            'requests_today': 0,
            'blocked_today': 0,
            'total_requests': 0,
            'total_blocked': 0,
            'waf_mode': 'protect',
            'malware_scanner': 'active',
            'threat_level': 'LOW',
        }

        if orphan_site:
            website_id = str(orphan_site['_id'])
            try:
                self.db.websites.update_one({'_id': orphan_site['_id']}, {'$set': update_fields})
            except Exception:
                pass
        else:
            website_id = str(uuid.uuid4())
            new_doc = {'_id': website_id, **update_fields}
            try:
                self.db.websites.insert_one(new_doc)
            except Exception:
                try:
                    self.db.websites.update_one({'domain': domain}, {'$set': update_fields}, upsert=True)
                    existing = self.db.websites.find_one({'domain': domain})
                    if existing:
                        website_id = str(existing['_id'])
                except Exception:
                    pass

        try:
            self.db.users.update_one(
                {'_id': user_id_obj},
                {'$addToSet': {'websites': domain}}
            )
        except Exception:
            pass

        # Generate unique scoped API Key for this website
        raw_key = generate_api_key()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        try:
            self.db.api_keys.delete_many({'website_id': website_id})
            self.db.api_keys.insert_one({
                'website_id': website_id,
                'user_id': user_id_str,
                'key_hash': key_hash,
                'label': platform or 'WordPress',
                'created_at': now_dt,
                'status': 'active'
            })
        except Exception as e:
            logger.warning(f"Could not record API key for website {website_id}: {e}")

        website_out = {
            'id': str(website_id),
            '_id': str(website_id),
            'domain': domain,
            'name': domain,
            'url': domain,
            'platform': platform,
            'status': 'active',
            'added_at': now_str,
            'waf_mode': 'protect',
            'threat_level': 'LOW'
        }

        return {
            'status': 'success',
            'website': website_out,
            'api_key': raw_key,
            'message': f'{domain} connected successfully'
        }

    def remove_website(self, user, website_id):
        if not website_id:
            return {'status': 'error', 'message': 'Website ID is required'}
        
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)
        
        # Build flexible ID queries
        target_ids = [website_id]
        if ObjectId.is_valid(website_id):
            target_ids.append(ObjectId(website_id))

        user_cond = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
        
        # Find website doc
        site_doc = self.db.websites.find_one({
            '$and': [
                user_cond,
                {'$or': [{'_id': {'$in': target_ids}}, {'domain': website_id}, {'name': website_id}, {'url': website_id}]}
            ]
        })

        if not site_doc:
            site_doc = self.db.websites.find_one({
                '$or': [{'_id': {'$in': target_ids}}, {'domain': website_id}]
            })

        domain = site_doc.get('domain') if site_doc else website_id
        actual_id = site_doc['_id'] if site_doc else website_id

        # 1. Delete from websites
        del_query = {
            '$or': [
                {'_id': actual_id},
                {'_id': website_id},
            ]
        }
        if ObjectId.is_valid(str(website_id)):
            del_query['$or'].append({'_id': ObjectId(str(website_id))})
        if domain:
            del_query['$or'].append({'domain': domain})

        self.db.websites.delete_many(del_query)

        # 2. Delete from wordpress_sites
        if domain:
            self.db.wordpress_sites.delete_many({'domain': domain})
        self.db.wordpress_sites.delete_many({'website_id': str(actual_id)})

        # 3. Delete associated API keys
        self.db.api_keys.delete_many({
            '$or': [
                {'website_id': str(actual_id)},
                {'website_id': str(website_id)},
                {'website_id': domain} if domain else {'website_id': None}
            ]
        })

        # 4. Remove from user's websites array if present
        if domain:
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$pull': {'websites': domain}}
            )

        return {'status': 'success', 'message': f'Website {domain or website_id} removed successfully'}

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

    def get_dashboard_stats(self, user, website_id=None):
        today = datetime.now().strftime('%Y-%m-%d')

        if user.get('requests_today_date') != today:
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'requests_today': 0, 'requests_today_date': today}}
            )
            user['requests_today'] = 0

        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)

        # Query websites from the websites and wordpress_sites collections scoped to the user
        websites_query = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
        websites_cursor = list(self.db.websites.find(websites_query))

        # Auto-discover active domains from connected wordpress_sites if not yet in websites table
        known_domains = {w.get('domain') for w in websites_cursor if w.get('domain')}
        wp_sites = list(self.db.wordpress_sites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        wp_domains = [wp.get('domain') for wp in wp_sites if wp.get('domain')]
        
        all_discovered_domains = set(filter(None, wp_domains))

        for d in all_discovered_domains:
            if d not in ('unknown', '') and d not in known_domains:
                site_id = str(uuid.uuid4())
                now_dt = datetime.now()
                is_local = d in ("localhost", "127.0.0.1", "::1")
                site_display_name = "Localhost (XAMPP)" if is_local else d
                site_url = "http://localhost" if is_local else f"https://{d}"
                new_site = {
                    '_id': site_id,
                    'user_id': user_id_str,
                    'name': site_display_name,
                    'domain': d,
                    'url': site_url,
                    'platform': 'WordPress (XAMPP)' if is_local else 'WordPress',
                    'status': 'active',
                    'protection_enabled': True,
                    'waf_mode': 'protect',
                    'malware_scanner': 'active',
                    'threat_level': 'LOW',
                    'added_at': now_dt,
                    'connected_at': now_dt,
                    'requests_today': 0,
                    'total_requests': 0,
                    'total_blocked': 0,
                }
                try:
                    self.db.websites.insert_one(new_site)
                    websites_cursor.append(new_site)
                    known_domains.add(d)
                except Exception:
                    pass

        websites = []
        for w in websites_cursor:
            added_at_val = self._format_dt(w.get('added_at') or w.get('connected_at'))
            websites.append({
                'id': str(w['_id']),
                'domain': w.get('domain', ''),
                'name': w.get('name', ''),
                'platform': w.get('platform', 'WordPress'),
                'origin_server': w.get('origin_server', ''),
                'status': w.get('status', 'active'),
                'added_at': added_at_val,
                'requests_today': w.get('requests_today', 0),
                'blocked_today': w.get('blocked_today', 0),
                'total_requests': w.get('total_requests', 0),
                'total_blocked': w.get('total_blocked', 0),
                'waf_mode': w.get('waf_mode', 'protect'),
                'malware_scanner': w.get('malware_scanner', 'active'),
                'threat_level': w.get('threat_level', 'LOW'),
            })

        website_domains = {w['id']: w.get('domain', '') for w in websites}
        website_domains_list = [w['domain'] for w in websites if w.get('domain')]

        # Build user scope query
        user_scope = [{'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}]
        if website_domains_list:
            user_scope.append({'domain': {'$in': website_domains_list}})
        user_filter = {'$or': user_scope} if len(user_scope) > 1 else user_scope[0]

        # Base query for stats and logs
        if website_id and website_id != 'all':
            base_query = {'$and': [user_filter, {'$or': [{'website_id': website_id}, {'domain': website_id}]}]}
        else:
            base_query = user_filter

        attack_filter = {'$or': [{'action': {'$in': ['block', 'blocked']}}, {'status': {'$in': ['block', 'blocked']}}]}
        attack_query = {'$and': [base_query, attack_filter]}

        # Retrieve recent activity (blocks & attacks) from security_events or attacks
        attack_logs = list(self.db.security_events.find(attack_query).sort('timestamp', -1).limit(25))
        if not attack_logs:
            attack_logs = list(self.db.attacks.find(base_query).sort('timestamp', -1).limit(25))

        logs = []
        for log in attack_logs:
            web_id = str(log.get('website_id', ''))
            domain_val = website_domains.get(web_id, '') or log.get('domain', '')
            logs.append({
                'id': str(log.get('_id', '')),
                'ip': log.get('source_ip') or log.get('ip', ''),
                'url': log.get('endpoint') or log.get('url', ''),
                'attack_type': log.get('attack_type') or 'Suspicious Request',
                'confidence': log.get('confidence') or (log.get('risk_score', 0) / 100.0 if log.get('risk_score') else 0.85),
                'timestamp': self._format_dt(log.get('timestamp')),
                'status': log.get('action') or log.get('status') or 'blocked',
                'domain': domain_val or 'WordPress Site',
            })

        attack_type_map = {}
        attacker_ip_map = {}
        all_attacks = list(self.db.security_events.find(attack_query).limit(500))
        if not all_attacks:
            all_attacks = list(self.db.attacks.find(base_query).limit(500))

        for a in all_attacks:
            atype = a.get('attack_type', 'Unknown') or 'Unknown'
            attack_type_map[atype] = attack_type_map.get(atype, 0) + 1
            ip = a.get('source_ip') or a.get('ip', '')
            if ip:
                attacker_ip_map[ip] = attacker_ip_map.get(ip, 0) + 1

        attack_types = list(attack_type_map.keys())
        attack_counts = [attack_type_map[k] for k in attack_types]

        top_attackers = sorted(
            [{'ip': ip, 'count': count} for ip, count in attacker_ip_map.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:10]

        # Fetch daily requests count (all actions) from security_events & attacks
        daily_requests = []
        for i in range(7):
            day = datetime.now() - timedelta(days=6 - i)
            day_str = day.strftime('%Y-%m-%d')
            day_start = datetime.strptime(day_str, '%Y-%m-%d')
            day_end = day_start + timedelta(days=1)
            
            day_q = {'$and': [base_query, {'timestamp': {'$gte': day_start, '$lt': day_end}}]}
            count = self.db.security_events.count_documents(day_q)
            if count == 0:
                count = self.db.attacks.count_documents(day_q)
            daily_requests.append(count)

        # Get latest user doc
        user_doc = self.db.users.find_one({'_id': user['_id']}) or user

        # Count real live telemetry numbers from database
        events_total = self.db.security_events.count_documents(base_query)
        attacks_total = self.db.attacks.count_documents(base_query)
        tot_req = max(events_total, attacks_total, sum(w.get('total_requests', 0) for w in websites), user_doc.get('total_requests', 0))

        blocked_events_count = self.db.security_events.count_documents(attack_query)
        blocked_attacks_count = self.db.attacks.count_documents(base_query)
        tot_block = max(blocked_events_count, blocked_attacks_count, sum(w.get('total_blocked', 0) for w in websites), user_doc.get('total_blocked', 0))

        today_start = datetime.strptime(today, '%Y-%m-%d')
        today_end = today_start + timedelta(days=1)
        today_events_count = self.db.security_events.count_documents({
            '$and': [base_query, {'timestamp': {'$gte': today_start, '$lt': today_end}}]
        })
        if today_events_count == 0:
            today_events_count = self.db.attacks.count_documents({
                '$and': [base_query, {'timestamp': {'$gte': today_start, '$lt': today_end}}]
            })
        req_today = max(today_events_count, sum(w.get('requests_today', 0) for w in websites), user_doc.get('requests_today', 0))

        active_sites_count = len(websites)

        return {
            'user': {
                'id': str(user_doc['_id']),
                'email': user_doc.get('email', ''),
                'name': user_doc.get('name', user_doc.get('full_name', '')),
                'plan': user_doc.get('plan', 'free'),
                'created_at': self._format_dt(user_doc.get('created_at'), '%Y-%m-%d'),
                'last_login': self._format_dt(user_doc.get('last_login')),
            },
            'api_key': user_doc.get('api_key', ''),
            'plan': user_doc.get('plan', 'free'),
            'requests_today': req_today,
            'total_requests': tot_req,
            'total_blocked': tot_block,
            'websites_count': active_sites_count,
            'active_websites': active_sites_count,
            'websites': websites,
            'recent_activity': logs,
            'attack_types': attack_types,
            'attack_counts': attack_counts,
            'daily_requests': daily_requests,
            'top_attackers': top_attackers,
            'protection_status': 'active',
            'selected_website': website_id or 'all',
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
                'created_at': self._format_dt(u.get('created_at')),
                'last_login': self._format_dt(u.get('last_login'), default='Never'),
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
        status_filter = params.get('status', '')
        website_id = params.get('website_id', '')
        date_from = params.get('date_from', '')
        date_to = params.get('date_to', '')
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)

        # Get all website domains owned by user
        user_sites = list(self.db.websites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        user_domains = [w.get('domain') for w in user_sites if w.get('domain')]

        # Base user scope
        user_scope = [{'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}]
        if user_domains:
            user_scope.append({'domain': {'$in': user_domains}})
        
        conditions = [{'$or': user_scope} if len(user_scope) > 1 else user_scope[0]]

        if website_id and website_id != 'all':
            conditions.append({'$or': [{'website_id': website_id}, {'domain': website_id}]})

        if status_filter:
            if status_filter in ('block', 'blocked'):
                conditions.append({'$or': [{'action': {'$in': ['block', 'blocked']}}, {'status': {'$in': ['block', 'blocked']}}]})
            elif status_filter in ('allow', 'allowed'):
                conditions.append({'$or': [{'action': {'$in': ['allow', 'allowed']}}, {'status': {'$in': ['allow', 'allowed']}}]})

        if attack_type:
            conditions.append({'attack_type': attack_type})

        if ip_filter:
            conditions.append({'$or': [{'ip': ip_filter}, {'source_ip': ip_filter}]})

        if search:
            conditions.append({'$or': [
                {'ip': {'$regex': search, '$options': 'i'}},
                {'source_ip': {'$regex': search, '$options': 'i'}},
                {'url': {'$regex': search, '$options': 'i'}},
                {'endpoint': {'$regex': search, '$options': 'i'}},
                {'attack_type': {'$regex': search, '$options': 'i'}},
                {'domain': {'$regex': search, '$options': 'i'}},
            ]})

        if date_from or date_to:
            time_filter = {}
            if date_from:
                try:
                    time_filter['$gte'] = datetime.strptime(date_from, '%Y-%m-%d')
                except Exception:
                    pass
            if date_to:
                try:
                    time_filter['$lte'] = datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S')
                except Exception:
                    pass
            if time_filter:
                conditions.append({'timestamp': time_filter})

        final_query = {'$and': conditions} if len(conditions) > 1 else (conditions[0] if conditions else {})

        # Primary source: security_events
        total = self.db.security_events.count_documents(final_query)
        logs = list(self.db.security_events.find(final_query)
            .sort('timestamp', -1)
            .skip((page - 1) * per_page)
            .limit(per_page))

        # Fallback to attacks collection if security_events has 0 matches
        if total == 0:
            total = self.db.attacks.count_documents(final_query)
            logs = list(self.db.attacks.find(final_query)
                .sort('timestamp', -1)
                .skip((page - 1) * per_page)
                .limit(per_page))

        result_logs = []
        for i, log in enumerate(logs):
            result_logs.append({
                'id': str(log.get('_id', i)),
                'ip': log.get('source_ip') or log.get('ip', ''),
                'url': log.get('endpoint') or log.get('url', ''),
                'domain': log.get('domain', ''),
                'attack_type': log.get('attack_type', 'Suspicious Request'),
                'status': log.get('action') or log.get('status', 'blocked'),
                'timestamp': log['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') and hasattr(log['timestamp'], 'strftime') else str(log.get('timestamp', '')),
                'confidence': log.get('confidence', 0.85),
                'method': log.get('method', 'GET'),
                'user_agent': log.get('user_agent', ''),
                'rule_matched': log.get('rule_matched', ''),
                'country_code': log.get('country_code') or log.get('countryCode') or '',
                'country': log.get('country') or log.get('country_name') or '',
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
        # Add global default rules
        for i, rule in enumerate(self.rule_engine.default_rules):
            rules.append({
                'id': f"global_{i}",
                'name': rule.get('name', ''),
                'description': rule.get('description', ''),
                'pattern': rule.get('pattern', ''),
                'type': 'global',
                'action': rule.get('action', 'block'),
                'enabled': rule.get('enabled', True),
                'severity': rule.get('severity', 'medium'),
                'is_custom': False
            })
            
        # Add user custom rules
        try:
            user_id_str = str(user['_id'])
            customs = list(self.db.user_rules.find({'user_id': user_id_str}))
            for rule in customs:
                rules.append({
                    'id': str(rule['_id']),
                    'name': rule.get('name', ''),
                    'description': rule.get('description', 'User custom WAF rule'),
                    'pattern': rule.get('pattern', ''),
                    'type': 'custom',
                    'action': rule.get('action', 'block'),
                    'enabled': rule.get('enabled', True),
                    'severity': rule.get('severity', 'medium'),
                    'is_custom': True
                })
        except Exception as e:
            logger.warning(f"Error loading custom rules for user: {e}")
            
        return rules

    def create_user_rule(self, user, data):
        name = data.get('name', '').strip()
        pattern = data.get('pattern', '').strip()
        action = data.get('action', 'block')
        severity = data.get('severity', 'medium')
        enabled = data.get('enabled', True)
        
        if not name or not pattern:
            return {'status': 'error', 'message': 'Name and pattern are required'}
        
        import re
        try:
            re.compile(pattern)
        except re.error as e:
            return {'status': 'error', 'message': f'Invalid regular expression: {e}'}
            
        rule = {
            'user_id': str(user['_id']),
            'name': name,
            'pattern': pattern,
            'action': action,
            'severity': severity,
            'enabled': enabled,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        res = self.db.user_rules.insert_one(rule)
        return {
            'status': 'success',
            'message': 'Rule created successfully',
            'id': str(res.inserted_id)
        }

    def update_user_rule(self, user, rule_id, data):
        try:
            oid = ObjectId(rule_id)
        except:
            return {'status': 'error', 'message': 'Invalid rule ID'}
            
        rule = self.db.user_rules.find_one({'_id': oid, 'user_id': str(user['_id'])})
        if not rule:
            return {'status': 'error', 'message': 'Rule not found'}
            
        update_fields = {}
        if 'name' in data:
            update_fields['name'] = data['name'].strip()
        if 'pattern' in data:
            pattern = data['pattern'].strip()
            try:
                import re
                re.compile(pattern)
                update_fields['pattern'] = pattern
            except re.error as e:
                return {'status': 'error', 'message': f'Invalid regular expression: {e}'}
        if 'action' in data:
            update_fields['action'] = data['action']
        if 'severity' in data:
            update_fields['severity'] = data['severity']
        if 'enabled' in data:
            update_fields['enabled'] = bool(data['enabled'])
            
        update_fields['updated_at'] = datetime.now()
        self.db.user_rules.update_one({'_id': oid}, {'$set': update_fields})
        return {'status': 'success', 'message': 'Rule updated successfully'}

    def delete_user_rule(self, user, rule_id):
        try:
            oid = ObjectId(rule_id)
        except:
            return {'status': 'error', 'message': 'Invalid rule ID'}
            
        res = self.db.user_rules.delete_one({'_id': oid, 'user_id': str(user['_id'])})
        if res.deleted_count == 0:
            return {'status': 'error', 'message': 'Rule not found'}
        return {'status': 'success', 'message': 'Rule deleted successfully'}

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

    def upgrade_plan(self, user, plan='premium', days=30):
        now = datetime.now()
        plan_expires = now + timedelta(days=days)
        self.db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'plan': plan,
                    'plan_expires': plan_expires,
                    'updated_at': now
                }
            }
        )
        return {
            'status': 'success',
            'message': f'Plan upgraded to {plan}',
            'plan': plan,
            'plan_expires': plan_expires.strftime('%Y-%m-%d')
        }

    def downgrade_plan(self, user):
        now = datetime.now()
        self.db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'plan': 'free',
                    'plan_expires': None,
                    'updated_at': now
                }
            }
        )
        return {'status': 'success', 'message': 'Plan downgraded to Free', 'plan': 'free'}
