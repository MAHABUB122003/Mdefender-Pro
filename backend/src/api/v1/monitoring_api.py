"""v1 API: Real-time Performance, SSL & Uptime Monitoring.

Endpoints for live fleet monitoring, Core Web Vitals audits (Mobile & Desktop),
X.509 TLS certificate lifecycle inspection, and outage tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.services.monitoring_service import MonitoringService
from src.utils.api_response import success

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])
monitoring_svc = MonitoringService()


class AuditRequest(BaseModel):
    strategy: str = Field("all", description="Auditing device strategy: 'desktop', 'mobile', or 'all'")
    force: bool = Field(True, description="Force fresh network audit ignoring 15-minute cache")


@router.get("/overview")
async def get_monitoring_overview(user=Depends(get_current_user)):
    """Retrieve aggregate fleet monitoring metrics: uptime %, avg latency, SSL status."""
    user_id = str(user.get("id") or user.get("_id") or "")
    overview = monitoring_svc.get_fleet_overview(user_id=user_id, wp_only=True)
    return success(overview)


@router.get("/{website_id}/probe")
async def probe_single_website(website_id: str, user=Depends(get_current_user)):
    """Run an immediate real-time HTTP health & latency probe against target website."""
    website = get_owned_website(user, website_id)
    probe_res = monitoring_svc.probe_website_health(website)
    return success(probe_res)


@router.get("/{website_id}/performance")
async def get_performance_audit(
    website_id: str,
    strategy: str = Query("desktop", regex="^(desktop|mobile)$"),
    user=Depends(get_current_user)
):
    """Fetch the latest performance audit and Core Web Vitals for the specified website."""
    website = get_owned_website(user, website_id)
    audit = monitoring_svc.run_performance_audit(website, strategy=strategy, force=False)
    return success(audit)


@router.post("/{website_id}/performance/audit")
async def trigger_performance_audit(
    website_id: str,
    body: AuditRequest = AuditRequest(),
    user=Depends(get_current_user)
):
    """Run a fresh on-demand Mobile & Desktop Core Web Vitals audit."""
    website = get_owned_website(user, website_id)
    strategy = body.strategy.lower()

    if strategy in ("desktop", "mobile"):
        result = monitoring_svc.run_performance_audit(website, strategy=strategy, force=body.force)
        return success(result)
    else:
        # Audit both desktop and mobile
        desktop_res = monitoring_svc.run_performance_audit(website, strategy="desktop", force=body.force)
        mobile_res = monitoring_svc.run_performance_audit(website, strategy="mobile", force=body.force)
        return success({
            "desktop": desktop_res,
            "mobile": mobile_res
        })


@router.get("/{website_id}/ssl")
async def get_ssl_status(website_id: str, user=Depends(get_current_user)):
    """Retrieve real X.509 SSL certificate validity, issuer, days remaining, and TLS cipher."""
    website = get_owned_website(user, website_id)
    ssl_data = monitoring_svc.probe_ssl_certificate(website)
    return success(ssl_data)


@router.post("/{website_id}/ssl/probe")
async def probe_ssl_handshake(website_id: str, user=Depends(get_current_user)):
    """Force an active TLS socket handshake probe and refresh SSL telemetry."""
    website = get_owned_website(user, website_id)
    ssl_data = monitoring_svc.probe_ssl_certificate(website)
    return success(ssl_data)


@router.get("/{website_id}/incidents")
async def get_incidents_log(website_id: str, limit: int = Query(15, ge=1, le=50), user=Depends(get_current_user)):
    """Retrieve real downtime incidents and outage reports for this website."""
    website = get_owned_website(user, website_id)
    domain = website.get("domain") or website.get("url") or website_id
    incidents = monitoring_svc.get_incidents(domain, limit=limit)
    return success(incidents)

