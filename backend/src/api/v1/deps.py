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

    user_id_str = str(user.get("id") or user.get("_id") or "").strip()
    is_admin = bool(user.get("role") in ("super_admin", "admin") or user.get("is_admin"))

    u_conditions = []
    if not is_admin and user_id_str:
        u_conditions.append({"user_id": user_id_str})
        if ObjectId.is_valid(user_id_str):
            u_conditions.append({"user_id": ObjectId(user_id_str)})

    def apply_user_scope(query):
        if not u_conditions:
            return query
        return {"$and": [{"$or": u_conditions}, query]}

    website = None

    # 1. Try by ObjectId
    try:
        if ObjectId.is_valid(website_id):
            website = db.websites.find_one(apply_user_scope({"_id": ObjectId(website_id)}))
    except Exception:
        pass

    # 2. Try by string _id or id
    if not website:
        website = db.websites.find_one(apply_user_scope({
            "$or": [
                {"_id": str(website_id)},
                {"id": str(website_id)},
                {"website_id": str(website_id)},
            ]
        }))

    # 3. Try by exact domain, url, or name
    if not website:
        clean_d = str(website_id).replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip().lower()
        full_clean = str(website_id).rstrip("/").lower()
        website = db.websites.find_one(apply_user_scope({
            "$or": [
                {"domain": clean_d},
                {"url": clean_d},
                {"name": clean_d},
                {"domain": str(website_id)},
                {"url": str(website_id)},
                {"url": full_clean},
                {"domain": full_clean},
                {"url": f"http://{clean_d}"},
                {"url": f"https://{clean_d}"},
            ]
        }))

    # 4. Check db.wordpress_sites fallback
    if not website:
        try:
            if ObjectId.is_valid(website_id):
                website = db.wordpress_sites.find_one(apply_user_scope({"_id": ObjectId(website_id)}))
        except Exception:
            pass
    if not website:
        clean_d = str(website_id).replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip().lower()
        website = db.wordpress_sites.find_one(apply_user_scope({
            "$or": [
                {"_id": str(website_id)},
                {"id": str(website_id)},
                {"domain": clean_d},
                {"url": clean_d},
                {"site_url": clean_d},
                {"domain": str(website_id)},
                {"url": str(website_id)},
                {"site_url": str(website_id)},
            ]
        }))

    if not website:
        raise HTTPException(status_code=404, detail="Website not found or not owned by current user")

    # Strict secondary verification: ensure caller owns this site
    site_user_id = str(website.get("user_id") or "")
    if not is_admin and site_user_id and site_user_id.lower() != user_id_str.lower():
        raise HTTPException(status_code=403, detail="Access denied: You do not own this website")

    return website


def require_super_admin(admin_email, db=None):
    db = db or get_db()
    admin = db.users.find_one({"email": admin_email})
    if not admin or admin.get("role") not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin
