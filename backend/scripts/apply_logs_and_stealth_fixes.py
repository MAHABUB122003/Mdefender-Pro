import os
import re

print("Starting MDefender-Pro stealth and zero-log patches...")

# -------------------------------------------------------------
# 1. PATCH backend/src/api/user_api.py
# -------------------------------------------------------------
user_api_path = os.path.join("backend", "src", "api", "user_api.py")
if os.path.exists(user_api_path):
    with open(user_api_path, "r", encoding="utf-8") as f:
        code = f.read()

    # A. Patch get_user_logs target site query
    old_target_block = '''                    remote_url = f"{site_url}/?waf_cloud_sync=1&action=get_logs"
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
                        resp = requests.get(remote_url, params=req_params, headers=headers, timeout=2.0, verify=False)
                    except Exception:
                        if site_url.startswith('https://'):
                            clean_host = raw_url.replace('https://', '').replace('http://', '')
                            resp = requests.get(f"http://{clean_host}/?waf_cloud_sync=1&action=get_logs", params=req_params, headers=headers, timeout=2.0, verify=False)
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
                except Exception as e:
                    # Gracefully fall back to MongoDB
                    pass'''

    new_target_block = '''                    remote_url = f"{site_url}/?waf_cloud_sync=1&action=get_logs&api_key={site_key}&site_token={site_key}"
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
                    })'''

    # Normalize CRLF for matching
    code_normalized = code.replace("\r\n", "\n")
    old_target_block_norm = old_target_block.replace("\r\n", "\n")
    if old_target_block_norm in code_normalized:
        code_normalized = code_normalized.replace(old_target_block_norm, new_target_block.replace("\r\n", "\n"))
        print("Patched target site query in user_api.py")
    else:
        print("Warning: old_target_block not matched in user_api.py")

    # B. Patch multi-site fleet live query in get_user_logs
    old_fleet_pattern = '''                    try:
                        remote_url = f"{site_url}/?waf_cloud_sync=1&action=get_logs"
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
                            resp = requests.get(remote_url, params=req_params, headers=headers, timeout=2.0, verify=False)
                        except Exception:
                            if site_url.startswith('https://'):
                                clean_host = raw_url.replace('https://', '').replace('http://', '')
                                resp = requests.get(f"http://{clean_host}/?waf_cloud_sync=1&action=get_logs", params=req_params, headers=headers, timeout=2.0, verify=False)
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
                    })'''

    new_fleet_pattern = '''                    try:
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
                })'''

    old_fleet_norm = old_fleet_pattern.replace("\r\n", "\n")
    if old_fleet_norm in code_normalized:
        code_normalized = code_normalized.replace(old_fleet_norm, new_fleet_pattern.replace("\r\n", "\n"))
        print("Patched fleet query in user_api.py")
    else:
        print("Warning: old_fleet_pattern not matched in user_api.py")

    # C. Patch clean_user_logs
    old_clean_block = '''        try:
            r1 = self.db.security_events.delete_many(final_query)
            r2 = self.db.attacks.delete_many(final_query)
            r3 = self.db.requests.delete_many(final_query)
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
                    clean_endpoint = f"{s_url.rstrip('/')}/?waf_cloud_sync=1&action=clear_logs"
                    headers = {
                        'Authorization': f'Bearer {s_key}',
                        'X-API-Key': s_key,
                        'User-Agent': 'MDefender-Cloud/2.0'
                    }
                    clean_payload = {
                        'days': days_param,
                        'type': stat_type,
                        'action': 'clear_logs'
                    }
                    try:
                        cr = None
                        try:
                            cr = requests.post(clean_endpoint, json=clean_payload, headers=headers, timeout=2.5, verify=False)
                        except Exception:
                            if s_url.startswith('https://'):
                                clean_host = raw_u.replace('https://', '').replace('http://', '')
                                cr = requests.post(f"http://{clean_host}/?waf_cloud_sync=1&action=clear_logs", json=clean_payload, headers=headers, timeout=2.5, verify=False)'''

    new_clean_block = '''        try:
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
                                cr = requests.post(f"http://{clean_host}/?waf_cloud_sync=1&action=clear_logs&api_key={s_key}&site_token={s_key}", json=clean_payload, headers=headers, timeout=6.0, verify=False)'''

    old_clean_norm = old_clean_block.replace("\r\n", "\n")
    if old_clean_norm in code_normalized:
        code_normalized = code_normalized.replace(old_clean_norm, new_clean_block.replace("\r\n", "\n"))
        print("Patched clean_user_logs in user_api.py")
    else:
        print("Warning: old_clean_block not matched in user_api.py")

    with open(user_api_path, "w", encoding="utf-8") as f:
        f.write(code_normalized)
    print("backend/src/api/user_api.py successfully saved.")

# -------------------------------------------------------------
# 2. PATCH backend/src/api/waf_api.py (Zero MongoDB Log Ingestion)
# -------------------------------------------------------------
waf_api_path = os.path.join("backend", "src", "api", "waf_api.py")
if os.path.exists(waf_api_path):
    with open(waf_api_path, "r", encoding="utf-8") as f:
        waf_code = f.read().replace("\r\n", "\n")

    # In async_save_logs: comment out attack and security event insertion
    old_insert = '''        try:
            self.db.attacks.insert_one(log_entry)
            if website_id:
                self.db.waf_events.insert_one(log_entry.copy())
        except Exception: pass

        try:
            self.db.security_events.insert_one(event)
        except Exception: pass'''

    new_insert = '''        # Zero-Bloat SaaS Architecture: Customer WordPress MySQL stores authentic local logs.
        # Zero attack/visitor logs are permanently stored in central MongoDB.
        pass'''

    if old_insert in waf_code:
        waf_code = waf_code.replace(old_insert, new_insert)
        print("Patched async_save_logs in waf_api.py")

    with open(waf_api_path, "w", encoding="utf-8") as f:
        f.write(waf_code)
    print("backend/src/api/waf_api.py successfully saved.")

# -------------------------------------------------------------
# 3. PATCH backend/src/api/v1/waf_api.py
# -------------------------------------------------------------
v1_waf_path = os.path.join("backend", "src", "api", "v1", "waf_api.py")
if os.path.exists(v1_waf_path):
    with open(v1_waf_path, "r", encoding="utf-8") as f:
        v1_code = f.read().replace("\r\n", "\n")

    # In ingest_telemetry_batch: remove live_site_events update
    old_live_stream = '''    # Ephemeral Live Stream Ring Buffer: Strictly capped to latest 50 events per website.
    # Zero persistent MongoDB log accumulation! Customer WordPress site stores full historical archive in MySQL.
    if live_stream_events:
        try:
            db.live_site_events.update_one(
                {"website_id": website_id_str},
                {
                    "$set": {
                        "website_id": website_id_str,
                        "user_id": user_id_str,
                        "domain": domain,
                        "updated_at": now
                    },
                    "$push": {
                        "events": {
                            "$each": live_stream_events,
                            "$sort": {"timestamp": -1},
                            "$slice": 50
                        }
                    }
                },
                upsert=True
            )
        except Exception:
            pass'''

    new_live_stream = '''    # Zero MongoDB Storage: Live stream logs are queried on-demand directly from WordPress MySQL.
    pass'''

    if old_live_stream in v1_code:
        v1_code = v1_code.replace(old_live_stream, new_live_stream)
        print("Patched live_site_events in v1/waf_api.py")

    # In store_event: remove insertions
    old_store_events = '''        if is_blocked or attack_type:
            db.security_events.insert_one(event)

        # Also store in attacks collection for unified user logs
        if is_blocked or attack_type:
            db.attacks.insert_one({
                "user_id": user_id_str,
                "website_id": website_id_str,
                "domain": domain,
                "ip": ip or "127.0.0.1",
                "url": req_data.get("url", "/"),
                "attack_type": attack_type or "Suspicious Request",
                "confidence": decision.get("confidence", 0.85),
                "status": "blocked",
                "timestamp": now,
                "method": req_data.get("method", "GET"),
                "user_agent": (req_data.get("headers") or {}).get("User-Agent", ""),
                "rule_matched": decision.get("reason", ""),
            })'''

    new_store_events = '''        # Zero MongoDB Storage: Customer WordPress MySQL stores authentic attack logs.
        pass'''

    if old_store_events in v1_code:
        v1_code = v1_code.replace(old_store_events, new_store_events)
        print("Patched store_event in v1/waf_api.py")

    with open(v1_waf_path, "w", encoding="utf-8") as f:
        f.write(v1_code)
    print("backend/src/api/v1/waf_api.py successfully saved.")

# -------------------------------------------------------------
# 4. PATCH backend/main.py (502 for Stealth Block in Cloud Proxy)
# -------------------------------------------------------------
main_py_path = os.path.join("backend", "main.py")
if os.path.exists(main_py_path):
    with open(main_py_path, "r", encoding="utf-8") as f:
        main_code = f.read().replace("\r\n", "\n")

    old_main_resp = '''        block_html = render_block_page(
            reference_id=decision.get('reference_id', 'N/A'),
            client_ip=claimed_ip,
            attack_type=decision.get('attack_type', 'Security Threat Blocked'),
            reason=f"Request blocked by MDefender Pro WAF (confidence: {decision.get('confidence', 0):.2f})",
            website_name=target_domain
        )
        return HTMLResponse(
            content=block_html,
            status_code=403,
            headers={
                "X-WAF-Eval-Time": f"{waf_eval_ms:.2f}ms",
                "X-WAF-Status": "BLOCKED"
            }
        )'''

    new_main_resp = '''        atk_type_str = str(decision.get('attack_type', '')).lower()
        is_stealth = any(k in atk_type_str for k in ['blacklist', 'country', 'geoip', 'geograph', 'probe'])
        block_html = render_block_page(
            reference_id=decision.get('reference_id', 'N/A'),
            client_ip=claimed_ip,
            attack_type=decision.get('attack_type', 'Security Threat Blocked'),
            reason=f"Request blocked by MDefender Pro WAF (confidence: {decision.get('confidence', 0):.2f})",
            website_name=target_domain
        )
        return HTMLResponse(
            content=block_html,
            status_code=502 if is_stealth else 403,
            headers={
                "X-WAF-Eval-Time": f"{waf_eval_ms:.2f}ms",
                "X-WAF-Status": "BLOCKED",
                "Connection": "close"
            }
        )'''

    if old_main_resp in main_code:
        main_code = main_code.replace(old_main_resp, new_main_resp)
        print("Patched block response status_code in main.py")

    with open(main_py_path, "w", encoding="utf-8") as f:
        f.write(main_code)
    print("backend/main.py successfully saved.")

print("All backend patches applied!")

# Patch v1/waf_api.py store_event
with open("backend/src/api/v1/waf_api.py", "r", encoding="utf-8") as f:
    v1_content = f.read().replace("\r\n", "\n")

old_store = """        # Zero-Bloat SaaS Architecture: Only save genuine attack and threat events in MongoDB.
        # Benign routine requests are kept on user WordPress website DB and only reflected in counters.
        if is_blocked or attack_type:
            db.security_events.insert_one(event)

        # Also store in attacks collection for unified user logs
        if is_blocked or attack_type:
            db.attacks.insert_one({
                "user_id": user_id_str,
                "website_id": website_id_str,
                "domain": domain,
                "ip": ip or "127.0.0.1",
                "url": req_data.get("url", "/"),
                "attack_type": attack_type or "Suspicious Request",
                "confidence": decision.get("confidence", 0.85),
                "status": "blocked",
                "timestamp": now,
                "method": req_data.get("method", "GET"),
                "user_agent": (req_data.get("headers") or {}).get("User-Agent", ""),
                "rule_matched": decision.get("reason", "ML/Rule Detection"),
                "reference_id": decision.get("reference_id"),
            })"""

new_store = """        # Zero MongoDB Storage: Authenticity is preserved on customer WordPress MySQL.
        # Zero attack/visitor logs are permanently stored in central MongoDB.
        pass"""

if old_store in v1_content:
    v1_content = v1_content.replace(old_store, new_store)
    with open("backend/src/api/v1/waf_api.py", "w", encoding="utf-8") as f:
        f.write(v1_content)
    print("Successfully patched store_event in v1/waf_api.py")
else:
    print("Warning: old_store not found in v1/waf_api.py")

# Patch remaining insertions in waf_api.py
with open("backend/src/api/waf_api.py", "r", encoding="utf-8") as f:
    waf_c = f.read().replace("\r\n", "\n")

old_p1 = """            try:
                self.db.attacks.insert_one(log_entry)
                if website_id:
                    self.db.waf_events.insert_one(log_entry.copy())
            except Exception:
                pass"""

new_p1 = """            # Zero MongoDB Storage: Customer WordPress MySQL stores authentic logs.
            pass"""

old_p2 = """        try:
            self.db.attacks.insert_one(log_entry)
            if website_id:
                self.db.waf_events.insert_one(log_entry.copy())
        except Exception:
            pass
            
        try:
            signals = decision.get("signals", {})
            detection_source = "combined"
            if signals.get("rule_matches"):
                detection_source = "rule"
            elif signals.get("ml_probability", 0) >= 0.6:
                detection_source = "ml"

            event = {
                "user_id": user_id or "",
                "website_id": website_id or "",
                "timestamp": datetime.now(),
                "source_ip": ip,
                "method": method,
                "endpoint": url,
                "attack_type": attack_type,
                "detection_source": detection_source,
                "risk_score": decision.get("risk_score", 0),
                "action": decision.get("action"),
                "status": decision.get("action"),
                "reference_id": decision.get("reference_id"),
                "user_agent": user_agent,
            }
            self.db.security_events.insert_one(event)
        except Exception:
            pass"""

new_p2 = """        # Zero MongoDB Storage: Authenticity is preserved on customer WordPress MySQL.
        pass"""

if old_p1 in waf_c:
    waf_c = waf_c.replace(old_p1, new_p1)
    print("Patched old_p1 in waf_api.py")

if old_p2 in waf_c:
    waf_c = waf_c.replace(old_p2, new_p2)
    print("Patched old_p2 in waf_api.py")

with open("backend/src/api/waf_api.py", "w", encoding="utf-8") as f:
    f.write(waf_c)
print("Updated waf_api.py successfully")
