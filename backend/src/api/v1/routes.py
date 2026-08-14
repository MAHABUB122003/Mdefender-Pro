"""v1 REST API. Mounted in main.py as app.include_router(v1_router).

Prefix: /api/v1
"""

from fastapi import APIRouter

from src.api.v1 import (
    admin_api,
    billing_api,
    malware_api,
    notifications_api,
    websites_api,
    waf_api,
    wordpress_api,
)

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(websites_api.router)
v1_router.include_router(waf_api.router)
v1_router.include_router(malware_api.router)
v1_router.include_router(wordpress_api.router)
v1_router.include_router(billing_api.router)
v1_router.include_router(notifications_api.router)
v1_router.include_router(admin_api.router)


def get_v1_router():
    return v1_router
