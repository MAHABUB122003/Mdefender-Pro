"""v1 API: user notifications.

All notifications are dashboard-first (in-app). Email/webhook are per-user
preferences that default to safe values; the service is wired to the WAF and
malware scan pipelines so the dashboards show real events.
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from src.auth.audit_service import AuditService
from src.auth.dependencies import get_current_user
from src.api.v1.deps import filter_sites_by_team_scope
from src.database.mongodb_connection import MongoDB
from src.services.notification_service import NotificationService
from src.utils.api_response import success

router = APIRouter(prefix="/notifications", tags=["Notifications"])

_OWNER_ONLY_NOTIF_CATEGORIES = {
    "api_key_revoked",
    "subscription_expired",
    "trial_reminder",
    "trial_expired",
    "subscription_renewal",
}


def _filter_notifications_for_team(user: dict, items: list) -> list:
    """Restrict notifications to the team member's assigned team_scope and strip owner-only billing/key alerts."""
    if not user or not user.get("team_member_context"):
        return items

    raw_scope = (user.get("team_scope") or "all").strip()
    is_global = not raw_scope or raw_scope.lower() == "all" or raw_scope.lower().startswith("global")

    allowed_tokens = set()
    if not is_global:
        db = MongoDB()
        owner_id = str(user.get("id") or user.get("_id") or "")
        u_conds = [{"user_id": owner_id}]
        if ObjectId.is_valid(owner_id):
            u_conds.append({"user_id": ObjectId(owner_id)})
        owner_sites = list(db.websites.find({"$or": u_conds}))
        scoped_sites = filter_sites_by_team_scope(user, owner_sites)
        for tok in raw_scope.split(","):
            t = tok.strip().lower()
            if t:
                allowed_tokens.add(t)
                clean_t = t.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
                if clean_t:
                    allowed_tokens.add(clean_t)
        for s in scoped_sites:
            for key in ("_id", "id", "website_id", "domain", "url", "name"):
                val = str(s.get(key) or "").strip().lower()
                if val:
                    allowed_tokens.add(val)
                    clean = val.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
                    if clean:
                        allowed_tokens.add(clean)

    filtered = []
    for item in items:
        cat = str(item.get("category") or item.get("type") or "").lower()
        if cat in _OWNER_ONLY_NOTIF_CATEGORIES:
            continue
        if is_global:
            filtered.append(item)
            continue
        data = item.get("data") if isinstance(item.get("data"), dict) else {}
        item_tokens = set()
        for k in ("website_id", "site_id", "website_domain", "domain", "site"):
            v = str(item.get(k) or data.get(k) or "").strip().lower()
            if v:
                item_tokens.add(v)
                clean = v.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
                if clean:
                    item_tokens.add(clean)
        if item_tokens & allowed_tokens:
            filtered.append(item)
    return filtered


@router.get("")
async def list_notifications(request: Request, unread_only: bool = False,
                             user=Depends(get_current_user)):
    params = dict(request.query_params)
    limit = int(params.get("limit", 50))
    service = NotificationService()
    fetch_limit = max(limit * 3, 100) if user.get("team_member_context") else limit
    items = service.list(user["id"], limit=fetch_limit, unread_only=unread_only)
    items = _filter_notifications_for_team(user, items)[:limit]
    if user.get("team_member_context"):
        unread = sum(1 for i in items if not i.get("read"))
    else:
        unread = service.unread_count(user["id"])
    return success({"notifications": items, "unread": unread})


@router.get("/unread-count")
async def unread_count(user=Depends(get_current_user)):
    service = NotificationService()
    if user.get("team_member_context"):
        items = _filter_notifications_for_team(user, service.list(user["id"], limit=100, unread_only=True))
        return success({"unread": len(items)})
    return success({"unread": service.unread_count(user["id"])})


@router.get("/preferences")
async def get_preferences(user=Depends(get_current_user)):
    prefs = dict(NotificationService().get_preferences(user["id"]) or {})
    if user.get("team_member_context"):
        for secret_k in ("webhook_url", "webhook_secret", "primary_email", "secondary_email"):
            if secret_k in prefs:
                prefs[secret_k] = ""
    return success({"preferences": prefs})


@router.put("/preferences")
async def save_preferences(request: Request, user=Depends(get_current_user)):
    if user.get("team_member_context"):
        raise HTTPException(status_code=403, detail="Notification preferences and webhooks are restricted to the Workspace Owner.")
    body = await request.json()
    prefs = NotificationService().save_preferences(user["id"], body)
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="notification_preferences_updated",
        ip_address=ip,
        details={"webhook_enabled": body.get("webhook"), "webhook_url": body.get("webhook_url")}
    )
    return success({"preferences": prefs})


@router.post("/test")
async def send_test_notification(request: Request, user=Depends(get_current_user)):
    if user.get("team_member_context"):
        raise HTTPException(status_code=403, detail="Test alert dispatch is restricted to the Workspace Owner.")
    service = NotificationService()
    title = "MDefender Pro Security Verification Test"
    message = "Synthetic security incident dispatch test successfully verified dashboard, email, and webhook routing."
    service.notify(
        user_id=user["id"],
        title=title,
        message=message,
        category="website_connected",
        data={"test": True, "sender": "Security Operations Gateway", "website_domain": "All Protected Domains"},
        force=True
    )
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="test_alert_dispatched",
        ip_address=ip,
        details={"title": title, "category": "test"}
    )
    return success(message="Test security alert dispatched to dashboard & configured email.")


@router.post("/test-webhook")
async def test_webhook_endpoint(request: Request, user=Depends(get_current_user)):
    if user.get("team_member_context"):
        raise HTTPException(status_code=403, detail="Webhook testing is restricted to the Workspace Owner.")
    body = await request.json()
    service = NotificationService()
    prefs = service.get_preferences(user["id"])
    url = (body.get("webhook_url") or prefs.get("webhook_url") or "").strip()
    secret = (body.get("webhook_secret") or prefs.get("webhook_secret") or "").strip()
    ok, msg = service.test_webhook_sync(user["id"], url, secret)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return success(message=msg)


@router.post("/read-all")
async def read_all(request: Request, user=Depends(get_current_user)):
    NotificationService().mark_read(user["id"], all_read=True)
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="all_notifications_read",
        ip_address=ip
    )
    return success(message="All notifications marked as read")


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, request: Request, user=Depends(get_current_user)):
    service = NotificationService()
    result = service.mark_read(user["id"], notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify notification actually belongs to user
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="notification_marked_read",
        ip_address=ip,
        details={"notification_id": notification_id}
    )
    return success(message="Marked as read")


@router.delete("/clear")
@router.delete("")
async def clear_all_notifications(request: Request, user=Depends(get_current_user)):
    NotificationService().delete_all(user["id"])
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="all_notifications_cleared",
        ip_address=ip
    )
    return success(message="All notifications cleared")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, request: Request, user=Depends(get_current_user)):
    result = NotificationService().delete(user["id"], notification_id)
    if not result or result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="notification_deleted",
        ip_address=ip,
        details={"notification_id": notification_id}
    )
    return success(message="Notification deleted")
