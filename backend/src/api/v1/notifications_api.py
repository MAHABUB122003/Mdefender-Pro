"""v1 API: user notifications.

All notifications are dashboard-first (in-app). Email/webhook are per-user
preferences that default to safe values; the service is wired to the WAF and
malware scan pipelines so the dashboards show real events.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
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
    return success({"preferences": prefs})


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user=Depends(get_current_user)):
    result = NotificationService().mark_read(user["id"], notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return success(message="Marked as read")


@router.post("/read-all")
async def read_all(user=Depends(get_current_user)):
    NotificationService().mark_read(user["id"], all_read=True)
    return success(message="All notifications marked as read")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user=Depends(get_current_user)):
    result = NotificationService().delete(user["id"], notification_id)
    if not result or result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return success(message="Notification deleted")
