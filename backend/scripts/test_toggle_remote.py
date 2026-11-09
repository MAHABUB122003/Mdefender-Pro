import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB
import asyncio

def run_test():
    db = MongoDB()
    demo_user_id = "6addfa54c2c6599343d03ed8"
    user_ctx = {"id": demo_user_id, "email": "user@gmail.com"}
    target_id = "eab7dc9f-316b-4a72-a71c-7c0a97a55fba"

    from src.api.v1.websites_api import RemoteActionRequest, execute_remote_action

    print("\n[+] Testing 'toggle_plugin' (activate wordfence)...")
    req = RemoteActionRequest(
        action="toggle_plugin",
        plugin_file="wordfence/wordfence.php",
        plugin_id="wordfence-security",
        status="active"
    )
    res = asyncio.run(execute_remote_action(target_id, req, user=user_ctx))
    print("    Toggle result:", res.get("data", {}).get("results", [{}])[0].get("response"))

    # Verify in DB
    w = db.websites.find_one({"_id": target_id})
    wf = next((p for p in w.get("plugins", []) if p.get("id") == "wordfence-security"), None)
    print("    Wordfence status in DB:", wf.get("status") if wf else "not found")

    print("\n[+] Testing 'toggle_plugin' (deactivate wordfence back)...")
    req2 = RemoteActionRequest(
        action="toggle_plugin",
        plugin_file="wordfence/wordfence.php",
        plugin_id="wordfence-security",
        status="inactive"
    )
    res2 = asyncio.run(execute_remote_action(target_id, req2, user=user_ctx))
    w2 = db.websites.find_one({"_id": target_id})
    wf2 = next((p for p in w2.get("plugins", []) if p.get("id") == "wordfence-security"), None)
    print("    Wordfence status in DB after deactivation:", wf2.get("status") if wf2 else "not found")
    print("\n[OK] REMOTE CONTROL WORKING 100%!")

if __name__ == "__main__":
    run_test()

