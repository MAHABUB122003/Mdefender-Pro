"""Post-incident security cleanup for MDefender Pro.

Run from the backend directory:

    python scripts/security_cleanup.py            # dry run (default)
    python scripts/security_cleanup.py --apply    # deactivate demo tenant, rotate keys

What it does:
  * Finds the previously seeded demo tenant (user@gmail.com / username "user").
  * Finds admin accounts still using the historical default password "admin123".
  * Dry run prints the findings and the planned actions; --apply performs them.

This does NOT delete data. The demo tenant is deactivated, unverified, moved to the
free plan, and its API keys are rotated so any leaked key stops working. Review the
output before applying, then delete the tenant manually if it is no longer needed.
"""

import sys
import secrets
import argparse
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.database.mongodb_connection import MongoDB
from src.services.password_service import PasswordService


DEMO_IDENTIFIERS = ("user@gmail.com", "user")
DEFAULT_PASSWORDS = ("admin123",)


def rotate_key(prefix="mdf_live_"):
    return f"{prefix}{secrets.token_urlsafe(32)}"


def find_demo_users(db):
    found = {}
    for ident in DEMO_IDENTIFIERS:
        doc = db.users.find_one({"$or": [{"email": ident}, {"username": ident}]})
        if doc:
            found[str(doc["_id"])] = doc
    return list(found.values())


def find_default_admins(db):
    svc = PasswordService()
    admins = []
    for doc in db.users.find({"$or": [{"role": "super_admin"}, {"is_admin": True}]}):
        pw_hash = doc.get("password_hash") or ""
        if not pw_hash:
            continue
        for candidate in DEFAULT_PASSWORDS:
            try:
                if svc.verify_password(candidate, pw_hash):
                    admins.append((doc, candidate))
                    break
            except Exception:
                continue
    return admins


def cleanup_demo(db, apply):
    users = find_demo_users(db)
    if not users:
        print("[demo] no demo tenant found (already clean)")
        return

    for user in users:
        uid = str(user["_id"])
        sites = list(db.websites.find({
            "$or": [{"user_id": uid}, {"user_id": user["_id"]}, {"added_by_user_id": uid}]
        }))
        print(f"[demo] {user.get('email') or user.get('username')} _id={uid} "
              f"plan={user.get('plan')} active={user.get('is_active')} sites={len(sites)}")
        if not apply:
            print("       would: deactivate, unverify, set plan=free, rotate API keys, revoke sessions")
            continue

        new_user_key = rotate_key()
        db.users.update_one({"_id": user["_id"]}, {"$set": {
            "is_active": False,
            "email_verified": False,
            "plan": "free",
            "api_key": new_user_key,
            "security_cleanup_at": datetime.now(),
            "security_cleanup_reason": "Seeded demo tenant removed after auth-backdoor audit",
        }})
        for site in sites:
            db.websites.update_one({"_id": site["_id"]}, {"$set": {
                "api_key": rotate_key("mdf_site_"),
                "status": "paused",
                "security_cleanup_at": datetime.now(),
            }})
        for collection in ("sessions", "refresh_tokens"):
            try:
                db[collection].update_many({"user_id": uid}, {"$set": {"revoked": True}})
            except Exception:
                pass
        print(f"       applied: deactivated, keys rotated, sessions revoked ({len(sites)} sites paused)")


def cleanup_admins(db, apply, new_password=None):
    admins = find_default_admins(db)
    if not admins:
        print("[admin] no account uses the historical default password")
        return

    for admin, candidate in admins:
        print(f"[admin] {admin.get('email') or admin.get('username')} still uses default password '{candidate}'")
        if not apply:
            print("        would: rotate password (use --admin-password) and revoke sessions")
            continue
        if not new_password:
            print("        skipped: pass --admin-password '<strong password>' to rotate")
            continue
        svc = PasswordService()
        db.users.update_one({"_id": admin["_id"]}, {"$set": {
            "password_hash": svc.hash_password(new_password),
            "security_cleanup_at": datetime.now(),
        }})
        for collection in ("sessions", "refresh_tokens"):
            try:
                db[collection].update_many({"user_id": str(admin["_id"])}, {"$set": {"revoked": True}})
            except Exception:
                pass
        print("        applied: password rotated, sessions revoked")


def main():
    parser = argparse.ArgumentParser(description="MDefender Pro security cleanup")
    parser.add_argument("--apply", action="store_true", help="perform the changes (default: dry run)")
    parser.add_argument("--admin-password", default=None, help="new password for admins using admin123")
    args = parser.parse_args()

    db = MongoDB()
    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"== MDefender Pro security cleanup ({mode}) ==")

    cleanup_demo(db, args.apply)
    cleanup_admins(db, args.apply, args.admin_password)

    print("== done ==")
    if not args.apply:
        print("Re-run with --apply to perform the actions above.")


if __name__ == "__main__":
    main()
