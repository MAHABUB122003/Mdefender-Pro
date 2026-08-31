import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv('MONGO_URI')
mongo_db = os.getenv('MONGO_DB')

client = MongoClient(mongo_uri)
db = client[mongo_db]

print("=== USERS ===")
for user in db.users.find():
    print(f"ID: {user.get('_id')}")
    print(f"Name: {user.get('full_name') or user.get('name')}")
    print(f"Email: {user.get('email')}")
    print(f"Verified: {user.get('email_verified')}")
    print(f"Is Active: {user.get('is_active')}")
    print(f"API Key: {user.get('api_key')}")
    print("-" * 30)

print("\n=== WEBSITES ===")
for site in db.websites.find():
    print(f"ID: {site.get('_id')}")
    print(f"Domain: {site.get('domain') or site.get('url')}")
    print(f"User ID: {site.get('user_id')}")
    print(f"Verified: {site.get('verified')}")
    print("-" * 30)

client.close()
