"""v1 API: Executive Security Reports & Automated Digest Schedules.

Zero origin load & zero PDF blob storage:
- Reports aggregate exclusively from already-cached MongoDB telemetry.
- Only lightweight (~300-byte) digest schedules are stored in `report_schedules`.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from src.auth.audit_service import AuditService
from src.auth.dependencies import get_current_user
from src.services.report_service import ReportService
from src.utils.api_response import success

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/generate")
async def generate_report(
    website_id: str = Query("all"),
    period: str = Query("30d"),
    user=Depends(get_current_user),
):
    report = ReportService().generate_executive_report(
        user=user,
        website_id=website_id,
        period=period,
    )
    return success({"report": report})


@router.get("/schedules")
async def list_schedules(user=Depends(get_current_user)):
    schedules = ReportService().list_schedules(user["id"])
    return success({"schedules": schedules})


@router.post("/schedules")
async def create_schedule(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    schedule = ReportService().create_schedule(user=user, data=body)
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="report_schedule_created",
        ip_address=ip,
        details={
            "schedule_id": schedule["id"],
            "name": schedule["name"],
            "frequency": schedule["frequency"],
            "website_id": schedule["website_id"],
        },
    )
    return success({"schedule": schedule}, message="Automated report digest scheduled.")


@router.patch("/schedules/{schedule_id}")
@router.put("/schedules/{schedule_id}")
async def update_schedule(
    schedule_id: str, request: Request, user=Depends(get_current_user)
):
    body = await request.json()
    updated = ReportService().update_schedule(
        user_id=user["id"], schedule_id=schedule_id, data=body
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Report schedule not found")
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="report_schedule_updated",
        ip_address=ip,
        details={"schedule_id": schedule_id, "enabled": updated.get("enabled")},
    )
    return success({"schedule": updated})


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str, request: Request, user=Depends(get_current_user)
):
    ok = ReportService().delete_schedule(user_id=user["id"], schedule_id=schedule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Report schedule not found")
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="report_schedule_deleted",
        ip_address=ip,
        details={"schedule_id": schedule_id},
    )
    return success(message="Report schedule removed.")


@router.post("/schedules/{schedule_id}/run-now")
async def dispatch_schedule_now(
    schedule_id: str, request: Request, user=Depends(get_current_user)
):
    updated = ReportService().dispatch_schedule_now(user=user, schedule_id=schedule_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Report schedule not found")
    ip = request.client.host if request.client else "127.0.0.1"
    AuditService().log(
        user_id=user["id"],
        action="report_digest_dispatched_manual",
        ip_address=ip,
        details={"schedule_id": schedule_id, "status": updated.get("last_status")},
    )
    return success({"schedule": updated}, message="Executive digest report dispatched via email.")

