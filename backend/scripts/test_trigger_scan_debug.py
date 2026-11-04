import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
import asyncio

def run():
    db = MongoDB()
    demo_user_id = "6addfa54c2c6599343d03ed8"
    user_ctx = {"id": demo_user_id, "email": "user@gmail.com"}

    from src.api.v1.websites_api import WebsiteScanTriggerRequest, trigger_website_scan, get_website_scans

    # Let's inspect all sites owned by demo user
    sites = list(db.websites.find({"user_id": demo_user_id}))
    print(f"Total sites: {len(sites)}")

    for s in sites:
        site_id = str(s["_id"])
        print(f"\n=======================================================")
        print(f"Testing Scan Trigger for: {s.get('domain')} (ID: {site_id}, URL: {s.get('url')})")
        print(f"=======================================================")
        
        req = WebsiteScanTriggerRequest(scan_type="quick")
        try:
            res = asyncio.run(trigger_website_scan(site_id, req, user=user_ctx))
            print(f"Trigger Response Status: {res.get('status')}")
            print(f"Data status: {res.get('data', {}).get('status')}")
            print(f"Message: {res.get('data', {}).get('message')}")
            print(f"Findings count: {len(res.get('data', {}).get('findings', []))}")
            if res.get('data', {}).get('findings'):
                for f in res.get('data', {}).get('findings')[:3]:
                    print(f"  - [{f.get('severity')}] {f.get('threat_name')} ({f.get('file')})")
        except Exception as e:
            print(f"[-] Scan Trigger Exception: {e}")
            import traceback
            traceback.print_exc()

        # Check get_website_scans
        try:
            scans_res = asyncio.run(get_website_scans(site_id, limit=5, user=user_ctx))
            scans = scans_res.get("data", {}).get("scans", [])
            print(f"get_website_scans count: {len(scans)}")
            if scans:
                latest = scans[0]
                print(f"Latest scan status: {latest.get('status')}, score: {latest.get('score')}, issues: {latest.get('issues_found')}")
        except Exception as e:
            print(f"[-] get_website_scans Exception: {e}")

if __name__ == "__main__":
    run()

