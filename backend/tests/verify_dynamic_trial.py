import sys
sys.path.insert(0, 'backend')
from src.database.mongodb_connection import MongoDB
from src.services.plan_service import PlanService
from src.services.license_slot_service import LicenseSlotService
from datetime import datetime, timezone, timedelta
from bson import ObjectId

def run():
    db = MongoDB()
    ps = PlanService(db)
    ls = LicenseSlotService(db)

    print('=== TEST 1: SET DYNAMIC TRIAL TO 60 DAYS ===')
    cfg = ps.get_dynamic_pricing_config()
    cfg['trial_days'] = 60
    ps.save_dynamic_pricing_config(cfg)
    assert ps.get_dynamic_pricing_config()['trial_days'] == 60
    print('[PASS] Config updated to 60 days')

    test_user = {
        '_id': ObjectId(),
        'email': 'qa_dyn_trial_verification@test.io',
        'role': 'user',
        'plan': 'free',
        'is_paid': False,
        'created_at': datetime.now(timezone.utc) - timedelta(days=5),
        'payment_status': 'trialing'
    }
    db.users.insert_one(test_user)
    ps.save_dynamic_pricing_config(cfg)

    u_db = db.users.find_one({'_id': test_user['_id']})
    state = ls.resolve_user_license_state(u_db)
    print(f"[PASS] User created 5 days ago under 60d trial: remaining = {state['trial_days_remaining']}")
    assert state['trial_days_remaining'] == 55

    print('=== TEST 2: ADMIN SWITCHES TRIAL TO 30 DAYS ===')
    cfg['trial_days'] = 30
    ps.save_dynamic_pricing_config(cfg)
    u_db = db.users.find_one({'_id': test_user['_id']})
    state = ls.resolve_user_license_state(u_db)
    print(f"[PASS] User under 30d trial: remaining = {state['trial_days_remaining']}")
    assert state['trial_days_remaining'] == 25

    print('=== TEST 3: RESTORE TO 60 DAYS AS CONFIGURED BY ADMIN ===')
    cfg['trial_days'] = 60
    ps.save_dynamic_pricing_config(cfg)
    u_db = db.users.find_one({'_id': test_user['_id']})
    state = ls.resolve_user_license_state(u_db)
    print(f"[PASS] Restored to 60d: remaining = {state['trial_days_remaining']}")
    assert state['trial_days_remaining'] == 55

    db.users.delete_one({'_id': test_user['_id']})
    print('=== ALL DYNAMIC TRIAL LIFECYCLE TESTS VERIFIED 100% ===')

if __name__ == '__main__':
    run()
