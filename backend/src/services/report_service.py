"""MDefender Pro Zero-Storage Executive Security & Fleet Report Service.

Generates multinational / agency-grade posture reports for 1 to 100+ websites
strictly from indexed, already-cached MongoDB telemetry (<20ms, zero load on
customer WordPress origins, zero PDF blob storage in database).
"""

import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from html import escape as html_escape
from typing import Any, Dict, List, Optional

from bson import ObjectId

from src.database.mongodb_connection import MongoDB


def _period_to_days(period: str) -> int:
    p = (period or "30d").strip().lower()
    if p == "24h" or p == "1d":
        return 1
    if p == "7d":
        return 7
    if p == "90d":
        return 90
    return 30


def _compute_next_run(frequency: str, from_dt: Optional[datetime] = None) -> datetime:
    base = from_dt or datetime.now(timezone.utc)
    freq = (frequency or "weekly").strip().lower()
    if freq == "daily":
        return base + timedelta(days=1)
    if freq == "monthly":
        return base + timedelta(days=30)
    return base + timedelta(days=7)


FINDING_PLAYBOOKS: Dict[str, Dict[str, Any]] = {
    "waf_disabled": {
        "category": "Perimeter WAF",
        "compliance": "OWASP A05 · PCI-DSS 6.4",
        "points": 20,
        "title": "Edge Web Application Firewall Inactive",
        "impact": "Malicious payloads (SQL injection, XSS, remote file inclusion, and automated exploit probes) pass directly to the origin server without edge filtering.",
        "remediation": "Open Site Security -> WAF Rules and switch WAF Mode to Protect (Blocking) so OWASP Core & Semantic WAAP rules block hostile requests at the edge.",
    },
    "site_outage": {
        "category": "Origin Availability",
        "compliance": "SOC-2 A1.2 · SLA Availability",
        "points": 20,
        "title": "Active Origin Downtime / Unreachable Endpoint",
        "impact": "Visitors and customers receive HTTP 5xx/timeout errors, impacting revenue, uptime SLA commitments, and search ranking.",
        "remediation": "Inspect origin web server/PHP-FPM health and database connectivity immediately, or verify reverse-proxy upstream routing inside Monitoring -> Uptime.",
    },
    "malware_detected": {
        "category": "Malware & Integrity",
        "compliance": "OWASP A08 · CIS WP-6.1",
        "points": 20,
        "title": "Malicious Code or Modified WordPress Core Files",
        "impact": "Compromised PHP/plugin files enable persistent backdoors, SEO spam injection, data exfiltration, and search-engine blocklisting.",
        "remediation": "Open WordPress Management -> Malware Scanner, review flagged files, quarantine suspicious payloads, and restore modified core files via WordPress Core Integrity.",
    },
    "login_exposed": {
        "category": "Authentication Security",
        "compliance": "OWASP A07 · CIS WP-3.2",
        "points": 15,
        "title": "Default WordPress Login Endpoint Exposed",
        "impact": "Automated credential-stuffing and brute-force botnets continuously target /wp-login.php and wp-admin, increasing risk of unauthorized admin takeover and PHP worker exhaustion.",
        "remediation": "Navigate to Security Protection -> Login Gateway Security and configure a Stealth Login URL or restrict /wp-admin access via Admin IP Allowlist.",
    },
    "bot_shield_off": {
        "category": "Bot Defense",
        "compliance": "OWASP Automated Threats · SOC-2 CC6",
        "points": 10,
        "title": "Biometric Hold-Press & Turnstile Bot Shield Inactive",
        "impact": "Headless scrapers and credential-guessing bots can submit forms and login requests without human challenge verification.",
        "remediation": "Open Security Protection -> Biometric & Bot Shield and enable Cloudflare Turnstile or Hold-Press verification on login and public submission endpoints.",
    },
    "no_2fa": {
        "category": "Identity Protection",
        "compliance": "NIST 800-63B · SOC-2 CC6.1",
        "points": 5,
        "title": "Two-Factor Authentication (2FA) Not Enforced",
        "impact": "If an administrator password is leaked or phished, attackers can log in with a single factor without TOTP/email second verification.",
        "remediation": "Enable Two-Factor Authentication inside Security Protection -> Two-Factor Auth (2FA) for all privileged WordPress and workspace accounts.",
    },
    "no_backup": {
        "category": "Business Continuity",
        "compliance": "ISO 27001 A.12.3 · SOC-2 A1.3",
        "points": 5,
        "title": "Zero Disaster-Recovery Backup Snapshots",
        "impact": "Without an off-origin snapshot, ransomware encryption, bad plugin updates, or accidental deletions cannot be cleanly rolled back.",
        "remediation": "Open Backup & Recovery -> Cloud Backups and create an encrypted baseline snapshot with recurring automated retention.",
    },
    "ssl_expired": {
        "category": "Transport Encryption",
        "compliance": "OWASP A02 · PCI-DSS 4.2",
        "points": 5,
        "title": "Expired SSL / TLS Certificate",
        "impact": "Modern browsers display full-page security warnings blocking user access, and traffic in transit loses verifiable HTTPS trust.",
        "remediation": "Renew and deploy a valid TLS certificate immediately via your edge SSL manager or origin certificate authority.",
    },
    "ssl_expiring": {
        "category": "Transport Encryption",
        "compliance": "OWASP A02 · TLS Lifecycle",
        "points": 2,
        "title": "SSL / TLS Certificate Expiring Within 30 Days",
        "impact": "Unrenewed certificates trigger browser trust failures and API webhook breakdowns once the expiration timestamp passes.",
        "remediation": "Verify auto-renewal ACME/SSL configuration before expiration so uninterrupted HTTPS coverage is maintained.",
    },
    "wp_disconnected": {
        "category": "Agent Telemetry",
        "compliance": "SOC-2 CC7.2 · Runtime Visibility",
        "points": 0,
        "title": "WordPress Security Plugin Disconnected",
        "impact": "Origin-level telemetry (plugin inventory, file integrity checksums, and instant hardening enforcement) cannot synchronize with the control plane.",
        "remediation": "Re-link the MDefender WordPress plugin from WordPress Sites -> Connect Website using the site connection key.",
    },
}


def _describe_attack_vector(attack_type: str) -> str:
    t = (attack_type or "").lower()
    if "brute" in t or "login" in t:
        return "Automated password guessing & credential stuffing against authentication endpoints."
    if "sql" in t:
        return "Malicious SQL syntax injected into query parameters or headers to read/alter database records."
    if "xss" in t or "cross-site" in t:
        return "Injected client-side script payloads attempting session hijacking or DOM manipulation."
    if "command" in t or "rce" in t or "remote code" in t:
        return "Attempts to execute arbitrary operating system commands or PHP code on the server."
    if "traversal" in t:
        return "Path manipulation (../) probing sensitive server configuration files such as wp-config.php or /etc/passwd."
    if "ssrf" in t or "metadata" in t:
        return "Server-Side Request Forgery probing internal cloud metadata services and private network hosts."
    if "wordpress" in t or "xmlrpc" in t:
        return "Targeted WordPress plugin, theme, or XML-RPC exploit probes."
    return "Hostile payload matched and dropped by MDefender Edge WAF signatures."


def _score_to_grade(score: int) -> Dict[str, str]:
    if score >= 95:
        return {"grade": "A+", "risk_level": "LOW RISK", "summary_label": "Hardened & Audit Ready"}
    if score >= 88:
        return {"grade": "A", "risk_level": "LOW RISK", "summary_label": "Strong Enterprise Posture"}
    if score >= 78:
        return {"grade": "B", "risk_level": "MODERATE RISK", "summary_label": "Protected — Minor Hardening Pending"}
    if score >= 65:
        return {"grade": "C", "risk_level": "ELEVATED RISK", "summary_label": "Attention Required on Key Controls"}
    if score >= 50:
        return {"grade": "D", "risk_level": "HIGH RISK", "summary_label": "Significant Exposure Gaps"}
    return {"grade": "F", "risk_level": "CRITICAL RISK", "summary_label": "Immediate Remediation Required"}


class ReportService:
    def __init__(self, db=None):
        self.db = db or MongoDB()

    def _resolve_user_doc(self, user: Any) -> Dict[str, Any]:
        if isinstance(user, dict) and user.get("email") and user.get("id"):
            uid_str = str(user.get("id") or user.get("_id") or "")
        elif isinstance(user, dict):
            uid_str = str(user.get("id") or user.get("_id") or "")
        else:
            uid_str = str(user or "")

        queries = [{"_id": uid_str}, {"id": uid_str}]
        if ObjectId.is_valid(uid_str):
            queries.append({"_id": ObjectId(uid_str)})

        doc = self.db.users.find_one(
            {"$or": queries},
            {"email": 1, "full_name": 1, "name": 1, "username": 1, "company": 1, "plan": 1},
        )
        if doc:
            return {
                "id": str(doc["_id"]),
                "email": doc.get("email", ""),
                "name": doc.get("full_name") or doc.get("name") or doc.get("username") or "Security Operator",
                "company": doc.get("company") or "",
                "plan": doc.get("plan") or "pro",
            }
        if isinstance(user, dict):
            return {
                "id": uid_str,
                "email": user.get("email", ""),
                "name": user.get("full_name") or user.get("name") or user.get("username") or "Security Operator",
                "company": user.get("company") or "",
                "plan": user.get("plan") or "pro",
            }
        return {"id": uid_str, "email": "", "name": "Security Operator", "company": "", "plan": "pro"}

    def generate_executive_report(
        self,
        user: Any,
        website_id: str = "all",
        period: str = "30d",
    ) -> Dict[str, Any]:
        """Compile a zero-origin-load executive report from cached fleet telemetry."""
        user_info = self._resolve_user_doc(user)
        uid_str = user_info["id"]
        days = _period_to_days(period)
        now_utc = datetime.now(timezone.utc)
        since_dt = now_utc - timedelta(days=days)
        since_naive = since_dt.replace(tzinfo=None)

        user_queries: List[Dict[str, Any]] = [{"user_id": uid_str}]
        if ObjectId.is_valid(uid_str):
            user_queries.append({"user_id": ObjectId(uid_str)})

        site_query: Dict[str, Any] = {"$or": user_queries}
        if website_id and website_id != "all":
            id_matches: List[Dict[str, Any]] = [{"_id": website_id}, {"id": website_id}]
            if ObjectId.is_valid(website_id):
                id_matches.append({"_id": ObjectId(website_id)})
            site_query = {"$and": [site_query, {"$or": id_matches}]}

        sites_raw = list(self.db.websites.find(site_query))
        domains = list({str(s.get("domain") or "").strip() for s in sites_raw if s.get("domain")})

        # 4 fast batched read queries across all domains in scope (0 HTTP calls to customer sites)
        ssl_by_domain: Dict[str, Dict[str, Any]] = {}
        ongoing_incidents_by_domain: Dict[str, Dict[str, Any]] = {}
        incident_counts_by_domain: Dict[str, int] = {}
        probe_stats_by_domain: Dict[str, Dict[str, Any]] = {}
        malware_hits_by_domain: Dict[str, int] = {}

        if domains:
            try:
                for doc in self.db.ssl_monitoring.find({"domain": {"$in": domains}}):
                    ssl_by_domain[str(doc.get("domain", ""))] = doc
            except Exception:
                pass

            try:
                for inc in self.db.monitoring_incidents.find(
                    {"domain": {"$in": domains}, "$or": [{"status": "ongoing"}, {"started_at": {"$gte": since_naive}}]}
                ):
                    dom = str(inc.get("domain", ""))
                    if inc.get("status") == "ongoing":
                        ongoing_incidents_by_domain[dom] = inc
                    incident_counts_by_domain[dom] = incident_counts_by_domain.get(dom, 0) + 1
            except Exception:
                pass

            try:
                pipeline = [
                    {"$match": {"domain": {"$in": domains}, "checked_at": {"$gte": since_naive}}},
                    {
                        "$group": {
                            "_id": "$domain",
                            "total": {"$sum": 1},
                            "online": {"$sum": {"$cond": [{"$eq": ["$is_online", True]}, 1, 0]}},
                            "avg_latency": {"$avg": "$total_latency_ms"},
                        }
                    },
                ]
                for row in self.db.monitoring_probes.aggregate(pipeline):
                    dom = str(row.get("_id", ""))
                    tot = int(row.get("total") or 0)
                    onl = int(row.get("online") or 0)
                    probe_stats_by_domain[dom] = {
                        "total": tot,
                        "online": onl,
                        "uptime_pct": round((onl / tot) * 100, 2) if tot > 0 else 100.0,
                        "avg_latency_ms": round(float(row.get("avg_latency") or 0), 1),
                    }
            except Exception:
                pass

            try:
                m_pipeline = [
                    {
                        "$match": {
                            "domain": {"$in": domains},
                            "timestamp": {"$gte": since_naive},
                            "verdict": {"$in": ["malicious", "suspicious"]},
                        }
                    },
                    {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
                ]
                for row in self.db.malware_scans.aggregate(m_pipeline):
                    malware_hits_by_domain[str(row.get("_id", ""))] = int(row.get("count") or 0)
            except Exception:
                pass

        site_rows: List[Dict[str, Any]] = []
        advisories: List[Dict[str, Any]] = []

        total_requests = 0
        total_blocked = 0
        uptime_sum = 0.0
        score_sum = 0

        cov_waf = 0
        cov_login_cloak = 0
        cov_bot_shield = 0
        cov_2fa = 0
        cov_ssl = 0
        cov_backup = 0

        rubric_waf = 0
        rubric_uptime = 0
        rubric_malware = 0
        rubric_login = 0
        rubric_bot = 0
        rubric_ssl = 0
        rubric_continuity = 0

        grouped_playbooks: Dict[str, Dict[str, Any]] = {}

        site_ids = []
        for s in sites_raw:
            if s.get("id"):
                site_ids.append(str(s.get("id")))
            if s.get("_id"):
                site_ids.append(str(s.get("_id")))
        site_ids = list(set(site_ids))

        # Batched Threat Vector Intelligence from cached attack_attempts (Zero origin load)
        threat_events_total = 0
        top_attack_vectors: List[Dict[str, Any]] = []
        top_attacker_ips: List[Dict[str, Any]] = []
        top_targeted_paths: List[Dict[str, Any]] = []
        site_vectors_map: Dict[str, List[Dict[str, Any]]] = {}
        site_events_map: Dict[str, int] = {}
        try:
            att_match: Dict[str, Any] = {"timestamp": {"$gte": since_naive}}
            if website_id and website_id != "all":
                att_match["website_id"] = {"$in": site_ids or [website_id]}
            else:
                or_clauses: List[Dict[str, Any]] = [{"user_id": uid_str}]
                if site_ids:
                    or_clauses.append({"website_id": {"$in": site_ids}})
                att_match["$or"] = or_clauses

            facet_res = list(
                self.db.attack_attempts.aggregate([
                    {"$match": att_match},
                    {
                        "$facet": {
                            "total": [{"$count": "cnt"}],
                            "vectors": [
                                {"$group": {"_id": {"$ifNull": ["$attack_type", "WAF Rule Block"]}, "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}},
                                {"$limit": 8},
                            ],
                            "by_site": [
                                {
                                    "$group": {
                                        "_id": {
                                            "wid": {"$ifNull": ["$website_id", ""]},
                                            "vec": {"$ifNull": ["$attack_type", "WAF Rule Block"]},
                                        },
                                        "count": {"$sum": 1},
                                    }
                                },
                                {"$sort": {"count": -1}},
                                {"$limit": 150},
                            ],
                            "ips": [
                                {
                                    "$group": {
                                        "_id": {"$ifNull": ["$ip", "Unknown"]},
                                        "count": {"$sum": 1},
                                        "top_vector": {"$first": "$attack_type"},
                                        "last_seen": {"$max": "$timestamp"},
                                    }
                                },
                                {"$sort": {"count": -1}},
                                {"$limit": 8},
                            ],
                            "paths": [
                                {"$group": {"_id": {"$ifNull": ["$url", "/"]}, "count": {"$sum": 1}}},
                                {"$sort": {"count": -1}},
                                {"$limit": 6},
                            ],
                        }
                    },
                ])
            )
            if facet_res:
                f = facet_res[0]
                threat_events_total = int((f.get("total") or [{}])[0].get("cnt") or 0)
                denom = threat_events_total if threat_events_total > 0 else 1
                for v in f.get("vectors") or []:
                    cnt = int(v.get("count") or 0)
                    v_name = str(v.get("_id") or "Edge Block")
                    top_attack_vectors.append({
                        "type": v_name,
                        "count": cnt,
                        "pct": round((cnt / denom) * 100, 1),
                        "description": _describe_attack_vector(v_name),
                    })
                for ip_row in f.get("ips") or []:
                    ls = ip_row.get("last_seen")
                    top_attacker_ips.append({
                        "ip": str(ip_row.get("_id") or "Unknown"),
                        "count": int(ip_row.get("count") or 0),
                        "top_vector": str(ip_row.get("top_vector") or "WAF Block"),
                        "last_seen": ls.isoformat() if hasattr(ls, "isoformat") else str(ls or ""),
                    })
                for p_row in f.get("paths") or []:
                    top_targeted_paths.append({
                        "path": str(p_row.get("_id") or "/")[:90],
                        "count": int(p_row.get("count") or 0),
                    })
                for s_row in f.get("by_site") or []:
                    key_obj = s_row.get("_id") or {}
                    wid_k = str(key_obj.get("wid") or "")
                    vec_k = str(key_obj.get("vec") or "WAF Rule Block")
                    cnt_k = int(s_row.get("count") or 0)
                    if wid_k:
                        site_events_map[wid_k] = site_events_map.get(wid_k, 0) + cnt_k
                        site_vectors_map.setdefault(wid_k, []).append({"type": vec_k, "count": cnt_k})
        except Exception:
            pass

        # Batched Incident Audit Log from monitoring_incidents
        incident_log: List[Dict[str, Any]] = []
        if domains:
            try:
                inc_docs = list(
                    self.db.monitoring_incidents.find(
                        {"domain": {"$in": domains}, "$or": [{"status": "ongoing"}, {"started_at": {"$gte": since_naive}}]}
                    )
                    .sort("started_at", -1)
                    .limit(15)
                )
                for inc in inc_docs:
                    st_dt = inc.get("started_at")
                    res_dt = inc.get("resolved_at")
                    dur_sec = int(inc.get("duration_seconds") or 0)
                    if dur_sec <= 0 and st_dt and res_dt:
                        try:
                            dur_sec = max(0, int((res_dt - st_dt).total_seconds()))
                        except Exception:
                            dur_sec = 0
                    incident_log.append({
                        "domain": str(inc.get("domain") or "Unknown"),
                        "status": str(inc.get("status") or "resolved").upper(),
                        "status_code": int(inc.get("status_code") or 0),
                        "error_message": str(inc.get("error_message") or "Origin unreachable / timeout"),
                        "started_at": st_dt.strftime("%b %d, %Y %H:%M UTC") if hasattr(st_dt, "strftime") else str(st_dt or "—"),
                        "duration_label": (
                            "Ongoing"
                            if inc.get("status") == "ongoing"
                            else (f"{max(1, round(dur_sec / 60))} min" if dur_sec > 0 else "< 1 min")
                        ),
                    })
            except Exception:
                pass

        for s in sites_raw:
            sid = str(s.get("id") or s.get("_id") or "")
            dom = str(s.get("domain") or s.get("url") or "Unknown Domain").strip()
            url = str(s.get("url") or f"https://{dom}").strip()
            h = s.get("hardening") or {}

            reqs = int(s.get("total_requests") or 0)
            blks = int(s.get("total_blocked") or 0)
            total_requests += reqs
            total_blocked += blks

            wp_conn = bool((s.get("wordpress_connection") or {}).get("connected"))
            status_val = str(s.get("status") or "").lower()
            ongoing_inc = ongoing_incidents_by_domain.get(dom)
            is_online = (ongoing_inc is None) and (status_val not in ("offline", "down"))

            p_stat = probe_stats_by_domain.get(dom)
            uptime_pct = p_stat["uptime_pct"] if p_stat else (100.0 if is_online else 95.0)
            avg_latency_ms = p_stat["avg_latency_ms"] if p_stat else 0.0
            uptime_sum += uptime_pct

            waf_mode = str(s.get("waf_mode") or "protect").lower()
            waf_active = waf_mode in ("protect", "monitor")
            if waf_active:
                cov_waf += 1

            hide_login = bool(s.get("hide_login_url") or h.get("hide_login_url"))
            custom_slug = str(s.get("custom_login_slug") or h.get("custom_login_slug") or "").strip()
            ip_lock = bool(s.get("admin_ip_whitelist_enabled") or h.get("admin_ip_whitelist_enabled"))
            if (hide_login and custom_slug) or ip_lock:
                cov_login_cloak += 1

            bot_shield = bool(s.get("turnstile_enabled") or s.get("hold_press_enabled"))
            if bot_shield:
                cov_bot_shield += 1

            two_fa = bool(s.get("two_factor_enabled") or s.get("login_two_factor"))
            if two_fa:
                cov_2fa += 1

            backups_count = int(s.get("backups_count") or len(s.get("backups") or []))
            if backups_count > 0:
                cov_backup += 1

            # Malware & Core Integrity
            last_scan_status = str(s.get("last_scan_status") or "clean").lower()
            checksum_modified = int(s.get("checksum_modified_count") or 0)
            malware_hits = malware_hits_by_domain.get(dom, 0)
            has_malware_issue = last_scan_status in ("infected", "malicious", "critical") or checksum_modified > 0 or malware_hits > 0

            # SSL Health
            ssl_doc = ssl_by_domain.get(dom)
            is_local = dom.startswith("localhost") or dom.startswith("127.0.0.1") or url.startswith("http://localhost")
            ssl_expired = bool(ssl_doc and ssl_doc.get("is_expired"))
            ssl_days = int(ssl_doc.get("days_remaining")) if (ssl_doc and ssl_doc.get("days_remaining") is not None) else None
            ssl_expiring_soon = bool(ssl_doc and not ssl_expired and ssl_days is not None and ssl_days <= 30)
            ssl_ok = is_local or (ssl_doc is None and url.startswith("https://")) or (ssl_doc and not ssl_expired)
            if ssl_doc and ssl_doc.get("has_ssl") and not ssl_expired:
                cov_ssl += 1
            elif url.startswith("https://") and not ssl_expired:
                cov_ssl += 1

            # Deterministic Security Posture Score (0 - 100)
            score = 0
            site_issues: List[Dict[str, str]] = []

            def _add_issue(code: str, severity: str, finding_text: str):
                pb = FINDING_PLAYBOOKS.get(code, {})
                item = {
                    "code": code,
                    "severity": severity,
                    "category": pb.get("category", "Security Posture"),
                    "compliance": pb.get("compliance", "SOC-2 / OWASP"),
                    "points_at_stake": int(pb.get("points") or 0),
                    "title": pb.get("title", finding_text),
                    "finding": finding_text,
                    "impact": pb.get("impact", "Increases exposure surface on the protected property."),
                    "remediation": pb.get("remediation", "Review configuration in MDefender Pro dashboard."),
                }
                site_issues.append(item)
                if code not in grouped_playbooks:
                    grouped_playbooks[code] = {
                        "code": code,
                        "severity": severity,
                        "category": item["category"],
                        "compliance": item["compliance"],
                        "points_at_stake": item["points_at_stake"],
                        "title": item["title"],
                        "finding": finding_text,
                        "impact": item["impact"],
                        "remediation": item["remediation"],
                        "affected_domains": [dom],
                        "affected_count": 1,
                    }
                else:
                    if dom not in grouped_playbooks[code]["affected_domains"]:
                        grouped_playbooks[code]["affected_domains"].append(dom)
                        grouped_playbooks[code]["affected_count"] += 1

            if waf_active:
                score += 20
                rubric_waf += 20
            else:
                _add_issue("waf_disabled", "critical", "Cloud WAF protection is disabled or off")

            if is_online:
                score += 20
                rubric_uptime += 20
            else:
                err_msg = (ongoing_inc or {}).get("error_message") or "Origin unreachable"
                _add_issue("site_outage", "critical", f"Website outage active ({err_msg})")

            if not has_malware_issue:
                score += 20
                rubric_malware += 20
            else:
                _add_issue(
                    "malware_detected",
                    "critical",
                    f"Malware or core modification flagged ({malware_hits or checksum_modified or 1} indicator(s))",
                )

            if (hide_login and custom_slug) or ip_lock:
                score += 15
                rubric_login += 15
            else:
                _add_issue("login_exposed", "warning", "Default /wp-login.php is exposed (no stealth slug or IP lock)")

            if bot_shield:
                score += 10
                rubric_bot += 10
            else:
                _add_issue("bot_shield_off", "warning", "Bot & Biometric Hold-Press Shield not active")

            if two_fa:
                score += 5
                rubric_continuity += 5
            else:
                _add_issue("no_2fa", "warning", "Two-Factor Authentication (2FA) is not enabled")

            if backups_count > 0:
                score += 5
                rubric_continuity += 5
            else:
                _add_issue("no_backup", "warning", "No stored disaster-recovery backup snapshot")

            if ssl_expired:
                _add_issue("ssl_expired", "critical", "TLS/SSL certificate has expired")
            elif ssl_expiring_soon:
                score += 3
                rubric_ssl += 3
                _add_issue("ssl_expiring", "warning", f"SSL certificate expires in {ssl_days} day(s)")
            elif ssl_ok:
                score += 5
                rubric_ssl += 5

            if not wp_conn and status_val == "disconnected":
                _add_issue("wp_disconnected", "warning", "WordPress plugin is currently disconnected")

            score = max(0, min(100, score))
            score_sum += score
            site_grade_info = _score_to_grade(score)

            has_critical = any(i["severity"] == "critical" for i in site_issues)
            has_warning = any(i["severity"] == "warning" for i in site_issues)
            verdict = "critical" if has_critical else ("attention" if has_warning else "healthy")

            site_ev_cnt = site_events_map.get(sid, 0) or site_events_map.get(str(s.get("_id") or ""), 0)
            site_vecs = (site_vectors_map.get(sid) or site_vectors_map.get(str(s.get("_id") or "")) or [])[:3]
            site_block_pct = round((blks / reqs) * 100, 1) if reqs > 0 else 0.0

            # Build per-site plain-English narrative explicitly naming this property's findings
            s_vec_text = (
                f" Forensics logged {site_ev_cnt:,} attack attempt(s) targeting this domain, led by {site_vecs[0]['type']} ({site_vecs[0]['count']} event(s))."
                if site_vecs
                else (
                    f" Edge WAF inspected {reqs:,} request(s) and blocked {blks:,} ({site_block_pct}%)."
                    if reqs > 0
                    else " Edge WAF protection is standing by with low ambient traffic volume."
                )
            )
            if not site_issues:
                site_narrative = (
                    f"{dom} achieved a {score}/100 ({site_grade_info['grade']}) posture rating with {uptime_pct}% origin availability "
                    f"({avg_latency_ms} ms avg latency).{s_vec_text} All baseline hardening, WAF, integrity, and continuity checks passed with zero open findings."
                )
            else:
                issue_titles = "; ".join(i["title"] for i in site_issues)
                pts_gain = min(100 - score, sum(i.get("points_at_stake", 0) for i in site_issues))
                site_narrative = (
                    f"{dom} scored {score}/100 ({site_grade_info['grade']} — {site_grade_info['risk_level']}) with {uptime_pct}% uptime.{s_vec_text} "
                    f"Audit identified {len(site_issues)} specific issue(s): {issue_titles}. "
                    + (f"Remediating these controls can improve this property's posture by +{pts_gain} points." if pts_gain > 0 else "")
                )

            for iss in site_issues:
                advisories.append({
                    "domain": dom,
                    "website_id": sid,
                    "code": iss["code"],
                    "severity": iss["severity"],
                    "category": iss["category"],
                    "compliance": iss.get("compliance", "SOC-2 / OWASP"),
                    "points_at_stake": iss.get("points_at_stake", 0),
                    "title": iss["title"],
                    "finding": iss["finding"],
                    "impact": iss["impact"],
                    "remediation": iss["remediation"],
                })

            site_rows.append({
                "website_id": sid,
                "domain": dom,
                "url": url,
                "connected": wp_conn,
                "is_online": is_online,
                "uptime_pct": uptime_pct,
                "avg_latency_ms": avg_latency_ms,
                "incidents_count": incident_counts_by_domain.get(dom, 0),
                "requests": reqs,
                "blocked": blks,
                "block_rate_pct": site_block_pct,
                "events_logged": site_ev_cnt,
                "top_vectors": site_vecs,
                "waf_mode": waf_mode,
                "waf_active": waf_active,
                "login_cloaked": bool(hide_login and custom_slug),
                "custom_login_slug": custom_slug if hide_login else "",
                "ip_lock_enabled": ip_lock,
                "bot_shield": bot_shield,
                "two_factor": two_fa,
                "backups_count": backups_count,
                "malware_clean": not has_malware_issue,
                "malware_hits": malware_hits,
                "checksum_modified": checksum_modified,
                "ssl_status": "local_http" if is_local else ("expired" if ssl_expired else ("expiring" if ssl_expiring_soon else "valid")),
                "ssl_days_remaining": ssl_days,
                "ssl_grade": (ssl_doc or {}).get("grade") or ("N/A" if is_local else "A"),
                "score": score,
                "grade": site_grade_info["grade"],
                "risk_level": site_grade_info["risk_level"],
                "narrative": site_narrative,
                "verdict": verdict,
                "issues": site_issues,
            })

        site_count = len(site_rows)
        # Sort critical/attention sites first so large agencies immediately see issues
        verdict_rank = {"critical": 0, "attention": 1, "healthy": 2}
        site_rows.sort(key=lambda r: (verdict_rank.get(r["verdict"], 2), -r["blocked"], r["domain"]))
        advisories.sort(key=lambda a: (0 if a["severity"] == "critical" else 1, a["domain"]))

        fleet_score = round(score_sum / site_count) if site_count > 0 else 100
        fleet_uptime = round(uptime_sum / site_count, 2) if site_count > 0 else 100.0
        block_rate = round((total_blocked / total_requests) * 100, 2) if total_requests > 0 else 0.0

        healthy_count = sum(1 for r in site_rows if r["verdict"] == "healthy")
        attention_count = site_count - healthy_count

        def _pct(n: int) -> int:
            return round((n / site_count) * 100) if site_count > 0 else 0

        report_id = f"MDP-RPT-{now_utc.strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
        scope_label = (
            f"All Connected Sites ({site_count})"
            if not website_id or website_id == "all"
            else (site_rows[0]["domain"] if site_rows else website_id)
        )

        grade_info = _score_to_grade(fleet_score)
        crit_cnt = sum(1 for a in advisories if a["severity"] == "critical")
        warn_cnt = sum(1 for a in advisories if a["severity"] == "warning")

        playbooks_sorted = sorted(
            grouped_playbooks.values(),
            key=lambda p: (0 if p["severity"] == "critical" else 1, -p["affected_count"], p["title"]),
        )

        # Build plain-English Executive Narrative
        top_vec_phrase = (
            f"The primary threat category observed was {top_attack_vectors[0]['type']} ({top_attack_vectors[0]['pct']}% of logged edge events)."
            if top_attack_vectors
            else "All edge inspection rules operated normally with no concentrated volumetric exploit campaign logged in the period."
        )
        ongoing_cnt = sum(1 for inc in incident_log if inc["status"] == "ONGOING")
        avail_phrase = (
            f"Origin availability averaged {fleet_uptime:.2f}% across {site_count} monitored property(ies). "
            + (
                f"{ongoing_cnt} unresolved outage incident(s) currently require immediate infrastructure intervention."
                if ongoing_cnt > 0
                else (
                    f"{len(incident_log)} transient availability event(s) were recorded and recovered during the window."
                    if incident_log
                    else "Zero downtime incidents were recorded across the observation window."
                )
            )
        )
        if crit_cnt == 0 and warn_cnt == 0:
            remediation_phrase = (
                f"All {site_count} evaluated property(ies) meet MDefender baseline security controls with zero critical exposures."
            )
        else:
            top_pb = playbooks_sorted[0] if playbooks_sorted else None
            top_action_hint = (
                f" Highest-leverage remediation: resolve '{top_pb['title']}' affecting {top_pb['affected_count']} site(s)."
                if top_pb
                else ""
            )
            remediation_phrase = (
                f"{healthy_count} of {site_count} site(s) achieved Healthy status while {attention_count} require hardening review "
                f"({crit_cnt} critical, {warn_cnt} warning finding(s)).{top_action_hint}"
            )

        key_strengths: List[str] = []
        if cov_waf == site_count and site_count > 0:
            key_strengths.append(f"100% Edge WAF Coverage across all {site_count} protected property(ies), actively filtering malicious HTTP payloads before origin execution.")
        elif cov_waf > 0:
            key_strengths.append(f"Edge WAF active on {cov_waf}/{site_count} site(s), blocking {total_blocked:,} hostile request(s) ({block_rate}% mitigation ratio).")
        if sum(1 for r in site_rows if r["malware_clean"]) == site_count and site_count > 0:
            key_strengths.append("Zero active malware infections or unauthorized WordPress core checksum alterations detected across audited properties.")
        if cov_login_cloak == site_count and site_count > 0:
            key_strengths.append("All properties enforce Login Gateway cloaking or IP restriction against automated credential stuffing.")
        if not key_strengths:
            key_strengths.append(f"Continuous zero-load security & availability telemetry established across {site_count} domain(s).")

        action_plan_7d: List[str] = []
        for pb in playbooks_sorted[:4]:
            doms_preview = ", ".join(pb["affected_domains"][:3]) + (
                f" (+{len(pb['affected_domains']) - 3} more)" if len(pb["affected_domains"]) > 3 else ""
            )
            action_plan_7d.append(
                f"[{str(pb['severity']).upper()}] {pb['title']} on {doms_preview} — {pb['remediation']}"
            )
        if not action_plan_7d:
            action_plan_7d.append("Maintain weekly automated digest monitoring and verify scheduled backup retention quarterly.")

        executive_brief = {
            "grade": grade_info["grade"],
            "risk_level": grade_info["risk_level"],
            "summary_label": grade_info["summary_label"],
            "headline": (
                f"Overall security posture scored {fleet_score}/100 (Grade {grade_info['grade']} — {grade_info['risk_level']}) "
                f"across {site_count} protected web property(ies) over the last {days} day(s)."
            ),
            "methodology_note": (
                "Compiled strictly from indexed MongoDB edge WAF logs, uptime probe history, SSL monitors, malware scan snapshots, "
                "and hardening state — imposing zero HTTP scan traffic on customer origin servers."
            ),
            "key_strengths": key_strengths,
            "action_plan_7d": action_plan_7d,
            "sections": [
                {
                    "heading": "Perimeter Defense & Threat Mitigation",
                    "body": (
                        f"MDefender Edge WAF inspected {total_requests:,} total HTTP requests and neutralized {total_blocked:,} "
                        f"malicious or unauthorized attempts ({block_rate}% block ratio). {top_vec_phrase}"
                    ),
                },
                {
                    "heading": "Origin Availability & Transport Security",
                    "body": avail_phrase,
                },
                {
                    "heading": "Hardening Posture & Remediation Priorities",
                    "body": remediation_phrase,
                },
            ],
        }

        def _avg_pts(total_pts: int, max_pts: int) -> float:
            if site_count <= 0:
                return float(max_pts)
            return round(total_pts / site_count, 1)

        scoring_rubric = [
            {"dimension": "Edge WAF Protection", "max_points": 20, "earned_avg": _avg_pts(rubric_waf, 20), "criteria": "WAF actively inspecting and blocking malicious edge traffic (Protect / Monitor mode)."},
            {"dimension": "Origin Availability SLA", "max_points": 20, "earned_avg": _avg_pts(rubric_uptime, 20), "criteria": "Origin web application reachable without active HTTP 5xx/timeout outage."},
            {"dimension": "Malware & Core Integrity", "max_points": 20, "earned_avg": _avg_pts(rubric_malware, 20), "criteria": "Clean malware scan posture and zero unauthorized WordPress core file checksum modifications."},
            {"dimension": "Login Gateway Hardening", "max_points": 15, "earned_avg": _avg_pts(rubric_login, 15), "criteria": "Default /wp-login.php concealed via Stealth Login URL or restricted by Admin IP Allowlist."},
            {"dimension": "Bot & Biometric Shield", "max_points": 10, "earned_avg": _avg_pts(rubric_bot, 10), "criteria": "Automated bot challenges (Hold-Press or Turnstile) active against credential stuffing."},
            {"dimension": "2FA & Disaster Backups", "max_points": 10, "earned_avg": _avg_pts(rubric_continuity, 10), "criteria": "Two-Factor Authentication (5 pts) and stored disaster-recovery backup snapshot (5 pts)."},
            {"dimension": "SSL / TLS Encryption", "max_points": 5, "earned_avg": _avg_pts(rubric_ssl, 5), "criteria": "Valid, unexpired HTTPS/TLS certificate with >30 days remaining validity."},
        ]

        return {
            "report_id": report_id,
            "generated_at": now_utc.isoformat(),
            "generated_at_label": now_utc.strftime("%b %d, %Y at %H:%M UTC"),
            "period": period,
            "period_days": days,
            "scope": website_id or "all",
            "scope_label": scope_label,
            "organization": {
                "name": user_info["company"] or user_info["name"],
                "operator": user_info["name"],
                "email": user_info["email"],
                "plan": str(user_info["plan"]).upper(),
            },
            "executive_brief": executive_brief,
            "summary": {
                "site_count": site_count,
                "healthy_sites": healthy_count,
                "attention_sites": attention_count,
                "fleet_score": fleet_score,
                "grade": grade_info["grade"],
                "risk_level": grade_info["risk_level"],
                "fleet_uptime_pct": fleet_uptime,
                "total_requests": total_requests,
                "total_blocked": total_blocked,
                "block_rate_pct": block_rate,
                "critical_advisories": crit_cnt,
                "warning_advisories": warn_cnt,
            },
            "scoring_rubric": scoring_rubric,
            "coverage": [
                {"label": "Edge WAF Protection", "enabled": cov_waf, "total": site_count, "pct": _pct(cov_waf)},
                {"label": "Stealth Login / IP Lock", "enabled": cov_login_cloak, "total": site_count, "pct": _pct(cov_login_cloak)},
                {"label": "Bot & Biometric Shield", "enabled": cov_bot_shield, "total": site_count, "pct": _pct(cov_bot_shield)},
                {"label": "Two-Factor Auth (2FA)", "enabled": cov_2fa, "total": site_count, "pct": _pct(cov_2fa)},
                {"label": "Valid SSL / TLS", "enabled": cov_ssl, "total": site_count, "pct": _pct(cov_ssl)},
                {"label": "Disaster Backup Vault", "enabled": cov_backup, "total": site_count, "pct": _pct(cov_backup)},
            ],
            "threat_intelligence": {
                "events_logged": threat_events_total,
                "top_vectors": top_attack_vectors,
                "top_ips": top_attacker_ips,
                "top_paths": top_targeted_paths,
            },
            "remediation_playbooks": playbooks_sorted[:15],
            "incidents": incident_log,
            "advisories": advisories[:40],
            "websites": site_rows,
        }

    # -------------------------------------------------------------------------
    # Automated Report Schedules (Tiny ~300-byte config docs, zero PDF storage)
    # -------------------------------------------------------------------------
    def _serialize_schedule(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(doc["_id"]),
            "name": doc.get("name") or "Executive Security Report",
            "website_id": doc.get("website_id") or "all",
            "frequency": doc.get("frequency") or "weekly",
            "period": doc.get("period") or "7d",
            "recipients": doc.get("recipients") or [],
            "include_healthy": bool(doc.get("include_healthy", True)),
            "enabled": bool(doc.get("enabled", True)),
            "next_run_at": doc["next_run_at"].isoformat() if hasattr(doc.get("next_run_at"), "isoformat") else doc.get("next_run_at"),
            "last_sent_at": doc["last_sent_at"].isoformat() if hasattr(doc.get("last_sent_at"), "isoformat") else doc.get("last_sent_at"),
            "last_status": doc.get("last_status") or "scheduled",
            "created_at": doc["created_at"].isoformat() if hasattr(doc.get("created_at"), "isoformat") else doc.get("created_at"),
        }

    def list_schedules(self, user_id: str) -> List[Dict[str, Any]]:
        docs = list(self.db.report_schedules.find({"user_id": str(user_id)}).sort("created_at", -1))
        return [self._serialize_schedule(d) for d in docs]

    def create_schedule(self, user: Any, data: Dict[str, Any]) -> Dict[str, Any]:
        u = self._resolve_user_doc(user)
        uid_str = u["id"]
        freq = (data.get("frequency") or "weekly").strip().lower()
        if freq not in ("daily", "weekly", "monthly"):
            freq = "weekly"
        period = data.get("period") or ("1d" if freq == "daily" else ("30d" if freq == "monthly" else "7d"))

        raw_rec = data.get("recipients")
        if isinstance(raw_rec, str):
            recipients = [e.strip() for e in raw_rec.split(",") if "@" in e.strip()]
        elif isinstance(raw_rec, list):
            recipients = [str(e).strip() for e in raw_rec if "@" in str(e)]
        else:
            recipients = []
        if not recipients and u["email"]:
            recipients = [u["email"]]

        now_utc = datetime.now(timezone.utc)
        doc = {
            "user_id": uid_str,
            "name": (data.get("name") or f"{freq.title()} Security Posture Digest").strip()[:100],
            "website_id": (data.get("website_id") or "all").strip(),
            "frequency": freq,
            "period": period,
            "recipients": recipients[:10],
            "include_healthy": bool(data.get("include_healthy", True)),
            "enabled": bool(data.get("enabled", True)),
            "next_run_at": _compute_next_run(freq, now_utc),
            "last_sent_at": None,
            "last_status": "scheduled",
            "created_at": now_utc,
        }
        res = self.db.report_schedules.insert_one(doc)
        doc["_id"] = res.inserted_id
        return self._serialize_schedule(doc)

    def update_schedule(self, user_id: str, schedule_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(schedule_id):
            return None
        oid = ObjectId(schedule_id)
        existing = self.db.report_schedules.find_one({"_id": oid, "user_id": str(user_id)})
        if not existing:
            return None

        updates: Dict[str, Any] = {}
        if "name" in data and data["name"]:
            updates["name"] = str(data["name"]).strip()[:100]
        if "enabled" in data:
            updates["enabled"] = bool(data["enabled"])
        if "frequency" in data and data["frequency"] in ("daily", "weekly", "monthly"):
            updates["frequency"] = data["frequency"]
            updates["next_run_at"] = _compute_next_run(data["frequency"])
        if "website_id" in data:
            updates["website_id"] = str(data["website_id"] or "all")
        if "recipients" in data:
            raw_rec = data["recipients"]
            if isinstance(raw_rec, str):
                updates["recipients"] = [e.strip() for e in raw_rec.split(",") if "@" in e.strip()][:10]
            elif isinstance(raw_rec, list):
                updates["recipients"] = [str(e).strip() for e in raw_rec if "@" in str(e)][:10]

        if updates:
            self.db.report_schedules.update_one({"_id": oid}, {"$set": updates})
        updated = self.db.report_schedules.find_one({"_id": oid})
        return self._serialize_schedule(updated) if updated else None

    def delete_schedule(self, user_id: str, schedule_id: str) -> bool:
        if not ObjectId.is_valid(schedule_id):
            return False
        res = self.db.report_schedules.delete_one({"_id": ObjectId(schedule_id), "user_id": str(user_id)})
        return res.deleted_count > 0

    def dispatch_schedule_now(self, user: Any, schedule_id: str) -> Optional[Dict[str, Any]]:
        u = self._resolve_user_doc(user)
        if not ObjectId.is_valid(schedule_id):
            return None
        oid = ObjectId(schedule_id)
        doc = self.db.report_schedules.find_one({"_id": oid, "user_id": u["id"]})
        if not doc:
            return None

        report = self.generate_executive_report(
            u,
            website_id=doc.get("website_id") or "all",
            period=doc.get("period") or "7d",
        )
        recipients = doc.get("recipients") or ([u["email"]] if u["email"] else [])
        if recipients:
            self.send_report_digest_email(report, recipients, doc.get("name") or "Executive Security Report")

        now_utc = datetime.now(timezone.utc)
        self.db.report_schedules.update_one(
            {"_id": oid},
            {"$set": {
                "last_sent_at": now_utc,
                "last_status": f"delivered to {len(recipients)} recipient(s)",
                "next_run_at": _compute_next_run(doc.get("frequency") or "weekly", now_utc),
            }},
        )
        updated = self.db.report_schedules.find_one({"_id": oid})
        return self._serialize_schedule(updated) if updated else None

    def run_due_schedules(self, batch_limit: int = 25) -> int:
        """Staggered background processor for automated scheduled report emails."""
        now_utc = datetime.now(timezone.utc)
        now_naive = now_utc.replace(tzinfo=None)
        due = list(
            self.db.report_schedules.find({
                "enabled": True,
                "$or": [
                    {"next_run_at": {"$lte": now_utc}},
                    {"next_run_at": {"$lte": now_naive}},
                ],
            }).limit(batch_limit)
        )
        sent = 0
        for doc in due:
            try:
                uid = doc.get("user_id")
                if not uid:
                    continue
                u = self._resolve_user_doc(uid)
                report = self.generate_executive_report(
                    u,
                    website_id=doc.get("website_id") or "all",
                    period=doc.get("period") or "7d",
                )
                recipients = doc.get("recipients") or ([u["email"]] if u["email"] else [])
                if recipients:
                    self.send_report_digest_email(report, recipients, doc.get("name") or "Scheduled Security Digest")
                    sent += 1
                self.db.report_schedules.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "last_sent_at": now_utc,
                        "last_status": f"delivered to {len(recipients)} recipient(s)",
                        "next_run_at": _compute_next_run(doc.get("frequency") or "weekly", now_utc),
                    }},
                )
            except Exception as e:
                print(f"[Report Scheduler] Schedule {doc.get('_id')} error: {e}")
        return sent

    def send_report_digest_email(self, report: Dict[str, Any], recipients: List[str], schedule_name: str):
        """Send a clean GitHub/Cloudflare-style Executive Report Digest email (zero heavy PDF attachment)."""
        def _dispatch():
            try:
                from email.mime.image import MIMEImage
                from email.mime.multipart import MIMEMultipart
                from email.mime.text import MIMEText

                from src.auth.config import AuthConfig
                from src.auth.email_sender import _LOGO_PATH, AuthEmailService

                config = AuthConfig()
                if not (config.SMTP_SERVER and config.SMTP_USERNAME and config.SMTP_PASSWORD):
                    return

                logo_bytes = b""
                if _LOGO_PATH and os.path.exists(_LOGO_PATH):
                    try:
                        with open(_LOGO_PATH, "rb") as _lf:
                            logo_bytes = _lf.read()
                    except Exception:
                        logo_bytes = b""

                summary = report.get("summary") or {}
                org = report.get("organization") or {}
                brief = report.get("executive_brief") or {}
                playbooks = report.get("remediation_playbooks") or []
                advisories = report.get("advisories") or []
                sites = report.get("websites") or []
                reports_url = f"{config.FRONTEND_URL}/user/reports"

                score = summary.get("fleet_score", 100)
                grade = summary.get("grade") or brief.get("grade") or "A"
                risk_level = summary.get("risk_level") or brief.get("risk_level") or "LOW RISK"
                brief_headline = brief.get("headline") or ""
                site_cnt = summary.get("site_count", 0)
                reqs = f"{int(summary.get('total_requests', 0)):,}"
                blks = f"{int(summary.get('total_blocked', 0)):,}"
                uptime = summary.get("fleet_uptime_pct", 100.0)
                att_cnt = summary.get("attention_sites", 0)
                scope_lbl = report.get("scope_label", "Protected Fleet")
                gen_lbl = report.get("generated_at_label", "")
                report_id = report.get("report_id", "")

                adv_html = ""
                if playbooks:
                    adv_items = "".join(
                        f'<li style="margin:0 0 10px 0;font-size:13px;color:#24292f;">'
                        f'<strong>[{html_escape(str(p.get("severity", "")).upper())}] {html_escape(p.get("title", ""))}</strong> '
                        f'<span style="color:#57606a;">({p.get("affected_count", 1)} site(s))</span><br>'
                        f'<span style="color:#57606a;font-size:12.5px;">Action: {html_escape(p.get("remediation", ""))}</span></li>'
                        for p in playbooks[:5]
                    )
                    adv_html = f"""
                    <p style="margin:18px 0 8px 0;font-size:13.5px;font-weight:700;color:#1f2328;">Priority Remediation Playbook</p>
                    <ul style="margin:0 0 18px 18px;padding:0;">{adv_items}</ul>
                    """
                elif advisories:
                    adv_items = "".join(
                        f'<li style="margin:0 0 6px 0;font-size:13px;color:#24292f;">'
                        f'<strong>{html_escape(a["domain"])}</strong>: {html_escape(a["finding"])}</li>'
                        for a in advisories[:6]
                    )
                    adv_html = f"""
                    <p style="margin:18px 0 8px 0;font-size:13.5px;font-weight:700;color:#1f2328;">Priority Findings</p>
                    <ul style="margin:0 0 18px 18px;padding:0;">{adv_items}</ul>
                    """
                else:
                    adv_html = '<p style="margin:16px 0;font-size:13.5px;color:#57606a;">All monitored websites passed security and availability checks with no critical advisories.</p>'

                site_rows_html = "".join(
                    f"""<tr>
                      <td style="padding:6px 0;font-size:12.5px;color:#1f2328;font-weight:600;border-bottom:1px solid #eaeef2;">{html_escape(s['domain'])}</td>
                      <td style="padding:6px 8px;font-size:12.5px;color:#57606a;border-bottom:1px solid #eaeef2;text-align:right;">{s['uptime_pct']}%</td>
                      <td style="padding:6px 8px;font-size:12.5px;color:#57606a;border-bottom:1px solid #eaeef2;text-align:right;">{int(s['blocked']):,} blocked</td>
                      <td style="padding:6px 0;font-size:12.5px;color:#1f2328;font-weight:600;border-bottom:1px solid #eaeef2;text-align:right;">{s['score']}/100</td>
                    </tr>"""
                    for s in sites[:12]
                )
                more_sites_note = (
                    f'<p style="margin:8px 0 0;font-size:12px;color:#57606a;">Showing top 12 of {len(sites)} sites. Open the full interactive PDF report in your dashboard to view all sites.</p>'
                    if len(sites) > 12
                    else ""
                )

                logo_html = (
                    '<img src="cid:mdefender_logo" width="28" height="28" alt="MDefender Pro" style="display:block;width:28px;height:28px;border-radius:6px;object-fit:contain;" />'
                    if logo_bytes
                    else ""
                )

                html_body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{html_escape(schedule_name)}</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#24292f;-webkit-font-smoothing:antialiased;line-height:1.6;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;text-align:left;">
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  {"<td style='vertical-align:middle;padding-right:10px;'>" + logo_html + "</td>" if logo_html else ""}
                  <td style="vertical-align:middle;"><span style="font-size:17px;font-weight:700;color:#1f2328;">MDefender Pro</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#24292f;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#1f2328;">Hi {html_escape(org.get('operator') or 'there')},</p>
              <p style="margin:0 0 14px 0;color:#24292f;">
                Here is your automated <strong>{html_escape(schedule_name)}</strong> covering <strong>{html_escape(scope_lbl)}</strong> ({html_escape(gen_lbl)}).
              </p>
              {f'<p style="margin:0 0 16px 0;color:#24292f;">{html_escape(brief_headline)}</p>' if brief_headline else ''}

              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #d0d7de;border-bottom:1px solid #d0d7de;padding:10px 0;margin:0 0 16px 0;">
                <tr><td style="padding:3px 0;font-size:13px;color:#57606a;width:165px;">Security Grade / Score:</td><td style="padding:3px 0;font-size:13px;color:#1f2328;font-weight:700;">Grade {html_escape(str(grade))} ({score} / 100 &middot; {html_escape(str(risk_level))})</td></tr>
                <tr><td style="padding:3px 0;font-size:13px;color:#57606a;">Sites Covered:</td><td style="padding:3px 0;font-size:13px;color:#1f2328;font-weight:600;">{site_cnt} ({att_cnt} requiring attention)</td></tr>
                <tr><td style="padding:3px 0;font-size:13px;color:#57606a;">Requests / Threats Blocked:</td><td style="padding:3px 0;font-size:13px;color:#1f2328;font-weight:600;">{reqs} requests / {blks} blocked</td></tr>
                <tr><td style="padding:3px 0;font-size:13px;color:#57606a;">Average Availability:</td><td style="padding:3px 0;font-size:13px;color:#1f2328;font-weight:600;">{uptime}%</td></tr>
              </table>

              {adv_html}

              {f'''<p style="margin:18px 0 8px 0;font-size:13.5px;font-weight:700;color:#1f2328;">Fleet Summary</p>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <th align="left" style="padding:4px 0;font-size:11.5px;color:#57606a;border-bottom:1px solid #d0d7de;">Domain</th>
                  <th align="right" style="padding:4px 8px;font-size:11.5px;color:#57606a;border-bottom:1px solid #d0d7de;">Uptime</th>
                  <th align="right" style="padding:4px 8px;font-size:11.5px;color:#57606a;border-bottom:1px solid #d0d7de;">Threats</th>
                  <th align="right" style="padding:4px 0;font-size:11.5px;color:#57606a;border-bottom:1px solid #d0d7de;">Posture</th>
                </tr>
                {site_rows_html}
              </table>{more_sites_note}''' if sites else ''}

              <p style="margin:22px 0;font-size:14px;">
                <a href="{html_escape(reports_url)}" style="color:#0969da;text-decoration:none;font-weight:600;">Open &amp; Download Full Executive PDF Report &rarr;</a>
              </p>

              <p style="margin:0 0 22px 0;">Thanks,<br>The MDefender Pro Security Team</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #eaeef2;padding-top:14px;font-size:11.5px;color:#6e7781;">
              Report ID: {html_escape(report_id)} &bull; <a href="{html_escape(reports_url)}" style="color:#6e7781;text-decoration:underline;">Manage report schedules</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

                text_body = (
                    f"Hi {org.get('operator') or 'there'},\n\n"
                    f"Here is your automated {schedule_name} covering {scope_lbl} ({gen_lbl}).\n\n"
                    f"- Fleet Security Score: {score}/100\n"
                    f"- Sites Covered: {site_cnt} ({att_cnt} requiring attention)\n"
                    f"- Requests / Threats Blocked: {reqs} / {blks}\n"
                    f"- Average Availability: {uptime}%\n\n"
                    f"Open & Download Full PDF Report: {reports_url}\n\n"
                    f"Thanks,\nThe MDefender Pro Security Team"
                )

                from_addr = config.SMTP_FROM_EMAIL or config.SMTP_USERNAME or "noreply@mdefender-pro.io"
                sender = AuthEmailService()
                for to_email in recipients:
                    msg = MIMEMultipart("related")
                    msg["Subject"] = f"[MDefender Pro] {schedule_name} — {scope_lbl}"
                    msg["From"] = f"{config.SMTP_FROM_NAME} <{from_addr}>"
                    msg["To"] = to_email
                    msg["X-Mailer"] = "MDefender-Pro-Report-Engine/3.0"

                    alt = MIMEMultipart("alternative")
                    alt.attach(MIMEText(text_body, "plain"))
                    alt.attach(MIMEText(html_body, "html"))
                    msg.attach(alt)

                    if logo_bytes:
                        img = MIMEImage(logo_bytes, _subtype="png")
                        img.add_header("Content-ID", "<mdefender_logo>")
                        img.add_header("Content-Disposition", "inline", filename="mdefender_logo.png")
                        msg.attach(img)

                    sender._send_smtp_message(config, msg, to_email, purpose="report_digest")
            except Exception as e:
                print(f"[REPORT DIGEST EMAIL] Delivery error: {e}")

        threading.Thread(target=_dispatch, daemon=True).start()

