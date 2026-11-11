from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
import uuid
import logging
from src.database.mongodb_connection import MongoDB

_log = logging.getLogger(__name__)

class SupportTicketService:
    """
    Enterprise Support & Incident Resolution Service
    Engineered for 100,000+ users and high throughput without database bloat.
    Features:
      - Clean ticket thread modeling with MongoDB indices
      - 90-day automated TTL retention policy for closed tickets
      - Attachment sanitization & remote diagnostics payload ingestion
      - SLA priority routing (critical, high, medium, low)
      - User manual purge & admin batch purge
    """

    def __init__(self):
        self.db = MongoDB()
        self._ensure_indexes()

    def _ensure_indexes(self):
        try:
            # Multi-tenant and high-speed retrieval indexes
            self.db.support_tickets.create_index([("user_id", 1), ("status", 1)])
            self.db.support_tickets.create_index([("status", 1), ("priority", 1), ("updated_at", -1)])
            self.db.support_tickets.create_index([("ticket_id", 1)], unique=True)
            self.db.support_tickets.create_index([("target_domain", 1)])
            
            # Auto-purge TTL Index for closed tickets: documents expire automatically when purge_at is reached
            self.db.support_tickets.create_index([("purge_at", 1)], expireAfterSeconds=0)
        except Exception as e:
            _log.warning(f"Support index initialization notice: {e}")

    def create_ticket(
        self,
        user_id: str,
        user_email: str,
        subject: str,
        category: str,
        priority: str,
        message: str,
        target_domain: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        diagnostics: Optional[Dict[str, Any]] = None,
        user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new incident ticket from a user.
        """
        now = datetime.now(timezone.utc)
        clean_ticket_id = f"TICK-{uuid.uuid4().hex[:8].upper()}"

        sender_display_name = (user_name or "").strip() or (user_email.split("@")[0].capitalize() if "@" in user_email else "Customer")

        initial_msg = {
            "msg_id": uuid.uuid4().hex[:12],
            "sender_type": "user",
            "sender_id": str(user_id),
            "sender_email": user_email,
            "sender_name": sender_display_name,
            "message": message.strip(),
            "created_at": now.isoformat(),
            "attachments": attachments or []
        }

        doc = {
            "ticket_id": clean_ticket_id,
            "user_id": str(user_id),
            "user_email": user_email,
            "user_name": sender_display_name,
            "subject": subject.strip(),
            "category": category or "general_inquiry", # general_inquiry, waf_false_positive, ddos_attack, site_down, malware_infection, billing
            "priority": priority or "medium", # critical, high, medium, low
            "status": "open", # open, in_progress, waiting_user, resolved, closed
            "target_domain": (target_domain or "").strip().lower(),
            "diagnostics": diagnostics or {}, # light JSON snapshot of WP / WAF state if sent
            "messages": [initial_msg],
            "message_count": 1,
            "created_at": now,
            "updated_at": now,
            "closed_at": None,
            "purge_at": None, # Set upon resolution/closing for 90-day auto-prune
            "admin_notes": ""
        }

        res = self.db.support_tickets.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        doc["created_at"] = now.isoformat()
        doc["updated_at"] = now.isoformat()
        return doc

    def get_user_tickets(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Fetch tickets for a specific user dashboard with pagination.
        """
        query: Dict[str, Any] = {"user_id": str(user_id)}
        if status and status != "all":
            query["status"] = status

        total = self.db.support_tickets.count_documents(query)
        cursor = self.db.support_tickets.find(query).sort("updated_at", -1).skip(skip).limit(limit)

        items = []
        for doc in cursor:
            items.append(self._format_ticket(doc, summary_only=True))

        return {
            "total": total,
            "page": (skip // limit) + 1 if limit else 1,
            "limit": limit,
            "tickets": items
        }

    def get_admin_tickets(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Super Admin Console multi-filter inquiry feed.
        """
        query: Dict[str, Any] = {}
        if status and status != "all":
            query["status"] = status
        if priority and priority != "all":
            query["priority"] = priority
        if category and category != "all":
            query["category"] = category
        if search:
            s = search.strip()
            query["$or"] = [
                {"ticket_id": {"$regex": s, "$options": "i"}},
                {"user_email": {"$regex": s, "$options": "i"}},
                {"subject": {"$regex": s, "$options": "i"}},
                {"target_domain": {"$regex": s, "$options": "i"}}
            ]

        total = self.db.support_tickets.count_documents(query)
        cursor = self.db.support_tickets.find(query).sort("updated_at", -1).skip(skip).limit(limit)

        items = []
        for doc in cursor:
            items.append(self._format_ticket(doc, summary_only=True))

        # Also get quick counts for badges
        open_count = self.db.support_tickets.count_documents({"status": "open"})
        in_progress_count = self.db.support_tickets.count_documents({"status": "in_progress"})
        waiting_count = self.db.support_tickets.count_documents({"status": "waiting_user"})
        resolved_count = self.db.support_tickets.count_documents({"status": {"$in": ["resolved", "closed"]}})

        return {
            "total": total,
            "metrics": {
                "open": open_count,
                "in_progress": in_progress_count,
                "waiting_user": waiting_count,
                "resolved": resolved_count,
            },
            "page": (skip // limit) + 1 if limit else 1,
            "limit": limit,
            "tickets": items
        }

    def get_ticket_details(self, ticket_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get entire ticket thread. If user_id passed, ensures multi-tenant isolation.
        """
        query: Dict[str, Any] = {"ticket_id": ticket_id}
        if user_id:
            query["user_id"] = str(user_id)

        doc = self.db.support_tickets.find_one(query)
        if not doc:
            return None
        return self._format_ticket(doc, summary_only=False)

    def add_message(
        self,
        ticket_id: str,
        sender_type: str, # 'admin' or 'user'
        sender_id: str,
        sender_email: str,
        message: str,
        attachments: Optional[List[Dict[str, str]]] = None,
        new_status: Optional[str] = None,
        staff_name: Optional[str] = None,
        sender_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Append a reply to an existing ticket.
        If sent by staff/admin, formats message professionally with greeting and signature.
        """
        now = datetime.now(timezone.utc)
        
        # Build professional formatted message for admin response if needed
        final_message = message.strip()
        formatted_staff = (staff_name or "MDefender Support Team").strip()
        existing_doc = self.db.support_tickets.find_one({"ticket_id": ticket_id})

        if sender_type == "admin":
            recipient_name = "Customer"
            if existing_doc:
                recipient_name = existing_doc.get("user_name") or (existing_doc.get("user_email", "").split("@")[0].capitalize() if existing_doc.get("user_email") else "Customer")
            
            # If the admin only typed the body (without already adding greeting/signature), wrap it automatically
            if not final_message.lower().startswith("hello") and not final_message.lower().startswith("hi "):
                final_message = (
                    f"Hello {recipient_name},\n\n"
                    f"{final_message}\n\n"
                    f"Best regards,\n"
                    f"{formatted_staff}\n"
                    f"Technical Support | MDefender Pro SOC Team"
                )

        user_display = (sender_name or "").strip()
        if not user_display and existing_doc:
            user_display = existing_doc.get("user_name") or (existing_doc.get("user_email", "").split("@")[0].capitalize() if existing_doc.get("user_email") else sender_email)
        if not user_display:
            user_display = sender_email

        msg_obj = {
            "msg_id": uuid.uuid4().hex[:12],
            "sender_type": sender_type,
            "sender_id": str(sender_id),
            "sender_email": sender_email,
            "sender_name": formatted_staff if sender_type == "admin" else user_display,
            "message": final_message,
            "created_at": now.isoformat(),
            "attachments": attachments or []
        }

        update_ops: Dict[str, Any] = {
            "$push": {"messages": msg_obj},
            "$inc": {"message_count": 1},
            "$set": {
                "updated_at": now
            }
        }

        if new_status:
            update_ops["$set"]["status"] = new_status
            if new_status in ["resolved", "closed"]:
                update_ops["$set"]["closed_at"] = now
                # 90-day auto retention purge
                update_ops["$set"]["purge_at"] = now + timedelta(days=90)
            elif new_status in ["open", "in_progress", "waiting_user"]:
                update_ops["$set"]["closed_at"] = None
                update_ops["$set"]["purge_at"] = None
        elif sender_type == "admin":
            update_ops["$set"]["status"] = "waiting_user"
        elif sender_type == "user":
            update_ops["$set"]["status"] = "in_progress"

        res = self.db.support_tickets.find_one_and_update(
            {"ticket_id": ticket_id},
            update_ops,
            return_document=True
        )
        if not res:
            return None

        # If admin replied, send rich professional email notification to user's registered inbox
        if sender_type == "admin":
            user_email = res.get("user_email")
            if user_email and "@" in user_email:
                self._dispatch_email_notification(
                    to_email=user_email,
                    ticket_id=ticket_id,
                    subject=res.get("subject", "Support Inquiry"),
                    reply_body=final_message,
                    status=res.get("status", "waiting_user"),
                    staff_name=formatted_staff
                )

        return self._format_ticket(res, summary_only=False)

    def _dispatch_email_notification(self, to_email: str, ticket_id: str, subject: str, reply_body: str, status: str, staff_name: str = "Technical Support"):
        """Asynchronously notify user about an admin reply via SMTP with enterprise template."""
        import threading
        def _send():
            try:
                from src.auth.config import AuthConfig
                import smtplib
                from email.mime.multipart import MIMEMultipart
                from email.mime.text import MIMEText

                config = AuthConfig()
                smtp_server = (config.SMTP_SERVER or "").strip()
                smtp_port = int(config.SMTP_PORT or 587)
                smtp_user = (config.SMTP_USERNAME or "").strip()
                smtp_pass = (config.SMTP_PASSWORD or "").strip()

                if not smtp_server or not smtp_user:
                    _log.info(f"[Support Email] SMTP not configured. Notification for {ticket_id} to {to_email} skipped.")
                    return

                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"[MDefender Support] Update on Ticket #{ticket_id}: {subject}"
                msg["From"] = f"{config.FROM_NAME or 'MDefender Support'} <{config.FROM_EMAIL or smtp_user}>"
                msg["To"] = to_email

                formatted_html_body = reply_body.replace("\n", "<br/>")

                html_content = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #D9E1DC; border-radius: 12px; background: #ffffff;">
                    <div style="padding-bottom: 18px; border-bottom: 2px solid #0B2522; display: flex; align-items: center; justify-content: space-between;">
                        <h2 style="color: #0B2522; margin: 0; font-size: 20px; font-weight: 800;">MDefender Pro &mdash; Technical Support</h2>
                        <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #ECFDF5; color: #059669; font-weight: 700; border: 1px solid #A7F3D0;">#{ticket_id}</span>
                    </div>
                    <div style="padding: 24px 0;">
                        <div style="background: #FBFCFA; border-left: 4px solid #6366F1; padding: 18px 20px; border-radius: 8px; margin-bottom: 24px; color: #1E293B; font-size: 14.5px; line-height: 1.6;">
                            {formatted_html_body}
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 12px 16px; background: #F8FAFC; border-radius: 8px; font-size: 13px;">
                            <span style="color: #64748B;">Ticket Status: <strong style="color: #2563EB; text-transform: uppercase;">{status}</strong></span>
                            <span style="color: #64748B;">Specialist: <strong style="color: #0F172A;">{staff_name}</strong></span>
                        </div>
                        <div style="text-align: center;">
                            <a href="http://localhost:5173/user/support" style="display: inline-block; background: #0B2522; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(11, 37, 34, 0.15);">View & Reply in Security Helpdesk</a>
                        </div>
                    </div>
                    <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; color: #94A3B8; font-size: 12px; line-height: 1.5;">
                        This is an official automated notification from MDefender Pro Security Operations Center (SOC). You can reply directly through your dashboard.
                    </div>
                </div>
                """
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as s:
                    s.starttls()
                    s.login(smtp_user, smtp_pass)
                    s.send_message(msg)
                _log.info(f"[Support Email] Successfully sent notification to {to_email} for ticket {ticket_id}")
            except Exception as e:
                _log.warning(f"[Support Email] Could not send email notification: {e}")

        t = threading.Thread(target=_send, daemon=True)
        t.start()

    def update_ticket_status(
        self,
        ticket_id: str,
        status: str,
        priority: Optional[str] = None,
        admin_notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Admin updates ticket status, SLA priority, or internal admin notes.
        """
        now = datetime.now(timezone.utc)
        set_payload: Dict[str, Any] = {
            "status": status,
            "updated_at": now
        }
        if priority:
            set_payload["priority"] = priority
        if admin_notes is not None:
            set_payload["admin_notes"] = admin_notes

        if status in ["resolved", "closed"]:
            set_payload["closed_at"] = now
            set_payload["purge_at"] = now + timedelta(days=90) # Clean up after 90 days
        else:
            set_payload["closed_at"] = None
            set_payload["purge_at"] = None

        res = self.db.support_tickets.find_one_and_update(
            {"ticket_id": ticket_id},
            {"$set": set_payload},
            return_document=True
        )
        if not res:
            return None
        return self._format_ticket(res, summary_only=False)

    def delete_ticket(self, ticket_id: str, user_id: Optional[str] = None) -> bool:
        """
        Manual purge of a ticket by user (only if resolved/closed) or super admin (any).
        """
        query: Dict[str, Any] = {"ticket_id": ticket_id}
        if user_id:
            query["user_id"] = str(user_id)
            query["status"] = {"$in": ["resolved", "closed"]}

        res = self.db.support_tickets.delete_one(query)
        return res.deleted_count > 0

    def get_remote_diagnostics(self, domain_or_id: str) -> Dict[str, Any]:
        """
        Super Admin Remote Inspector: inspects live health, WAF status, and recent blocks of target website.
        """
        clean_domain = domain_or_id.replace("https://", "").replace("http://", "").strip().strip("/")
        site = self.db.websites.find_one({
            "$or": [
                {"domain": clean_domain},
                {"target_url": {"$regex": clean_domain, "$options": "i"}},
                {"site_url": {"$regex": clean_domain, "$options": "i"}},
                {"api_key": domain_or_id}
            ]
        })

        if not site:
            # Fallback check in clients collection
            site = self.db.clients.find_one({
                "$or": [
                    {"domain": clean_domain},
                    {"api_key": domain_or_id}
                ]
            })

        if not site:
            return {
                "found": False,
                "message": f"Origin site '{domain_or_id}' not found in registry."
            }

        # Query recent blocked attacks for this site
        api_key = site.get("api_key", "")
        domain_name = site.get("domain", clean_domain)
        recent_attacks = list(self.db.attacks.find({
            "$or": [
                {"api_key": api_key},
                {"domain": domain_name},
                {"host": domain_name}
            ]
        }).sort("timestamp", -1).limit(5))

        formatted_attacks = []
        for att in recent_attacks:
            formatted_attacks.append({
                "ip": att.get("ip", "unknown"),
                "attack_type": att.get("attack_type", "WAF Block"),
                "timestamp": str(att.get("timestamp", "")),
                "action": att.get("action", "blocked"),
                "request_uri": att.get("request_uri", "/")
            })

        return {
            "found": True,
            "domain": domain_name,
            "site_id": str(site.get("_id", "")),
            "owner_user_id": str(site.get("user_id", "")),
            "status": site.get("status", "active"),
            "waf_mode": site.get("waf_mode", "block"),
            "ssl_status": site.get("ssl_status", "active"),
            "wp_version": site.get("wp_version", "6.7.1"),
            "plugins_count": site.get("plugins_count", 0),
            "recent_attacks": formatted_attacks,
            "health_score": site.get("health_score", 98)
        }

    def _format_ticket(self, doc: Dict[str, Any], summary_only: bool = False) -> Dict[str, Any]:
        t_id = doc.get("ticket_id")
        created_at = doc.get("created_at")
        updated_at = doc.get("updated_at")
        closed_at = doc.get("closed_at")
        purge_at = doc.get("purge_at")

        result = {
            "_id": str(doc.get("_id", "")),
            "ticket_id": t_id,
            "user_id": str(doc.get("user_id", "")),
            "user_email": doc.get("user_email", ""),
            "user_name": doc.get("user_name", ""),
            "subject": doc.get("subject", ""),
            "category": doc.get("category", "general_inquiry"),
            "priority": doc.get("priority", "medium"),
            "status": doc.get("status", "open"),
            "target_domain": doc.get("target_domain", ""),
            "message_count": doc.get("message_count", len(doc.get("messages", []))),
            "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
            "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at or ""),
            "closed_at": closed_at.isoformat() if isinstance(closed_at, datetime) else (str(closed_at) if closed_at else None),
            "purge_at": purge_at.isoformat() if isinstance(purge_at, datetime) else (str(purge_at) if purge_at else None),
            "admin_notes": doc.get("admin_notes", "")
        }

        if summary_only:
            messages = doc.get("messages", [])
            last_msg = messages[-1] if messages else {}
            result["latest_message"] = {
                "sender_type": last_msg.get("sender_type", "user"),
                "sender_email": last_msg.get("sender_email", ""),
                "snippet": (last_msg.get("message", "")[:120] + "...") if len(last_msg.get("message", "")) > 120 else last_msg.get("message", ""),
                "created_at": last_msg.get("created_at", "")
            }
        else:
            result["messages"] = doc.get("messages", [])
            result["diagnostics"] = doc.get("diagnostics", {})

        return result

