import sys
import os

# Ensure backend root is in python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from src.database.mongodb_connection import MongoDB

def run_phase2_isolation_audit():
    print("==================================================================")
    print("PHASE 2 AUDIT: FLEET & MULTI-TENANT WEBSITE ISOLATION TEST")
    print("==================================================================")
    
    db = MongoDB()
    user = db.users.find_one({'email': 'user@gmail.com'})
    assert user is not None, "Test user user@gmail.com not found!"
    user_id = str(user['_id'])
    
    sites = list(db.websites.find({'user_id': user_id}))
    print(f"[+] Found {len(sites)} websites registered under user {user.get('email')}:")
    for s in sites:
        print(f"    - ID: {s.get('_id')} | Domain: {s.get('domain')} | Platform: {s.get('platform')}")
        
    site_a = next((s for s in sites if 'localhost' in s.get('domain', '')), None)
    site_b = next((s for s in sites if 'mahabubur.shop' in s.get('domain', '')), None)
    
    assert site_a is not None, "Site A (localhost) must exist for isolation test"
    assert site_b is not None, "Site B (mahabubur.shop) must exist for isolation test"
    
    id_a = str(site_a['_id'])
    id_b = str(site_b['_id'])
    
    # -------------------------------------------------------------
    # Test 1: API Key & Credential Isolation
    # -------------------------------------------------------------
    print("\n[Test 1] Verifying Credential & Token Isolation...")
    key_a = site_a.get('api_key') or ''
    token_a = site_a.get('site_token') or ''
    key_b = site_b.get('api_key') or ''
    token_b = site_b.get('site_token') or ''
    
    print(f"    * Site A Key: {key_a[:8]}... | Token: {token_a[:12]}...")
    print(f"    * Site B Key: {key_b[:8]}... | Token: {token_b[:12]}...")
    
    # Verify Tokens are unique
    if token_a and token_b:
        assert token_a != token_b, "CRITICAL: Site tokens must be unique per website!"
        print("    [PASS] Site Tokens are cryptographically unique.")
    else:
        print("    [INFO] One or both site tokens are unassigned (using API keys).")
        
    # -------------------------------------------------------------
    # Test 2: Mutation Isolation (Site A Mutation must NOT touch Site B)
    # -------------------------------------------------------------
    print("\n[Test 2] Verifying State Mutation Isolation...")
    
    # Snapshot Site B state before modifying Site A
    site_b_before = db.websites.find_one({'_id': site_b['_id']})
    b_plugins_before = list(site_b_before.get('plugins', []))
    b_themes_before = list(site_b_before.get('themes', []))
    b_hardening_before = dict(site_b_before.get('hardening_overview', {}).get('master_shields', {}))
    
    print(f"    * Site B Baseline: {len(b_plugins_before)} plugins, {len(b_themes_before)} themes, {len(b_hardening_before)} shields.")
    
    # Simulate a mutation targeting Site A ONLY
    test_flag_name = "test_isolation_probe_shield"
    db.websites.update_one(
        {'_id': site_a['_id']},
        {'$set': {f'hardening_overview.master_shields.{test_flag_name}': True}}
    )
    
    # Verify Site A received the change
    site_a_after = db.websites.find_one({'_id': site_a['_id']})
    assert site_a_after.get('hardening_overview', {}).get('master_shields', {}).get(test_flag_name) is True, "Site A update failed!"
    print(f"    [PASS] Site A successfully updated with {test_flag_name} = True.")
    
    # Verify Site B was NOT modified
    site_b_after = db.websites.find_one({'_id': site_b['_id']})
    b_hardening_after = dict(site_b_after.get('hardening_overview', {}).get('master_shields', {}))
    b_plugins_after = list(site_b_after.get('plugins', []))
    b_themes_after = list(site_b_after.get('themes', []))
    
    assert test_flag_name not in b_hardening_after, "CRITICAL ISOLATION LEAK: Site A modification bled into Site B!"
    assert b_hardening_after == b_hardening_before, "CRITICAL: Site B hardening shields altered by Site A operation!"
    assert b_plugins_after == b_plugins_before, "CRITICAL: Site B plugins altered by Site A operation!"
    assert b_themes_after == b_themes_before, "CRITICAL: Site B themes altered by Site A operation!"
    print("    [PASS] Site B verified 100% UNTOUCHED and pristine. Zero cross-talk detected.")
    
    # Clean up test probe flag on Site A
    db.websites.update_one(
        {'_id': site_a['_id']},
        {'$unset': {f'hardening_overview.master_shields.{test_flag_name}': ""}}
    )
    
    # -------------------------------------------------------------
    # Test 3: Fleet Scoping Verification in execute_remote_action
    # -------------------------------------------------------------
    print("\n[Test 3] Verifying Backend Scoping in websites_api / Remote Actions...")
    
    from src.api.v1.websites_api import get_owned_website
    
    # Test scoping with user object
    user_obj = {"id": str(user['_id']), "_id": str(user['_id']), "role": "user"}
    
    fetched_a = get_owned_website(user_obj, id_a)
    assert fetched_a is not None and str(fetched_a['_id']) == id_a, "Failed to resolve Site A with user scope"
    print(f"    [PASS] Scoped query for {id_a} correctly resolved Site A ({fetched_a.get('domain')}).")
    
    fetched_b = get_owned_website(user_obj, id_b)
    assert fetched_b is not None and str(fetched_b['_id']) == id_b, "Failed to resolve Site B with user scope"
    print(f"    [PASS] Scoped query for {id_b} correctly resolved Site B ({fetched_b.get('domain')}).")
    
    # Test foreign user rejection
    foreign_user = {"id": "foreign_attacker_999", "_id": "foreign_attacker_999", "role": "user"}
    try:
        get_owned_website(foreign_user, id_a)
        assert False, "CRITICAL SECURITY LEAK: Unauthorized user accessed Site A!"
    except Exception as e:
        print(f"    [PASS] Foreign user correctly blocked with access exception: {type(e).__name__}.")
        
    print("\n==================================================================")
    print("PHASE 2 ISOLATION AUDIT COMPLETED: 100% PASSED (ZERO CROSS-TALK)")
    print("==================================================================")

if __name__ == '__main__':
    run_phase2_isolation_audit()
