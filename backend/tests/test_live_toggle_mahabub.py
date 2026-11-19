import sys
import os
import urllib.request
import urllib.error

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService

def run_test():
    db = MongoDB()
    slot_service = LicenseSlotService(db)

    user = db.users.find_one({'email': 'rahmanmdmahabubur575@gmail.com'})
    assert user, "User rahmanmdmahabubur575@gmail.com not found"
    u_id = str(user['_id'])

    website = db.websites.find_one({'user_id': u_id, 'domain': 'localhost/mahabub'})
    if not website:
        website = db.websites.find_one({'domain': 'localhost/mahabub'})
    assert website, "Website localhost/mahabub not found"
    w_id = str(website['_id'])

    print(f"=== Testing Real-Time Protection Toggle on {website.get('url')} ===")
    print(f"User ID: {u_id}, Website ID: {w_id}")

    def send_attack():
        url = 'http://localhost/mahabub/?id=1%27%20OR%201=1--'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 MDefender-Test'})
            res = urllib.request.urlopen(req, timeout=3)
            return res.status
        except urllib.error.HTTPError as e:
            return e.code
        except Exception as e:
            return str(e)

    # Step 1: Ensure Protection ON
    print("\n[Step 1] Setting site protection ON...")
    slot_service.assign_slot(u_id, w_id)
    code1 = send_attack()
    print(f"Attack response code with Protection ON: {code1}")
    assert code1 == 403, f"Expected 403 Forbidden when ON, got {code1}"
    print(">>> PASS: Attack successfully blocked (HTTP 403)")

    # Step 2: Toggle Protection OFF (Release Slot)
    print("\n[Step 2] Toggling protection OFF (Releasing slot / Protection Paused)...")
    ok, msg = slot_service.release_slot(u_id, w_id)
    print(f"Release slot result: ok={ok}, msg={msg}")
    code2 = send_attack()
    print(f"Attack response code with Protection OFF: {code2}")
    assert code2 == 200, f"Expected 200 OK when Protection Paused, got {code2}"
    print(">>> PASS: Protection paused, traffic passes through safely (HTTP 200)")

    # Step 3: Toggle Protection ON (Assign Slot)
    print("\n[Step 3] Toggling protection ON (Re-assigning slot / Protection Resumed)...")
    ok, msg = slot_service.assign_slot(u_id, w_id)
    print(f"Assign slot result: ok={ok}, msg={msg}")
    code3 = send_attack()
    print(f"Attack response code with Protection ON: {code3}")
    assert code3 == 403, f"Expected 403 Forbidden after turning ON, got {code3}"
    print(">>> PASS: Protection resumed, attack blocked (HTTP 403)")

    # Step 4: Test Atomic Slot Swap
    print("\n[Step 4] Testing Atomic Slot Swap...")
    # Create or get dummy site
    dummy_doc = db.websites.find_one({"user_id": u_id, "domain": "store2.local"})
    if not dummy_doc:
        ins = db.websites.insert_one({
            "user_id": u_id,
            "domain": "store2.local",
            "url": "http://store2.local",
            "platform": "wordpress",
            "is_licensed": False,
            "license_status": "unlicensed",
            "protection_paused": False
        })
        dummy_id = str(ins.inserted_id)
    else:
        dummy_id = str(dummy_doc["_id"])

    # Swap: release mahabub, assign store2
    ok_sw, msg_sw = slot_service.swap_slot(u_id, release_website_id=w_id, assign_website_id=dummy_id)
    print(f"Swap (Mahabub -> Store2) result: ok={ok_sw}, msg={msg_sw}")
    assert ok_sw is True, f"Swap failed: {msg_sw}"
    code_after_swap = send_attack()
    print(f"Attack response on Mahabub after swap (should be paused): {code_after_swap}")
    assert code_after_swap == 200, f"Expected 200 after swap, got {code_after_swap}"

    # Swap back: release store2, assign mahabub
    ok_back, msg_back = slot_service.swap_slot(u_id, release_website_id=dummy_id, assign_website_id=w_id)
    print(f"Swap back (Store2 -> Mahabub) result: ok={ok_back}, msg={msg_back}")
    assert ok_back is True, f"Swap back failed: {msg_back}"
    code_restored = send_attack()
    print(f"Attack response on Mahabub after swap back (should be blocked): {code_restored}")
    assert code_restored == 403, f"Expected 403 after restoring, got {code_restored}"

    # Clean up dummy site
    db.websites.delete_one({"_id": dummy_doc["_id"] if dummy_doc else None})

    print("\n=======================================================")
    print("SUCCESS! ALL LIVE WORDPRESS TOGGLE & SWAP TESTS PASSED!")
    print("=======================================================")

if __name__ == '__main__':
    run_test()
