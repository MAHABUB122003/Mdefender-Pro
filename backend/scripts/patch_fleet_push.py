import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'main.py')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize line endings for replacement
norm_content = content.replace('\r\n', '\n')

old_func = '''def push_to_fleet_async(target_sites, payload):
    """
    Ultra-Fast Non-Blocking Asynchronous Edge Dispatcher.
    Pushes blacklist/country rules to WordPress nodes concurrently in background (< 15ms frontend latency).
    """
    if not target_sites:
        return

    def _worker():
        import requests
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        for s in target_sites:
            raw_url = str(s.get('url') or s.get('domain') or '').strip().rstrip('/')
            site_url = ('https://' + raw_url) if not raw_url.startswith(('http://', 'https://')) else raw_url
            site_key = s.get('api_key') or ''
            headers = {
                'Authorization': f'Bearer {site_key}',
                'X-API-Key': site_key,
                'Content-Type': 'application/json',
                'User-Agent': 'MDefender-Cloud/2.0'
            }
            remote_url = f"{site_url}/?waf_cloud_sync=1"
            try:
                requests.post(remote_url, json=payload, headers=headers, timeout=1.5, verify=False)
            except Exception:
                if site_url.startswith('https://'):
                    clean_host = raw_url.replace('https://', '').replace('http://', '')
                    try:
                        requests.post(f"http://{clean_host}/?waf_cloud_sync=1", json=payload, headers=headers, timeout=1.5, verify=False)
                    except Exception:
                        pass

    import threading
    t = threading.Thread(target=_worker, daemon=True)
    t.start()'''

new_func = '''def push_to_fleet_async(target_sites, payload, full_sync=True):
    """
    Ultra-Fast Non-Blocking Asynchronous Edge Dispatcher.
    Pushes blacklist/country rules to WordPress nodes concurrently in background (< 15ms frontend latency).
    Transmits both incremental actions and full synchronized state, with headers and query fallbacks.
    """
    if not target_sites:
        return

    def _worker():
        import requests
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        active_countries = []
        active_ips = []
        if full_sync:
            try:
                for item in db.country_blocks.find():
                    cc = (item.get('country_code') or '').strip().upper()
                    if cc and len(cc) == 2 and cc not in active_countries:
                        active_countries.append(cc)

                now_dt = datetime.now()
                for item in db.blacklist.find():
                    ip_v = (item.get('ip') or '').strip()
                    if not ip_v or ip_v in ('127.0.0.1', '::1', '0.0.0.0', 'localhost'):
                        continue
                    exp = item.get('expires_at')
                    if exp and isinstance(exp, datetime) and exp <= now_dt:
                        continue
                    if ip_v not in active_ips:
                        active_ips.append(ip_v)
            except Exception:
                active_countries = []
                active_ips = []

        for s in target_sites:
            raw_url = str(s.get('url') or s.get('domain') or '').strip().rstrip('/')
            site_url = ('https://' + raw_url) if not raw_url.startswith(('http://', 'https://')) else raw_url
            site_key = s.get('api_key') or ''
            headers = {
                'Authorization': f'Bearer {site_key}',
                'X-API-Key': site_key,
                'Content-Type': 'application/json',
                'User-Agent': 'MDefender-Cloud/2.0'
            }
            # Include api_key and site_token in query string in case LiteSpeed/Apache strips Authorization headers
            remote_url = f"{site_url}/?waf_cloud_sync=1&api_key={site_key}&site_token={site_key}"

            send_payload = dict(payload)
            send_payload['api_key'] = site_key
            send_payload['site_token'] = site_key
            if full_sync:
                send_payload['blocked_countries'] = active_countries
                send_payload['blacklist'] = active_ips

            try:
                requests.post(remote_url, json=send_payload, headers=headers, timeout=8.0, verify=False)
            except Exception:
                if site_url.startswith('https://'):
                    clean_host = raw_url.replace('https://', '').replace('http://', '')
                    try:
                        requests.post(f"http://{clean_host}/?waf_cloud_sync=1&api_key={site_key}&site_token={site_key}", json=send_payload, headers=headers, timeout=8.0, verify=False)
                    except Exception:
                        pass

    import threading
    t = threading.Thread(target=_worker, daemon=True)
    t.start()'''

if old_func in norm_content:
    norm_content = norm_content.replace(old_func, new_func)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(norm_content)
    print("SUCCESS: push_to_fleet_async patched in main.py")
else:
    print("FAILED: old_func pattern not found in main.py")

