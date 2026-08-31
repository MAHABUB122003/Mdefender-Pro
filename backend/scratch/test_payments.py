import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.database.mongodb_connection import MongoDB
from src.services.payment_service import PaymentService
from src.services.bkash_service import BkashService

def main():
    print("=== Testing MDefender Pro 1-Click Privacy-Secured Payment Gateway ===")
    db = MongoDB()
    pay_service = PaymentService(db)
    bkash_service = BkashService(db)

    # 1. Config Test
    bkash_config = bkash_service.get_bkash_config()
    print("[1] bKash Config (Zero phone exposure):", bkash_config)
    assert "merchant_number" not in bkash_config
    assert bkash_config["usd_to_bdt_rate"] == 120

    # 2. Test User
    test_user = db.users.find_one({"email": "testuser@mdefender.pro"})
    if not test_user:
        res = db.users.insert_one({
            "email": "testuser@mdefender.pro",
            "full_name": "Test Payment User",
            "plan": "free"
        })
        test_user = db.users.find_one({"_id": res.inserted_id})

    print("[2] Test User:", test_user["email"])

    # 3. Test 1-Click bKash Payment & Activation
    bkash_res = bkash_service.create_checkout_payment(test_user, plan_id="pro", billing_cycle="monthly")
    print("[3] 1-Click bKash Payment Result:", bkash_res["status"], "- Invoice:", bkash_res.get("invoice_id"))
    assert bkash_res["status"] == "success"
    assert bkash_res.get("amount_bdt") == 3480.0

    # Verify user in database
    updated_user = db.users.find_one({"_id": test_user["_id"]})
    print("    Updated User Plan:", updated_user.get("plan"), "- Expires:", updated_user.get("plan_expires"))
    assert updated_user.get("plan") == "premium"

    # 4. Test Stripe Checkout Session Creation
    stripe_session = pay_service.create_stripe_checkout_session(test_user, plan_id="pro", billing_cycle="yearly")
    print("[4] Stripe Session Creation:", stripe_session["status"], "- URL:", stripe_session.get("checkout_url"))
    assert stripe_session["status"] == "success"

    # 5. Payment History Retrieval
    history = pay_service.get_user_payment_history(test_user)
    print(f"[5] Retrieved {len(history)} Total Invoices from DB.")
    for h in history[:3]:
        print(f"    - {h['invoice_id']} | ${h['amount']} USD | {h['payment_method']} | {h['status']}")

    print("\nALL 1-CLICK BKASH & STRIPE PAYMENT GATEWAY TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    main()
