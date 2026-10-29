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
        self._stats_cache = {}
        self._stats_cache_ttl = 15
        self._logs_cache = {}
        self._logs_cache_ttl = 1

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
        full_name = user.get('full_name') or user.get('name') or ''
        username = user.get('username') or (user.get('email', '').split('@')[0] if user.get('email') else '')
        email_verified = user.get('email_verified', False)
        created_at_str = self._format_dt(user.get('created_at'))
        last_login_str = self._format_dt(user.get('last_login'))
        plan_expires_str = self._format_dt(user.get('plan_expires'), default=None)
        
        user_id_str = str(user.get('id') or user.get('_id'))
        user_oid = self._resolve_id(user_id_str)
        
        websites = list(self.db.websites.find({
            '$or': [{'user_id': user_id_str}, {'user_id': user_oid}]
        }))
        for w in websites:
            w['id'] = str(w['_id'])
            w['_id'] = str(w['_id'])

        return {
            'id': user_id_str,
            '_id': user_id_str,
            'email': user.get('email', ''),
            'name': full_name,
            'full_name': full_name,
            'username': username,
            'email_verified': email_verified,
            'plan': user.get('plan', 'free'),
            'role': user.get('role', 'user'),
            'api_key': user.get('api_key', ''),
            'status': user.get('status', 'active'),
            'created_at': created_at_str,
            'last_login': last_login_str,
            'plan_expires': plan_expires_str,
            'websites': websites,
            'total_requests': user.get('total_requests', 0),
            'total_blocked': user.get('total_blocked', 0),
        }

    def regenerate_api_key(self, user, data=None):
        if data and data.get('website_id'):
            website_id = data.get('website_id')
            user_id_str = str(user['_id'])
            user_id_obj = self._resolve_id(user_id_str)
            target_ids = [website_id]
            if ObjectId.is_valid(website_id):
                target_ids.append(ObjectId(website_id))

            website = self.db.websites.find_one({
                '$and': [
                    {'_id': {'$in': target_ids}},
                    {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
                ]
            })
            if not website:
                return {'status': 'error', 'message': 'Website not found or unauthorized'}
            
            raw_key = generate_api_key()
            key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
            
            # Delete old keys for this website
            self.db.api_keys.delete_many({'website_id': str(website['_id'])})
            
            self.db.api_keys.insert_one({
                'website_id': str(website['_id']),
                'user_id': user_id_str,
                'key_hash': key_hash,
                'label': website.get('platform', 'WordPress'),
                'created_at': datetime.now(),
                'status': 'active'
            })
            # Also store on the website record
            try:
                self.db.websites.update_one({'_id': website['_id']}, {'$set': {'api_key': raw_key}})
            except Exception:
                pass

            return {'status': 'success', 'api_key': raw_key, 'message': 'Website API key regenerated'}
        else:
            # Account-level key for compatibility
            new_key = generate_api_key()
            user_id_str = str(user['_id'])
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'api_key': new_key, 'updated_at': datetime.now()}}
            )
            return {'status': 'success', 'api_key': new_key, 'message': 'Account API key regenerated'}

    def add_website(self, user, data):
        domain = data.get('domain', '').strip()
        origin = data.get('origin_server', '').strip()
        raw_platform = (data.get('platform') or 'domain').lower().strip()
        platform = 'wordpress' if 'wordpress' in raw_platform or 'wp' in raw_platform else 'domain'
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

        # Check if already added by this user (any platform) or orphaned
        existing_site = self.db.websites.find_one({
            '$and': [
                {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]},
                {'$or': [{'domain': domain}, {'url': domain}, {'name': domain}]}
            ]
        })

        orphan_site = None
        if not existing_site:
            orphan_site = self.db.websites.find_one({
                '$or': [{'domain': domain}, {'url': domain}, {'name': domain}]
            })

        # Generate unique dedicated scoped API Key for this website
        raw_key = generate_api_key()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        now_dt = datetime.now()
        now_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')

        selected_plan = (data.get('plan') or 'free').lower()
        ssl_mode = (data.get('ssl_mode') or 'flexible').lower()
        current_ns = data.get('current_nameservers') or []

        from src.services.domain_service import get_assigned_nameservers_for_domain
        assigned_ns, _ = get_assigned_nameservers_for_domain(domain)

        update_fields = {
            'user_id': user_id_str,
            'domain': domain,
            'name': domain,
            'url': domain,
            'platform': platform,
            'origin_server': origin,
            'plan': selected_plan,
            'ssl_mode': ssl_mode,
            'verified': False,
            'status': 'active',
            'api_key': raw_key,
            'assigned_nameservers': assigned_ns,
            'current_nameservers': current_ns,
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

        # If already added, re-connect and update records seamlessly
        if existing_site:
            website_id = str(existing_site['_id'])
            try:
                self.db.websites.update_one({'_id': existing_site['_id']}, {'$set': update_fields})
            except Exception:
                pass
            try:
                self.db.users.update_one({'_id': user_id_obj}, {'$addToSet': {'websites': domain}})
            except Exception:
                pass

            # Sync DNS records if provided
            records_in = data.get('dns_records')
            if records_in and isinstance(records_in, list):
                self.db.dns_records.delete_many({'$or': [{'website_id': website_id}, {'domain': domain}]})
                for rec in records_in:
                    self.db.dns_records.insert_one({
                        '_id': str(uuid.uuid4()),
                        'website_id': website_id,
                        'user_id': user_id_str,
                        'domain': domain,
                        'type': rec.get('type', 'A').upper(),
                        'name': rec.get('name', '@'),
                        'content': rec.get('content', ''),
                        'ttl': rec.get('ttl', 'Auto'),
                        'proxied': bool(rec.get('proxied', False)),
                        'priority': rec.get('priority'),
                        'purpose': rec.get('purpose', ''),
                        'created_at': now_dt,
                        'updated_at': now_dt,
                    })

            self._stats_cache.clear()
            return {
                'status': 'success',
                'website_id': website_id,
                'website': {
                    'id': website_id,
                    'domain': domain,
                    'name': domain,
                    'platform': platform,
                    'status': 'active',
                    'assigned_nameservers': assigned_ns
                },
                'api_key': raw_key,
                'message': f'{domain} connected successfully'
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
                    conflicting = self.db.websites.find_one({'$or': [{'domain': domain}, {'url': domain}]})
                    if conflicting:
                        website_id = str(conflicting['_id'])
                        self.db.websites.update_one({'_id': conflicting['_id']}, {'$set': update_fields})
                    else:
                        self.db.websites.update_one({'_id': website_id}, {'$set': update_fields}, upsert=True)
                except Exception:
                    pass

        try:
            self.db.users.update_one(
                {'_id': user_id_obj},
                {'$addToSet': {'websites': domain}}
            )
        except Exception:
            pass

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

        self._stats_cache.clear()

        # Seed DNS records
        try:
            from src.services.dns_zone_service import DNSZoneService
            dns_svc = DNSZoneService(self.db)
            records_in = data.get('dns_records')
            if records_in and isinstance(records_in, list):
                for rec in records_in:
                    self.db.dns_records.insert_one({
                        '_id': str(uuid.uuid4()),
                        'website_id': website_id,
                        'user_id': user_id_str,
                        'domain': domain,
                        'type': rec.get('type', 'A').upper(),
                        'name': rec.get('name', '@'),
                        'content': rec.get('content', ''),
                        'ttl': rec.get('ttl', 'Auto'),
                        'proxied': bool(rec.get('proxied', False)),
                        'priority': rec.get('priority'),
                        'purpose': rec.get('purpose', ''),
                        'created_at': now_dt,
                        'updated_at': now_dt,
                    })
            else:
                discovery = dns_svc.discover_public_dns(domain, scan_subdomains=True)
                recs_to_insert = discovery.get('records', [])
                if not recs_to_insert:
                    recs_to_insert = [
                        {'type': 'A', 'name': '@', 'content': '217.15.170.82', 'ttl': 'Auto', 'proxied': True, 'purpose': 'Root domain WAF Anycast edge'},
                        {'type': 'CNAME', 'name': 'www', 'content': '@', 'ttl': 'Auto', 'proxied': True, 'purpose': 'WWW subdomain alias'}
                    ]
                for rec in recs_to_insert:
                    self.db.dns_records.insert_one({
                        '_id': str(uuid.uuid4()),
                        'website_id': website_id,
                        'user_id': user_id_str,
                        'domain': domain,
                        'type': rec['type'],
                        'name': rec['name'],
                        'content': rec['content'],
                        'ttl': rec.get('ttl', 'Auto'),
                        'proxied': rec.get('proxied', True),
                        'priority': rec.get('priority'),
                        'purpose': rec.get('purpose', ''),
                        'created_at': now_dt,
                        'updated_at': now_dt,
                    })
        except Exception as e:
            logger.warning(f"Could not seed DNS records for {domain}: {e}")

        website_out = {
            'id': str(website_id),
            '_id': str(website_id),
            'domain': domain,
            'name': domain,
            'url': domain,
            'platform': platform,
            'plan': selected_plan,
            'ssl_mode': ssl_mode,
            'verified': False,
            'status': 'active',
            'api_key': raw_key,
            'assigned_nameservers': assigned_ns,
            'nameservers': assigned_ns,
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

    def remove_website(self, user, website_id=None, domain=None):
        if not website_id and not domain:
            return {'status': 'error', 'message': 'Website ID or Domain is required'}
        
        user_id_str = str(user.get('_id') or user.get('id') or '')
        user_id_obj = self._resolve_id(user_id_str)
        is_admin = bool(user.get('is_admin') or user.get('role') in ('admin', 'super_admin'))
        
        # Build set of target IDs to purge
        target_ids = []
        if website_id:
            target_ids.append(str(website_id))
            if ObjectId.is_valid(str(website_id)):
                target_ids.append(ObjectId(str(website_id)))

        user_cond = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}, {'user_id': str(user_id_obj)}]}

        # Find any matching site doc across all potential identifiers
        find_query = []
        if target_ids:
            find_query.append({'_id': {'$in': target_ids}})
            find_query.append({'website_id': {'$in': [str(t) for t in target_ids]}})
        if domain:
            find_query.extend([{'domain': domain}, {'url': domain}, {'name': domain}])
        if website_id and not ObjectId.is_valid(str(website_id)):
            find_query.extend([{'domain': str(website_id)}, {'url': str(website_id)}, {'name': str(website_id)}])

        # 1. Search in websites collection
        site_docs = []
        if is_admin:
            site_docs = list(self.db.websites.find({'$or': find_query}))
        else:
            site_docs = list(self.db.websites.find({'$and': [user_cond, {'$or': find_query}]}))
            if not site_docs:
                raw_docs = list(self.db.websites.find({'$or': find_query}))
                for rd in raw_docs:
                    if str(rd.get('user_id', '')).lower() == user_id_str.lower() or not rd.get('user_id'):
                        site_docs.append(rd)

        # Collect all domains and IDs to be purged
        domains_to_purge = set()
        ids_to_purge = set()

        if domain:
            clean_d = str(domain).strip().lower().replace('https://', '').replace('http://', '').rstrip('/')
            domains_to_purge.add(clean_d)
            domains_to_purge.add(str(domain))

        for sd in site_docs:
            ids_to_purge.add(str(sd['_id']))
            d_val = sd.get('domain') or sd.get('url') or sd.get('name')
            if d_val:
                clean_d = str(d_val).strip().lower().replace('https://', '').replace('http://', '').rstrip('/')
                domains_to_purge.add(clean_d)
                domains_to_purge.add(str(d_val))

        if website_id:
            ids_to_purge.add(str(website_id))
            if '.' in str(website_id):
                clean_w = str(website_id).strip().lower().replace('https://', '').replace('http://', '').rstrip('/')
                domains_to_purge.add(clean_w)
                domains_to_purge.add(str(website_id))

        # Also search in wordpress_sites to catch any WP site records
        wp_find_query = []
        if ids_to_purge:
            valid_oids = [ObjectId(i) for i in ids_to_purge if ObjectId.is_valid(i)]
            wp_find_query.append({'_id': {'$in': valid_oids + list(ids_to_purge)}})
            wp_find_query.append({'website_id': {'$in': list(ids_to_purge)}})
        if domains_to_purge:
            wp_find_query.append({'domain': {'$in': list(domains_to_purge)}})
            wp_find_query.append({'site_url': {'$in': list(domains_to_purge)}})

        if wp_find_query:
            wp_docs = list(self.db.wordpress_sites.find({'$or': wp_find_query}))
            for wd in wp_docs:
                ids_to_purge.add(str(wd['_id']))
                if wd.get('website_id'):
                    ids_to_purge.add(str(wd['website_id']))
                if wd.get('domain'):
                    domains_to_purge.add(str(wd['domain']))

        # Also search in domains collection
        if wp_find_query:
            dom_docs = list(self.db.domains.find({'$or': wp_find_query}))
            for dd in dom_docs:
                ids_to_purge.add(str(dd['_id']))
                if dd.get('domain'):
                    domains_to_purge.add(str(dd['domain']))

        # Delete from websites collection
        del_ids = list(ids_to_purge) + [ObjectId(i) for i in ids_to_purge if ObjectId.is_valid(i)]
        del_websites_filter = {'$or': [
            {'_id': {'$in': del_ids}},
            {'domain': {'$in': list(domains_to_purge)}},
            {'url': {'$in': list(domains_to_purge)}},
            {'name': {'$in': list(domains_to_purge)}}
        ]}
        if not is_admin:
            del_websites_filter = {'$and': [user_cond, del_websites_filter]}
        self.db.websites.delete_many(del_websites_filter)

        # Delete from wordpress_sites
        del_wp_filter = {'$or': [
            {'_id': {'$in': del_ids}},
            {'website_id': {'$in': list(ids_to_purge)}},
            {'domain': {'$in': list(domains_to_purge)}},
            {'site_url': {'$in': list(domains_to_purge)}}
        ]}
        if not is_admin:
            del_wp_filter = {'$and': [user_cond, del_wp_filter]}
        self.db.wordpress_sites.delete_many(del_wp_filter)

        # Delete from domains collection
        del_dom_filter = {'$or': [
            {'_id': {'$in': del_ids}},
            {'domain': {'$in': list(domains_to_purge)}}
        ]}
        if not is_admin:
            del_dom_filter = {'$and': [user_cond, del_dom_filter]}
        self.db.domains.delete_many(del_dom_filter)

        # Delete from dns_records
        self.db.dns_records.delete_many({'$or': [
            {'website_id': {'$in': list(ids_to_purge)}},
            {'domain_id': {'$in': list(ids_to_purge)}},
            {'domain': {'$in': list(domains_to_purge)}}
        ]})

        # Delete API keys
        self.db.api_keys.delete_many({'$or': [
            {'website_id': {'$in': list(ids_to_purge)}}
        ]})

        # Thoroughly purge from users.websites array in MongoDB
        for d in domains_to_purge:
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': d}}
            )
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': {'domain': d}}}
            )
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': {'url': d}}}
            )
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': {'name': d}}}
            )
        for i_val in ids_to_purge:
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': {'id': i_val}}}
            )
            self.db.users.update_many(
                user_cond,
                {'$pull': {'websites': {'_id': i_val}}}
            )

        # In-memory user object cleanup
        if 'websites' in user and isinstance(user['websites'], list):
            user['websites'] = [
                w for w in user['websites']
                if (w if isinstance(w, str) else (w.get('domain') or w.get('id') or w.get('name') or '')) not in domains_to_purge.union(ids_to_purge)
            ]

        self._stats_cache.clear()
        primary_label = next(iter(domains_to_purge), website_id or 'Website')
        return {'status': 'success', 'message': f'Website "{primary_label}" removed successfully'}

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

    def _sync_single_site_telemetry(self, site_info, today):
        site_url = site_info.get('url') or (f"http://{site_info.get('domain')}" if site_info.get('domain') else '')
        site_key = site_info.get('api_key') or ''
        if not site_url or not site_key:
            return None
        try:
            import requests as _req
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            sync_url = f"{site_url.rstrip('/')}/?waf_cloud_sync=1&action=get_stats"
            headers = {
                'Authorization': f'Bearer {site_key}',
                'X-API-Key': site_key,
                'User-Agent': 'MDefender-Cloud/2.0'
            }
            resp = None
            try:
                resp = _req.get(sync_url, headers=headers, timeout=2.0, verify=False)
            except Exception:
                if site_url.startswith('https://'):
                    clean_h = site_url.replace('https://', '').replace('http://', '')
                    resp = _req.get(f"http://{clean_h}/?waf_cloud_sync=1&action=get_stats", headers=headers, timeout=2.0, verify=False)

            if resp and resp.status_code == 200:
                data = resp.json()
                st = data.get('action_result') or data.get('stats') or {}
                if st and isinstance(st, dict):
                    tot = int(st.get('total_requests', 0))
                    blk = int(st.get('total_blocked', 0) or st.get('requests_blocked', 0) or 0)
                    today_cnt = int(st.get('requests_today', 0))
                    today_blk = int(st.get('blocked_today', 0))

                    w_target_id = site_info.get('id')
                    w_c = [{"_id": w_target_id}]
                    if ObjectId.is_valid(str(w_target_id)):
                        w_c.append({"_id": ObjectId(str(w_target_id))})
                    self.db.websites.update_one(
                        {"$or": w_c},
                        {"$set": {
                            "total_requests": tot,
                            "total_blocked": blk,
                            "requests_today": today_cnt,
                            "blocked_today": today_blk,
                            "requests_today_date": today,
                            "last_activity": datetime.now()
                        }}
                    )
                    return {
                        'site_id': site_info.get('id'),
                        'domain': site_info.get('domain') or site_info.get('name') or '',
                        'total_requests': tot,
                        'total_blocked': blk,
                        'requests_today': today_cnt,
                        'blocked_today': today_blk,
                        'daily_counts': st.get('daily_counts', {}),
                        'daily_series': st.get('daily_series', []),
                        'daily_clean': st.get('daily_clean', []),
                        'daily_threats': st.get('daily_threats', []),
                        'hourly_total': st.get('hourly_total', []),
                        'attack_types': st.get('attack_types', []),
                        'attack_counts': st.get('attack_counts', []),
                        'top_attackers': st.get('top_attackers', []),
                        'recent_logs': st.get('recent_logs', []),
                    }
        except Exception:
            pass
        return None

    def _get_fallback_dashboard_metrics(self, user_id_str, target_site_ids=None, target_domains=None):
        """Query ephemeral live stream buffer or MongoDB for genuine telemetry when live site sync is unreachable."""
        user_id_obj = self._resolve_id(user_id_str)

        # 1. Check Ephemeral Live Stream Buffer (Zero-Bloat real-time storage)
        live_docs = []
        if target_site_ids:
            target_ids_str = [str(tid) for tid in target_site_ids if tid]
            live_docs = list(self.db.live_site_events.find({'website_id': {'$in': target_ids_str}}))
        else:
            live_docs = list(self.db.live_site_events.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))

        all_live = []
        for ld in live_docs:
            all_live.extend(ld.get('events', []))

        if all_live:
            all_live.sort(key=lambda x: str(x.get('timestamp', '')), reverse=True)
            logs = all_live[:25]
            att_counts = {}
            type_counts = {}
            for ev in all_live:
                if str(ev.get('status', '')).lower() in ('block', 'blocked') or str(ev.get('action', '')).lower() in ('block', 'blocked'):
                    ip_k = ev.get('ip') or ev.get('source_ip')
                    if ip_k:
                        att_counts[ip_k] = att_counts.get(ip_k, 0) + 1
                    at_k = ev.get('attack_type')
                    if at_k and at_k not in ('Clean Traffic', 'Allowed Request'):
                        type_counts[at_k] = type_counts.get(at_k, 0) + 1
            top_attackers = [{'ip': k, 'count': v} for k, v in sorted(att_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
            attack_types = list(type_counts.keys())[:8]
            attack_counts = [type_counts[k] for k in attack_types]
            daily_requests = [0] * 7
            daily_requests[6] = len(all_live)
            return {
                'logs': logs,
                'top_attackers': top_attackers,
                'attack_types': attack_types,
                'attack_counts': attack_counts,
                'daily_requests': daily_requests
            }

        conditions = []
        if target_site_ids or target_domains:
            or_conds = []
            if target_site_ids:
                or_conds.append({'website_id': {'$in': target_site_ids}})
                or_conds.append({'website_id': {'$in': [self._resolve_id(tid) for tid in target_site_ids if tid]}})
            if target_domains:
                or_conds.append({'domain': {'$in': target_domains}})
            conditions.append({'$or': or_conds})
        else:
            conditions.append({'$or': [
                {'user_id': user_id_str},
                {'user_id': user_id_obj},
                {'added_by_user_id': user_id_str}
            ]})
        query = {'$and': conditions} if len(conditions) > 1 else (conditions[0] if conditions else {})

        # 1. Recent logs
        recent_events = list(self.db.security_events.find(query).sort('timestamp', -1).limit(25))
        if not recent_events:
            recent_events = list(self.db.attacks.find(query).sort('timestamp', -1).limit(25))
        
        logs = []
        for d in recent_events:
            st = str(d.get('status') or d.get('action') or 'allowed').lower()
            is_b = st in ('block', 'blocked', 'b', 'mitigated')
            at = d.get('attack_type') or ('Suspicious Probe' if is_b else 'Clean Ingress')
            logs.append({
                'id': str(d.get('_id', '')),
                'ip': d.get('source_ip') or d.get('ip', ''),
                'url': d.get('endpoint') or d.get('url', '/'),
                'attack_type': at,
                'confidence': float(d.get('confidence') or (0.95 if is_b else 0.05)),
                'timestamp': self._format_dt(d.get('timestamp') or d.get('created_at')),
                'status': 'blocked' if is_b else 'allowed',
                'domain': d.get('domain') or 'WordPress Site',
                'method': d.get('method', 'GET')
            })

        # 2. Top attackers
        att_query = {'$and': [query, {'$or': [{'status': {'$in': ['block', 'blocked']}}, {'action': {'$in': ['block', 'blocked']}}]}]} if query else {'$or': [{'status': {'$in': ['block', 'blocked']}}, {'action': {'$in': ['block', 'blocked']}}]}
        top_attackers = []
        try:
            agg_pipeline = [
                {'$match': att_query},
                {'$group': {'_id': {'$ifNull': ['$source_ip', '$ip']}, 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 10}
            ]
            agg_res = list(self.db.security_events.aggregate(agg_pipeline))
            if not agg_res:
                agg_res = list(self.db.attacks.aggregate(agg_pipeline))
            for item in agg_res:
                ip_v = item.get('_id')
                if ip_v:
                    top_attackers.append({'ip': str(ip_v), 'count': int(item.get('count', 0))})
        except Exception:
            pass

        # 3. Attack types & counts
        attack_types = []
        attack_counts = []
        try:
            type_agg = [
                {'$match': att_query},
                {'$group': {'_id': '$attack_type', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 8}
            ]
            type_res = list(self.db.attacks.aggregate(type_agg))
            if not type_res:
                type_res = list(self.db.security_events.aggregate(type_agg))
            for t_item in type_res:
                t_name = t_item.get('_id')
                if t_name and t_name not in ('Clean Traffic', 'Allowed Request'):
                    attack_types.append(str(t_name))
                    attack_counts.append(int(t_item.get('count', 0)))
        except Exception:
            pass

        # 4. Daily series for last 7 days
        now_time = datetime.now()
        daily_requests = [0] * 7
        try:
            seven_days_ago = now_time - timedelta(days=7)
            time_query = {'$and': [query, {'timestamp': {'$gte': seven_days_ago}}]} if query else {'timestamp': {'$gte': seven_days_ago}}
            day_agg = [
                {'$match': time_query},
                {'$group': {
                    '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}},
                    'count': {'$sum': 1}
                }}
            ]
            day_res = {r['_id']: r['count'] for r in self.db.security_events.aggregate(day_agg)}
            if not day_res:
                day_res = {r['_id']: r['count'] for r in self.db.attacks.aggregate(day_agg)}
            for idx in range(7):
                dt_key = (now_time - timedelta(days=6 - idx)).strftime('%Y-%m-%d')
                daily_requests[idx] = int(day_res.get(dt_key, 0))
        except Exception:
            pass

        return {
            'logs': logs,
            'top_attackers': top_attackers,
            'attack_types': attack_types,
            'attack_counts': attack_counts,
            'daily_requests': daily_requests
        }

    def get_dashboard_stats(self, user, website_id=None, force_refresh=False):
        if not isinstance(user, dict):
            u_id = self._resolve_id(user)
            user = self.db.users.find_one({'_id': u_id}) or {'_id': u_id}
        user_id_str = str(user.get('_id', ''))
        user_id_obj = self._resolve_id(user_id_str)
        cache_key = f"{user_id_str}_{website_id or 'all'}"
        now_ts = datetime.now().timestamp()

        if not force_refresh and cache_key in self._stats_cache:
            cached_data, cached_at = self._stats_cache[cache_key]
            if now_ts - cached_at < self._stats_cache_ttl:
                return cached_data

        today = datetime.now().strftime('%Y-%m-%d')

        if user.get('requests_today_date') != today:
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'requests_today': 0, 'requests_today_date': today}}
            )
            user['requests_today'] = 0

        # Query websites from the websites collection scoped to the user
        websites_query = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
        websites_cursor = list(self.db.websites.find(websites_query))

        websites = []
        for w in websites_cursor:
            site_key = w.get('api_key')
            if not site_key:
                site_key = generate_api_key()
                key_hash = hashlib.sha256(site_key.encode()).hexdigest()
                try:
                    self.db.websites.update_one({'_id': w['_id']}, {'$set': {'api_key': site_key}})
                    self.db.api_keys.insert_one({
                        'website_id': str(w['_id']),
                        'user_id': user_id_str,
                        'key_hash': key_hash,
                        'label': w.get('platform', 'WordPress'),
                        'created_at': datetime.now(),
                        'status': 'active'
                    })
                except Exception:
                    pass

            added_at_val = self._format_dt(w.get('added_at') or w.get('connected_at'))
            wp_conn = w.get('wordpress_connection') or {}
            hardening_opts = w.get('hardening') or {
                'disable_file_editing': bool(w.get('disable_file_editing', True)),
                'disable_xmlrpc': bool(w.get('disable_xmlrpc', True)),
                'hide_wp_version': bool(w.get('hide_wp_version', True)),
                'prevent_user_enumeration': bool(w.get('prevent_user_enumeration', True)),
                'block_uploads_php': bool(w.get('block_uploads_php', True)),
                'security_headers': bool(w.get('security_headers', True)),
                'file_permissions_check': bool(w.get('file_permissions_check', True)),
                'login_two_factor': bool(w.get('login_two_factor', True)),
                'disable_directory_listing': bool(w.get('disable_directory_listing', True)),
            }
            websites.append({
                'id': str(w['_id']),
                'domain': w.get('domain', ''),
                'name': w.get('name', ''),
                'url': w.get('url', ''),
                'platform': w.get('platform', 'WordPress'),
                'origin_server': w.get('origin_server', ''),
                'status': w.get('status', 'active'),
                'added_at': added_at_val,
                'api_key': site_key,
                'requests_today': w.get('requests_today', 0) or 0,
                'blocked_today': w.get('blocked_today', 0) or 0,
                'total_requests': w.get('total_requests', 0) or 0,
                'total_blocked': w.get('total_blocked', 0) or 0,
                'requests_today_date': w.get('requests_today_date') or today,
                'waf_mode': w.get('waf_mode', 'protect'),
                'malware_scanner': w.get('malware_scanner', 'active'),
                'threat_level': w.get('threat_level', 'LOW'),
                'plugins': w.get('plugins', []),
                'themes': w.get('themes', []),
                'theme': w.get('theme', wp_conn.get('theme', '')),
                'hardening': hardening_opts,
                'backups': w.get('backups', []),
                'wordpress_connection': wp_conn,
                'wp_version': wp_conn.get('wp_version', w.get('wp_version', '6.7.1')),
                'php_version': wp_conn.get('php_version', w.get('php_version', '8.2')),
                'plugin_version': wp_conn.get('plugin_version', w.get('plugin_version', '4.3.0')),
                'disable_xmlrpc': bool(w.get('disable_xmlrpc', True)),
                'block_uploads_php': bool(w.get('block_uploads_php', True)),
                'disable_file_editing': bool(w.get('disable_file_editing', True)),
                'disable_directory_listing': bool(w.get('disable_directory_listing', True)),
                'prevent_user_enumeration': bool(w.get('prevent_user_enumeration', True)),
                'hide_wp_version': bool(w.get('hide_wp_version', True)),
                'security_headers': bool(w.get('security_headers', True)),
                'file_permissions_check': bool(w.get('file_permissions_check', True)),
                'login_two_factor': bool(w.get('login_two_factor', True)),
            })

        # -------------------------------------------------------------
        # Live Remote Telemetry Proxy (Zero MongoDB log storage)
        # All requests/attacks are fetched directly from connected WordPress site(s)
        # -------------------------------------------------------------
        if website_id and website_id != 'all':
            target_site = next((w for w in websites if w['id'] == website_id or w.get('domain') == website_id or w.get('url') == website_id), None)
            if target_site:
                site_res = self._sync_single_site_telemetry(target_site, today)
                if site_res:
                    tot_req = site_res['total_requests']
                    tot_block = site_res['total_blocked']
                    req_today = site_res['requests_today']
                    block_today = site_res['blocked_today']
                    target_site['total_requests'] = tot_req
                    target_site['total_blocked'] = tot_block
                    target_site['requests_today'] = req_today
                    target_site['blocked_today'] = block_today

                    ds = site_res.get('daily_series', [])
                    if isinstance(ds, list) and len(ds) == 7:
                        daily_requests = [int(x or 0) for x in ds]
                    else:
                        daily_requests = [0] * 7
                        if isinstance(site_res.get('daily_counts'), dict):
                            now_time = datetime.now()
                            for idx in range(7):
                                dt_key = (now_time - timedelta(days=6-idx)).strftime('%Y-%m-%d')
                                c_info = site_res['daily_counts'].get(dt_key, {})
                                daily_requests[idx] = c_info.get('total', 0) if isinstance(c_info, dict) else int(c_info or 0)

                    attack_types = site_res.get('attack_types', [])
                    attack_counts = site_res.get('attack_counts', [])
                    top_attackers = site_res.get('top_attackers', [])

                    logs = []
                    for item in site_res.get('recent_logs', []):
                        if isinstance(item, dict):
                            st = str(item.get('status', 'allowed')).lower()
                            is_b = st in ('block', 'blocked', 'drop', 'mitigated')
                            raw_at = item.get('attack_type')
                            disp_type = raw_at or ('Suspicious Probe' if is_b else 'Clean Ingress')
                            logs.append({
                                'id': str(item.get('id', '')),
                                'ip': item.get('ip', ''),
                                'url': item.get('url', '/'),
                                'attack_type': disp_type,
                                'confidence': float(item.get('confidence') or (0.95 if is_b else 0.05)),
                                'timestamp': self._format_dt(item.get('created_at') or item.get('timestamp')),
                                'status': 'blocked' if is_b else 'allowed',
                                'domain': target_site.get('domain') or 'WordPress Site',
                                'method': item.get('method', 'GET')
                            })
                else:
                    tot_req = target_site.get('total_requests', 0)
                    tot_block = target_site.get('total_blocked', 0)
                    req_today = target_site.get('requests_today', 0)
                    block_today = target_site.get('blocked_today', 0)
                    fb = self._get_fallback_dashboard_metrics(user_id_str, [target_site['id']], [target_site.get('domain'), target_site.get('url')])
                    daily_requests = fb['daily_requests']
                    attack_types = fb['attack_types']
                    attack_counts = fb['attack_counts']
                    top_attackers = fb['top_attackers']
                    logs = fb['logs']
            else:
                tot_req = 0
                tot_block = 0
                req_today = 0
                block_today = 0
                daily_requests = [0] * 7
                attack_types = []
                attack_counts = []
                top_attackers = []
                logs = []
        else:
            # Query all user's connected WordPress sites in parallel
            from concurrent.futures import ThreadPoolExecutor, as_completed
            synced_results = []
            if websites:
                with ThreadPoolExecutor(max_workers=min(10, max(1, len(websites)))) as executor:
                    futures = {executor.submit(self._sync_single_site_telemetry, s, today): s for s in websites}
                    for fut in as_completed(futures):
                        try:
                            res = fut.result()
                            if res:
                                synced_results.append(res)
                                s_obj = futures[fut]
                                s_obj['total_requests'] = res['total_requests']
                                s_obj['total_blocked'] = res['total_blocked']
                                s_obj['requests_today'] = res['requests_today']
                                s_obj['blocked_today'] = res['blocked_today']
                        except Exception:
                            pass

            if synced_results:
                tot_req = sum(r['total_requests'] for r in synced_results)
                tot_block = sum(r['total_blocked'] for r in synced_results)
                req_today = sum(r['requests_today'] for r in synced_results)
                block_today = sum(r['blocked_today'] for r in synced_results)

                daily_requests = [0] * 7
                for r in synced_results:
                    ds = r.get('daily_series', [])
                    if isinstance(ds, list) and len(ds) == 7:
                        for idx in range(7):
                            daily_requests[idx] += int(ds[idx] or 0)
                    elif isinstance(r.get('daily_counts'), dict):
                        now_time = datetime.now()
                        for idx in range(7):
                            dt_key = (now_time - timedelta(days=6-idx)).strftime('%Y-%m-%d')
                            c_info = r['daily_counts'].get(dt_key, {})
                            val = c_info.get('total', 0) if isinstance(c_info, dict) else int(c_info or 0)
                            daily_requests[idx] += val

                atk_map = {}
                for r in synced_results:
                    types = r.get('attack_types', [])
                    counts = r.get('attack_counts', [])
                    for t, c in zip(types, counts):
                        atk_map[t] = atk_map.get(t, 0) + int(c)
                attack_types = list(atk_map.keys())
                attack_counts = [atk_map[k] for k in attack_types]

                att_ip_map = {}
                for r in synced_results:
                    for a in r.get('top_attackers', []):
                        if isinstance(a, dict):
                            ip = a.get('ip', '')
                            cnt = int(a.get('count', 1))
                            if ip:
                                att_ip_map[ip] = att_ip_map.get(ip, 0) + cnt
                top_attackers = sorted(
                    [{'ip': ip, 'count': cnt} for ip, cnt in att_ip_map.items()],
                    key=lambda x: x['count'],
                    reverse=True
                )[:10]

                all_logs = []
                for r in synced_results:
                    site_domain = r.get('domain') or 'WordPress Site'
                    for item in r.get('recent_logs', []):
                        if isinstance(item, dict):
                            st = str(item.get('status', 'allowed')).lower()
                            is_b = st in ('block', 'blocked', 'drop', 'mitigated')
                            raw_at = item.get('attack_type')
                            disp_type = raw_at or ('Suspicious Probe' if is_b else 'Clean Ingress')
                            all_logs.append({
                                'id': str(item.get('id', '')),
                                'ip': item.get('ip', ''),
                                'url': item.get('url', '/'),
                                'attack_type': disp_type,
                                'confidence': float(item.get('confidence') or (0.95 if is_b else 0.05)),
                                'timestamp': self._format_dt(item.get('created_at') or item.get('timestamp')),
                                'status': 'blocked' if is_b else 'allowed',
                                'domain': site_domain,
                                'method': item.get('method', 'GET')
                            })
                all_logs.sort(key=lambda x: str(x.get('timestamp', '')), reverse=True)
                logs = all_logs[:25]

                # Update user document in MongoDB to reflect authentic sum
                self.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'total_requests': tot_req,
                        'total_blocked': tot_block,
                        'requests_today': req_today,
                        'blocked_today': block_today,
                        'requests_today_date': today,
                        'updated_at': datetime.now()
                    }}
                )
            else:
                tot_req = sum(w.get('total_requests', 0) for w in websites)
                tot_block = sum(w.get('total_blocked', 0) for w in websites)
                req_today = sum(w.get('requests_today', 0) for w in websites)
                block_today = sum(w.get('blocked_today', 0) for w in websites)
                all_site_ids = [w['id'] for w in websites]
                all_site_domains = [w.get('domain') for w in websites if w.get('domain')]
                fb = self._get_fallback_dashboard_metrics(user_id_str, all_site_ids, all_site_domains)
                daily_requests = fb['daily_requests']
                attack_types = fb['attack_types']
                attack_counts = fb['attack_counts']
                top_attackers = fb['top_attackers']
                logs = fb['logs']
                if tot_req == 0 and len(logs) > 0:
                    tot_req = len(logs)
                if tot_block == 0 and len(attack_counts) > 0:
                    tot_block = sum(attack_counts)

        active_sites_count = len(websites)
        user_doc = self.db.users.find_one({'_id': user['_id']}) or user
        user_full_name = user_doc.get('full_name') or user_doc.get('name', '')
        user_uname = user_doc.get('username') or (user_doc.get('email', '').split('@')[0] if user_doc.get('email') else '')

        from src.services.subscription_service import SubscriptionService
        effective_plan = SubscriptionService(self.db).effective_plan(user_doc)

        result = {
            'user': {
                'id': str(user_doc['_id']),
                'email': user_doc.get('email', ''),
                'name': user_full_name,
                'full_name': user_full_name,
                'username': user_uname,
                'email_verified': user_doc.get('email_verified', False),
                'plan': effective_plan,
                'created_at': self._format_dt(user_doc.get('created_at'), '%Y-%m-%d'),
                'last_login': self._format_dt(user_doc.get('last_login')),
            },
            'api_key': user_doc.get('api_key', ''),
            'plan': effective_plan,
            'requests_today': req_today,
            'blocked_today': block_today,
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
        self._stats_cache[cache_key] = (result, now_ts)
        return result

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

        # High-speed Memory Cache Check (< 1ms return)
        cache_key = f"{user_id_str}_{website_id}_{page}_{per_page}_{search}_{ip_filter}_{attack_type}_{status_filter}_{date_from}_{date_to}"
        now_ts = datetime.now().timestamp()
        if cache_key in self._logs_cache:
            c_entry = self._logs_cache[cache_key]
            if now_ts - c_entry.get('ts', 0) < self._logs_cache_ttl:
                return c_entry.get('data')

        def _return_cached(res_data):
            try:
                self._logs_cache[cache_key] = {'ts': now_ts, 'data': res_data}
                if len(self._logs_cache) > 150:
                    cutoff = now_ts - self._logs_cache_ttl
                    self._logs_cache = {k: v for k, v in self._logs_cache.items() if v.get('ts', 0) > cutoff}
            except Exception:
                pass
            return res_data

        # Get all website domains and IDs owned by user (from both websites and wordpress_sites)
        user_sites = list(self.db.websites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        user_domains = []
        user_site_ids = []

        for w in user_sites:
            if w.get('_id'):
                user_site_ids.append(str(w['_id']))
            for key in ('domain', 'url', 'name'):
                val = w.get(key)
                if val and isinstance(val, str):
                    clean_val = val.replace('http://', '').replace('https://', '').strip().strip('/').split('/')[0]
                    if clean_val and clean_val not in user_domains:
                        user_domains.append(clean_val)
                    if val not in user_domains:
                        user_domains.append(val)

        wp_sites = list(self.db.wordpress_sites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        for wp in wp_sites:
            d = wp.get('domain')
            if d and d not in user_domains:
                user_domains.append(d)
            w_id = str(wp.get('_id')) if wp.get('_id') else None
            if w_id and w_id not in user_site_ids:
                user_site_ids.append(w_id)

        is_admin = user.get('is_admin') or user.get('role') in ('admin', 'super_admin')
        conditions = []
        if not is_admin:
            # Base strict user scope across user_id, owned website_ids and domains
            user_scope = [{'user_id': user_id_str}, {'user_id': user_id_obj}]
            if user_site_ids:
                user_scope.append({'website_id': {'$in': user_site_ids}})
                user_scope.append({'website_id': {'$in': [self._resolve_id(sid) for sid in user_site_ids if sid]}})
            if user_domains:
                user_scope.append({'domain': {'$in': user_domains}})
            conditions.append({'$or': user_scope})

        if website_id and website_id != 'all':
            target_ids = [website_id]
            target_domains = [website_id]
            target_site = None
            for s in user_sites + wp_sites:
                sid = str(s.get('_id', ''))
                sdom = s.get('domain', '')
                surl = s.get('url', '')
                if website_id in (sid, sdom, surl):
                    target_site = s
                    if sid:
                        target_ids.append(sid)
                    if sdom:
                        target_domains.append(sdom)
                    if surl:
                        target_domains.append(surl)

            # High-performance Remote Log Query Proxy:
            # Query the WordPress plugin directly for authentic local logs without loading the central MongoDB database!
            if target_site and (target_site.get('url') or target_site.get('domain')):
                raw_url = str(target_site.get('url') or target_site.get('domain') or '').strip().rstrip('/')
                site_url = ('https://' + raw_url) if not raw_url.startswith(('http://', 'https://')) else raw_url
                site_key = target_site.get('api_key') or ''
                try:
                    import requests
                    import urllib3
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                    remote_url = f"{site_url}/?waf_cloud_sync=1&action=get_logs&api_key={site_key}&site_token={site_key}"
                    req_params = {
                        'page': page,
                        'limit': per_page,
                        'per_page': per_page,
                        'search': search,
                        'ip': ip_filter,
                        'attack_type': attack_type,
                        'status': status_filter,
                        'date_from': date_from,
                        'date_to': date_to
                    }
                    headers = {
                        'Authorization': f'Bearer {site_key}',
                        'X-API-Key': site_key,
                        'User-Agent': 'MDefender-Cloud/2.0'
                    }
                    resp = None
                    try:
                        resp = requests.get(remote_url, params=req_params, headers=headers, timeout=6.0, verify=False)
                    except Exception:
                        if site_url.startswith('https://'):
                            clean_host = raw_url.replace('https://', '').replace('http://', '')
                            resp = requests.get(f"http://{clean_host}/?waf_cloud_sync=1&action=get_logs&api_key={site_key}&site_token={site_key}", params=req_params, headers=headers, timeout=6.0, verify=False)
                    if resp and resp.status_code == 200:
                        r_data = resp.json()
                        if isinstance(r_data, dict) and 'logs' in r_data and isinstance(r_data['logs'], list):
                            norm_logs = []
                            for idx, rl in enumerate(r_data['logs']):
                                st = str(rl.get('status') or rl.get('action') or 'allowed').lower()
                                is_b = (st in ('block', 'blocked', 'b'))
                                at = rl.get('attack_type') or ('Blocked Attack' if is_b else 'Clean Traffic')
                                norm_logs.append({
                                    'id': str(rl.get('id', idx)),
                                    'ip': rl.get('ip') or rl.get('source_ip', ''),
                                    'url': rl.get('url') or rl.get('endpoint', '/'),
                                    'domain': target_site.get('domain') or target_site.get('name') or 'localhost',
                                    'attack_type': at,
                                    'status': 'blocked' if is_b else 'allowed',
                                    'timestamp': str(rl.get('created_at') or rl.get('timestamp') or ''),
                                    'confidence': float(rl.get('confidence') or (0.95 if is_b else 0.0)),
                                    'method': rl.get('method', 'GET'),
                                    'user_agent': rl.get('user_agent', ''),
                                    'rule_matched': rl.get('rule_matched', ''),
                                    'country_code': rl.get('country_code', ''),
                                    'country': rl.get('country', ''),
                                })
                            tot = int(r_data.get('total', len(norm_logs)))
                            return _return_cached({
                                'total': tot,
                                'page': page,
                                'per_page': per_page,
                                'total_pages': int(r_data.get('total_pages', max(1, (tot + per_page - 1) // per_page))),
                                'logs': norm_logs,
                                'source': 'wordpress_live'
                            })
                    # Target site is connected: Return live clean broadcast state (never load old ghost logs from MongoDB)
                    return _return_cached({
                        'total': 0,
                        'page': page,
                        'per_page': per_page,
                        'total_pages': 1,
                        'logs': [],
                        'source': 'wordpress_live'
                    })
                except Exception as e:
                    return _return_cached({
                        'total': 0,
                        'page': page,
                        'per_page': per_page,
                        'total_pages': 1,
                        'logs': [],
                        'source': 'wordpress_live'
                    })

            conditions.append({'$or': [
                {'website_id': {'$in': target_ids}},
                {'website_id': {'$in': [self._resolve_id(tid) for tid in target_ids if tid]}},
                {'domain': {'$in': target_domains}},
                {'url': {'$in': target_domains}},
            ]})
        else:
            # Multi-Website Aggregated Query Proxy:
            # When viewing "All Websites", query all user's unique connected WordPress sites in parallel!
            # Zero database load on central MongoDB, completely lightweight and memory-efficient.
            unique_connected_sites = {}
            for s in (user_sites + wp_sites):
                raw_u = s.get('url') or s.get('domain')
                if not raw_u or not s.get('api_key'):
                    continue
                clean_k = str(raw_u).lower().strip().replace('http://', '').replace('https://', '').rstrip('/')
                if clean_k and clean_k not in unique_connected_sites:
                    unique_connected_sites[clean_k] = s

            connected_wp_sites = list(unique_connected_sites.values())
            if connected_wp_sites:
                import requests
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                from concurrent.futures import ThreadPoolExecutor, as_completed

                all_remote_logs = []
                total_remote_count = 0

                def fetch_single_site_logs(site):
                    raw_url = str(site.get('url') or site.get('domain') or '').strip().rstrip('/')
                    site_url = ('https://' + raw_url) if not raw_url.startswith(('http://', 'https://')) else raw_url
                    site_key = site.get('api_key') or ''
                    domain_name = site.get('domain') or site.get('name') or 'localhost'
                    try:
                        remote_url = f"{site_url}/?waf_cloud_sync=1&action=get_logs&api_key={site_key}&site_token={site_key}"
                        req_params = {
                            'page': 1,
                            'limit': 50,
                            'per_page': 50,
                            'search': search,
                            'ip': ip_filter,
                            'attack_type': attack_type,
                            'status': status_filter,
                            'date_from': date_from,
                            'date_to': date_to
                        }
                        headers = {
                            'Authorization': f'Bearer {site_key}',
                            'X-API-Key': site_key,
                            'User-Agent': 'MDefender-Cloud/2.0'
                        }
                        resp = None
                        try:
                            resp = requests.get(remote_url, params=req_params, headers=headers, timeout=6.0, verify=False)
                        except Exception:
                            if site_url.startswith('https://'):
                                clean_host = raw_url.replace('https://', '').replace('http://', '')
                                resp = requests.get(f"http://{clean_host}/?waf_cloud_sync=1&action=get_logs&api_key={site_key}&site_token={site_key}", params=req_params, headers=headers, timeout=6.0, verify=False)
                        if resp and resp.status_code == 200:
                            data = resp.json()
                            logs_list = data.get('logs', []) if isinstance(data, dict) else []
                            return logs_list, data.get('total', len(logs_list)), domain_name
                    except Exception:
                        pass
                    return [], 0, domain_name

                with ThreadPoolExecutor(max_workers=min(10, len(connected_wp_sites))) as executor:
                    futures = [executor.submit(fetch_single_site_logs, s) for s in connected_wp_sites]
                    for fut in as_completed(futures):
                        try:
                            s_logs, s_tot, s_dom = fut.result()
                            total_remote_count += s_tot
                            for idx, rl in enumerate(s_logs):
                                st = str(rl.get('status') or rl.get('action') or 'allowed').lower()
                                is_b = (st in ('block', 'blocked', 'b'))
                                at = rl.get('attack_type') or ('Blocked Attack' if is_b else 'Clean Traffic')
                                all_remote_logs.append({
                                    'id': str(rl.get('id', idx)),
                                    'ip': rl.get('ip') or rl.get('source_ip', ''),
                                    'url': rl.get('url') or rl.get('endpoint', '/'),
                                    'domain': s_dom,
                                    'attack_type': at,
                                    'status': 'blocked' if is_b else 'allowed',
                                    'timestamp': str(rl.get('created_at') or rl.get('timestamp') or ''),
                                    'confidence': float(rl.get('confidence') or (0.95 if is_b else 0.0)),
                                    'method': rl.get('method', 'GET'),
                                    'user_agent': rl.get('user_agent', ''),
                                    'rule_matched': rl.get('rule_matched', ''),
                                    'country_code': rl.get('country_code', ''),
                                    'country': rl.get('country', ''),
                                })
                        except Exception:
                            pass

                if all_remote_logs:
                    # Sort in memory by timestamp descending
                    all_remote_logs.sort(key=lambda x: str(x.get('timestamp', '')), reverse=True)
                    start_idx = (page - 1) * per_page
                    paged_logs = all_remote_logs[start_idx:start_idx + per_page]
                    tot = max(total_remote_count, len(all_remote_logs))
                    return _return_cached({
                        'total': tot,
                        'page': page,
                        'per_page': per_page,
                        'total_pages': max(1, (tot + per_page - 1) // per_page) if tot > 0 else 1,
                        'logs': paged_logs,
                        'source': 'wordpress_fleet_live'
                    })
                else:
                    return _return_cached({
                        'total': 0,
                        'page': page,
                        'per_page': per_page,
                        'total_pages': 1,
                        'logs': [],
                        'source': 'wordpress_fleet_live'
                    })
            else:
                return _return_cached({
                    'total': 0,
                    'page': page,
                    'per_page': per_page,
                    'total_pages': 1,
                    'logs': [],
                    'source': 'wordpress_fleet_live'
                })

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

        # 1. Check Ephemeral Live Stream Buffer (Zero MongoDB Bloat Real-Time Stream)
        live_stream_docs = []
        if website_id and website_id != 'all':
            target_ids_str = [str(tid) for tid in target_ids if tid]
            live_stream_docs = list(self.db.live_site_events.find({'website_id': {'$in': target_ids_str}}))
        else:
            live_stream_docs = list(self.db.live_site_events.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
            if not live_stream_docs and user_site_ids:
                live_stream_docs = list(self.db.live_site_events.find({'website_id': {'$in': user_site_ids}}))

        all_live_events = []
        for l_doc in live_stream_docs:
            for ev in l_doc.get('events', []):
                if status_filter:
                    st = str(ev.get('status') or ev.get('action') or '').lower()
                    if status_filter in ('block', 'blocked') and st not in ('block', 'blocked'):
                        continue
                    if status_filter in ('allow', 'allowed') and st not in ('allow', 'allowed'):
                        continue
                if attack_type and ev.get('attack_type') != attack_type:
                    continue
                if ip_filter and (ev.get('ip') != ip_filter and ev.get('source_ip') != ip_filter):
                    continue
                if search:
                    s_low = search.lower()
                    if s_low not in str(ev.get('ip', '')).lower() and s_low not in str(ev.get('url', '')).lower() and s_low not in str(ev.get('attack_type', '')).lower():
                        continue
                all_live_events.append(ev)

        if all_live_events:
            all_live_events.sort(key=lambda x: str(x.get('timestamp', '')), reverse=True)
            tot = len(all_live_events)
            start_idx = (page - 1) * per_page
            paged_logs = all_live_events[start_idx:start_idx + per_page]
            return _return_cached({
                'total': tot,
                'page': page,
                'per_page': per_page,
                'total_pages': max(1, (tot + per_page - 1) // per_page),
                'logs': paged_logs,
                'source': 'live_stream_buffer'
            })

        # Primary source: security_events (contains all requests: normal & blocked)
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

        site_domain_map = {}
        for s in user_sites:
            s_id = str(s.get('_id', ''))
            s_dom = s.get('domain') or s.get('name') or ''
            if s_id and s_dom:
                site_domain_map[s_id] = s_dom

        for wp in wp_sites:
            wp_id = str(wp.get('website_id') or wp.get('_id') or '')
            wp_dom = wp.get('domain') or ''
            if wp_id and wp_dom:
                site_domain_map[wp_id] = wp_dom

        result_logs = []
        for i, log in enumerate(logs):
            status_val = log.get('status') or log.get('action') or 'allowed'
            if str(status_val).lower() in ('block', 'blocked', 'b'):
                status_val = 'blocked'
            elif str(status_val).lower() in ('allow', 'allowed', 'pass', 'passed', 'a'):
                status_val = 'allowed'
            
            is_blocked = (status_val == 'blocked')
            raw_atype = log.get('attack_type')
            attack_type_str = raw_atype if raw_atype else ('Blocked Attack' if is_blocked else 'Clean Request')

            web_id = str(log.get('website_id', ''))
            domain_val = log.get('domain') or site_domain_map.get(web_id, '') or 'mahabubur.shop'

            result_logs.append({
                'id': str(log.get('_id', i)),
                'ip': log.get('source_ip') or log.get('ip', ''),
                'url': log.get('endpoint') or log.get('url', ''),
                'domain': domain_val,
                'attack_type': attack_type_str,
                'status': status_val,
                'timestamp': log['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if log.get('timestamp') and hasattr(log['timestamp'], 'strftime') else str(log.get('timestamp', '')),
                'confidence': log.get('confidence', 0.95 if is_blocked else 0.0),
                'method': log.get('method', 'GET'),
                'user_agent': log.get('user_agent', ''),
                'rule_matched': log.get('rule_matched', ''),
                'country_code': log.get('country_code') or log.get('countryCode') or '',
                'country': log.get('country') or log.get('country_name') or '',
            })
        return _return_cached({
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page if total > 0 else 1,
            'logs': result_logs,
        })

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

    def clean_user_logs(self, user, data=None):
        data = data or {}
        days_param = str(data.get('days', 'all')).strip().lower()
        stat_type = data.get('type') or data.get('stat_type', '')
        mode = data.get('mode', '')
        website_id = data.get('website_id', '')
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)

        self._stats_cache.clear()
        self._logs_cache.clear()

        user_sites = list(self.db.websites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        wp_sites = list(self.db.wordpress_sites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
        all_sites = user_sites + wp_sites
        user_domains = [w.get('domain') for w in all_sites if w.get('domain')]

        user_scope = [{'user_id': user_id_str}, {'user_id': user_id_obj}]
        if user_domains:
            user_scope.append({'domain': {'$in': user_domains}})
        
        conditions = [{'$or': user_scope}]

        if website_id and website_id != 'all':
            conditions.append({'$or': [{'website_id': website_id}, {'domain': website_id}]})

        now = datetime.now()
        time_desc = "all"
        if days_param == 'today' or mode == 'today' or stat_type == 'requests_today':
            today_start = datetime(now.year, now.month, now.day)
            conditions.append({'timestamp': {'$gte': today_start}})
            time_desc = "today's"
            days_param = 'today'
        elif days_param and days_param not in ('0', 'all'):
            try:
                days = int(days_param)
                if days > 0:
                    cutoff = now - timedelta(days=days)
                    conditions.append({'timestamp': {'$lt': cutoff}})
                    time_desc = f"older than {days} day{'s' if days > 1 else ''}"
            except ValueError:
                pass

        final_query = {'$and': conditions} if len(conditions) > 1 else conditions[0]

        try:
            r1 = self.db.security_events.delete_many(final_query)
            r2 = self.db.attacks.delete_many(final_query)
            r3 = self.db.requests.delete_many(final_query)
            try:
                self.db.live_site_events.delete_many(final_query)
                self.db.waf_events.delete_many(final_query)
                if not website_id or website_id == 'all':
                    self.db.live_site_events.delete_many({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]})
                    self.db.waf_events.delete_many({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]})
                    if user_site_ids:
                        self.db.live_site_events.delete_many({'website_id': {'$in': user_site_ids}})
                        self.db.waf_events.delete_many({'website_id': {'$in': user_site_ids}})
                else:
                    self.db.live_site_events.delete_many({'website_id': website_id})
                    self.db.waf_events.delete_many({'website_id': website_id})
            except Exception:
                pass
            total_deleted = r1.deleted_count + r2.deleted_count + r3.deleted_count

            # Remote fleet command: Dispatch log purge directly to connected WordPress sites
            wp_targets = []
            for s in all_sites:
                sid = str(s.get('_id', ''))
                sdom = s.get('domain', '')
                surl = s.get('url', '')
                if not website_id or website_id == 'all' or website_id in (sid, sdom, surl):
                    if s.get('url') or s.get('domain'):
                        wp_targets.append(s)

            remote_cleaned = 0
            import requests
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            for target in wp_targets:
                raw_u = str(target.get('url') or target.get('domain') or '').strip().rstrip('/')
                s_key = target.get('api_key') or ''
                if raw_u and s_key:
                    s_url = ('https://' + raw_u) if not raw_u.startswith(('http://', 'https://')) else raw_u
                    clean_endpoint = f"{s_url.rstrip('/')}/?waf_cloud_sync=1&action=clear_logs&api_key={s_key}&site_token={s_key}"
                    headers = {
                        'Authorization': f'Bearer {s_key}',
                        'X-API-Key': s_key,
                        'User-Agent': 'MDefender-Cloud/2.0'
                    }
                    clean_payload = {
                        'days': days_param,
                        'type': stat_type,
                        'action': 'clear_logs',
                        'api_key': s_key,
                        'site_token': s_key
                    }
                    try:
                        cr = None
                        try:
                            cr = requests.post(clean_endpoint, json=clean_payload, headers=headers, timeout=6.0, verify=False)
                        except Exception:
                            if s_url.startswith('https://'):
                                clean_host = raw_u.replace('https://', '').replace('http://', '')
                                cr = requests.post(f"http://{clean_host}/?waf_cloud_sync=1&action=clear_logs&api_key={s_key}&site_token={s_key}", json=clean_payload, headers=headers, timeout=6.0, verify=False)
                        if cr and cr.status_code == 200:
                            remote_cleaned += 1
                            # Update target site counters immediately
                            set_zero = {}
                            if stat_type == 'total_requests':
                                set_zero['total_requests'] = 0
                                set_zero['requests_today'] = 0
                            elif stat_type == 'total_blocked':
                                set_zero['total_blocked'] = 0
                                set_zero['blocked_today'] = 0
                            elif stat_type == 'requests_today' or days_param == 'today':
                                set_zero['requests_today'] = 0
                                set_zero['blocked_today'] = 0
                            else:
                                set_zero['total_requests'] = 0
                                set_zero['total_blocked'] = 0
                                set_zero['requests_today'] = 0
                                set_zero['blocked_today'] = 0
                            if set_zero:
                                self.db.websites.update_one({'_id': target['_id']}, {'$set': set_zero})
                    except Exception as e:
                        print(f"[Remote Log Purge] Error reaching {s_url}: {e}")

            msg_suffix = f" and remotely purged local database on {remote_cleaned} connected WordPress site(s)." if remote_cleaned > 0 else "."
            return {
                'status': 'success',
                'deleted': total_deleted,
                'remote_cleaned_sites': remote_cleaned,
                'message': f'Successfully cleared {time_desc} log record(s) from Central Dashboard{msg_suffix}'
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def get_log_recycle_settings(self, user, website_id=None):
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)
        site = None
        if website_id and website_id != 'all':
            site = self.db.websites.find_one({
                '$and': [
                    {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]},
                    {'$or': [{'_id': self._resolve_id(website_id)}, {'_id': website_id}, {'domain': website_id}]}
                ]
            })
        if not site:
            site = self.db.websites.find_one({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]})

        recycle_cfg = (site.get('log_recycle') if site else {}) or {}
        return {
            'status': 'success',
            'website_id': str(site['_id']) if site else None,
            'domain': site.get('domain') if site else '',
            'auto_recycle': recycle_cfg.get('auto_recycle', True),
            'max_logs': recycle_cfg.get('max_logs', 10000),
            'retention_days': recycle_cfg.get('retention_days', 7)
        }

    def update_log_recycle_settings(self, user, data=None):
        data = data or {}
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)
        website_id = data.get('website_id')

        auto_recycle = bool(data.get('auto_recycle', True))
        max_logs = int(data.get('max_logs', 10000))
        retention_days = int(data.get('retention_days', 7))

        site_query = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
        if website_id and website_id != 'all':
            site_query = {
                '$and': [
                    {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]},
                    {'$or': [{'_id': self._resolve_id(website_id)}, {'_id': website_id}, {'domain': website_id}]}
                ]
            }

        recycle_obj = {
            'auto_recycle': auto_recycle,
            'max_logs': max_logs,
            'retention_days': retention_days,
            'updated_at': datetime.now()
        }

        self.db.websites.update_many(site_query, {'$set': {'log_recycle': recycle_obj}})

        # Dispatch settings push to connected WordPress sites
        sites = list(self.db.websites.find(site_query))
        synced_count = 0
        for s in sites:
            s_url = s.get('url') or (f"http://{s.get('domain')}" if s.get('domain') else None)
            s_key = s.get('api_key') or ''
            if s_url and s_key:
                try:
                    import requests
                    push_url = f"{s_url.rstrip('/')}/?waf_cloud_sync=1&action=update_recycle_settings"
                    headers = {'Authorization': f'Bearer {s_key}', 'X-API-Key': s_key}
                    payload = {
                        'action': 'update_recycle_settings',
                        'auto_recycle': 'yes' if auto_recycle else 'no',
                        'max_logs': max_logs,
                        'retention_days': retention_days
                    }
                    resp = requests.post(push_url, json=payload, headers=headers, timeout=2.5)
                    if resp.status_code == 200:
                        synced_count += 1
                except Exception as e:
                    print(f"[Recycle Settings Push] Error {s_url}: {e}")

        return {
            'status': 'success',
            'message': f'Auto-recycle settings updated and synced to {synced_count} WordPress site(s).',
            'settings': recycle_obj
        }

    def reset_user_stats(self, user, data=None):
        data = data or {}
        website_id = data.get('website_id', 'all')
        stat_type = data.get('type') or data.get('stat_type', 'all')
        user_id_str = str(user['_id'])
        user_id_obj = self._resolve_id(user_id_str)

        try:
            self._stats_cache.clear()
            self._logs_cache.clear()

            site_filter = {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}
            if website_id and website_id != 'all':
                site_filter = {'$and': [
                    {'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]},
                    {'$or': [{'_id': website_id}, {'domain': website_id}, {'_id': self._resolve_id(website_id)}]}
                ]}

            # Delegate to clean_user_logs with the specific type
            if stat_type == 'requests_today':
                self.clean_user_logs(user, {'website_id': website_id, 'days': 'today', 'type': 'requests_today'})
                self.db.websites.update_many(site_filter, {'$set': {'requests_today': 0, 'blocked_today': 0}})
                msg = "Requests Today counter cleaned successfully."

            elif stat_type == 'total_requests':
                self.clean_user_logs(user, {'website_id': website_id, 'days': 'all', 'type': 'total_requests'})
                self.db.websites.update_many(site_filter, {'$set': {'total_requests': 0, 'requests_today': 0}})
                msg = "Total Lifetime Traffic counter cleaned successfully."

            elif stat_type == 'total_blocked':
                self.clean_user_logs(user, {'website_id': website_id, 'days': 'all', 'type': 'total_blocked'})
                self.db.websites.update_many(site_filter, {'$set': {'total_blocked': 0, 'blocked_today': 0}})
                msg = "Attacks Blocked counter cleaned successfully."

            else:
                self.clean_user_logs(user, {'website_id': website_id, 'days': 'all', 'type': 'all'})
                self.db.websites.update_many(
                    site_filter,
                    {'$set': {
                        'requests_today': 0,
                        'blocked_today': 0,
                        'total_requests': 0,
                        'total_blocked': 0,
                    }}
                )
                msg = "All dashboard statistics reset to 0 successfully."

            # Recalculate user document sum from current websites
            user_sites = list(self.db.websites.find({'$or': [{'user_id': user_id_str}, {'user_id': user_id_obj}]}))
            u_tot_req = sum(s.get('total_requests', 0) for s in user_sites)
            u_tot_blk = sum(s.get('total_blocked', 0) for s in user_sites)
            u_req_today = sum(s.get('requests_today', 0) for s in user_sites)
            u_blk_today = sum(s.get('blocked_today', 0) for s in user_sites)
            self.db.users.update_one(
                {'_id': user['_id']},
                {'$set': {
                    'total_requests': u_tot_req,
                    'total_blocked': u_tot_blk,
                    'requests_today': u_req_today,
                    'blocked_today': u_blk_today,
                    'updated_at': datetime.now()
                }}
            )

            return {'status': 'success', 'message': msg}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
