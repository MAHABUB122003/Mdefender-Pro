from src.database.mongodb_connection import MongoDB
from datetime import datetime, timedelta
import time

class IPFilter:
    def __init__(self):
        self.db = MongoDB()
        self._whitelist = set()

    _global_whitelist_set = None
    _global_whitelist_time = 0.0
    _global_blacklist_set = None
    _global_blacklist_time = 0.0

    @classmethod
    def _refresh_ip_sets(cls, db):
        now = time.time()
        # Refresh whitelist set every 300s in background
        if cls._global_whitelist_set is None or (now - cls._global_whitelist_time) > 300.0:
            try:
                wl_docs = list(db.whitelist.find({}, {"ip": 1}))
                cls._global_whitelist_set = {d.get("ip") for d in wl_docs if d.get("ip")}
                cls._global_whitelist_time = now
            except Exception:
                if cls._global_whitelist_set is None:
                    cls._global_whitelist_set = set()

        # Refresh blacklist set every 60s in background
        if cls._global_blacklist_set is None or (now - cls._global_blacklist_time) > 60.0:
            try:
                bl_docs = list(db.blacklist.find({}, {"ip": 1, "expires_at": 1}))
                now_dt = datetime.now()
                valid_bl = set()
                for d in bl_docs:
                    exp = d.get("expires_at")
                    if exp and exp < now_dt:
                        continue
                    if d.get("ip"):
                        valid_bl.add(d.get("ip"))
                cls._global_blacklist_set = valid_bl
                cls._global_blacklist_time = now
            except Exception:
                if cls._global_blacklist_set is None:
                    cls._global_blacklist_set = set()

    def is_blacklisted(self, ip, user_id=None):
        if not ip:
            return False
        ip = str(ip).strip()
        if self.is_whitelisted(ip):
            return False

        IPFilter._refresh_ip_sets(self.db)
        if IPFilter._global_blacklist_set and ip in IPFilter._global_blacklist_set:
            return True
        return False

    def add_to_blacklist(self, ip, duration_hours=None):
        if not ip:
            return
        ip = str(ip).strip()
        if IPFilter._global_blacklist_set is not None:
            IPFilter._global_blacklist_set.add(ip)
        try:
            existing = self.db.blacklist.find_one({'ip': ip})
            if not existing:
                expires_at = None if (duration_hours is None or duration_hours <= 0) else datetime.now() + timedelta(hours=duration_hours)
                self.db.blacklist.insert_one({
                    'ip': ip,
                    'reason': 'Auto-blocked by rate limiter',
                    'blocked_at': datetime.now(),
                    'type': 'permanent' if expires_at is None else 'temporary',
                    'expires_at': expires_at,
                    'auto_blocked': True
                })
        except Exception:
            pass

    def remove_from_blacklist(self, ip):
        if not ip:
            return
        ip = str(ip).strip()
        if IPFilter._global_blacklist_set is not None and ip in IPFilter._global_blacklist_set:
            IPFilter._global_blacklist_set.discard(ip)
        try:
            self.db.blacklist.delete_one({'ip': ip})
        except Exception:
            pass

    def auto_block(self, ip, reason='Suspicious activity', duration_hours=1):
        self.add_to_blacklist(ip, duration_hours)
        try:
            self.db.blacklist.update_one(
                {'ip': ip},
                {'$set': {'reason': reason, 'auto_blocked': True}}
            )
        except Exception:
            pass

    def add_to_whitelist(self, ip):
        ip = str(ip).strip()
        self._whitelist.add(ip)
        if IPFilter._global_whitelist_set is not None:
            IPFilter._global_whitelist_set.add(ip)

    def is_whitelisted(self, ip):
        if not ip:
            return False
        ip = str(ip).strip()
        if ip in self._whitelist or ip in ('127.0.0.1', '::1', 'localhost'):
            return True

        IPFilter._refresh_ip_sets(self.db)
        if IPFilter._global_whitelist_set and ip in IPFilter._global_whitelist_set:
            return True
        return False

    def get_blacklist(self):
        return list(self.db.blacklist.find().sort('blocked_at', -1))

    def get_ip_country(self, ip, headers=None, override_country=None):
        if override_country:
            cc = str(override_country).strip().upper()[:2]
            return {'country_code': cc, 'country_name': cc}

        # 1. Edge and CDN headers check (CF-IPCountry, X-Country-Code, etc.)
        if headers and isinstance(headers, dict):
            for hk in ('CF-IPCountry', 'cf-ipcountry', 'HTTP_CF_IPCOUNTRY',
                       'X-Country-Code', 'x-country-code', 'HTTP_X_COUNTRY_CODE',
                       'X-Country', 'x-country', 'HTTP_X_COUNTRY',
                       'X-Geo-Country', 'x-geo-country', 'HTTP_X_GEOIP_COUNTRY',
                       'CloudFront-Viewer-Country', 'cloudfront-viewer-country',
                       'GeoIP-Country-Code', 'geoip-country-code'):
                val = headers.get(hk)
                if val:
                    c_code = str(val).strip().upper()[:2]
                    if len(c_code) == 2 and c_code.isalpha() and c_code not in ('XX', 'T1'):
                        return {'country_code': c_code, 'country_name': c_code}

        # 2. Local network / loopback handling
        is_local = (not ip or ip in ('127.0.0.1', 'localhost', '::1', '0.0.0.0') or 
                    ip.startswith(('192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.')))
        
        if not hasattr(self, '_geo_cache'):
            self._geo_cache = {}

        now_ts = datetime.now().timestamp()

        if is_local:
            # Check if we have cached local server public country
            if '_LOCAL_SERVER_COUNTRY' in self._geo_cache:
                entry, exp = self._geo_cache['_LOCAL_SERVER_COUNTRY']
                if now_ts < exp:
                    return entry
            
            try:
                import requests
                r = requests.get("http://ip-api.com/json/?fields=status,country,countryCode", timeout=1.2)
                if r.status_code == 200:
                    data = r.json()
                    if data.get('status') == 'success' and data.get('countryCode'):
                        val = {
                            'country_code': str(data.get('countryCode')).upper(),
                            'country_name': data.get('country') or 'Bangladesh',
                            'is_local': True
                        }
                        self._geo_cache['_LOCAL_SERVER_COUNTRY'] = (val, now_ts + 86400)
                        return val
            except Exception:
                pass
            
            # Default fallback for local Bangladesh development
            local_val = {'country_code': 'BD', 'country_name': 'Bangladesh (Local)', 'is_local': True}
            self._geo_cache['_LOCAL_SERVER_COUNTRY'] = (local_val, now_ts + 3600)
            return local_val

        # 3. Cache lookup for public IP
        if ip in self._geo_cache:
            entry, exp = self._geo_cache[ip]
            if now_ts < exp:
                return entry

        # 4. Non-blocking asynchronous GeoIP resolution (never stalls active WAF request)
        def _resolve_bg(target_ip):
            try:
                import requests
                r = requests.get(f"http://ip-api.com/json/{target_ip}?fields=status,country,countryCode", timeout=1.0)
                if r.status_code == 200:
                    data = r.json()
                    if data.get('status') == 'success' and data.get('countryCode'):
                        val = {
                            'country_code': (data.get('countryCode') or '').upper(),
                            'country_name': data.get('country') or ''
                        }
                        self._geo_cache[target_ip] = (val, time.time() + 86400)
            except Exception:
                pass

        import threading
        threading.Thread(target=_resolve_bg, args=(ip,), daemon=True).start()
        # Immediately return placeholder so request latency is 0.001ms
        placeholder = {'country_code': 'UNKNOWN', 'country_name': 'Unknown'}
        self._geo_cache[ip] = (placeholder, now_ts + 5.0)
        return placeholder

    def has_active_country_blocks(self, user_id=None):
        """Ultra-fast check if any country block rules exist in the database (cached for 15s)."""
        now_ts = time.time()
        cache_key = str(user_id) if user_id else "global"
        if not hasattr(self, '_cb_has_cache'):
            self._cb_has_cache = {}
        cached, exp = self._cb_has_cache.get(cache_key, (None, 0))
        if now_ts < exp and cached is not None:
            return cached

        from bson import ObjectId
        query = {}
        if user_id:
            u_str = str(user_id)
            conds = [{'user_id': u_str}, {'added_by_user_id': u_str}, {'is_global': True}]
            if ObjectId.is_valid(u_str):
                conds.append({'user_id': ObjectId(u_str)})
                conds.append({'added_by_user_id': ObjectId(u_str)})
            query['$or'] = conds
        else:
            query['is_global'] = True
        
        try:
            count = self.db.country_blocks.count_documents(query, limit=1)
            has_blocks = (count > 0)
        except Exception:
            has_blocks = False
            
        self._cb_has_cache[cache_key] = (has_blocks, now_ts + 3600.0)
        return has_blocks

    def is_country_blocked(self, ip, user_id=None, headers=None, country_code=None):
        # FAST PATH: If no country blocking rules exist, skip GeoIP resolution entirely (0.001ms)
        if not country_code and not self.has_active_country_blocks(user_id):
            return False, {'country_code': 'UNKNOWN', 'country_name': 'Unknown'}

        geo = self.get_ip_country(ip, headers=headers, override_country=country_code)
        cc = (country_code or geo.get('country_code', '')).upper().strip()
        if not cc or cc in ('UNKNOWN',):
            return False, geo

        now_ts = time.time()
        cache_key_block = f"{user_id or ''}:{cc}"
        if not hasattr(self, '_cb_res_cache'):
            self._cb_res_cache = {}
        c_res, exp_res = self._cb_res_cache.get(cache_key_block, (None, 0))
        if now_ts < exp_res and c_res is not None:
            return c_res, geo
        
        from bson import ObjectId
        # Support case-insensitive / regex or direct upper/lower match
        code_candidates = [cc, cc.lower(), cc.upper()]
        
        query = {'country_code': {'$in': code_candidates}}
        if user_id:
            u_str = str(user_id)
            or_conditions = [
                {'user_id': u_str},
                {'added_by_user_id': u_str},
                {'is_global': True},
            ]
            if ObjectId.is_valid(u_str):
                or_conditions.append({'user_id': ObjectId(u_str)})
                or_conditions.append({'added_by_user_id': ObjectId(u_str)})
            query['$or'] = or_conditions
        else:
            query['is_global'] = True
            
        entry = self.db.country_blocks.find_one(query)
        if entry:
            self._cb_res_cache[cache_key_block] = (True, now_ts + 3600.0)
            return True, {
                'country_code': cc,
                'country_name': entry.get('country_name') or geo.get('country_name', cc),
                'reason': entry.get('reason', f'Country {cc} restricted by policy')
            }
        self._cb_res_cache[cache_key_block] = (False, now_ts + 3600.0)
        return False, geo
