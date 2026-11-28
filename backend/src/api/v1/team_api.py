"""v1 REST API: Workspace Team & Role-Based Access Control (RBAC).

Supports universal SaaS collaboration (solo owners, businesses, and agencies):
- Dynamic team seat calculation based on active subscription / licensed site slots
- Real pending invitations with secure acceptance tokens & 7-day expiry
- Workspace switching & real role/site-scope enforcement
- Real client IP audit logging
"""

import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import os
import secrets
import uuid
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr

from src.auth.cookie_service import CookieService
from src.auth.dependencies import get_current_user
from src.auth.email_sender import AuthEmailService
from src.auth.jwt_service import JWTService
from src.services.password_service import PasswordService
from src.database.mongodb_connection import MongoDB
from src.utils.api_key import generate_api_key
from src.utils.api_response import success

router = APIRouter(prefix="/team", tags=["Team"])

ROLE_TITLES = {
    "owner": "Workspace Owner (Full Access)",
    "secops": "Security Manager",
    "devops": "WordPress Developer",
    "auditor": "Read-Only Viewer",
}


def _client_ip(request: Optional[Request]) -> str:
    if not request:
        return "127.0.0.1"
    fwd = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    if fwd:
        return fwd
    return request.client.host if request.client else "127.0.0.1"


def _resolve_team_seats(user: dict) -> int:
    """Resolve team seats dynamically using SaaS tier & per-site licensing state."""
    if user.get("is_admin") or user.get("role") in ("admin", "super_admin"):
        return 100
    is_paid = bool(user.get("is_paid"))
    is_trial = bool(user.get("is_trial_active"))
    purchased_slots = int(user.get("purchased_slots") or 0)
    plan = (user.get("effective_plan") or user.get("plan") or "free").lower()
    if is_paid:
        if plan == "go":
            return max(3, min(10, purchased_slots * 2))
        if plan in ("enterprise", "premium", "ultra") or purchased_slots >= 25:
            return min(100, max(15, purchased_slots * 2))
        return min(25, max(5, purchased_slots))
    if is_trial:
        return 2
    return 0


def _require_team_owner(user: dict):
    """Only the workspace owner (or platform admin) can manage team members and invites."""
    if user.get("team_member_context"):
        raise HTTPException(
            status_code=403,
            detail="Only the Workspace Owner can invite, edit, or remove team members.",
        )


def _frontend_base_url(request: Optional[Request] = None) -> str:
    if request:
        origin = (request.headers.get("origin") or "").strip().rstrip("/")
        if origin.startswith(("http://", "https://")):
            return origin
    return (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")


class InviteMemberRequest(BaseModel):
    name: str
    email: EmailStr
    role_id: str = "secops"
    scope: str = "all"
    require_2fa: bool = True


class UpdateMemberRequest(BaseModel):
    role_id: str | None = None
    scope: str | None = None
    require_2fa: bool | None = None


class AcceptInviteRequest(BaseModel):
    token: str


class CompleteInviteSignupRequest(BaseModel):
    token: str
    full_name: str
    password: str


def _hash_invite_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _check_invite_rate_limit(db, ip_addr: str):
    """Prevent brute-force token guessing on public invite endpoints."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    recent_failures = db.team_invite_attempts.count_documents({
        "ip": ip_addr,
        "created_at": {"$gte": cutoff},
    })
    if recent_failures >= 15:
        raise HTTPException(
            status_code=429,
            detail="Too many invalid invitation attempts. Please try again in 15 minutes.",
        )


def _record_invite_failure(db, ip_addr: str):
    try:
        db.team_invite_attempts.insert_one({
            "ip": ip_addr,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


def _find_pending_invite(db, raw_token: str):
    t_hash = _hash_invite_token(raw_token)
    return db.team_invites.find_one({
        "$or": [{"token_hash": t_hash}, {"token": raw_token}],
        "status": "pending",
    })


@router.get("/workspaces")
async def list_accessible_workspaces(user=Depends(get_current_user)):
    """List the user's own workspace plus any team workspaces they have joined."""
    db = MongoDB()
    # Always resolve the real actor (not switched workspace)
    actor_id = str(user.get("actor_id") or user.get("id") or "")
    actor_email = (user.get("actor_email") or user.get("email") or "").lower().strip()
    actor_name = user.get("actor_name") or user.get("name") or actor_email.split("@")[0].title()

    workspaces = [{
        "owner_id": actor_id,
        "workspace_name": user.get("own_workspace_name") or f"{actor_name}'s Workspace",
        "owner_email": actor_email,
        "role_id": "owner",
        "role_title": ROLE_TITLES["owner"],
        "scope": "Global (All Domains & Sites)",
        "is_own": True,
    }]

    query_filters = []
    if actor_id:
        query_filters.append({"member_user_id": actor_id})
    if actor_email:
        query_filters.append({"email": actor_email})

    seen_owners = {actor_id}
    if query_filters:
        for tm in db.team_members.find({"$or": query_filters, "status": {"$ne": "revoked"}}):
            o_id = str(tm.get("owner_id") or "")
            if not o_id or o_id in seen_owners:
                continue
            seen_owners.add(o_id)

            owner_doc = None
            if ObjectId.is_valid(o_id):
                owner_doc = db.users.find_one({"_id": ObjectId(o_id)})
            if not owner_doc:
                owner_doc = db.users.find_one({"_id": o_id})

            owner_email = (owner_doc.get("email") if owner_doc else None) or tm.get("owner_email") or "Workspace Owner"
            owner_name = (
                (owner_doc.get("workspace_name") or owner_doc.get("full_name") or owner_doc.get("name"))
                if owner_doc else None
            ) or owner_email.split("@")[0].title()

            workspaces.append({
                "owner_id": o_id,
                "workspace_name": owner_name,
                "owner_email": owner_email,
                "role_id": tm.get("role_id", "auditor"),
                "role_title": tm.get("role_title", ROLE_TITLES.get(tm.get("role_id", "auditor"), "Team Member")),
                "scope": tm.get("scope", "Global (All Domains & Sites)"),
                "is_own": False,
            })

    active_owner_id = str(user.get("id") or actor_id)
    return success({
        "workspaces": workspaces,
        "active_owner_id": active_owner_id,
        "is_team_session": bool(user.get("team_member_context")),
        "active_role": user.get("team_role") or "owner",
        "active_scope": user.get("team_scope") or "all",
    })


@router.get("/members")
async def list_team_members(request: Request, user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])
    owner_email = user.get("email", "")
    owner_name = user.get("name") or user.get("full_name") or owner_email.split("@")[0].title()

    seats_total = _resolve_team_seats(user)

    owner_member = {
        "id": u_id,
        "name": f"{owner_name} (You)" if not user.get("team_member_context") else owner_name,
        "email": owner_email,
        "roleId": "owner",
        "roleTitle": ROLE_TITLES["owner"],
        "scope": "Global (All Domains & Sites)",
        "twoFactor": bool(user.get("mfa_enabled", False)),
        "lastActive": "Active Now",
        "isOwner": True,
        "joinedAt": str(user.get("created_at", "2026-01-01"))[:10],
    }

    additional_members = []
    for tm in db.team_members.find({"owner_id": u_id, "status": {"$ne": "revoked"}}):
        m_id = str(tm.get("_id", tm.get("id", "")))
        additional_members.append({
            "id": m_id,
            "name": tm.get("name", "Team Member"),
            "email": tm.get("email", ""),
            "roleId": tm.get("role_id", "secops"),
            "roleTitle": tm.get("role_title", ROLE_TITLES.get(tm.get("role_id", "secops"), "Security Operations")),
            "scope": tm.get("scope", "Global (All Domains & Sites)"),
            "status": tm.get("status", "active"),
            "twoFactor": bool(tm.get("two_factor", True)),
            "lastActive": tm.get("last_active", "Active"),
            "isOwner": False,
            "joinedAt": str(tm.get("joined_at", datetime.now().strftime("%Y-%m-%d")))[:10],
        })

    all_members = [owner_member] + additional_members

    pending_invites = []
    now = datetime.now(timezone.utc)
    base_url = _frontend_base_url(request)
    for inv in db.team_invites.find({"owner_id": u_id, "status": "pending"}):
        exp = inv.get("expires_at")
        days_left = "7 days"
        if isinstance(exp, datetime):
            exp_utc = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
            delta_days = max(0, (exp_utc - now).days)
            days_left = f"{delta_days} days" if delta_days > 0 else "Expires today"
        token = inv.get("token", "")
        pending_invites.append({
            "id": str(inv.get("_id", "")),
            "email": inv.get("email", ""),
            "name": inv.get("name", ""),
            "roleId": inv.get("role_id", "secops"),
            "roleTitle": inv.get("role_title", "Security Operations"),
            "scope": inv.get("scope", "Global (All Domains & Sites)"),
            "invitedBy": owner_email,
            "sentAt": str(inv.get("sent_at", datetime.now().strftime("%Y-%m-%d")))[:10],
            "expiresIn": days_left,
            "inviteUrl": f"{base_url}/team/accept?token={token}" if token else "",
        })

    return success({
        "members": all_members,
        "pending_invites": pending_invites,
        "seats_total": seats_total,
        "seats_used": len(all_members) + len(pending_invites),
    })


@router.post("/invite")
async def invite_team_member(body: InviteMemberRequest, request: Request, user=Depends(get_current_user)):
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])
    owner_email = (user.get("email") or "").lower().strip()
    target_email = body.email.lower().strip()

    if body.role_id not in ("secops", "devops", "auditor"):
        raise HTTPException(status_code=400, detail="Invalid role_id. Must be secops, devops, or auditor.")

    seats_total = _resolve_team_seats(user)
    used_seats = (
        db.team_members.count_documents({"owner_id": u_id, "status": {"$ne": "revoked"}})
        + db.team_invites.count_documents({"owner_id": u_id, "status": "pending"})
        + 1
    )
    if used_seats >= seats_total:
        raise HTTPException(
            status_code=403,
            detail=f"Team seat limit reached ({seats_total} seats). Add more protected sites or upgrade to unlock additional seats.",
        )

    if target_email == owner_email:
        raise HTTPException(status_code=400, detail="Cannot invite yourself as a team member.")
    if db.team_members.find_one({"owner_id": u_id, "email": target_email, "status": {"$ne": "revoked"}}):
        raise HTTPException(status_code=400, detail="A team member with this email is already active in your workspace.")
    if db.team_invites.find_one({"owner_id": u_id, "email": target_email, "status": "pending"}):
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email.")

    role_title = ROLE_TITLES.get(body.role_id, "Security Manager")
    scope_val = body.scope.strip() if body.scope and body.scope != "all" else "Global (All Domains & Sites)"
    now = datetime.now(timezone.utc)
    invite_id = f"inv-{uuid.uuid4().hex[:10]}"
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invite_token(raw_token)
    invite_url = f"{_frontend_base_url(request)}/team/accept?token={raw_token}"
    owner_display = user.get("workspace_name") or user.get("name") or owner_email

    invite_doc = {
        "_id": invite_id,
        "id": invite_id,
        "owner_id": u_id,
        "owner_email": owner_email,
        "owner_name": owner_display,
        "name": body.name.strip(),
        "email": target_email,
        "role_id": body.role_id,
        "role_title": role_title,
        "scope": scope_val,
        "two_factor": body.require_2fa,
        "token_hash": token_hash,
        "status": "pending",
        "sent_at": now,
        "expires_at": now + timedelta(hours=48),
    }
    db.team_invites.insert_one(invite_doc)

    email_sent = await asyncio.to_thread(
        AuthEmailService().send_team_invite_email,
        target_email,
        body.name.strip(),
        owner_display,
        role_title,
        scope_val,
        invite_url,
    )

    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": owner_email,
        "action": f"Invited team member {body.name.strip()} ({target_email}) as {role_title}",
        "ip": _client_ip(request),
        "created_at": now,
    })

    return success({
        "email_sent": bool(email_sent),
        "invite": {
            "id": invite_id,
            "name": body.name.strip(),
            "email": target_email,
            "roleId": body.role_id,
            "roleTitle": role_title,
            "scope": scope_val,
            "invitedBy": owner_email,
            "sentAt": now.strftime("%Y-%m-%d"),
            "expiresIn": "7 days",
            "inviteUrl": invite_url,
        },
        "message": (
            f"Invitation email sent to {target_email}!"
            if email_sent
            else f"Invitation created for {target_email}. Copy the invite link to share."
        ),
    })


@router.get("/invites/verify")
async def verify_team_invite(request: Request, token: str = Query(..., min_length=10)):
    """Public endpoint to preview a pending workspace invitation before accepting."""
    db = MongoDB()
    ip_addr = _client_ip(request)
    _check_invite_rate_limit(db, ip_addr)

    inv = _find_pending_invite(db, token)
    if not inv:
        _record_invite_failure(db, ip_addr)
        raise HTTPException(status_code=404, detail="Invitation not found, already accepted, or revoked.")

    exp = inv.get("expires_at")
    if isinstance(exp, datetime):
        exp_utc = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
        if exp_utc < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This invitation link has expired.")

    invite_email = (inv.get("email") or "").lower().strip()
    account_exists = bool(db.users.find_one({"email": invite_email}, {"_id": 1}))

    return success({
        "email": invite_email,
        "name": inv.get("name", ""),
        "role_id": inv.get("role_id", "secops"),
        "role_title": inv.get("role_title", "Security Manager"),
        "scope": inv.get("scope", "Global (All Domains & Sites)"),
        "owner_name": inv.get("owner_name", "Workspace Owner"),
        "owner_email": inv.get("owner_email", ""),
        "account_exists": account_exists,
    })


@router.post("/invites/accept")
async def accept_team_invite(body: AcceptInviteRequest, request: Request, user=Depends(get_current_user)):
    """Accept a pending team invitation as the currently authenticated user."""
    db = MongoDB()
    ip_addr = _client_ip(request)
    _check_invite_rate_limit(db, ip_addr)

    actor_id = str(user.get("actor_id") or user.get("id") or "")
    actor_email = (user.get("actor_email") or user.get("email") or "").lower().strip()
    actor_name = user.get("actor_name") or user.get("name") or actor_email.split("@")[0].title()

    inv = _find_pending_invite(db, body.token)
    if not inv:
        _record_invite_failure(db, ip_addr)
        raise HTTPException(status_code=404, detail="Invitation not found, already accepted, or revoked.")

    exp = inv.get("expires_at")
    if isinstance(exp, datetime):
        exp_utc = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
        if exp_utc < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This invitation link has expired.")

    if inv.get("email", "").lower().strip() != actor_email:
        raise HTTPException(
            status_code=403,
            detail=f"This invitation was sent to {inv.get('email')}. Please log in with that email address to accept.",
        )

    now = datetime.now(timezone.utc)
    # Atomic single-use token consumption to prevent replay / race conditions
    consumed = db.team_invites.find_one_and_update(
        {"_id": inv["_id"], "status": "pending"},
        {"$set": {"status": "accepted", "accepted_at": now, "accepted_by": actor_id}, "$unset": {"token": "", "token_hash": ""}},
    )
    if not consumed:
        raise HTTPException(status_code=409, detail="This invitation has already been accepted.")

    owner_id = str(inv.get("owner_id") or "")
    member_id = f"usr-{uuid.uuid4().hex[:8]}"

    existing = db.team_members.find_one({"owner_id": owner_id, "email": actor_email})
    if existing:
        db.team_members.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "member_user_id": actor_id,
                "status": "active",
                "role_id": inv.get("role_id", "secops"),
                "role_title": inv.get("role_title", ROLE_TITLES["secops"]),
                "scope": inv.get("scope", "Global (All Domains & Sites)"),
                "last_active": "Active Now",
                "joined_at": now,
            }},
        )
    else:
        db.team_members.insert_one({
            "_id": member_id,
            "id": member_id,
            "owner_id": owner_id,
            "owner_email": inv.get("owner_email", ""),
            "member_user_id": actor_id,
            "name": actor_name or inv.get("name", "Team Member"),
            "email": actor_email,
            "role_id": inv.get("role_id", "secops"),
            "role_title": inv.get("role_title", ROLE_TITLES["secops"]),
            "scope": inv.get("scope", "Global (All Domains & Sites)"),
            "two_factor": bool(user.get("mfa_enabled", False) or inv.get("two_factor", True)),
            "status": "active",
            "joined_at": now,
            "last_active": "Active Now",
        })

    db.audit_logs.insert_one({
        "user_id": owner_id,
        "user_email": actor_email,
        "action": f"Team member {actor_email} accepted invitation as {inv.get('role_title')}",
        "ip": ip_addr,
        "created_at": now,
    })

    return success({
        "owner_id": owner_id,
        "role_id": inv.get("role_id", "secops"),
        "scope": inv.get("scope", "Global (All Domains & Sites)"),
        "message": "You have joined the workspace! You can now switch to it from the header.",
    })


@router.post("/invites/complete-signup")
async def complete_team_invite_signup(body: CompleteInviteSignupRequest, request: Request, response: Response):
    """Zero-Trust 1-Step Onboarding for NEW invited users (no existing account).
    Strictly rejects if an account with the invited email already exists (prevents account takeover).
    """
    db = MongoDB()
    ip_addr = _client_ip(request)
    _check_invite_rate_limit(db, ip_addr)

    inv = _find_pending_invite(db, body.token)
    if not inv:
        _record_invite_failure(db, ip_addr)
        raise HTTPException(status_code=404, detail="Invitation not found, already accepted, or revoked.")

    exp = inv.get("expires_at")
    if isinstance(exp, datetime):
        exp_utc = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
        if exp_utc < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This invitation link has expired.")

    target_email = (inv.get("email") or "").lower().strip()
    if db.users.find_one({"email": target_email}, {"_id": 1}):
        raise HTTPException(
            status_code=409,
            detail=f"An account for {target_email} already exists. Please sign in with your password to accept.",
        )

    pw_svc = PasswordService()
    pw_res = pw_svc.validate_strength(body.password)
    if not pw_res.get("valid"):
        errs = pw_res.get("errors") or ["Password does not meet security requirements."]
        raise HTTPException(status_code=400, detail=errs[0])

    now = datetime.now(timezone.utc)
    # Atomic single-use consumption BEFORE creating user/membership
    consumed = db.team_invites.find_one_and_update(
        {"_id": inv["_id"], "status": "pending"},
        {"$set": {"status": "accepted", "accepted_at": now}, "$unset": {"token": "", "token_hash": ""}},
    )
    if not consumed:
        raise HTTPException(status_code=409, detail="This invitation has already been accepted.")

    full_name = (body.full_name or inv.get("name") or target_email.split("@")[0]).strip()
    password_hash = pw_svc.hash_password(body.password)
    api_key = generate_api_key()
    first_name = full_name.split()[0] if full_name else "Team"

    user_doc = {
        "full_name": full_name,
        "name": full_name,
        "email": target_email,
        "username": target_email.split("@")[0],
        "password_hash": password_hash,
        "api_key": api_key,
        "email_verified": True,
        "mfa_enabled": False,
        "mfa_secret": None,
        "google_id": None,
        "plan": "free",
        "role": "user",
        "is_active": True,
        "payment_status": "trialing",
        "purchased_slots": 0,
        "licensed_website_ids": [],
        "token_version": 0,
        "websites": [],
        "onboarded": True,
        "onboarding_step": "completed",
        "workspace_name": f"{first_name}'s Workspace",
        "requests_today": 0,
        "total_requests": 0,
        "total_blocked": 0,
        "created_at": now,
        "updated_at": now,
        "last_login": now,
    }
    res = db.users.insert_one(user_doc)
    new_user_id = str(res.inserted_id)

    owner_id = str(inv.get("owner_id") or "")
    member_id = f"usr-{uuid.uuid4().hex[:8]}"
    db.team_members.insert_one({
        "_id": member_id,
        "id": member_id,
        "owner_id": owner_id,
        "owner_email": inv.get("owner_email", ""),
        "member_user_id": new_user_id,
        "name": full_name,
        "email": target_email,
        "role_id": inv.get("role_id", "secops"),
        "role_title": inv.get("role_title", ROLE_TITLES["secops"]),
        "scope": inv.get("scope", "Global (All Domains & Sites)"),
        "two_factor": False,
        "status": "active",
        "joined_at": now,
        "last_active": "Active Now",
    })

    db.audit_logs.insert_one({
        "user_id": owner_id,
        "user_email": target_email,
        "action": f"New team member {full_name} ({target_email}) created account & joined as {inv.get('role_title')}",
        "ip": ip_addr,
        "created_at": now,
    })

    jwt_svc = JWTService()
    session_id = uuid.uuid4().hex
    access_token = jwt_svc.create_access_token(
        user_id=new_user_id,
        email=target_email,
        role="user",
        extra_claims={"session_id": session_id},
    )
    refresh_token = jwt_svc.create_refresh_token(
        user_id=new_user_id,
        session_id=session_id,
        token_version=0,
    )
    csrf_token = secrets.token_urlsafe(32)
    CookieService().set_auth_cookies(response, access_token, refresh_token, csrf_token, True)

    return success({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "csrf_token": csrf_token,
        "owner_id": owner_id,
        "user": {
            "id": new_user_id,
            "email": target_email,
            "name": full_name,
            "full_name": full_name,
            "role": "user",
            "onboarded": True,
        },
        "message": "Account created and joined workspace successfully!",
    })


@router.post("/invites/{invite_id}/resend")
async def resend_team_invite(invite_id: str, request: Request, user=Depends(get_current_user)):
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])

    query = {"owner_id": u_id, "status": "pending", "$or": [{"_id": invite_id}, {"id": invite_id}]}
    if ObjectId.is_valid(invite_id):
        query["$or"].append({"_id": ObjectId(invite_id)})

    inv = db.team_invites.find_one(query)
    if not inv:
        raise HTTPException(status_code=404, detail="Pending invitation not found.")

    now = datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invite_token(raw_token)
    db.team_invites.update_one(
        {"_id": inv["_id"]},
        {"$set": {"sent_at": now, "expires_at": now + timedelta(hours=48), "token_hash": token_hash}, "$unset": {"token": ""}},
    )

    invite_url = f"{_frontend_base_url(request)}/team/accept?token={raw_token}"
    email_sent = False
    if invite_url:
        email_sent = await asyncio.to_thread(
            AuthEmailService().send_team_invite_email,
            inv.get("email", ""),
            inv.get("name", ""),
            inv.get("owner_name") or user.get("name") or "Workspace Owner",
            inv.get("role_title", "Team Member"),
            inv.get("scope", "Global (All Domains & Sites)"),
            invite_url,
        )
    return success({
        "email_sent": bool(email_sent),
        "inviteUrl": invite_url,
        "message": (
            f"Invitation email re-sent to {inv.get('email')}!"
            if email_sent
            else f"Invitation refreshed for {inv.get('email')}."
        ),
    })


@router.put("/members/{member_id}")
async def update_team_member(member_id: str, body: UpdateMemberRequest, request: Request, user=Depends(get_current_user)):
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])

    if member_id == u_id:
        raise HTTPException(status_code=400, detail="Cannot alter permissions of the workspace owner.")

    query = {"owner_id": u_id, "$or": [{"_id": member_id}, {"id": member_id}]}
    if ObjectId.is_valid(member_id):
        query["$or"].append({"_id": ObjectId(member_id)})

    member = db.team_members.find_one(query)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")

    updates = {}
    if body.role_id:
        if body.role_id not in ("secops", "devops", "auditor"):
            raise HTTPException(status_code=400, detail="Invalid role_id.")
        updates["role_id"] = body.role_id
        updates["role_title"] = ROLE_TITLES[body.role_id]
    if body.scope is not None:
        updates["scope"] = body.scope if body.scope != "all" else "Global (All Domains & Sites)"
    if body.require_2fa is not None:
        updates["two_factor"] = body.require_2fa

    if updates:
        now = datetime.now(timezone.utc)
        updates["updated_at"] = now
        db.team_members.update_one({"_id": member["_id"]}, {"$set": updates})

        db.audit_logs.insert_one({
            "user_id": u_id,
            "user_email": user.get("email", ""),
            "action": f"Updated role/scope for team member {member.get('name')} ({member.get('email')})",
            "ip": _client_ip(request),
            "created_at": now,
        })

    return success(message="Team member permissions updated successfully.")


@router.post("/members/{member_id}/suspend")
async def toggle_suspend_team_member(member_id: str, request: Request, user=Depends(get_current_user)):
    """Temporarily suspend or reactivate a team member without deleting them."""
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])

    if member_id == u_id:
        raise HTTPException(status_code=400, detail="Cannot suspend the workspace owner.")

    query = {"owner_id": u_id, "$or": [{"_id": member_id}, {"id": member_id}]}
    if ObjectId.is_valid(member_id):
        query["$or"].append({"_id": ObjectId(member_id)})

    member = db.team_members.find_one(query)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")

    new_status = "active" if member.get("status") == "suspended" else "suspended"
    now = datetime.now(timezone.utc)
    db.team_members.update_one(
        {"_id": member["_id"]},
        {"$set": {"status": new_status, "updated_at": now}},
    )

    # If this user is a team-only account (0 own sites and no other active memberships),
    # toggle is_active on their user record so they cannot even log in while suspended.
    m_email = (member.get("email") or "").lower().strip()
    m_uid = str(member.get("member_user_id") or "")
    u_doc = None
    if m_uid and ObjectId.is_valid(m_uid):
        u_doc = db.users.find_one({"_id": ObjectId(m_uid)})
    if not u_doc and m_email:
        u_doc = db.users.find_one({"email": m_email})
    if u_doc and u_doc.get("role") == "user":
        uid_str = str(u_doc["_id"])
        own_sites = db.websites.count_documents({"$or": [{"user_id": uid_str}, {"user_id": u_doc["_id"]}]})
        other_active = db.team_members.count_documents({
            "owner_id": {"$ne": u_id},
            "status": "active",
            "$or": [{"member_user_id": uid_str}, {"email": m_email}],
        })
        if own_sites == 0 and other_active == 0:
            db.users.update_one(
                {"_id": u_doc["_id"]},
                {"$set": {"is_active": (new_status == "active")}, "$inc": {"token_version": 1}},
            )

    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": user.get("email", ""),
        "action": f"{'Suspended' if new_status == 'suspended' else 'Reactivated'} team member {member.get('name')} ({m_email})",
        "ip": _client_ip(request),
        "created_at": now,
    })

    return success({
        "status": new_status,
        "message": f"{member.get('name')} has been {'suspended' if new_status == 'suspended' else 'reactivated'}.",
    })


@router.delete("/members/{member_id}")
async def delete_team_member(member_id: str, request: Request, user=Depends(get_current_user)):
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])

    if member_id == u_id:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner.")

    query = {"owner_id": u_id, "$or": [{"_id": member_id}, {"id": member_id}]}
    if ObjectId.is_valid(member_id):
        query["$or"].append({"_id": ObjectId(member_id)})

    member = db.team_members.find_one(query)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")

    db.team_members.delete_one({"_id": member["_id"]})

    # Permanently remove team-only user account so revoked member cannot log in
    # and can be re-invited with fresh password setup later.
    m_email = (member.get("email") or "").lower().strip()
    m_uid = str(member.get("member_user_id") or "")
    u_doc = None
    if m_uid and ObjectId.is_valid(m_uid):
        u_doc = db.users.find_one({"_id": ObjectId(m_uid)})
    if not u_doc and m_email:
        u_doc = db.users.find_one({"email": m_email})
    if u_doc and u_doc.get("role") == "user":
        uid_str = str(u_doc["_id"])
        own_sites = db.websites.count_documents({"$or": [{"user_id": uid_str}, {"user_id": u_doc["_id"]}]})
        other_memberships = db.team_members.count_documents({
            "$or": [{"member_user_id": uid_str}, {"email": m_email}],
        })
        if own_sites == 0 and other_memberships == 0:
            db.users.delete_one({"_id": u_doc["_id"]})
            db.refresh_tokens.delete_many({"user_id": uid_str})

    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": user.get("email", ""),
        "action": f"Removed team member {member.get('name')} ({member.get('email')})",
        "ip": _client_ip(request),
        "created_at": datetime.now(timezone.utc),
    })

    return success(message="Team member revoked and removed successfully.")


@router.delete("/invites/{invite_id}")
async def revoke_team_invite(invite_id: str, request: Request, user=Depends(get_current_user)):
    _require_team_owner(user)
    db = MongoDB()
    u_id = str(user["id"])

    query = {"owner_id": u_id, "$or": [{"_id": invite_id}, {"id": invite_id}]}
    if ObjectId.is_valid(invite_id):
        query["$or"].append({"_id": ObjectId(invite_id)})

    inv = db.team_invites.find_one(query)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    db.team_invites.delete_one({"_id": inv["_id"]})

    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": user.get("email", ""),
        "action": f"Revoked team invitation for {inv.get('email')}",
        "ip": _client_ip(request),
        "created_at": datetime.now(timezone.utc),
    })

    return success(message=f"Invitation for {inv.get('email')} revoked successfully.")


@router.get("/audit")
async def list_team_audit_logs(user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])

    logs = []
    cursor = db.audit_logs.find({"user_id": u_id}).sort([("created_at", -1), ("timestamp", -1), ("_id", -1)]).limit(30)
    for log in cursor:
        c_at = log.get("created_at") or log.get("timestamp")
        time_str = c_at.strftime("%Y-%m-%d %H:%M:%S") if isinstance(c_at, datetime) else str(c_at or "Recent")
        raw_act = log.get("action", "Security Action")
        act_display = raw_act.replace("_", " ").title() if "_" in raw_act and not raw_act.startswith(("Invited", "Removed", "Updated", "Revoked", "Team member")) else raw_act
        logs.append({
            "id": str(log.get("_id", "")),
            "user": log.get("user_email") or user.get("email") or "Operator",
            "action": act_display,
            "timestamp": time_str,
            "ip": log.get("ip") or log.get("ip_address") or "127.0.0.1",
            "details": log.get("details", {}),
        })

    return success({"logs": logs})
