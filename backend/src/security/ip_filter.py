from src.database.mongodb_connection import MongoDB
from datetime import datetime, timedelta

class IPFilter:
    def __init__(self):
        self.db = MongoDB()
        self._whitelist = set()

    def is_blacklisted(self, ip, user_id=None):
        if not ip:
            return False
        ip = str(ip).strip()
        from bson import ObjectId
        
        candidates = [ip]
        if ip in ('127.0.0.1', '::1', '0.0.0.0', 'localhost'):
            candidates = ['127.0.0.1', '::1', '0.0.0.0', 'localhost']

        ip_cond = {'ip': {'$in': candidates}} if len(candidates) > 1 else {'ip': ip}
        query = ip_cond
        if user_id:
            u_str = str(user_id)
            user_doc = None
            if ObjectId.is_valid(u_str):
                user_doc = self.db.users.find_one({'_id': ObjectId(u_str)})
            elif u_str:
                user_doc = self.db.users.find_one({'$or': [{'_id': u_str}, {'id': u_str}]})
            u_email = user_doc.get('email', '') if user_doc else ''

            or_conditions = [
                {'added_by_user_id': u_str},
                {'user_id': u_str},
                {'is_global': True},
                {'added_by_user_id': {'$exists': False}},
                {'added_by_user_id': None},
            ]
            if u_email:
                or_conditions.append({'added_by': u_email})
            if ObjectId.is_valid(u_str):
                or_conditions.append({'added_by_user_id': ObjectId(u_str)})
                or_conditions.append({'user_id': ObjectId(u_str)})
            query = {
                '$and': [
                    ip_cond,
                    {'$or': or_conditions}
                ]
            }
        entry = self.db.blacklist.find_one(query)
        if not entry:
            return False
        expires_at = entry.get('expires_at')
        if expires_at is not None and hasattr(expires_at, '__gt__') and expires_at < datetime.now():
            self.db.blacklist.delete_one({'_id': entry['_id']})
            return False
        return True

    def add_to_blacklist(self, ip, duration_hours=None):
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

    def remove_from_blacklist(self, ip):
        self.db.blacklist.delete_one({'ip': ip})

    def auto_block(self, ip, reason='Suspicious activity', duration_hours=1):
        self.add_to_blacklist(ip, duration_hours)
        self.db.blacklist.update_one(
            {'ip': ip},
            {'$set': {'reason': reason, 'auto_blocked': True}}
        )

    def add_to_whitelist(self, ip):
        self._whitelist.add(ip)

    def is_whitelisted(self, ip):
        if ip in self._whitelist:
            return True
        entry = self.db.whitelist.find_one({'ip': ip})
        if entry:
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

        # 4. Multi-provider GeoIP Resolution
        # Provider 1: ip-api.com
        try:
            import requests
            r = requests.get(f"http://ip-api.com/json/{ip}?fields=status,country,countryCode", timeout=1.5)
            if r.status_code == 200:
                data = r.json()
                if data.get('status') == 'success' and data.get('countryCode'):
                    val = {
                        'country_code': (data.get('countryCode') or '').upper(),
                        'country_name': data.get('country') or ''
                    }
                    self._geo_cache[ip] = (val, now_ts + 86400)
                    return val
        except Exception:
            pass

        # Provider 2: ipwhois.app
        try:
            import requests
            r2 = requests.get(f"https://ipwhois.app/json/{ip}", timeout=1.5)
            if r2.status_code == 200:
                data2 = r2.json()
                if data2.get('success') and data2.get('country_code'):
                    val2 = {
                        'country_code': (data2.get('country_code') or '').upper(),
                        'country_name': data2.get('country') or ''
                    }
                    self._geo_cache[ip] = (val2, now_ts + 86400)
                    return val2
        except Exception:
            pass

        # Provider 3: ipapi.co
        try:
            import requests
            r3 = requests.get(f"https://ipapi.co/{ip}/json/", timeout=1.5)
            if r3.status_code == 200:
                data3 = r3.json()
                if data3.get('country_code'):
                    val3 = {
                        'country_code': (data3.get('country_code') or '').upper(),
                        'country_name': data3.get('country_name') or ''
                    }
                    self._geo_cache[ip] = (val3, now_ts + 86400)
                    return val3
        except Exception:
            pass

        return {'country_code': 'UNKNOWN', 'country_name': 'Unknown'}

    def is_country_blocked(self, ip, user_id=None, headers=None, country_code=None):
        geo = self.get_ip_country(ip, headers=headers, override_country=country_code)
        cc = (country_code or geo.get('country_code', '')).upper().strip()
        if not cc or cc in ('UNKNOWN',):
            return False, geo
        
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
            return True, {
                'country_code': cc,
                'country_name': entry.get('country_name') or geo.get('country_name', cc),
                'reason': entry.get('reason', f'Country {cc} restricted by policy')
            }
        return False, geo
