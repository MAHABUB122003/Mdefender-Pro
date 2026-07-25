from src.database.mongodb_connection import MongoDB
db = MongoDB()
result = db.users.update_one(
    {'email': 'testuser2@mdefender.com'},
    {'$set': {'email_verified': True}}
)
print(f'Updated: {result.modified_count} user(s)')
user = db.users.find_one({'email': 'testuser2@mdefender.com'})
print(f'email_verified: {user.get("email_verified") if user else "NOT FOUND"}')
