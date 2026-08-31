#!/usr/bin/env python
"""Database connection test with SSL bypass"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from pymongo import MongoClient
    import ssl
    
    mongo_uri = os.getenv('MONGO_URI')
    mongo_db = os.getenv('MONGO_DB')
    
    if not mongo_uri:
        print("❌ ERROR: MONGO_URI not found in .env")
        sys.exit(1)
    
    print(f"🔗 Connecting to MongoDB (with SSL verification disabled)...")
    print(f"   URI: {mongo_uri[:50]}...")
    print(f"   Database: {mongo_db}")
    
    # Try connection with SSL disabled
    client = MongoClient(
        mongo_uri, 
        ssl=False,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000
    )
    
    # Test connection
    server_info = client.server_info()
    print(f"✅ Connected successfully!")
    print(f"   MongoDB version: {server_info.get('version', 'unknown')}")
    
    # Test database access
    db = client[mongo_db]
    collections = db.list_collection_names()
    print(f"\n📦 Database '{mongo_db}' contains {len(collections)} collections:")
    for collection in collections:
        try:
            count = db[collection].count_documents({})
            print(f"   • {collection}: {count} documents")
        except:
            print(f"   • {collection}: (error reading)")
    
    client.close()
    print("\n✅ Database connection test PASSED!")
    
except Exception as e:
    print(f"\n❌ Database connection test FAILED!")
    print(f"   Error: {type(e).__name__}")
    print(f"   Details: {e}")
    sys.exit(1)
