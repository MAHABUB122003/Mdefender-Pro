"""v1 API: user notifications.

All notifications are dashboard-first (in-app). Email/webhook are per-user
preferences that default to safe values; the service is wired to the WAF and
malware scan pipelines so the dashboards show real events.
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from src.auth.audit_service import AuditService
from src.auth.dependencies import get_current_user
from src.services.notification_service import NotificationService
from src.utils.api_response import success

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(request: Request, unread_only: bool = False,
                             user=Depends(get_current_user)):
    params = dict(request.query_params)
    limit = int(params.get("limit", 50))
    service = NotificationService()
    items = service.list(user["id"], limit=limit, unread_only=unread_only)
    return success({"notifications": items, "unread": service.unread_count(user["id"])})


@router.get("/unread-count")
async def unread_count(user=Depends(get_current_user)):
    return success({"unread": NotificationService().unread_count(user["id"])})


@router.get("/preferences")
async def get_preferences(user=Depends(get_current_user)):
    return success({"preferences": NotificationService().get_preferences(user["id"])})


@router.put("/preferences")
async def save_preferences(request: Request, user=Depends(get_current_user)):
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
    service = NotificationService()
    title = "MDefender Pro Security Verification Test"
    message = "Synthetic security incident dispatch test successfully verified notification routing."
    service.notify(
        user_id=user["id"],
        title=title,
        message=message,
        category="critical_attack",
        data={"test": True, "sender": "Security Operations Gateway", "website_domain": "All Protected Domains"},
        force=True
    )
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="test_alert_dispatched",
        ip_address=ip,
        details={"title": title, "category": "critical_attack"}
    )
    return success(message="Test security alert dispatched successfully.")


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
