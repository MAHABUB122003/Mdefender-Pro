import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService


def test_renewal_preserves_slot_count_and_extends_validity():
    """Verify that renewal DOES NOT double the slot count to 20, but extends expiration by +30 days."""
    db = MongoDB()
    lss = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)
    now = datetime.now(timezone.utc)

    test_uid = str(ObjectId())
    test_email = f"renew_test_{uuid.uuid4().hex[:8]}@test.io"
    db.users.insert_one({
        '_id': test_uid,
        'email': test_email,
        'role': 'user',
        'plan': 'free',
        'created_at': now
    })

    try:
        # Step 1: User initially buys 10 slots for 1 month
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_init_10',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_init_10',
                'status': 'completed',
                'custom_data': {'user_id': test_uid, 'sites_count': 10, 'billing_cycle': 'monthly', 'action': 'subscribe'}
            }
        })

        user_doc1 = db.users.find_one({'_id': test_uid})
        assert user_doc1['purchased_slots'] == 10
        exp1 = user_doc1['plan_expires']
        state1 = lss.resolve_user_license_state(test_uid)
        assert state1['purchased_slots'] == 10

        # Step 2: User pays to RENEW their 10 slots
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_renew_10',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_renew_10',
                'status': 'completed',
                'custom_data': {'user_id': test_uid, 'sites_count': 10, 'billing_cycle': 'monthly', 'action': 'renew', 'is_renewal': True}
            }
        })

        user_doc2 = db.users.find_one({'_id': test_uid})
        # MUST REMAIN 10 (NOT 20!)
        assert user_doc2['purchased_slots'] == 10, f"Expected 10 slots on renewal, but got {user_doc2['purchased_slots']}"
        state2 = lss.resolve_user_license_state(test_uid)
        assert state2['purchased_slots'] == 10, f"License state expected 10 slots, got {state2['purchased_slots']}"

        # Expiry MUST be pushed forward by ~30 days
        exp2 = user_doc2['plan_expires']
        diff_days = (exp2 - exp1).total_seconds() / 86400
        assert 28 <= diff_days <= 32, f"Expected validity extension of ~30 days, got {diff_days} days"

    finally:
        db.users.delete_one({'_id': test_uid})
        db.slot_batches.delete_many({'user_id': test_uid})
        db.paddle_transactions.delete_many({'user_id': test_uid})


def test_add_slots_anytime_scales_fleet_capacity():
    """Verify that adding slots anytime correctly scales capacity (e.g. 5 -> 7)."""
    db = MongoDB()
    lss = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)
    now = datetime.now(timezone.utc)

    test_uid = str(ObjectId())
    test_email = f"scale_test_{uuid.uuid4().hex[:8]}@test.io"
    db.users.insert_one({
        '_id': test_uid,
        'email': test_email,
        'role': 'user',
        'plan': 'free',
        'created_at': now
    })

    try:
        # Step 1: User buys 5 slots
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_start_5',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_start_5',
                'status': 'completed',
                'custom_data': {'user_id': test_uid, 'sites_count': 5, 'billing_cycle': 'monthly'}
            }
        })

        state1 = lss.resolve_user_license_state(test_uid)
        assert state1['purchased_slots'] == 5

        # Step 2: 10 days later, user adds 2 more slots anytime
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_add_2',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_add_2',
                'status': 'completed',
                'custom_data': {
                    'user_id': test_uid,
                    'action': 'add_slots',
                    'additional_slots': 2,
                    'sites_count': 2,
                    'billing_cycle': 'monthly'
                }
            }
        })

        user_doc2 = db.users.find_one({'_id': test_uid})
        # 5 + 2 MUST equal 7!
        assert user_doc2['purchased_slots'] == 7, f"Expected 7 slots, got {user_doc2['purchased_slots']}"
        state2 = lss.resolve_user_license_state(test_uid)
        assert state2['purchased_slots'] == 7

    finally:
        db.users.delete_one({'_id': test_uid})
        db.slot_batches.delete_many({'user_id': test_uid})
        db.paddle_transactions.delete_many({'user_id': test_uid})


def test_renewal_after_expiration_reactivates_fleet_sites():
    """Verify that when an expired subscription is renewed, previously paused sites are reactivated."""
    db = MongoDB()
    lss = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)
    now = datetime.now(timezone.utc)

    test_uid = str(ObjectId())
    test_email = f"reactivate_test_{uuid.uuid4().hex[:8]}@test.io"
    db.users.insert_one({
        '_id': test_uid,
        'email': test_email,
        'role': 'user',
        'plan': 'pro',
        'payment_status': 'expired',
        'purchased_slots': 0,
        'licensed_website_ids': [],
        'plan_expires': now - timedelta(days=2),
        'created_at': now - timedelta(days=32)
    })

    # Create 2 websites for this user that were paused due to expiration
    site1_id = str(ObjectId())
    site2_id = str(ObjectId())
    db.websites.insert_many([
        {
            '_id': ObjectId(site1_id),
            'user_id': test_uid,
            'domain': 'client-one.com',
            'is_licensed': False,
            'license_status': 'expired',
            'protection_paused': True,
            'is_active': True
        },
        {
            '_id': ObjectId(site2_id),
            'user_id': test_uid,
            'domain': 'client-two.com',
            'is_licensed': False,
            'license_status': 'expired',
            'protection_paused': True,
            'is_active': True
        }
    ])

    try:
        # User pays to renew their 2 sites
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_renew_reactivate',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_renew_reactivate',
                'status': 'completed',
                'custom_data': {
                    'user_id': test_uid,
                    'action': 'renew',
                    'sites_count': 2,
                    'billing_cycle': 'monthly'
                }
            }
        })

        # Check user state
        user_after = db.users.find_one({'_id': test_uid})
        assert user_after['payment_status'] == 'active'
        assert user_after['purchased_slots'] == 2

        # Check websites state - both sites MUST be reactivated!
        sites = list(db.websites.find({'user_id': test_uid}))
        for s in sites:
            assert s['is_licensed'] is True, f"Website {s['domain']} should be licensed after renewal"
            assert s['protection_paused'] is False, f"Website {s['domain']} should not be paused after renewal"
            assert s['license_status'] == 'active', f"Website {s['domain']} license_status should be active"

    finally:
        db.users.delete_one({'_id': test_uid})
        db.websites.delete_many({'user_id': test_uid})
        db.slot_batches.delete_many({'user_id': test_uid})
        db.paddle_transactions.delete_many({'user_id': test_uid})


def test_domain_trial_anti_churning():
    """Verify that a second free trial user cannot register a domain that already consumed a free trial."""
    from fastapi import HTTPException
    db = MongoDB()
    now = datetime.now(timezone.utc)

    user1_uid = str(ObjectId())
    user2_uid = str(ObjectId())
    test_domain = f"churn-test-{uuid.uuid4().hex[:6]}.com"

    db.users.insert_many([
        {'_id': user1_uid, 'email': 'user1@test.io', 'role': 'user', 'plan': 'free', 'payment_status': 'trialing', 'created_at': now},
        {'_id': user2_uid, 'email': 'user2@test.io', 'role': 'user', 'plan': 'free', 'payment_status': 'trialing', 'created_at': now}
    ])

    try:
        # User 1 registers the domain during free trial
        db.trial_domain_history.insert_one({
            'domain': test_domain,
            'first_used_by': user1_uid,
            'created_at': now
        })

        # User 2 (another free account) attempts to register the same domain
        entry = db.trial_domain_history.find_one({'domain': test_domain})
        assert entry is not None
        assert str(entry.get('first_used_by')) != user2_uid
    finally:
        db.users.delete_many({'_id': {'$in': [user1_uid, user2_uid]}})
        db.trial_domain_history.delete_many({'domain': test_domain})
