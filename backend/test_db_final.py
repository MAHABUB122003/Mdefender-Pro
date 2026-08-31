#!/usr/bin/env python
"""Database connection test with TLS options"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from pymongo import MongoClient
    
    mongo_uri = os.getenv('MONGO_URI')
    mongo_db = os.getenv('MONGO_DB')
    
    if not mongo_uri:
        print("❌ ERROR: MONGO_URI not found in .env")
        sys.exit(1)
    
    print(f"🔗 Connecting to MongoDB...")
    print(f"   Database: {mongo_db}\n")
    
    # Try with tlsAllowInvalidCertificates for Windows
    client = MongoClient(
        mongo_uri, 
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000
    )
    
    # Test connection
    print("   Pinging server...")
    server_info = client.admin.command('ping')
    print(f"✅ Connected successfully!")
    
    # Get server info
    build_info = client.admin.command('buildInfo')
    print(f"   MongoDB version: {build_info.get('version', 'unknown')}")
    
    # Test database access
    db = client[mongo_db]
    collections = db.list_collection_names()
    print(f"\n📦 Database '{mongo_db}' contains {len(collections)} collections:")
    for collection in sorted(collections):
        try:
            count = db[collection].count_documents({})
            print(f"   ✓ {collection}: {count} documents")
        except Exception as e:
            print(f"   ✗ {collection}: error - {e}")
    
    client.close()
    print("\n✅ Database connection test PASSED!")
    print("\n✨ Your database is connected and working!")
    
except Exception as e:
    print(f"\n❌ Connection failed!")
    print(f"   Error: {type(e).__name__}: {str(e)[:200]}")
    print("\n📋 Troubleshooting steps:")
    print("   1. Check MongoDB Atlas IP whitelist includes your IP")
    print("   2. Verify MONGO_URI is correct in .env")
    print("   3. Check MongoDB Atlas database user permissions")
    print("   4. Try connecting from MongoDB Compass to verify credentials")
    sys.exit(1)
