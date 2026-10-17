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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user, get_current_user_optional
from src.database.mongodb_connection import MongoDB
from src.features.feature_flags import FeatureFlagService
from src.services.paddle_service import PaddleService
from src.services.plan_service import PlanService
from src.services.subscription_service import SubscriptionService
from src.utils.api_response import success

router = APIRouter(prefix="/billing", tags=["Billing"])
public_router = APIRouter(prefix="/pricing", tags=["Pricing"])


@public_router.get("/plans")
async def get_public_pricing_plans():
    db = MongoDB()
    plans = PlanService(db).all_plans()
    return success({"plans": plans})


def _paddle(db):
    return PaddleService()


def _feature_enabled(db):
    return FeatureFlagService(db).is_enabled("paddle_billing_enabled")


class CheckoutRequest(BaseModel):
    plan: str
    billing_cycle: str | None = "monthly"
    customer_email: str | None = None
    email: str | None = None
    return_url: str | None = None
    success_url: str | None = None


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
        return success({"enabled": True, "checkout_url": None,
                        "message": f"No Paddle price configured for the {plan.get('name', body.plan)} ({body.billing_cycle}) plan"})
    
    uid = str(user.get("id") or user.get("_id")) if user else ""
    customer_email = (user.get("email", "") if user else "") or body.customer_email or body.email or ""
    return_url = body.return_url or body.success_url or "http://localhost:5173/settings"

    checkout = await service.create_checkout_session(
        items=[{"price_id": price_id, "quantity": 1}],
        customer_email=customer_email or None,
        custom_data={"user_id": uid, "plan": body.plan, "billing_cycle": body.billing_cycle or "monthly"},
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
    return success({
        "enabled": True,
        "checkout_id": checkout.get("checkout_id"),
        "checkout_url": checkout.get("checkout_url"),
        "price_id": price_id
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
    return success(result)


@router.post("/cancel")
async def cancel_subscription(user=Depends(get_current_user)):
    db = MongoDB()
    service = SubscriptionService(db)
    sub = service.get_active_subscription(user)
    if not sub:
        return {"success": False, "error": {"code": "NO_SUBSCRIPTION",
                                            "message": "No active subscription"}}
    paddle = _paddle(db)
    result = await paddle.cancel_subscription(sub.get("paddle_subscription_id"))
    if result.get("status") != "success":
        return {"success": False, "error": {"code": "CANCEL_FAILED",
                                            "message": result.get("error", "Cancellation failed")}}
    return success({"message": "Subscription cancelled. You keep current features until the period ends."})


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
    event_id = event.get("event_id") or data.get("id")
    if event_id:
        try:
            existing = db.paddle_events.find_one({"event_id": event_id})
            if existing:
                return success({"ok": True, "duplicate": True, "event_type": event_type})
            db.paddle_events.insert_one({
                "event_id": event_id,
                "event_type": event_type,
                "received_at": datetime.now()
            })
        except Exception:
            pass

    data = event.get("data", event)

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

    if not user_id:
        return {"success": False, "error": {"code": "UNKNOWN_USER",
                                            "message": "Event has no resolvable user"}}

    service = SubscriptionService(db)
    if event_type.startswith("transaction.completed"):
        service.record_transaction(user_id, event)
    if "subscription." in event_type:
        service.upsert_paddle_subscription(user_id, event)
    return success({"ok": True, "event_type": event_type})
