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

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.api.v1.deps import get_owned_website
from src.auth.dependencies import get_current_user
from src.database.mongodb_connection import MongoDB
from src.features.feature_flags import FeatureFlagService
from src.services.paddle_service import PaddleService
from src.services.plan_service import PlanService
from src.services.subscription_service import SubscriptionService
from src.utils.api_response import success

router = APIRouter(prefix="/billing", tags=["Billing"])


def _paddle(db):
    return PaddleService()


def _feature_enabled(db):
    return FeatureFlagService(db).is_enabled("paddle_billing_enabled")


class CheckoutRequest(BaseModel):
    plan: str
    return_url: str
    success_url: str | None = None


class ChangePlanRequest(BaseModel):
    plan: str


@router.get("/plans")
async def list_plans(user=Depends(get_current_user)):
    db = MongoDB()
    plans = PlanService(db).all_plans()
    return success({
        "plans": plans,
        "current_plan": SubscriptionService(db).effective_plan(user),
        "billing_enabled": _feature_enabled(db),
    })


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, user=Depends(get_current_user)):
    db = MongoDB()
    if not _feature_enabled(db):
        return success({"enabled": False, "message": "Online billing is not enabled yet",
                        "checkout_url": None})
    service = _paddle(db)
    if not service.configured:
        return success({"enabled": True, "checkout_url": None,
                        "message": "Billing is not configured on the server yet"})
    plan = PlanService(db).get_plan(body.plan)
    price_id = plan.get("price_id", "")
    if not price_id:
        return success({"enabled": True, "checkout_url": None,
                        "message": f"No Paddle price configured for the {plan['name']} plan"})
    checkout = await service.create_checkout_session(
        items=[{"price_id": price_id, "quantity": 1}],
        customer_email=user.get("email"),
        custom_data={"user_id": user["id"], "plan": body.plan},
        success_url=body.success_url or body.return_url,
        cancel_url=body.return_url,
    )
    if not checkout.get("checkout_url"):
        return success({"enabled": True, "checkout_url": None,
                        "message": checkout.get("error", "Billing temporarily unavailable")})
    return success({"enabled": True, "checkout_id": checkout.get("checkout_id"),
                    "checkout_url": checkout.get("checkout_url")})


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
