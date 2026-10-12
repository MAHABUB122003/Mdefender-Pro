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
    """Resolve a website that belongs to the given user or is accessed by admin. Raises 404 otherwise."""
    db = get_db()
    if not website_id:
        raise HTTPException(status_code=400, detail="website_id is required")
    website = None

    # 1. Try by ObjectId
    try:
        if ObjectId.is_valid(website_id):
            website = db.websites.find_one({"_id": ObjectId(website_id)})
    except Exception:
        pass

    # 2. Try by string _id
    if not website:
        website = db.websites.find_one({"_id": str(website_id)})

    # 3. Try by domain, url, or name (strip http:// or https:// if provided)
    if not website:
        clean_d = str(website_id).replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip().lower()
        website = db.websites.find_one({
            "$or": [
                {"domain": clean_d},
                {"url": clean_d},
                {"name": clean_d},
                {"domain": str(website_id)},
                {"url": str(website_id)},
            ]
        })

    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    # Verify authorization
    user_id_str = str(user.get("id") or user.get("_id") or "")
    site_user_id = str(website.get("user_id") or "")
    is_admin = bool(user.get("role") in ("super_admin", "admin") or user.get("is_admin"))

    if not is_admin and site_user_id:
        if site_user_id.lower() != user_id_str.lower():
            # If the user's websites list contains this domain, allow access
            user_doc = db.users.find_one({"_id": ObjectId(user_id_str)}) if ObjectId.is_valid(user_id_str) else db.users.find_one({"_id": user_id_str})
            user_domains = user_doc.get("websites", []) if user_doc else []
            if website.get("domain") not in user_domains and website.get("url") not in user_domains:
                raise HTTPException(status_code=404, detail="Website not found")

    return website


def require_super_admin(admin_email, db=None):
    db = db or get_db()
    admin = db.users.find_one({"email": admin_email})
    if not admin or admin.get("role") not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin
