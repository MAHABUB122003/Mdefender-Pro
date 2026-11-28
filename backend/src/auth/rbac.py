"""Role-Based Access Control (RBAC) for MDefender Owner & Support Team.

Owner roles (`super_admin`, `admin`) retain unrestricted access (`*`).
Support roles (`support_lead`, `support_agent`) only receive the granular
permissions explicitly assigned to them (or their role defaults).
"""

OWNER_ROLES = ("super_admin", "admin")
SUPPORT_ROLES = ("support_lead", "support_agent")
ADMIN_ROLES = OWNER_ROLES + SUPPORT_ROLES

SUPPORT_PERMISSIONS = [
    {
        "key": "support.tickets",
        "label": "Support Desk & Tickets",
        "description": "View customer tickets, reply, and update ticket status.",
    },
    {
        "key": "support.inspector",
        "label": "Remote Inspector",
        "description": "Diagnose customer WordPress sites, sync status, and plugin health.",
    },
    {
        "key": "users.view",
        "label": "View Customers & Sites",
        "description": "Browse customer profiles, subscription status, and connected websites.",
    },
    {
        "key": "users.troubleshoot",
        "label": "Account Troubleshooting",
        "description": "Unlock brute-force lockouts, verify emails, reset MFA, and force logout.",
    },
    {
        "key": "users.impersonate",
        "label": "Dashboard Impersonation",
        "description": "Open a temporary read/debug session inside a customer's dashboard (audited).",
    },
    {
        "key": "users.billing",
        "label": "Plan & Quota Adjustments",
        "description": "Gift plans, extend trials, and adjust website quota for customers.",
    },
    {
        "key": "security.blacklist.unblock",
        "label": "Unblock False-Positive IPs",
        "description": "Remove mistakenly blocked IPs from customer or fleet blacklists.",
    },
]

VALID_SUPPORT_PERMISSION_KEYS = {p["key"] for p in SUPPORT_PERMISSIONS}

DEFAULT_ROLE_PERMISSIONS = {
    "support_lead": [
        "support.tickets",
        "support.inspector",
        "users.view",
        "users.troubleshoot",
        "users.impersonate",
        "users.billing",
        "security.blacklist.unblock",
    ],
    "support_agent": [
        "support.tickets",
        "support.inspector",
        "users.view",
        "users.troubleshoot",
        "security.blacklist.unblock",
    ],
}


def is_owner_user(user_doc: dict) -> bool:
    if not user_doc:
        return False
    role = (user_doc.get("role") or "user").strip()
    if role in OWNER_ROLES:
        return True
    return bool(user_doc.get("is_admin") and role not in SUPPORT_ROLES)


def is_admin_panel_user(user_doc: dict) -> bool:
    if not user_doc:
        return False
    role = (user_doc.get("role") or "user").strip()
    return role in ADMIN_ROLES or bool(user_doc.get("is_admin"))


def resolve_user_permissions(user_doc: dict) -> list[str]:
    if not user_doc:
        return []
    if is_owner_user(user_doc):
        return ["*"]
    role = (user_doc.get("role") or "user").strip()
    if role not in SUPPORT_ROLES:
        return []
    custom = user_doc.get("permissions")
    if isinstance(custom, list):
        return [p for p in custom if p in VALID_SUPPORT_PERMISSION_KEYS]
    return list(DEFAULT_ROLE_PERMISSIONS.get(role, []))


def has_permission(user_doc: dict, permission: str) -> bool:
    if not user_doc:
        return False
    if is_owner_user(user_doc):
        return True
    perms = resolve_user_permissions(user_doc)
    return "*" in perms or permission in perms
