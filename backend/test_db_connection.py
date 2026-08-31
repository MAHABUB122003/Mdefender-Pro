#!/usr/bin/env python
"""Simple database connection test"""
import sys
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Test MongoDB connection
try:
    from pymongo import MongoClient
    
    mongo_uri = os.getenv('MONGO_URI')
    mongo_db = os.getenv('MONGO_DB')
    
    if not mongo_uri:
        print("❌ ERROR: MONGO_URI not found in .env")
        sys.exit(1)
    
    print(f"🔗 Connecting to MongoDB...")
    print(f"   Database: {mongo_db}")
    
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
    # Test connection
    server_info = client.server_info()
    print(f"✅ Connected successfully!")
    print(f"   MongoDB version: {server_info.get('version', 'unknown')}")
    
    # Test database access
    db = client[mongo_db]
    collections = db.list_collection_names()
    print(f"\n📦 Database '{mongo_db}' contains {len(collections)} collections:")
    for collection in collections:
        count = db[collection].count_documents({})
        print(f"   • {collection}: {count} documents")
    
    client.close()
    print("\n✅ Database connection test PASSED!")
    
except Exception as e:
    print(f"\n❌ Database connection test FAILED!")
    print(f"   Error: {type(e).__name__}: {e}")
    sys.exit(1)
