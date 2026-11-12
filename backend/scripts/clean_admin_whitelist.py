import sys
sys.path.insert(0, 'backend')
from src.database.mongodb_connection import MongoDB

db = MongoDB()

for s in db.websites.find():
    wl = s.get('admin_ip_whitelist') or []
    if s.get('admin_ip_whitelist_enabled') and (not wl or wl == ['127.0.0.1']):
        print('Disabling admin_ip_whitelist_enabled on website:', s.get('domain'), s.get('_id'))
        db.websites.update_one({'_id': s['_id']}, {'$set': {'admin_ip_whitelist_enabled': False, 'admin_ip_whitelist': []}})

for wp in db.wordpress_sites.find():
    wl = wp.get('admin_ip_whitelist') or []
    harden = wp.get('hardening') or {}
    if isinstance(harden, str):
        import json
        try:
            harden = json.loads(harden)
        except Exception:
            harden = {}
    if harden.get('admin_ip_whitelist_enabled') and (not harden.get('admin_ip_whitelist') or harden.get('admin_ip_whitelist') == ['127.0.0.1']):
        print('Disabling admin_ip_whitelist_enabled on wp_site:', wp.get('domain'), wp.get('_id'))
        harden['admin_ip_whitelist_enabled'] = False
        harden['admin_ip_whitelist'] = []
        db.wordpress_sites.update_one({'_id': wp['_id']}, {'$set': {'admin_ip_whitelist_enabled': False, 'admin_ip_whitelist': [], 'hardening': harden}})

print('Completed cleanup successfully.')

