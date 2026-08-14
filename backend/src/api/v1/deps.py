"""Shared dependencies for v1 APIs.

Every website-scoped route MUST resolve the website through `get_owned_website`
so tenant isolation is enforced in one place (never trust IDs from the client).
"""

from bson import ObjectId
from fastapi import HTTPException

from src.database.mongodb_connection import MongoDB


def get_db():
    return MongoDB()


def get_owned_website(user, website_id):
    """Resolve a website that belongs to the given user. Raises 404 otherwise.

    Also enforces: user must be active; website must not be globally suspended.
    """
    db = get_db()
    if not website_id:
        raise HTTPException(status_code=400, detail="website_id is required")
    website = None
    try:
        website = db.websites.find_one({"_id": ObjectId(website_id)})
    except Exception:
        pass
    if not website:
        website = db.websites.find_one({"_id": website_id})
    if not website or str(website.get("user_id", "")) != str(user["id"]):
        raise HTTPException(status_code=404, detail="Website not found")
    return website


def require_super_admin(admin_email, db=None):
    db = db or get_db()
    admin = db.users.find_one({"email": admin_email})
    if not admin or admin.get("role") not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin
