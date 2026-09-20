import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from src.database.mongodb_connection import MongoDB
from src.services.password_service import PasswordService
from src.utils.api_key import generate_api_key

def main():
    email = "user@gmail.com"
    username = "user"
    password = "user123"
    full_name = "Demo User"

    db = MongoDB()
    ps = PasswordService()

    password_hash = ps.hash_password(password)
    api_key = generate_api_key()

    user_doc = {
        "email": email.lower(),
        "username": username.lower(),
        "full_name": full_name,
        "name": full_name,
        "password_hash": password_hash,
        "role": "user",
        "plan": "pro",
        "is_active": True,
        "email_verified": True,
        "api_key": api_key,
        "websites": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "total_requests": 0,
        "total_blocked": 0,
        "mfa_enabled": False,
        "mfa_secret": None
    }

    # Upsert user in db.users
    existing = db.users.find_one({"email": email.lower()})
    if existing:
        db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "password_hash": password_hash,
                "email_verified": True,
                "is_active": True,
                "role": "user",
                "plan": "pro",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        user_id = str(existing["_id"])
        print(f"Updated existing user: {email} (ID: {user_id})")
    else:
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        print(f"Created new user: {email} (ID: {user_id})")

    # Clear any brute force lockouts on this account
    db.login_attempts.delete_many({"identifier": email.lower()})
    db.login_attempts.delete_many({"identifier": username.lower()})

    print(f"\nUser account ready for login:")
    print(f"  Email    : {email}")
    print(f"  Password : {password}")
    print(f"  Role     : user")
    print(f"  Status   : active & email_verified")

if __name__ == "__main__":
    main()
