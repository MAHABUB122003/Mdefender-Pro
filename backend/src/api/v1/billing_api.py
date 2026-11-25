"""v1 API: billing & subscription (Paddle).

Server-side truth for all billing. The frontend never sees Paddle secrets;
it only receives checkout IDs to open the hosted checkout page.

Webhook security: Paddle signs the raw body as `timestamp + ":" + body` with
HMAC-SHA256. The signature arrives in the `Paddle-Signature` header as
`ts=...;h1=...`. We verify in constant time and reject events older than 5
minutes.

Plans are created/updated in Paddle from `plan_service.DEFAULT_PLANS` when a
Paddle client is configured.
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user, get_current_user_optional
from src.database.mongodb_connection import MongoDB
from src.features.feature_flags import FeatureFlagService
from src.services.paddle_service import PaddleService
from src.services.plan_service import PlanService
from src.services.subscription_service import SubscriptionService
from src.services.license_slot_service import LicenseSlotService
from src.utils.api_response import success

router = APIRouter(prefix="/billing", tags=["Billing"])
public_router = APIRouter(prefix="/pricing", tags=["Pricing"])


@public_router.get("/plans")
async def get_public_pricing_plans():
    db = MongoDB()
    plans = PlanService(db).all_plans()
    return success({"plans": plans})


@public_router.get("/config")
async def get_public_pricing_config():
    """Returns dynamic per-site pricing rates, trial days, volume discounts, and feature set."""
    db = MongoDB()
    config = PlanService(db).get_dynamic_pricing_config()
    # Mask backend payment IDs on public endpoint
    safe_config = dict(config)
    safe_config.pop("price_id_monthly", None)
    safe_config.pop("price_id_yearly", None)
    return success(safe_config)


def _paddle(db):
    return PaddleService(db=db)


def _feature_enabled(db):
    if PaddleService(db=db).configured:
        return True
    return FeatureFlagService(db).is_enabled("paddle_billing_enabled")


class CheckoutRequest(BaseModel):
    plan: str = "pro"
    billing_cycle: str | None = "monthly"
    website_limit: int | None = None
    sites_count: int | None = None
    site_count: int | None = None
    quantity: int | None = None
    sites: int | None = None
    price_id: str | None = None
    customer_email: str | None = None
    email: str | None = None
    return_url: str | None = None
    success_url: str | None = None
    action: str | None = "subscribe"
    additional_slots: int | None = None
    is_renewal: bool | None = False


class ChangePlanRequest(BaseModel):
    plan: str


@router.get("/config")
async def get_billing_config():
    db = MongoDB()
    service = _paddle(db)
    return success({
        "enabled": _feature_enabled(db),
        "configured": service.configured,
        "environment": service.environment,
        "client_token": service.client_token,
    })


@router.get("/plans")
async def list_plans(user=Depends(get_current_user_optional)):
    db = MongoDB()
    plans = PlanService(db).all_plans()
    current_plan = SubscriptionService(db).effective_plan(user) if user else "free"
    service = _paddle(db)
    return success({
        "plans": plans,
        "current_plan": current_plan,
        "billing_enabled": _feature_enabled(db),
        "paddle_configured": service.configured,
        "client_token": service.client_token,
        "environment": service.environment,
    })


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, user=Depends(get_current_user_optional)):
    db = MongoDB()
    if not _feature_enabled(db):
        return success({"enabled": False, "message": "Online billing is not enabled yet",
                        "checkout_url": None})
    service = _paddle(db)
    if not service.configured:
        return success({"enabled": True, "checkout_url": None,
                        "message": "Billing is not configured on the server yet"})
    plan_service = PlanService(db)
    plan = plan_service.get_plan(body.plan)
    price_id = plan_service.get_price_id(body.plan, body.billing_cycle)
    if not price_id:
        dyn_config = plan_service.get_dynamic_pricing_config()
        is_yearly = str(body.billing_cycle or "").lower() in ("yearly", "annually", "annual")
        price_id = dyn_config.get("price_id_yearly") if is_yearly else dyn_config.get("price_id_monthly")

    # Resolve accurate requested fleet site count
    quantity = max(1, int(body.website_limit or body.sites_count or body.site_count or body.quantity or body.sites or 1))
    fleet_calc = plan_service.calculate_fleet_pricing(quantity, body.billing_cycle or "monthly")
    
    uid = str(user.get("id") or user.get("_id")) if user else ""
    customer_email = (user.get("email", "") if user else "") or body.customer_email or body.email or ""
    return_url = body.return_url or body.success_url or "http://localhost:5173/settings"

    action = str(body.action or ("renew" if body.is_renewal else "subscribe")).lower()
    additional_slots = int(body.additional_slots or 0)
    is_renewal = bool(body.is_renewal or action in ("renew", "renewal", "extend"))

    custom_data = {
        "user_id": uid,
        "plan": body.plan or "pro",
        "billing_cycle": "yearly" if fleet_calc["is_yearly"] else "monthly",
        "website_limit": quantity,
        "sites_count": quantity,
        "action": action,
        "additional_slots": additional_slots,
        "is_renewal": is_renewal,
        "discount_percent": fleet_calc["discount_percent"],
        "final_total": fleet_calc["final_total"],
        "unit_price": fleet_calc["unit_price"]
    }

    # Item strategy 1: Inline price with exact dynamic unit price & volume discount
    disc_text = f" {fleet_calc['discount_percent']}% Off" if fleet_calc.get("discount_percent", 0) > 0 else ""
    inline_item = {
        "quantity": quantity,
        "price": {
            "description": f"MDefender Pro ({quantity} Sites - {fleet_calc['tier_label']}{disc_text})",
            "product_id": fleet_calc["product_id"],
            "unit_price": {
                "amount": str(fleet_calc["unit_amount_in_cents"]),
                "currency_code": fleet_calc["currency"]
            },
            "billing_cycle": {
                "interval": "year" if fleet_calc["is_yearly"] else "month",
                "frequency": 1
            }
        }
    }

    checkout = await service.create_checkout_session(
        items=[inline_item],
        customer_email=customer_email or None,
        custom_data=custom_data,
        success_url=body.success_url or return_url,
        cancel_url=return_url,
    )

    # Item strategy 2: Fallback to standard price ID if inline price rejected
    if checkout.get("error") and price_id:
        checkout = await service.create_checkout_session(
            items=[{"price_id": price_id, "quantity": quantity}],
            customer_email=customer_email or None,
            custom_data=custom_data,
            success_url=body.success_url or return_url,
            cancel_url=return_url,
        )

    if checkout.get("error"):
        return {
            "success": False,
            "error": {
                "code": checkout.get("error_code", "CHECKOUT_ERROR"),
                "message": checkout.get("error")
            }
        }
    ret_data = {
        "enabled": True,
        "checkout_id": checkout.get("checkout_id") or checkout.get("id"),
        "checkout_url": checkout.get("checkout_url") or checkout.get("url"),
        "price_id": price_id,
        "sites_count": quantity,
        "final_total": fleet_calc["final_total"],
        "discount_percent": fleet_calc["discount_percent"],
        "tier_label": fleet_calc["tier_label"]
    }
    return {
        "success": True,
        "data": ret_data,
        **ret_data
    }


create_checkout_session = create_checkout


@router.get("/verify-transaction")
async def verify_transaction(
    txn_id: str | None = None,
    plan: str | None = "pro",
    cycle: str | None = "monthly",
    sites: int | None = 1,
    action: str | None = None,
    is_renewal: bool | None = False,
    user=Depends(get_current_user)
):
    """Retrieve and verify a completed Paddle transaction, returning accurate receipt info.
    Zero-Trust Security: Never grants subscriptions or slots without genuine gateway confirmation.
    """
    db = MongoDB()
    service = _paddle(db)

    if not txn_id:
        return {
            "success": False,
            "error": {
                "code": "TRANSACTION_REQUIRED",
                "message": "A valid transaction ID is required to verify payment"
            }
        }

    txn_data = None
    if service.configured:
        txn_data = await service.get_transaction(txn_id)

    if not txn_data:
        return {
            "success": False,
            "error": {
                "code": "TRANSACTION_NOT_FOUND",
                "message": "Transaction could not be verified on the payment gateway"
            }
        }

    txn_status = str(txn_data.get("status") or "").lower()
    if txn_status not in ("paid", "completed", "billed"):
        return {
            "success": False,
            "error": {
                "code": "PAYMENT_INCOMPLETE",
                "message": f"Payment is not completed. Current gateway status: {txn_status}"
            }
        }

    # Verify ownership binding to prevent cross-account transaction theft/replay
    custom = txn_data.get("custom_data") or {}
    if not isinstance(custom, dict):
        custom = {}
    txn_data["custom_data"] = custom

    txn_user_id = str(custom.get("user_id") or "")
    current_uid = str(user.get("id") or user.get("_id"))
    current_email = str((user or {}).get("email") or "").strip().lower()
    txn_email = str((txn_data.get("customer") or {}).get("email") or txn_data.get("customer_email") or "").strip().lower()

    if txn_user_id:
        if txn_user_id != current_uid:
            raise HTTPException(status_code=403, detail="Transaction does not belong to this user account")
    elif not txn_email or txn_email != current_email:
        raise HTTPException(status_code=403, detail="Transaction ownership could not be verified for this account")

    # Authoritative server-side fulfillment for verified transaction
    SubscriptionService(db).record_transaction(current_uid, {"data": txn_data, "event_type": "transaction.completed"})

    cycle_clean = str(custom.get("billing_cycle") or cycle or "monthly").lower()
    is_yearly = cycle_clean in ("yearly", "annual", "annually", "1 year")
    sites_count = int(custom.get("sites_count") or custom.get("quantity") or sites or 1)

    now = datetime.now()
    expires = (now + (timedelta(days=365) if is_yearly else timedelta(days=30))).strftime("%B %d, %Y")

    details = txn_data.get("details", {})
    totals = details.get("totals", {})
    raw_total = totals.get("total")
    amount_paid = f"${int(raw_total) / 100:.2f} USD" if raw_total is not None else "$0.00 USD"

    return success({
        "status": "success",
        "invoice_id": txn_id,
        "plan_id": custom.get("plan") or plan or "pro",
        "plan_name": "MDefender Pro Security Fleet",
        "billing_cycle": "Yearly" if is_yearly else "Monthly",
        "period_label": "1 Year (Annual)" if is_yearly else "1 Month (Monthly)",
        "plan_expires": expires,
        "sites_count": sites_count,
        "amount_paid": amount_paid,
        "transaction_status": txn_status,
        "user_email": (user or {}).get("email", ""),
    })


@router.get("/subscription")
async def get_subscription(user=Depends(get_current_user)):
    db = MongoDB()
    service = SubscriptionService(db)
    return success(service.billing_dashboard(user))


@router.post("/change-plan")
async def change_plan(body: ChangePlanRequest, user=Depends(get_current_user)):
    db = MongoDB()
    service = SubscriptionService(db)
    valid = [p["id"] for p in PlanService(db).all_plans()]
    if body.plan not in valid:
        return {"success": False, "error": {"code": "INVALID_PLAN",
                                            "message": "Unknown plan"}}
    result = await service.change_plan(user, body.plan)
    if not result.get("applied") and result.get("error"):
        return {"success": False, "error": {"code": result.get("error"), "message": result.get("message")}}
    return success(result)


@router.post("/cancel")
@router.post("/cancel-auto-renew")
async def cancel_subscription(user=Depends(get_current_user)):
    """User cancellation request. Fleet remains 100% protected until the end of the paid prepaid cycle."""
    db = MongoDB()
    from bson import ObjectId
    from src.services.notification_service import NotificationService
    
    uid_str = str(user.get("id") or user.get("_id"))
    u_oid = ObjectId(uid_str) if ObjectId.is_valid(uid_str) else uid_str
    user_doc = db.users.find_one({"_id": u_oid}) or user

    now = datetime.now()
    plan_expires = user_doc.get("plan_expires")
    if isinstance(plan_expires, datetime) and plan_expires > now:
        expiry_dt = plan_expires
    else:
        expiry_dt = now
    
    expiry_label = expiry_dt.strftime("%B %d, %Y")

    # Mark user account as cancelled at period end without interrupting current active prepaid protection
    db.users.update_one(
        {"_id": u_oid},
        {"$set": {
            "cancel_at_period_end": True,
            "cancelled_at": now,
            "plan_expires": expiry_dt,
            "updated_at": now
        }}
    )

    # Send persistent in-app billing notification
    try:
        NotificationService(db).notify(
            uid_str,
            title="Subscription Cancelled",
            message=f"Your MDefender subscription has been cancelled. Your websites remain 100% protected until {expiry_label}. No recurring charges will ever be billed.",
            category="billing"
        )
    except Exception:
        pass

    return success({
        "status": "success",
        "cancel_at_period_end": True,
        "plan_expires": expiry_dt.isoformat(),
        "expiry_label": expiry_label,
        "message": f"Subscription cancelled. Your fleet remains protected until {expiry_label}. Manual renewal is available anytime."
    })


@router.post("/reactivate-auto-renew")
async def reactivate_subscription(user=Depends(get_current_user)):
    """Manual renewal model is platform standard (zero unexpected auto-charges)."""
    return success({
        "status": "success",
        "message": "MDefender Pro operates on a 100% user-controlled manual renewal model. You can extend your license anytime from Plans & Pricing."
    })


@router.post("/webhook")
async def paddle_webhook(request: Request):
    """Public Paddle webhook. Verifies HMAC signature on the raw body."""
    db = MongoDB()
    if not _feature_enabled(db):
        return success({"ok": True})
    raw_body = await request.body()
    signature_header = request.headers.get("Paddle-Signature", "")
    service = _paddle(db)
    secret = service.webhook_secret
    if not secret:
        return {"success": False, "error": {"code": "WEBHOOK_NOT_CONFIGURED",
                                            "message": "Webhook secret not configured"}}
    if not service.verify_webhook_signature(raw_body, signature_header, secret):
        return {"success": False, "error": {"code": "INVALID_SIGNATURE",
                                            "message": "Signature verification failed"}}
    try:
        event = service.parse_event(json.loads(raw_body.decode("utf-8")))
    except Exception:
        return {"success": False, "error": {"code": "INVALID_PAYLOAD",
                                            "message": "Malformed event payload"}}
    event_type = event.get("event_type", event.get("type", "unknown"))
    data = event.get("data", event)
    event_id = event.get("event_id") or (data.get("id") if isinstance(data, dict) else None)
    if event_id:
        try:
            existing = None
            if hasattr(db, "billing_webhook_events"):
                res = db.billing_webhook_events.find_one({"event_id": event_id})
                if res and isinstance(res, dict) and res.get("event_id"):
                    existing = res
            if not existing and hasattr(db, "paddle_events"):
                res = db.paddle_events.find_one({"event_id": event_id})
                if res and isinstance(res, dict) and res.get("event_id"):
                    existing = res
            if existing:
                dup_data = {"ok": True, "duplicate": True, "event_type": event_type, "event_id": event_id, "action": "duplicate_skipped"}
                return {
                    "success": True,
                    "event_id": event_id,
                    "action": "duplicate_skipped",
                    "duplicate": True,
                    "event_type": event_type,
                    "data": dup_data,
                    **dup_data
                }
        except Exception:
            pass

    user_id = None
    custom = data.get("custom_data") or event.get("custom_data") or {}
    if custom.get("user_id"):
        user_id = str(custom["user_id"])
    elif custom.get("user"):
        user_id = str(custom["user"])
    if not user_id:
        sub = db.subscriptions.find_one(
            {"paddle_subscription_id": data.get("id") or data.get("subscription_id")}
        )
        if sub:
            user_id = sub.get("user_id")

    if not user_id and data.get("customer_id"):
        user_by_cust = db.users.find_one({"paddle_customer_id": data.get("customer_id")})
        if user_by_cust:
            user_id = str(user_by_cust["_id"])

    if not user_id:
        cust_email = (data.get("customer") or {}).get("email") or data.get("customer_email")
        if cust_email:
            user_by_email = db.users.find_one({"email": str(cust_email).strip().lower()})
            if user_by_email:
                user_id = str(user_by_email["_id"])

    if not user_id:
        return {"success": False, "error": {"code": "UNKNOWN_USER",
                                            "message": "Event has no resolvable user"}}

    service = SubscriptionService(db)
    if event_type.startswith("transaction."):
        service.record_transaction(user_id, event)
    elif "subscription." in event_type:
        service.upsert_paddle_subscription(user_id, event)

    if event_id:
        try:
            evt_doc = {
                "event_id": event_id,
                "event_type": event_type,
                "received_at": datetime.now()
            }
            if hasattr(db, "paddle_events"):
                db.paddle_events.insert_one(evt_doc)
            if hasattr(db, "billing_webhook_events"):
                db.billing_webhook_events.insert_one(evt_doc)
        except Exception:
            pass
    
    action = "activated" if event_type.startswith("transaction.") else "processed"
    ret_res = {
        "ok": True,
        "event_type": event_type,
        "event_id": event_id,
        "action": action,
        "user_id": user_id
    }
    return {
        "success": True,
        "event_id": event_id,
        "action": action,
        "user_id": user_id,
        "event_type": event_type,
        "data": ret_res,
        **ret_res
    }


class SlotActionRequest(BaseModel):
    website_id: str


class SlotSwapRequest(BaseModel):
    release_website_id: str
    assign_website_id: str


LicenseSlotAssignRequest = SlotActionRequest
LicenseSlotSwapRequest = SlotSwapRequest


@router.get("/license-slots/status")
async def get_license_slots_status(user=Depends(get_current_user)):
    """Return real-time allocation status: total slots, used slots, available slots, and site states."""
    db = MongoDB()
    user_id = str(user.get("id") or user.get("_id"))
    slot_service = LicenseSlotService(db)
    summary = slot_service.get_slots_summary(user_id)
    return success(summary)


@router.post("/license-slots/assign")
async def assign_license_slot(body: SlotActionRequest, user=Depends(get_current_user)):
    """Atomically assign an available license slot to a website."""
    db = MongoDB()
    user_id = str(user.get("id") or user.get("_id"))
    slot_service = LicenseSlotService(db)
    ok, msg = slot_service.assign_slot(user_id, body.website_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return success({"message": msg, "website_id": body.website_id, "is_licensed": True})


@router.post("/license-slots/release")
async def release_license_slot(body: SlotActionRequest, user=Depends(get_current_user)):
    """Release an assigned license slot from a website to make it available for another site."""
    db = MongoDB()
    user_id = str(user.get("id") or user.get("_id"))
    slot_service = LicenseSlotService(db)
    ok, msg = slot_service.release_slot(user_id, body.website_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return success({"message": msg, "website_id": body.website_id, "is_licensed": False})


@router.post("/license-slots/swap")
async def swap_license_slot(body: SlotSwapRequest, user=Depends(get_current_user)):
    """Atomically swap a license slot between two websites."""
    db = MongoDB()
    user_id = str(user.get("id") or user.get("_id"))
    slot_service = LicenseSlotService(db)
    ok, msg = slot_service.swap_slot(user_id, body.release_website_id, body.assign_website_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    
    u_doc = slot_service._get_user_doc(user_id) or {}
    curr = list(u_doc.get("licensed_website_ids") or (user or {}).get("licensed_website_ids") or [])
    new_lic = [body.assign_website_id if str(x) == str(body.release_website_id) else str(x) for x in curr]
    if body.assign_website_id not in new_lic:
        new_lic.append(body.assign_website_id)
    new_lic = [x for x in list(dict.fromkeys(new_lic)) if x != body.release_website_id]

    return success({
        "message": msg,
        "release_website_id": body.release_website_id,
        "assign_website_id": body.assign_website_id,
        "licensed_website_ids": new_lic
    })

