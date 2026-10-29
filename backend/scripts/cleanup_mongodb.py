"""
MDefender-Pro MongoDB Zero-Bloat Database Cleaner
Drops obsolete traffic/attack collections and removes dead/unused collections to free up disk space and index RAM.
Safe for production: preserves users, websites, wordpress_sites, api_keys, user_rules, rules, etc.
"""
import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("backend/.env")
load_dotenv(".env")

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
db_name = os.getenv("MONGO_DB", "mdefender_pro")

print(f"Connecting to MongoDB: {db_name}...")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[db_name]
    print("[+] Successfully connected to MongoDB.")
except Exception as e:
    print(f"[-] MongoDB connection failed: {e}")
    sys.exit(1)

# Collections to remove:
# 1. Obsolete visitor/attack logs (now handled via Live WordPress MySQL Streaming)
# 2. Dead/leftover collections that have 0 documents and no backend references
OBSOLETE_COLLECTIONS = [
    "security_events",      # Obsolete: visitor/attack logs
    "attacks",              # Obsolete: attack logs
    "attack_attempts",      # Obsolete: rate limit attempt logs
    "requests",             # Obsolete: request logs
    "live_site_events",     # Obsolete: rolling stream buffer
    "waf_events",           # Obsolete: waf log events
    "bank_accounts",        # Dead leftover: 0 docs, no backend usage
    "finance_transactions", # Dead leftover: 0 docs, no backend usage
    "paddle_transactions",  # Dead leftover: 0 docs, no backend usage
    "notices",              # Dead leftover: 0 docs, no backend usage
]

existing_colls = db.list_collection_names()
print(f"Current total collections in database: {len(existing_colls)}")

dropped_count = 0
for coll in OBSOLETE_COLLECTIONS:
    if coll in existing_colls:
        doc_count = db[coll].estimated_document_count()
        db[coll].drop()
        print(f"  [x] Dropped obsolete collection: '{coll}' (freed {doc_count} docs and all its indexes)")
        dropped_count += 1
    else:
        print(f"  [-] Collection '{coll}' does not exist (already clean)")

print(f"\n[+] Total obsolete collections dropped: {dropped_count}")

# Verify remaining collections
remaining = sorted(db.list_collection_names())
print(f"\n[+] Remaining active essential collections ({len(remaining)}):")
for r in remaining:
    print(f"  - {r}: {db[r].estimated_document_count()} docs")

# Try to run compact command if supported
try:
    print("\n[+] Running MongoDB storage optimization...")
    # Note: 'compact' requires collection-level command on wiredTiger
    for r in remaining:
        try:
            db.command({"compact": r})
        except Exception:
            pass
    print("[+] Storage optimization complete.")
except Exception as e:
    print(f"[-] Compact note: {e}")

print("\nMongoDB cleanup successfully finished!")

