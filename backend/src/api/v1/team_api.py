"""v1 REST API: Workspace Team & Role-Based Access Control (RBAC).

Allows the workspace owner to view team members, invite new operators (SecOps, DevOps, Auditor),
manage permissions, and inspect security audit logs.
"""

from datetime import datetime
import uuid
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.services.plan_service import PLAN_LIMITS
from src.utils.api_response import success

router = APIRouter(prefix="/team", tags=["Team"])


class InviteMemberRequest(BaseModel):
    name: str
    email: EmailStr
    role_id: str = "secops"
    scope: str = "all"
    require_2fa: bool = True


@router.get("/members")
async def list_team_members(user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])
    owner_email = user.get("email", "")
    owner_name = user.get("name") or user.get("full_name") or owner_email.split("@")[0].title()

    # Determine plan seat limit
    user_plan = (user.get("plan") or "free").lower()
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])
    seats_total = limits.get("team_seats", 1)

    # 1. Primary Owner Member
    owner_member = {
        "id": u_id,
        "name": f"{owner_name} (You)",
        "email": owner_email,
        "roleId": "owner",
        "roleTitle": "Super Admin (Owner)",
        "scope": "Global (All Domains & Sites)",
        "twoFactor": bool(user.get("mfa_enabled", False)),
        "lastActive": "Active Now",
        "isOwner": True,
        "joinedAt": user.get("created_at", datetime.now()).strftime("%Y-%m-%d") if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", "2026-01-01"))[:10],
    }

    # 2. Additional Workspace Members from db.team_members
    additional_members = []
    for tm in db.team_members.find({"owner_id": u_id}):
        m_id = str(tm.get("_id", tm.get("id", "")))
        additional_members.append({
            "id": m_id,
            "name": tm.get("name", "Team Member"),
            "email": tm.get("email", ""),
            "roleId": tm.get("role_id", "secops"),
            "roleTitle": tm.get("role_title", "Security Operations (SecOps)"),
            "scope": tm.get("scope", "Global (All Domains & Sites)"),
            "twoFactor": bool(tm.get("two_factor", True)),
            "lastActive": tm.get("last_active", "Just joined"),
            "isOwner": False,
            "joinedAt": str(tm.get("joined_at", datetime.now().strftime("%Y-%m-%d")))[:10],
        })

    all_members = [owner_member] + additional_members

    # 3. Pending Invites
    pending_invites = []
    for inv in db.team_invites.find({"owner_id": u_id, "status": "pending"}):
        pending_invites.append({
            "id": str(inv.get("_id", "")),
            "email": inv.get("email", ""),
            "name": inv.get("name", ""),
            "roleId": inv.get("role_id", "secops"),
            "roleTitle": inv.get("role_title", "Security Operations"),
            "scope": inv.get("scope", "Global (All Domains)"),
            "invitedBy": owner_email,
            "sentAt": str(inv.get("sent_at", datetime.now().strftime("%Y-%m-%d")))[:10],
            "expiresIn": "7 days",
        })

    return success({
        "members": all_members,
        "pending_invites": pending_invites,
        "seats_total": seats_total,
        "seats_used": len(all_members),
    })


@router.post("/invite")
async def invite_team_member(body: InviteMemberRequest, user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])
    owner_email = user.get("email", "")

    user_plan = (user.get("plan") or "free").lower()
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])
    seats_total = limits.get("team_seats", 1)

    existing_members_count = db.team_members.count_documents({"owner_id": u_id}) + 1  # +1 for owner
    if existing_members_count >= seats_total:
        raise HTTPException(
            status_code=403,
            detail=f"Team seat limit reached ({seats_total} seats). Please upgrade your subscription plan to add more team members.",
        )

    # Check for duplicate member
    if body.email.lower() == owner_email.lower():
        raise HTTPException(status_code=400, detail="Cannot invite yourself as a team member.")
    if db.team_members.find_one({"owner_id": u_id, "email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="A team member with this email already exists.")

    role_titles = {
        "secops": "Security Operations (SecOps)",
        "devops": "DevOps & Infrastructure Engineer",
        "auditor": "Security Compliance Auditor",
    }
    role_title = role_titles.get(body.role_id, "Security Operations")

    now = datetime.now()
    member_id = f"usr-{uuid.uuid4().hex[:8]}"
    new_member = {
        "_id": member_id,
        "id": member_id,
        "owner_id": u_id,
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "role_id": body.role_id,
        "role_title": role_title,
        "scope": body.scope if body.scope != "all" else "Global (All Domains & Sites)",
        "two_factor": body.require_2fa,
        "status": "active",
        "joined_at": now,
        "last_active": "Active Now",
    }
    db.team_members.insert_one(new_member)

    # Log audit event
    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": owner_email,
        "action": f"Invited team member {body.name} ({body.email}) as {role_title}",
        "ip": "127.0.0.1",
        "created_at": now,
    })

    return success({
        "member": {
            "id": member_id,
            "name": body.name,
            "email": body.email,
            "roleId": body.role_id,
            "roleTitle": role_title,
            "scope": new_member["scope"],
            "twoFactor": body.require_2fa,
            "lastActive": "Just joined",
            "isOwner": False,
            "joinedAt": now.strftime("%Y-%m-%d"),
        },
        "message": f"Successfully added {body.name} to workspace team.",
    })


@router.delete("/members/{member_id}")
async def delete_team_member(member_id: str, user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])

    if member_id == u_id:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner.")

    member = db.team_members.find_one({"_id": member_id, "owner_id": u_id}) or db.team_members.find_one({"id": member_id, "owner_id": u_id})
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")

    db.team_members.delete_one({"_id": member["_id"]})

    # Log audit event
    db.audit_logs.insert_one({
        "user_id": u_id,
        "user_email": user.get("email", ""),
        "action": f"Removed team member {member.get('name')} ({member.get('email')})",
        "ip": "127.0.0.1",
        "created_at": datetime.now(),
    })

    return success(message="Team member removed successfully.")


@router.get("/audit")
async def list_team_audit_logs(user=Depends(get_current_user)):
    db = MongoDB()
    u_id = str(user["id"])

    logs = []
    for log in db.audit_logs.find({"user_id": u_id}).sort("created_at", -1).limit(20):
        c_at = log.get("created_at")
        time_str = c_at.strftime("%Y-%m-%d %H:%M:%S") if isinstance(c_at, datetime) else str(c_at or "Recent")
        logs.append({
            "id": str(log.get("_id", "")),
            "user": log.get("user_email") or user.get("name") or "Operator",
            "action": log.get("action", "Security Action"),
            "timestamp": time_str,
            "ip": log.get("ip", "127.0.0.1"),
        })

    return success({"logs": logs})
