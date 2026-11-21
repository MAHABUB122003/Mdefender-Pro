import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

from src.database.mongodb_connection import MongoDB
from src.services.license_slot_service import LicenseSlotService
from src.services.subscription_service import SubscriptionService


def test_multibatch_additive_fleet_slots():
    db = MongoDB()
    lss = LicenseSlotService(db)
    sub_svc = SubscriptionService(db)
    now = datetime.now(timezone.utc)

    test_uid = str(ObjectId())
    test_email = f"fleet_batch_{uuid.uuid4().hex[:8]}@test.io"
    db.users.insert_one({
        '_id': test_uid,
        'email': test_email,
        'role': 'user',
        'plan': 'free',
        'created_at': now
    })

    try:
        # Step 1: User purchases 5 slots (e.g. at Day 0)
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_batch_001',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_batch_001',
                'status': 'completed',
                'custom_data': {'user_id': test_uid, 'sites_count': 5, 'billing_cycle': 'monthly'}
            }
        })

        state1 = lss.resolve_user_license_state(test_uid)
        assert state1['purchased_slots'] == 5
        assert state1['is_paid'] is True

        # Step 2: 10 days later, user purchases 10 more slots
        sub_svc.record_transaction(test_uid, {
            'id': 'txn_batch_002',
            'event_type': 'transaction.completed',
            'data': {
                'id': 'txn_batch_002',
                'status': 'completed',
                'custom_data': {'user_id': test_uid, 'sites_count': 10, 'billing_cycle': 'monthly'}
            }
        })

        state2 = lss.resolve_user_license_state(test_uid)
        # 5 + 10 MUST equal 15 additive slots!
        assert state2['purchased_slots'] == 15
        assert state2['is_paid'] is True

        # Step 3: When Batch 1 naturally reaches Day 30 and expires without manual renewal
        db.slot_batches.update_one(
            {'user_id': test_uid, 'slots': 5},
            {'$set': {'expires_at': now - timedelta(days=2)}}
        )
        state3 = lss.resolve_user_license_state(test_uid)
        # User retains remaining 10 slots from Batch 2!
        assert state3['purchased_slots'] == 10
        assert state3['is_paid'] is True

        # Step 4: When Batch 2 reaches Day 40 and also expires without manual renewal
        db.slot_batches.update_one(
            {'user_id': test_uid, 'slots': 10},
            {'$set': {'expires_at': now - timedelta(days=1)}}
        )
        state4 = lss.resolve_user_license_state(test_uid)
        # Both expired -> 0 active slots, paywall lockout triggered!
        assert state4['purchased_slots'] == 0
        assert state4['is_paid'] is False
    finally:
        db.users.delete_one({'_id': test_uid})
        db.slot_batches.delete_many({'user_id': test_uid})
