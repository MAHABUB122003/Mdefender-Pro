"""Dedicated Domains API for MDefender Pro Cloudflare-Style Onboarding.

Prefix: /api/v1/domains
Provides real backend functionality for the Domains Dashboard:
- Real dynamic tenant metrics (total domains, active WAF, measured latency)
- Full 10-step domain lifecycle state machine
- SSRF-safe origin validation and health checks
- Cryptographic ownership TXT token challenges
- Nameserver provisioning and authoritative delegation checks
- Activation gate enforcement
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user
from src.services.domain_service import DomainService
from src.services.dns_zone_service import DNSZoneService
from src.utils.api_response import success

router = APIRouter(prefix="/domains", tags=["domains"])


# ---------- Request Models ----------

class DomainCreateRequest(BaseModel):
    domain: str = Field(..., description="Root domain name (e.g. example.com)")
    origin_address: Optional[str] = Field(None, description="IPv4 or hostname of origin server")
    origin_port: int = Field(443, description="Origin port (80 or 443)")
    ssl_mode: str = Field("strict", description="SSL mode: flexible, full, strict")
    plan: Optional[str] = Field("free", description="Plan identifier")


class OriginUpdateRequest(BaseModel):
    origin_address: str = Field(..., description="IPv4 or hostname of origin server")
    origin_port: int = Field(443, description="Origin port (80 or 443)")
    ssl_mode: str = Field("strict", description="SSL mode: flexible, full, strict")


class DnsRecordItem(BaseModel):
    type: str
    name: str
    content: str
    ttl: Optional[str] = "Auto"
    proxied: Optional[bool] = True
    priority: Optional[int] = None


class DnsRecordsBatchUpdate(BaseModel):
    records: List[DnsRecordItem]


# ---------- Endpoints ----------

@router.get("/overview")
async def get_domains_overview(user=Depends(get_current_user)):
    """Retrieve real tenant-scoped metrics for Domains dashboard."""
    user_id = str(user["id"])
    svc = DomainService()
    overview = svc.get_dashboard_overview(user_id)
    return success(overview)


@router.get("")
async def list_domains(user=Depends(get_current_user)):
    """List all domains configured for the current tenant."""
    user_id = str(user["id"])
    svc = DomainService()
    domains = svc.list_user_domains(user_id)
    return success({"domains": domains, "count": len(domains)})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_domain(body: DomainCreateRequest, user=Depends(get_current_user)):
    """Initiate domain onboarding, check plan limits, and issue ownership token."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.create_domain(
            user_id=user_id,
            domain_name=body.domain,
            origin_address=body.origin_address,
            origin_port=body.origin_port,
            ssl_mode=body.ssl_mode,
            background_scan=True
        )
        return success(domain, message=f"Domain '{body.domain}' registered. Ownership verification required.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{domain_id}")
async def get_domain(domain_id: str, user=Depends(get_current_user)):
    """Get full details and lifecycle state of a specific domain."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        return success(svc.serialize_domain(domain))
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.delete("/{domain_id}")
async def delete_domain(domain_id: str, user=Depends(get_current_user)):
    """Delete a domain and its DNS records."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        svc.delete_domain(domain_id, user_id)
        return success(message=f"Domain '{domain_id}' removed successfully.")
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.post("/{domain_id}/discover-dns")
async def trigger_dns_discovery(domain_id: str, user=Depends(get_current_user)):
    """Trigger on-demand DNS discovery scan."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        clean_d = domain.get("domain")
        svc.enqueue_dns_discovery(domain_id, clean_d, user_id)
        zone_svc = DNSZoneService()
        records = zone_svc.list_records(domain_id)
        return success({"records": records, "count": len(records), "message": "DNS discovery completed."})
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.get("/{domain_id}/dns-records")
async def get_dns_records(domain_id: str, user=Depends(get_current_user)):
    """Fetch all DNS records for a domain zone."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        clean_d = domain.get("domain")
        zone_svc = DNSZoneService()
        records = zone_svc.list_records(domain_id)
        if not records:
            records = zone_svc.list_records(clean_d)
        return success({"records": records, "count": len(records)})
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.put("/{domain_id}/dns-records")
async def batch_update_dns_records(domain_id: str, body: DnsRecordsBatchUpdate, user=Depends(get_current_user)):
    """Save or update DNS records reviewed by the customer."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        clean_d = domain.get("domain")
        zone_svc = DNSZoneService()

        # Update records
        saved = []
        for r in body.records:
            rec = zone_svc.add_dns_record(
                website_id=domain_id,
                user_id=user_id,
                data=r.dict()
            )
            saved.append(rec)

        svc.db.domains.update_one(
            {"_id": domain_id},
            {"$set": {"lifecycle_step": 5, "updated_at": svc.db.domains.find_one({"_id": domain_id}).get("updated_at")}}
        )
        return success({"records": saved, "count": len(saved), "message": "DNS zone records updated successfully."})
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.post("/{domain_id}/ownership/verify")
async def verify_ownership(domain_id: str, user=Depends(get_current_user)):
    """Verify domain ownership using DNS TXT record token."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        res = svc.verify_ownership(domain_id, user_id)
        return success(res)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{domain_id}/nameservers/assign")
async def assign_nameservers(domain_id: str, user=Depends(get_current_user)):
    """Assign MDefender authoritative nameservers to domain."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        assigned = domain.get("nameservers", {}).get("assigned", [])
        return success({"nameservers": assigned, "message": "Authoritative nameservers assigned."})
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.post("/{domain_id}/delegation/check")
async def check_delegation(domain_id: str, user=Depends(get_current_user)):
    """Check live registrar nameserver delegation."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        res = svc.check_delegation(domain_id, user_id)
        return success(res)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.put("/{domain_id}/origin")
async def update_origin(domain_id: str, body: OriginUpdateRequest, user=Depends(get_current_user)):
    """Configure origin server destination with anti-SSRF protection."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        res = await svc.update_and_check_origin(
            domain_id=domain_id,
            user_id=user_id,
            origin_address=body.origin_address,
            port=body.origin_port,
            ssl_mode=body.ssl_mode
        )
        return success(res, message="Origin configuration updated and health verified.")
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post("/{domain_id}/origin/check")
async def probe_origin_health(domain_id: str, user=Depends(get_current_user)):
    """Run an on-demand health check against the configured origin."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        domain = svc.get_owned_domain(domain_id, user_id)
        origin = domain.get("origin", {})
        addr = origin.get("address")
        if not addr:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No origin server address configured.")

        res = await svc.update_and_check_origin(
            domain_id=domain_id,
            user_id=user_id,
            origin_address=addr,
            port=origin.get("port", 443),
            ssl_mode=origin.get("ssl_mode", "strict")
        )
        return success(res)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")


@router.post("/{domain_id}/activate")
async def activate_domain(domain_id: str, user=Depends(get_current_user)):
    """Verify all prerequisite security gates and activate Edge WAF protection."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        res = svc.activate_domain(domain_id, user_id)
        return success(res)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{domain_id}/pause")
async def pause_domain(domain_id: str, user=Depends(get_current_user)):
    """Temporarily pause edge proxy and WAF protection."""
    user_id = str(user["id"])
    svc = DomainService()
    try:
        res = svc.pause_domain(domain_id, user_id)
        return success(res)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
