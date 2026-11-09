import sys, os
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

import time
from src.database.mongodb_connection import MongoDB
import main

db = MongoDB()

test_user = db.users.find_one({}) or {'_id': 'test_user_id', 'email': 'user@gmail.com'}
test_site = db.websites.find_one({}) or {'_id': 'test_site_id'}

print("==================================================")
print("TEST: Endpoint Latencies for Blacklist & Country Blocks")
print("==================================================")

# Mock Request class
class MockRequest:
    def __init__(self, json_data=None, query_params=None):
        self._json = json_data or {}
        self.query_params = query_params or {}

    async def json(self):
        return self._json

import asyncio

async def test_latencies():
    # 1. user_add_blacklist
    req = MockRequest(json_data={'ip': '198.51.100.88', 'duration': 'permanent', 'website_id': str(test_site['_id'])})
    t0 = time.perf_counter()
    res = await main.user_add_blacklist(req, test_user)
    t1 = time.perf_counter()
    ms_add_bl = (t1 - t0) * 1000
    print(f"user_add_blacklist: {ms_add_bl:.2f} ms | Status: {res.get('status')} | Message: {res.get('message')}")

    # 2. user_delete_blacklist
    req2 = MockRequest(query_params={'ip': '198.51.100.88', 'website_id': str(test_site['_id'])})
    t0 = time.perf_counter()
    res2 = await main.user_delete_blacklist(req2, test_user)
    t1 = time.perf_counter()
    ms_del_bl = (t1 - t0) * 1000
    print(f"user_delete_blacklist: {ms_del_bl:.2f} ms | Status: {res2.get('status')}")

    # 3. user_add_country_block
    req3 = MockRequest(json_data={'code': 'RU', 'website_id': str(test_site['_id'])})
    t0 = time.perf_counter()
    res3 = await main.user_add_country_block(req3, test_user)
    t1 = time.perf_counter()
    ms_add_cb = (t1 - t0) * 1000
    print(f"user_add_country_block: {ms_add_cb:.2f} ms | Status: {res3.get('status')}")

    # 4. user_delete_country_block
    req4 = MockRequest(query_params={'code': 'RU', 'website_id': str(test_site['_id'])})
    t0 = time.perf_counter()
    res4 = await main.user_delete_country_block(req4, test_user)
    t1 = time.perf_counter()
    ms_del_cb = (t1 - t0) * 1000
    print(f"user_delete_country_block: {ms_del_cb:.2f} ms | Status: {res4.get('status')}")

    assert ms_add_bl < 50, "user_add_blacklist should be under 50ms!"
    assert ms_del_bl < 50, "user_delete_blacklist should be under 50ms!"
    assert ms_add_cb < 50, "user_add_country_block should be under 50ms!"
    assert ms_del_cb < 50, "user_delete_country_block should be under 50ms!"
    print("\n>>> ALL LATENCY CHECKS PASSED: SUB-50MS ASYNCHRONOUS DISPATCH VERIFIED!")

asyncio.run(test_latencies())

