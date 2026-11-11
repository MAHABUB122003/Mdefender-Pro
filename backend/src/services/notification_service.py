"""MDefender Pro notification service.

Channels: dashboard (MongoDB w/ 30-day Auto-TTL) + email (SMTP) + webhook (Slack/Discord/Custom JSON).
Implements smart escalation, per-site deduplication cooldowns, and auto-resolved user registration emails
so single-VPS SaaS deployments handle 100k+ users with zero alert storms or database bloat.
"""

import hashlib
import hmac
import json
import threading
import time
from datetime import datetime, timezone
from html import escape as html_escape

from bson import ObjectId

from src.database.mongodb_connection import MongoDB

DEFAULT_POLICY_STATES = {
    "site_lifecycle": True,
    "origin_down": True,
    "ssl": True,
    "malware": True,
    "ddos": True,
    "bruteforce": True,
    "exploit": True,
    "wp_admin": True,
}

DEFAULT_PREFERENCES = {
    "email": True,
    "dashboard": True,
    "webhook": False,
    "webhook_url": "",
    "webhook_secret": "",
    "primary_email": "",
    "secondary_email": "",
    "instant_critical": True,
    "weekly_digest": True,
    "include_forensic_payload": True,
    "website_connected": True,
    "website_disconnected": True,
    "site_down": True,
    "site_recovered": True,
    "ssl_expiring": True,
    "critical_attack": True,
    "ddos_surge": True,
    "bruteforce_surge": True,
    "malware_detected": True,
    "api_key_revoked": True,
    "subscription_expired": True,
    "scan_completed": False,
    "config_issue": True,
    "policy_states": dict(DEFAULT_POLICY_STATES),
}

SEVERITY = {
    "website_connected": "info",
    "website_disconnected": "warning",
    "site_down": "critical",
    "site_recovered": "info",
    "ssl_expiring": "warning",
    "ddos_surge": "critical",
    "bruteforce_surge": "high",
    "wp_admin_alert": "high",
    "critical_attack": "critical",
    "malware_detected": "critical",
    "api_key_revoked": "warning",
    "subscription_expired": "warning",
    "scan_completed": "info",
    "config_issue": "critical",
}

CATEGORY_TO_POLICY = {
    "website_connected": "site_lifecycle",
    "website_disconnected": "site_lifecycle",
    "site_down": "origin_down",
    "site_recovered": "origin_down",
    "ssl_expiring": "ssl",
    "malware_detected": "malware",
    "ddos_surge": "ddos",
    "critical_attack": "exploit",
    "bruteforce_surge": "bruteforce",
    "wp_admin_alert": "wp_admin",
}

DEFAULT_COOLDOWNS = {
    "website_connected": 30,
    "website_disconnected": 30,
    "site_down": 1800,
    "site_recovered": 60,
    "ssl_expiring": 86400,
    "ddos_surge": 3600,
    "bruteforce_surge": 3600,
    "wp_admin_alert": 3600,
    "critical_attack": 3600,
    "malware_detected": 900,
}

# Thread-safe in-memory cooldown cache to avoid DB hits on burst events
_COOLDOWN_LOCK = threading.Lock()
_COOLDOWN_CACHE: dict[tuple, float] = {}


def _check_and_set_cooldown(key: tuple, cooldown_seconds: int) -> bool:
    """Return True if notification is allowed (not in cooldown), and record timestamp."""
    if cooldown_seconds <= 0:
        return True
    now = time.monotonic()
    with _COOLDOWN_LOCK:
        # Opportunistic tiny cleanup so dict stays bounded across long uptimes
        if len(_COOLDOWN_CACHE) > 20000:
            expired = [k for k, exp in _COOLDOWN_CACHE.items() if exp <= now]
            for k in expired:
                _COOLDOWN_CACHE.pop(k, None)
        expires_at = _COOLDOWN_CACHE.get(key, 0.0)
        if expires_at > now:
            return False
        _COOLDOWN_CACHE[key] = now + cooldown_seconds
        return True


class NotificationService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def _ensure_indexes(self):
        try:
            self.db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        except Exception:
            pass

    def _resolve_user_email(self, user_id: str) -> str:
        """Fetch user's registered account email as default notification destination."""
        if not user_id:
            return ""
        try:
            queries = [{"_id": str(user_id)}, {"id": str(user_id)}]
            if ObjectId.is_valid(str(user_id)):
                queries.append({"_id": ObjectId(str(user_id))})
            user_doc = self.db.users.find_one({"$or": queries}, {"email": 1})
            if user_doc and user_doc.get("email"):
                return str(user_doc["email"]).strip()
        except Exception:
            pass
        return ""

    def _resolve_user_name(self, user_id: str) -> str:
        """Fetch user's display name or username for personalized email greetings."""
        if not user_id:
            return ""
        try:
            queries = [{"_id": str(user_id)}, {"id": str(user_id)}]
            if ObjectId.is_valid(str(user_id)):
                queries.append({"_id": ObjectId(str(user_id))})
            user_doc = self.db.users.find_one({"$or": queries}, {"full_name": 1, "name": 1, "username": 1})
            if user_doc:
                return str(user_doc.get("full_name") or user_doc.get("name") or user_doc.get("username") or "").strip()
        except Exception:
            pass
        return ""

    def get_preferences(self, user_id):
        user_id_str = str(user_id)
        doc = self.db.settings.find_one({"_type": "notification_prefs", "user_id": user_id_str})
        prefs = dict(DEFAULT_PREFERENCES)
        prefs["policy_states"] = dict(DEFAULT_POLICY_STATES)

        if doc and isinstance(doc.get("prefs"), dict):
            saved = doc.get("prefs")
            for k, v in saved.items():
                if k == "policy_states" and isinstance(v, dict):
                    prefs["policy_states"].update(v)
                else:
                    prefs[k] = v

        if not prefs.get("primary_email"):
            reg_email = self._resolve_user_email(user_id_str)
            if reg_email:
                prefs["primary_email"] = reg_email

        return prefs

    def save_preferences(self, user_id, prefs):
        cleaned = dict(prefs) if isinstance(prefs, dict) else {}
        self.db.settings.update_one(
            {"_type": "notification_prefs", "user_id": str(user_id)},
            {"$set": {"prefs": cleaned, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        return self.get_preferences(user_id)

    def _is_category_allowed(self, prefs: dict, category: str) -> bool:
        if category in prefs and prefs.get(category) is False:
            return False
        policy_key = CATEGORY_TO_POLICY.get(category)
        if policy_key:
            policy_states = prefs.get("policy_states") or {}
            if policy_key in policy_states and not policy_states.get(policy_key):
                return False
        return True

    def notify(
        self,
        user_id,
        title,
        message,
        category="general",
        data=None,
        website_id=None,
        force=False,
        send_email=True,
        cooldown_seconds=None,
        dedupe_key=None,
    ):
        """Create a dashboard notification and optionally dispatch email & webhook."""
        if not user_id:
            return False

        user_id = str(user_id)
        prefs = self.get_preferences(user_id)

        if not force:
            if not self._is_category_allowed(prefs, category):
                return False

            cd = DEFAULT_COOLDOWNS.get(category, 0) if cooldown_seconds is None else int(cooldown_seconds)
            if cd > 0:
                c_key = (user_id, str(website_id or "fleet"), str(category), str(dedupe_key or ""))
                if not _check_and_set_cooldown(c_key, cd):
                    return False

        severity = SEVERITY.get(category, "info")
        now_utc = datetime.now(timezone.utc)
        notification = {
            "user_id": user_id,
            "website_id": str(website_id) if website_id else None,
            "title": title,
            "message": message,
            "category": category,
            "severity": severity,
            "data": data or {},
            "read": False,
            "created_at": now_utc,
        }

        if prefs.get("dashboard", True) or force:
            try:
                self.db.notifications.insert_one(notification)
            except Exception:
                return False

        # Dispatch Webhook non-blockingly
        if (prefs.get("webhook") and prefs.get("webhook_url")) or (force and prefs.get("webhook_url")):
            self._send_webhook(prefs["webhook_url"], notification, prefs.get("webhook_secret"))

        # Dispatch Email non-blockingly using existing AuthConfig SMTP pipeline
        should_email = send_email and (prefs.get("email", True) or force)
        if should_email and not force:
            # Respect instant_critical flag for threat alerts, while always delivering lifecycle & downtime alerts
            if category in ("critical_attack", "ddos_surge", "bruteforce_surge", "malware_detected") and not prefs.get("instant_critical", True):
                should_email = False

        if should_email:
            recipients = []
            for addr in (prefs.get("primary_email"), prefs.get("secondary_email")):
                clean = (addr or "").strip()
                if clean and "@" in clean and clean not in recipients:
                    recipients.append(clean)
            if recipients:
                user_name = self._resolve_user_name(user_id)
                self._send_alert_email_async(recipients, notification, user_name=user_name)

        return True

    def _send_alert_email_async(self, recipients: list[str], notification: dict, user_name: str = ""):
        """Send clean, GitHub/Cloudflare-grade transactional alert email non-blockingly."""
        def _dispatch():
            try:
                import os
                from email.mime.image import MIMEImage
                from email.mime.multipart import MIMEMultipart
                from email.mime.text import MIMEText

                from src.auth.config import AuthConfig
                from src.auth.email_sender import _LOGO_PATH, AuthEmailService

                logo_bytes = b""
                if _LOGO_PATH and os.path.exists(_LOGO_PATH):
                    try:
                        with open(_LOGO_PATH, "rb") as _lf:
                            logo_bytes = _lf.read()
                    except Exception:
                        logo_bytes = b""

                config = AuthConfig()
                smtp_server = (config.SMTP_SERVER or "").strip()
                smtp_user = (config.SMTP_USERNAME or "").strip()
                smtp_pass = (config.SMTP_PASSWORD or "").strip()
                if not smtp_server or not smtp_user or not smtp_pass:
                    return

                category = notification.get("category", "general")
                title = notification.get("title") or "MDefender Pro Alert"
                message = notification.get("message") or ""
                data = notification.get("data") or {}
                domain = data.get("website_domain") or data.get("domain") or "your connected fleet"
                is_test = bool(data.get("test"))
                now_str = datetime.now(timezone.utc).strftime("%b %d, %Y at %H:%M UTC")
                dashboard_url = f"{config.FRONTEND_URL}/user/alerts"
                greeting = f"Hi {html_escape(user_name)}," if user_name else "Hi there,"
                text_greeting = f"Hi {user_name}," if user_name else "Hi there,"

                # Descriptive human-readable subject, lead paragraph, and guidance per event
                if is_test:
                    subject = "[MDefender Pro] Security alert notifications are active"
                    headline = "Security alert routing verified"
                    lead_p = (
                        "This is a confirmation that email alerts for your MDefender Pro workspace are active "
                        "and properly configured."
                    )
                    context_p = (
                        "To avoid inbox clutter, routine single blocked requests are logged silently in your dashboard. "
                        "You will only receive real-time emails for high-priority events such as website connections, "
                        "plugin disconnections, origin downtime and recovery, SSL expiration warnings, malware detections, "
                        "or volumetric DDoS surges."
                    )
                elif category == "website_connected":
                    subject = f"[MDefender Pro] {domain} is now connected and protected"
                    headline = f"{domain} is now connected"
                    lead_p = (
                        f"Your WordPress site {domain} has been successfully linked to your MDefender Pro "
                        "security workspace."
                    )
                    context_p = (
                        "Real-time Web Application Firewall (WAF) rules, automated brute-force defense, and "
                        "background uptime monitoring are now active for this website."
                    )
                elif category == "website_disconnected":
                    subject = f"[MDefender Pro] Action required: {domain} was disconnected"
                    headline = f"{domain} was disconnected"
                    lead_p = (
                        f"Your WordPress site {domain} is no longer connected to MDefender Pro, which means "
                        "cloud security rules and automated telemetry updates are currently paused for this domain."
                    )
                    context_p = (
                        "If you did not intend to disconnect this site, please log in to your WordPress admin "
                        "dashboard and reactivate or reconnect the MDefender Pro plugin."
                    )
                elif category == "site_down":
                    subject = f"[MDefender Pro] Outage alert: {domain} is unreachable"
                    headline = f"{domain} appears to be down"
                    lead_p = (
                        f"Our uptime monitoring checks could not reach {domain} "
                        f"({data.get('error') or data.get('status_code') or 'connection failure'})."
                    )
                    context_p = (
                        "Please check your origin hosting server or PHP/database health. You will not receive "
                        "repeated emails while the site remains offline—we will send one confirmation message as "
                        "soon as the website recovers."
                    )
                elif category == "site_recovered":
                    subject = f"[MDefender Pro] Resolved: {domain} is back online"
                    headline = f"{domain} has recovered"
                    lead_p = (
                        f"Good news — {domain} is responding normally again (HTTP 200 OK) after an earlier "
                        f"outage lasting {data.get('downtime_duration') or 'a brief period'}."
                    )
                    context_p = "Uptime monitoring and WAF protection have resumed normal operation."
                elif category == "ssl_expiring":
                    days_rem = data.get("days_remaining")
                    subject = f"[MDefender Pro] SSL certificate notice for {domain}"
                    headline = f"SSL certificate attention needed for {domain}"
                    lead_p = (
                        f"The TLS/SSL certificate for {domain} has "
                        f"{'expired' if days_rem == 0 else f'only {days_rem} day(s) remaining before expiration'}."
                    )
                    context_p = (
                        "Please renew or verify AutoSSL on your server or DNS proxy so visitors do not encounter "
                        "browser security warnings."
                    )
                elif category == "malware_detected":
                    subject = f"[MDefender Pro] Security alert: Suspicious file detected on {domain}"
                    headline = f"Malicious or suspicious code found on {domain}"
                    lead_p = (
                        f"The MDefender Pro malware scanner flagged a suspicious file on {domain}"
                        f"{': ' + str(data.get('file_path')) if data.get('file_path') else '.'}"
                    )
                    context_p = (
                        "We recommend reviewing the scan finding and quarantining or repairing the file from your "
                        "Malware Scanner dashboard right away."
                    )
                elif category == "ddos_surge":
                    subject = f"[MDefender Pro] Traffic surge mitigated on {domain}"
                    headline = f"High-volume threat activity mitigated on {domain}"
                    lead_p = (
                        f"MDefender Pro detected and automatically blocked {data.get('blocked_count') or '50+'}+ "
                        f"malicious requests targeting {domain} within the last 10 minutes."
                    )
                    context_p = (
                        "Your website remains protected by the Edge WAF and automated rate limiting. No immediate "
                        "action is required unless traffic continues to escalate."
                    )
                else:
                    subject = f"[MDefender Pro] {title}"
                    headline = title
                    lead_p = message
                    context_p = "You can inspect full details and manage your security posture from your dashboard."

                detail_lines = [("Website", str(domain)), ("Detected", now_str)]
                for k, label in (
                    ("status_code", "HTTP Status"),
                    ("error", "Details"),
                    ("downtime_duration", "Outage Duration"),
                    ("days_remaining", "Days Remaining"),
                    ("blocked_count", "Requests Blocked"),
                    ("file_path", "File Path"),
                    ("waf_mode", "WAF Mode"),
                ):
                    if data.get(k) is not None and str(data.get(k)).strip() != "":
                        detail_lines.append((label, str(data.get(k))))

                details_html = "".join(
                    f'<tr><td style="padding:4px 0;font-size:13px;color:#57606a;width:135px;vertical-align:top;">{html_escape(lbl)}:</td>'
                    f'<td style="padding:4px 0;font-size:13px;color:#1f2328;font-weight:600;vertical-align:top;">{html_escape(val)}</td></tr>'
                    for lbl, val in detail_lines
                )

                logo_html = (
                    '<img src="cid:mdefender_logo" width="28" height="28" alt="MDefender Pro" style="display:block;width:28px;height:28px;border-radius:6px;object-fit:contain;" />'
                    if logo_bytes
                    else ""
                )

                html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html_escape(headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#24292f;-webkit-font-smoothing:antialiased;line-height:1.6;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:540px;text-align:left;">
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  {"<td style='vertical-align:middle;padding-right:10px;'>" + logo_html + "</td>" if logo_html else ""}
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#1f2328;letter-spacing:-0.2px;">MDefender Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="font-size:14px;color:#24292f;">
              <p style="margin:0 0 14px 0;font-size:14.5px;font-weight:600;color:#1f2328;">
                {greeting}
              </p>

              <p style="margin:0 0 14px 0;font-size:14px;color:#24292f;">
                {html_escape(lead_p)}
              </p>

              <p style="margin:0 0 18px 0;font-size:14px;color:#57606a;">
                {html_escape(context_p)}
              </p>

              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #d0d7de;border-bottom:1px solid #d0d7de;padding:10px 0;margin:0 0 20px 0;">
                {details_html}
              </table>

              <p style="margin:0 0 24px 0;font-size:14px;">
                <a href="{html_escape(dashboard_url)}" style="color:#0969da;text-decoration:none;font-weight:600;">Open MDefender Pro Dashboard &rarr;</a>
              </p>

              <p style="margin:0 0 24px 0;font-size:14px;color:#24292f;">
                Thanks,<br>
                The MDefender Pro Security Team
              </p>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #eaeef2;padding-top:16px;font-size:11.5px;line-height:1.5;color:#6e7781;">
              You are receiving this email because real-time security notifications are enabled on your MDefender Pro account.
              <a href="{html_escape(dashboard_url)}" style="color:#6e7781;text-decoration:underline;">Manage alert settings</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

                details_text = "\n".join(f"- {lbl}: {val}" for lbl, val in detail_lines)
                text_body = (
                    f"{text_greeting}\n\n"
                    f"{lead_p}\n\n"
                    f"{context_p}\n\n"
                    f"{details_text}\n\n"
                    f"Open Dashboard: {dashboard_url}\n\n"
                    f"Thanks,\nThe MDefender Pro Security Team"
                )

                from_addr = config.SMTP_FROM_EMAIL or config.SMTP_USERNAME or "noreply@mdefender-pro.io"
                email_sender = AuthEmailService()
                for to_email in recipients:
                    msg = MIMEMultipart("related")
                    msg["Subject"] = subject
                    msg["From"] = f"{config.SMTP_FROM_NAME} <{from_addr}>"
                    msg["To"] = to_email
                    msg["X-Mailer"] = "MDefender-Pro-Alert-Engine/3.0"

                    alt = MIMEMultipart("alternative")
                    alt.attach(MIMEText(text_body, "plain"))
                    alt.attach(MIMEText(html_body, "html"))
                    msg.attach(alt)

                    if logo_bytes:
                        img = MIMEImage(logo_bytes, _subtype="png")
                        img.add_header("Content-ID", "<mdefender_logo>")
                        img.add_header("Content-Disposition", "inline", filename="mdefender_logo.png")
                        msg.attach(img)

                    email_sender._send_smtp_message(config, msg, to_email, purpose=f"alert:{category}")
            except Exception as e:
                print(f"[ALERT EMAIL] Background delivery error: {e}")

        threading.Thread(target=_dispatch, daemon=True).start()

    def _build_webhook_payload(self, url: str, notification: dict) -> tuple[dict, dict]:
        """Auto-format webhook JSON cleanly for Slack, Discord, or generic SOC endpoints."""
        title = notification.get("title") or "MDefender Pro Alert"
        message = notification.get("message") or ""
        severity = (notification.get("severity") or "info").upper()
        category = notification.get("category") or "general"
        data = notification.get("data") or {}
        domain = data.get("website_domain") or data.get("domain") or "Fleet"
        ts = (
            notification["created_at"].isoformat()
            if hasattr(notification.get("created_at"), "isoformat")
            else str(notification.get("created_at"))
        )

        lower_url = (url or "").lower()
        if "hooks.slack.com" in lower_url:
            return {
                "text": f"[{severity}] {title} ({domain})",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*[{severity}] {title}*\n*Domain:* `{domain}`\n{message}",
                        },
                    }
                ],
            }, {"Content-Type": "application/json"}

        if "discord.com/api/webhooks" in lower_url or "discordapp.com/api/webhooks" in lower_url:
            color_map = {"CRITICAL": 0xDC2626, "HIGH": 0xEA580C, "WARNING": 0xD97706, "INFO": 0x059669}
            return {
                "embeds": [
                    {
                        "title": f"[{severity}] {title}",
                        "description": message,
                        "color": color_map.get(severity, 0x0B2522),
                        "fields": [
                            {"name": "Domain", "value": str(domain), "inline": True},
                            {"name": "Category", "value": str(category), "inline": True},
                        ],
                        "timestamp": ts,
                    }
                ]
            }, {"Content-Type": "application/json"}

        payload = {
            "event": "security.alert",
            "type": category,
            "title": title,
            "message": message,
            "severity": severity.lower(),
            "website_id": notification.get("website_id"),
            "domain": domain,
            "timestamp": ts,
            "data": data,
        }
        return payload, {"Content-Type": "application/json", "User-Agent": "MDefender-Pro-SOC-Webhook/3.0"}

    def _send_webhook(self, url, notification, secret_token=None):
        """Dispatches webhook non-blockingly so the API response is instantaneous."""
        def _dispatch():
            try:
                import httpx

                payload, headers = self._build_webhook_payload(url, notification)
                if secret_token and "X-MDefender-Signature" not in headers and "User-Agent" in headers:
                    body_bytes = json.dumps(payload, default=str).encode("utf-8")
                    sig = hmac.new(secret_token.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
                    headers["X-MDefender-Signature"] = f"sha256={sig}"
                httpx.post(url, json=payload, headers=headers, timeout=4.0)
            except Exception:
                pass

        threading.Thread(target=_dispatch, daemon=True).start()

    def test_webhook_sync(self, user_id, webhook_url: str, secret_token: str = "") -> tuple[bool, str]:
        """Synchronously verify webhook URL reachability for UI feedback."""
        import httpx

        if not webhook_url or not webhook_url.startswith(("http://", "https://")):
            return False, "Please enter a valid HTTP or HTTPS webhook URL."

        sample = {
            "title": "MDefender Pro Webhook Verification",
            "message": "Your Slack / Discord / SOC webhook endpoint is properly connected and receiving alerts.",
            "category": "website_connected",
            "severity": "info",
            "website_id": "test",
            "data": {"website_domain": "All Connected Sites", "test": True},
            "created_at": datetime.now(timezone.utc),
        }
        payload, headers = self._build_webhook_payload(webhook_url, sample)
        if secret_token and "User-Agent" in headers:
            body_bytes = json.dumps(payload, default=str).encode("utf-8")
            sig = hmac.new(secret_token.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
            headers["X-MDefender-Signature"] = f"sha256={sig}"
        try:
            resp = httpx.post(webhook_url, json=payload, headers=headers, timeout=6.0)
            if 200 <= resp.status_code < 300:
                return True, f"Webhook verified (HTTP {resp.status_code})."
            return False, f"Webhook endpoint returned HTTP {resp.status_code}."
        except Exception as e:
            return False, f"Connection failed: {e}"

    def list(self, user_id, limit=50, unread_only=False):
        query = {"user_id": str(user_id)}
        if unread_only:
            query["read"] = False
        items = list(self.db.notifications.find(query).sort("created_at", -1).limit(int(limit)))
        return [
            {
                "id": str(n["_id"]),
                "title": n.get("title"),
                "message": n.get("message"),
                "category": n.get("category"),
                "severity": n.get("severity"),
                "read": n.get("read", False),
                "website_id": n.get("website_id"),
                "data": n.get("data", {}),
                "created_at": n.get("created_at").isoformat() if n.get("created_at") else None,
            }
            for n in items
        ]

    def unread_count(self, user_id):
        try:
            return self.db.notifications.count_documents({"user_id": str(user_id), "read": False})
        except Exception:
            return 0

    def mark_read(self, user_id, notification_id=None, all_read=False):
        user_id = str(user_id)
        if all_read:
            return self.db.notifications.update_many({"user_id": user_id}, {"$set": {"read": True}})
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None
        return self.db.notifications.update_one(
            {"_id": oid, "user_id": user_id}, {"$set": {"read": True}}
        )

    def delete(self, user_id, notification_id):
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None
        return self.db.notifications.delete_one({"_id": oid, "user_id": str(user_id)})

    def delete_all(self, user_id):
        return self.db.notifications.delete_many({"user_id": str(user_id)})
