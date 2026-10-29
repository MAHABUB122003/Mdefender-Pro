import os, sys
sys.path.insert(0, os.path.abspath('backend'))
from src.database.mongodb_connection import MongoDB

db = MongoDB()
user = db.users.find_one({'email': 'user@gmail.com'})
print("User ID:", user['_id'], "User Master API Key:", user.get('api_key'))

print("\nWebsites for user:")
for w in db.websites.find({'$or': [{'user_id': str(user['_id'])}, {'user_id': user['_id']}]}):
    print(f"ID: {w['_id']} | Name: {w.get('name')} | Domain: {w.get('domain')} | URL: {w.get('url')} | API Key: {w.get('api_key')}")

print("\nWordpress_sites collection:")
for wp in db.wordpress_sites.find({'$or': [{'user_id': str(user['_id'])}, {'user_id': user['_id']}]}):
    print(f"WP ID: {wp.get('website_id')} | Domain: {wp.get('domain')} | Connected: {wp.get('connected')} | Status: {wp.get('status')}")
