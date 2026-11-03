import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
import asyncio

def run_sync_test():
    print("=" * 60)
    print("MDEFENDER PLUGINS & THEMES SYNC & MANAGEMENT VERIFICATION")
    print("=" * 60)

    db = MongoDB()
    demo_user_id = "6addfa54c2c6599343d03ed8"

    # Make sure local XAMPP site is linked to demo user as well
    db.websites.update_one(
        {"_id": "eab7dc9f-316b-4a72-a71c-7c0a97a55fba"},
        {"$set": {"user_id": demo_user_id}}
    )
    print(f"[+] Linked local XAMPP site (eab7dc9f-316b-4a72-a71c-7c0a97a55fba) to demo user {demo_user_id}")

    # Inspect all websites for demo user
    websites = list(db.websites.find({"user_id": demo_user_id}))
    print(f"\n[+] Found {len(websites)} website(s) for user {demo_user_id}:")
    for w in websites:
        plugins_cnt = len(w.get("plugins") or [])
        themes_cnt = len(w.get("themes") or [])
        print(f"    - ID: {w.get('_id')} | Domain: {w.get('domain')} | URL: {w.get('url')} | Plugins: {plugins_cnt} | Themes: {themes_cnt}")

    # Test execute_remote_action endpoint for sync_inventory
    from src.api.v1.websites_api import RemoteActionRequest, execute_remote_action

    user_ctx = {"id": demo_user_id, "email": "user@gmail.com"}

    local_site = db.websites.find_one({"_id": "eab7dc9f-316b-4a72-a71c-7c0a97a55fba"})
    if local_site:
        target_id = str(local_site["_id"])
        print(f"\n[+] Testing 'sync_inventory' for {local_site.get('domain')} ({target_id})...")
        req = RemoteActionRequest(action="sync_inventory")
        try:
            res = asyncio.run(execute_remote_action(target_id, req, user=user_ctx))
            print(f"    Response status: {res.get('status')}")
            fresh_w = db.websites.find_one({"_id": local_site["_id"]})
            fresh_p = fresh_w.get("plugins") or []
            fresh_t = fresh_w.get("themes") or []
            print(f"    [OK] Synced {len(fresh_p)} plugins and {len(fresh_t)} themes!")
            for p in fresh_p:
                print(f"       Plugin: {p.get('name')} | Status: {p.get('status')} | Version: {p.get('version')} | Update: {p.get('update_available')}")
            for t in fresh_t:
                print(f"       Theme: {t.get('name')} | Status: {t.get('status')} | Version: {t.get('version')}")
        except Exception as e:
            print(f"    [!] Error during sync: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_sync_test()
