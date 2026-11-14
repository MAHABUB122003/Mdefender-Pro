"""MDefender Pro WordPress Core Version, Checksum Integrity & Fleet Management Service.

Provides 100% authentic integration with:
  1. WordPress.org Official Version API (https://api.wordpress.org/core/version-check/1.7/)
  2. WordPress.org Official SVN Checksums API (https://api.wordpress.org/core/checksums/1.0/)
  3. Real Core Checksum verification for connected WordPress origins
  4. Auto-update policy enforcement (minor, all, disabled)
  5. 1-Click Core update dispatching
"""

import json
import time
import urllib.request
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from bson import ObjectId

from src.database.mongodb_connection import MongoDB
from src.auth.audit_service import AuditService

logger = logging.getLogger("mdefender.wordpress_core")


class WordPressCoreService:
    def __init__(self):
        self.db = MongoDB()

    # -------------------------------------------------------------------------
    # 1. Fetch Latest Official WordPress Release from WordPress.org
    # -------------------------------------------------------------------------
    def get_official_version_info(self) -> Dict[str, Any]:
        """Fetch latest stable WordPress release from official WordPress.org API."""
        now = datetime.now()
        # Check cache in DB (valid for 1 hour)
        cached = self.db.system_cache.find_one({"key": "wp_official_version"})
        if cached and cached.get("expires_at", now) > now:
            return cached.get("data", {})

        url = "https://api.wordpress.org/core/version-check/1.7/"
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "MDefender-Pro-CoreGuard/4.5; https://mdefender-pro.com"}
            )
            with urllib.request.urlopen(req, timeout=6.0) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
                offers = payload.get("offers", [])
                primary = offers[0] if offers else {}
                latest_version = str(primary.get("current") or "").strip()
                if not latest_version:
                    raise ValueError("WordPress.org returned no current stable release")

                result = {
                    "available": True,
                    "latest_version": latest_version,
                    "version_branch": latest_version.rsplit(".", 1)[0],
                    "php_required": primary.get("php_version"),
                    "mysql_required": primary.get("mysql_version"),
                    "download_url": primary.get("download"),
                    "package_type": primary.get("response"),
                    "official_source": "WordPress.org Official Security & Release API",
                    "fetched_at": now.isoformat()
                }

                self.db.system_cache.update_one(
                    {"key": "wp_official_version"},
                    {"$set": {
                        "key": "wp_official_version",
                        "data": result,
                        "expires_at": now + timedelta(hours=1)
                    }},
                    upsert=True
                )
                return result
        except Exception as e:
            logger.warning(f"[WordPressCore] Failed to fetch official WP version: {e}")
            return {
                "available": False,
                "latest_version": None,
                "official_source": "WordPress.org Official Security & Release API",
                "fetched_at": now.isoformat(),
                "error": "The official WordPress release could not be verified."
            }

    # -------------------------------------------------------------------------
    # 2. Get Official Core Checksums from WordPress.org API
    # -------------------------------------------------------------------------
    def get_official_checksums(self, version: str) -> Dict[str, str]:
        """Fetch official md5 checksums for a given WordPress version."""
        clean_ver = str(version or "").replace("WordPress ", "").replace("v", "").strip()
        if not clean_ver:
            raise ValueError("A verified installed WordPress version is required for checksum lookup")
        now = datetime.now()

        # Check DB cache
        cache_key = f"wp_checksums_{clean_ver}"
        cached = self.db.system_cache.find_one({"key": cache_key})
        if cached:
            return cached.get("checksums", {})

        url = f"https://api.wordpress.org/core/checksums/1.0/?version={clean_ver}&locale=en_US"
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": f"MDefender-Pro-CoreGuard/4.5; WordPress/{clean_ver}"}
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                checksums = data.get("checksums", {})
                if checksums:
                    self.db.system_cache.update_one(
                        {"key": cache_key},
                        {"$set": {
                            "key": cache_key,
                            "version": clean_ver,
                            "checksums": checksums,
                            "total_files": len(checksums),
                            "cached_at": now
                        }},
                        upsert=True
                    )
                return checksums
        except Exception as e:
            logger.warning(f"[WordPressCore] Failed to fetch checksums for {clean_ver}: {e}")
            return {}

    # -------------------------------------------------------------------------
    # 3. Fleet Core Matrix for User
    # -------------------------------------------------------------------------
    def get_fleet_core_matrix(self, user_id: str) -> Dict[str, Any]:
        """Return WordPress core status, versions, and update availability across fleet."""
        official_info = self.get_official_version_info()
        latest_ver = official_info.get("latest_version")

        # Retrieve user websites with robust type compatibility
        all_user_sites = list(self.db.websites.find({"user_id": user_id}))
        if not all_user_sites:
            try:
                from bson import ObjectId
                all_user_sites = list(self.db.websites.find({"user_id": ObjectId(user_id)}))
            except Exception:
                pass

        sites = []
        for s in all_user_sites:
            p = str(s.get("platform") or "").lower()
            if p.startswith("wordpress") or s.get("wordpress_connection") or s.get("wp_version"):
                sites.append(s)

        fleet_rows = []
        up_to_date_count = 0
        needs_update_count = 0
        unknown_version_count = 0

        for s in sites:
            s_id = str(s.get("_id") or s.get("id"))
            domain = s.get("domain") or s.get("name") or s.get("url") or "Connected Site"
            wp_conn = s.get("wordpress_connection", {}) or {}

            # Installed version
            raw_ver = s.get("wp_version") or wp_conn.get("wp_version")
            installed_ver = str(raw_ver).replace("WordPress ", "").replace("v", "").strip()

            # Compare versions
            update_available = None
            if latest_ver and installed_ver:
                inst_parts = tuple(int(p) for p in installed_ver.split(".") if p.isdigit())
                lat_parts = tuple(int(p) for p in latest_ver.split(".") if p.isdigit())
                if not inst_parts or not lat_parts:
                    unknown_version_count += 1
                else:
                    while len(inst_parts) > 1 and inst_parts[-1] == 0:
                        inst_parts = inst_parts[:-1]
                    while len(lat_parts) > 1 and lat_parts[-1] == 0:
                        lat_parts = lat_parts[:-1]
                    update_available = inst_parts < lat_parts
                    if update_available:
                        needs_update_count += 1
                    else:
                        up_to_date_count += 1
            else:
                unknown_version_count += 1

            # PHP & Runtime
            php_ver = s.get("php_version") or wp_conn.get("php_version") or "unknown"
            db_engine = s.get("db_engine") or "unknown"
            auto_update_policy = s.get("auto_update_core") or "minor" # 'minor' | 'all' | 'disabled'

            # Checksum status from latest scan
            checksum_result = s.get("checksum_result") or {}
            checksum_confirmed = checksum_result.get("verification_complete") is True
            checksum_status = checksum_result.get("status") if checksum_confirmed else "unknown"
            checksum_verified_at = s.get("checksum_verified_at") if checksum_confirmed else None
            files_verified_count = (checksum_result.get("total_files_checked") or 0) if checksum_confirmed else 0
            modified_files_count = (
                len(checksum_result.get("modified_files") or [])
                + len(checksum_result.get("missing_files") or [])
                + len(checksum_result.get("unknown_files") or [])
            ) if checksum_confirmed else 0

            fleet_rows.append({
                "site_id": s_id,
                "domain": domain,
                "url": s.get("url") or f"https://{domain}",
                "installed_version": installed_ver,
                "latest_version": latest_ver,
                "update_available": update_available,
                "version_status": "known" if update_available is not None else "unknown",
                "php_version": php_ver,
                "db_engine": db_engine,
                "auto_update_policy": auto_update_policy,
                "checksum_status": checksum_status,
                "checksum_verified_at": checksum_verified_at.isoformat() if isinstance(checksum_verified_at, datetime) else checksum_verified_at,
                "files_verified_count": files_verified_count,
                "modified_files_count": modified_files_count,
                "modified_files": checksum_result.get("modified_files") or [] if checksum_confirmed else [],
                "missing_files": checksum_result.get("missing_files") or [] if checksum_confirmed else [],
                "unknown_files": checksum_result.get("unknown_files") or [] if checksum_confirmed else [],
                "is_online": bool(wp_conn.get("connected"))
            })

        return {
            "official_info": official_info,
            "total_sites": len(sites),
            "up_to_date_count": up_to_date_count,
            "needs_update_count": needs_update_count,
            "unknown_version_count": unknown_version_count,
            "fleet_integrity_pct": f"{((up_to_date_count / max(1, up_to_date_count + needs_update_count)) * 100):.1f}" if up_to_date_count + needs_update_count else None,
            "sites": fleet_rows
        }

    def _find_site(self, website_id: str):
        site = self.db.websites.find_one({"_id": website_id})
        if not site:
            try:
                if ObjectId.is_valid(website_id):
                    site = self.db.websites.find_one({"_id": ObjectId(website_id)})
            except Exception:
                pass
        if not site:
            clean_d = website_id.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].strip()
            site = self.db.websites.find_one({"$or": [{"domain": clean_d}, {"url": clean_d}]})
        return site

    # -------------------------------------------------------------------------
    # 4. Real Core File Checksums Verification
    # -------------------------------------------------------------------------
    def verify_website_core_checksums(self, website_id: str, user_id: str) -> Dict[str, Any]:
        """Perform a real WordPress.org SVN MD5 checksum audit on the website core files."""
        site = self._find_site(website_id)
        if not site:
            raise ValueError("Website not found")

        domain = site.get("domain") or site.get("url") or "localhost"
        wp_conn = site.get("wordpress_connection", {}) or {}
        raw_ver = site.get("wp_version") or wp_conn.get("wp_version")
        version = str(raw_ver).replace("WordPress ", "").replace("v", "").strip()
        if not version:
            raise RuntimeError("The installed WordPress version is unknown; checksum verification cannot proceed")

        now = datetime.now()
        official_checksums = self.get_official_checksums(version)
        total_official_files = len(official_checksums)

        modified_files = []
        missing_files = []
        unknown_files = []
        checked_count = 0
        scan_confirmed = False

        # Prefer the WordPress origin's full scan, which has access to its actual filesystem.
        try:
            from src.api.v1.websites_api import _dispatch_wp_posthack
            remote_res = _dispatch_wp_posthack(site, "core_integrity_scan", timeout=25.0)
            if remote_res.get("success") and remote_res.get("data", {}).get("success") is True:
                p_data = remote_res["data"]
                remote_total = int(p_data.get("total_official_files") or 0)
                intact_count = int(p_data.get("intact_count") or 0)
                remote_modified = p_data.get("modified_files") or []
                remote_missing = p_data.get("missing_files") or []
                remote_unknown = p_data.get("unknown_files") or []
                checked_count = int(p_data.get("checked_count") or 0)
                skipped_count = int(p_data.get("skipped_count") or 0)
                if (
                    remote_total > 0
                    and checked_count == intact_count + len(remote_modified) + len(remote_missing)
                    and checked_count > 0
                    and checked_count + skipped_count == remote_total
                ):
                    total_official_files = remote_total
                    scan_confirmed = True
                    for m in remote_modified:
                        modified_files.append({
                            "file": m.get("path") or m.get("file"),
                            "expected_md5": m.get("official_hash", ""),
                            "actual_md5": m.get("local_hash", ""),
                            "risk": "HIGH"
                        })
                    missing_files = [m.get("path") for m in remote_missing]
                    for u in remote_unknown:
                        unknown_files.append({
                            "file": u.get("path"),
                            "size": u.get("file_size"),
                            "risk": "CRITICAL"
                        })
        except (TypeError, ValueError, ImportError) as exc:
            logger.warning("[WordPressCore] Origin checksum scan response was invalid: %s", exc)

        if not scan_confirmed:
            status = "verification_unavailable"
        elif modified_files or missing_files or unknown_files:
            status = "modified_files_detected"
        else:
            status = "verified"
        result = {
            "website_id": str(site["_id"]),
            "domain": domain,
            "version": version,
            "status": status,
            "total_official_files": total_official_files,
            "total_files_checked": checked_count,
            "modified_files_count": len(modified_files),
            "modified_files": modified_files,
            "missing_files_count": len(missing_files),
            "missing_files": missing_files,
            "unknown_files_count": len(unknown_files),
            "unknown_files": unknown_files,
            "integrity_percentage": f"{max(0, ((total_official_files - len(modified_files) - len(missing_files)) / total_official_files) * 100):.2f}" if scan_confirmed and total_official_files else None,
            "official_api_source": "https://api.wordpress.org/core/checksums/1.0/",
            "verification_complete": scan_confirmed,
            "verified_at": now.isoformat()
        }

        if scan_confirmed:
            self.db.websites.update_one(
                {"_id": site["_id"]},
                {"$set": {
                    "checksum_status": status,
                    "checksum_verified_at": now,
                    "checksum_files_count": total_official_files,
                    "checksum_modified_count": len(modified_files) + len(missing_files) + len(unknown_files),
                    "checksum_result": result
                }}
            )

        try:
            AuditService().log(
                user_id=user_id,
                action="core_checksums_verified",
                ip_address="system",
                details={
                    "website_id": str(site["_id"]),
                    "domain": domain,
                    "status": status,
                    "total_files": total_official_files,
                    "modified_count": len(modified_files),
                    "integrity_percentage": result.get("integrity_percentage")
                }
            )
        except Exception:
            pass

        return result

    # -------------------------------------------------------------------------
    # 5. Set WordPress Core Auto-Update Policy
    # -------------------------------------------------------------------------
    def set_auto_update_policy(self, website_id: str, policy: str, user_id: str) -> Dict[str, Any]:
        """Configure auto-update policy (minor, all, disabled)."""
        valid_policies = ("minor", "all", "disabled")
        clean_pol = policy.lower().strip()
        if clean_pol not in valid_policies:
            raise ValueError("Policy must be one of: minor, all, disabled")

        site = self._find_site(website_id)
        if not site:
            raise ValueError("Website not found")

        from src.api.v1.websites_api import _dispatch_wp_posthack
        dispatch_result = _dispatch_wp_posthack(site, "set_auto_update_policy", {"policy": clean_pol}, timeout=8.0)
        action_result = dispatch_result.get("data") or {}
        if not dispatch_result.get("success") or action_result.get("success") is not True:
            raise RuntimeError(action_result.get("message") or dispatch_result.get("message") or "WordPress origin did not confirm the policy change")

        target_id = site["_id"]
        self.db.websites.update_one(
            {"_id": target_id},
            {"$set": {
                "auto_update_core": clean_pol,
                "updated_at": datetime.now()
            }}
        )

        try:
            AuditService().log(
                user_id=user_id,
                action="core_policy_updated",
                ip_address="system",
                details={
                    "website_id": str(target_id),
                    "domain": site.get("domain") or "",
                    "policy": clean_pol
                }
            )
        except Exception:
            pass

        return {
            "website_id": str(target_id),
            "auto_update_core": clean_pol,
            "message": action_result.get("message") or f"WordPress Core auto-update policy updated to '{clean_pol.upper()}'."
        }

    # -------------------------------------------------------------------------
    # 6. Update WordPress Core Engine (Single & Fleet)
    # -------------------------------------------------------------------------
    def _dispatch_core_update(self, site: Dict[str, Any], target_version: str) -> Dict[str, Any]:
        import requests
        from urllib.parse import urlencode

        target_url = str(site.get("url") or site.get("domain") or "").strip().rstrip("/")
        if not target_url:
            raise RuntimeError("WordPress site URL is missing")
        if not target_url.startswith(("http://", "https://")):
            scheme = "http" if site.get("domain") in ("localhost", "127.0.0.1") else "https"
            target_url = f"{scheme}://{target_url}"

        api_key = str(site.get("api_key") or "")
        site_token = str(site.get("site_token") or "")
        connection = site.get("wordpress_connection") or {}
        api_key = api_key or str(connection.get("api_key") or "")
        site_token = site_token or str(connection.get("site_token") or "")
        if not api_key and not site_token:
            raise RuntimeError("WordPress site has no configured connection credential")

        query = urlencode({
            "waf_cloud_sync": "1",
            "action": "update_core",
            "version": target_version,
        })
        endpoint = f"{target_url}/?{query}"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers.update({"Authorization": f"Bearer {api_key}", "X-API-Key": api_key})
        if site_token:
            headers["X-Site-Token"] = site_token

        try:
            response = requests.post(
                endpoint,
                json={"action": "update_core", "version": target_version},
                headers=headers,
                timeout=60.0,
            )
        except requests.RequestException as exc:
            raise RuntimeError(f"Could not contact WordPress origin: {exc}") from exc

        if response.status_code != 200:
            raise RuntimeError(f"WordPress origin returned HTTP {response.status_code}")
        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError("WordPress origin returned invalid JSON") from exc

        action_result = payload.get("action_result") if isinstance(payload, dict) else None
        if not isinstance(action_result, dict) or action_result.get("success") is not True:
            message = action_result.get("message") if isinstance(action_result, dict) else None
            raise RuntimeError(message or "WordPress origin did not confirm the core update")
        return action_result

    def update_core(self, website_id: str, user_id: str) -> Dict[str, Any]:
        """Dispatch a core update and persist the version only after origin confirmation."""
        site = self._find_site(website_id)
        if not site:
            raise ValueError("Website not found")

        official = self.get_official_version_info()
        latest_ver = str(official.get("latest_version") or "").strip()
        if not latest_ver:
            raise RuntimeError("The official WordPress version could not be verified")

        action_result = self._dispatch_core_update(site, latest_ver)
        installed_version = str(action_result.get("updated_version") or action_result.get("installed_version") or "").strip()
        if not installed_version:
            raise RuntimeError("WordPress origin did not return the installed core version")

        now = datetime.now()
        update_fields = {
            "wp_version": installed_version,
            "wordpress_connection.wp_version": installed_version,
            "core_updated_at": now,
        }
        self.db.websites.update_one({"_id": site["_id"]}, {"$set": update_fields})
        self.db.wordpress_sites.update_one(
            {"website_id": str(site["_id"])},
            {"$set": {"wp_version": installed_version, "updated_at": now}}
        )

        try:
            AuditService().log(
                user_id=user_id,
                action="core_updated",
                ip_address="system",
                details={
                    "website_id": str(site["_id"]),
                    "domain": site.get("domain") or site.get("url"),
                    "previous_version": site.get("wp_version") or None,
                    "updated_version": installed_version
                }
            )
        except Exception:
            pass

        return {
            "website_id": str(site["_id"]),
            "domain": site.get("domain") or site.get("url"),
            "previous_version": site.get("wp_version"),
            "updated_version": installed_version,
            "status": "success",
            "updated_at": now.isoformat(),
            "message": action_result.get("message") or f"WordPress Core is now {installed_version}."
        }

    def update_all_fleet(self, user_id: str) -> Dict[str, Any]:
        """Update each WordPress origin and persist only origin-confirmed versions."""
        official = self.get_official_version_info()
        latest_ver = str(official.get("latest_version") or "").strip()
        if not latest_ver:
            raise RuntimeError("The official WordPress version could not be verified")

        sites = list(self.db.websites.find({"user_id": user_id}))
        results = []
        for site in sites:
            connection = site.get("wordpress_connection") or {}
            is_wordpress = (
                str(site.get("platform") or "").lower().startswith("wordpress")
                or bool(connection)
                or bool(site.get("wp_version"))
            )
            site_id = str(site.get("_id") or "")
            if not is_wordpress:
                continue
            try:
                action_result = self._dispatch_core_update(site, latest_ver)
                installed_version = str(action_result.get("updated_version") or action_result.get("installed_version") or "").strip()
                if not installed_version:
                    raise RuntimeError("WordPress origin did not return the installed core version")
                now = datetime.now()
                self.db.websites.update_one(
                    {"_id": site["_id"]},
                    {"$set": {
                        "wp_version": installed_version,
                        "wordpress_connection.wp_version": installed_version,
                        "core_updated_at": now,
                    }}
                )
                self.db.wordpress_sites.update_one(
                    {"website_id": site_id},
                    {"$set": {"wp_version": installed_version, "updated_at": now}}
                )
                results.append({
                    "website_id": site_id,
                    "domain": site.get("domain") or site.get("url", ""),
                    "success": True,
                    "updated_version": installed_version,
                    "message": action_result.get("message", ""),
                })
            except Exception as exc:
                results.append({
                    "website_id": site_id,
                    "domain": site.get("domain") or site.get("url", ""),
                    "success": False,
                    "error": str(exc),
                })

        succeeded = sum(1 for result in results if result["success"])
        failed = len(results) - succeeded

        try:
            AuditService().log(
                user_id=user_id,
                action="fleet_core_update_dispatched",
                ip_address="system",
                details={
                    "updated_version": latest_ver,
                    "succeeded": succeeded,
                    "failed": failed,
                }
            )
        except Exception:
            pass

        return {
            "updated_version": latest_ver,
            "total": len(results),
            "succeeded": succeeded,
            "failed": failed,
            "results": results,
            "status": "success" if results and failed == 0 else ("partial" if succeeded else "failed"),
            "message": f"Confirmed {succeeded} of {len(results)} WordPress core update(s)." if results else "No connected WordPress sites were found."
        }

    # -------------------------------------------------------------------------
    # 7. One-Click Bulk Repair All Corrupted Core Files
    # -------------------------------------------------------------------------
    def repair_all_core_files(self, website_id: str, user_id: str) -> Dict[str, Any]:
        """One-click repair all modified/corrupted core files by restoring pristine official SVN releases."""
        site = self._find_site(website_id)
        if not site:
            raise ValueError("Website not found")

        report = self.verify_website_core_checksums(website_id, user_id)
        if report.get("status") == "verification_unavailable":
            raise RuntimeError("Core integrity could not be verified; no files were repaired")
        modified = report.get("modified_files", [])
        missing = report.get("missing_files", [])
        repaired_files = []
        errors = []
        from src.api.v1.websites_api import _dispatch_wp_posthack

        files_to_repair = modified + [{"file": item} for item in missing]
        for m in files_to_repair:
            file_name = m.get("file") if isinstance(m, dict) else str(m)
            if not file_name:
                continue
            dispatch_result = _dispatch_wp_posthack(
                site,
                "core_integrity_restore",
                {"file_path": file_name, "file": file_name},
                timeout=25.0,
            )
            action_result = dispatch_result.get("data") or {}
            if dispatch_result.get("success") and action_result.get("success") is True:
                repaired_files.append(file_name)
            else:
                errors.append(file_name)

        final_report = self.verify_website_core_checksums(website_id, user_id)
        now = datetime.now()

        try:
            AuditService().log(
                user_id=user_id,
                action="core_files_bulk_repaired",
                ip_address="system",
                details={
                    "website_id": str(site["_id"]),
                    "domain": site.get("domain") or site.get("url"),
                    "repaired_count": len(repaired_files),
                    "repaired_files": repaired_files
                }
            )
        except Exception:
            pass

        return {
            "website_id": str(site["_id"]),
            "domain": site.get("domain") or site.get("url"),
            "repaired_count": len(repaired_files),
            "repaired_files": repaired_files,
            "errors": errors,
            "final_status": final_report.get("status"),
            "integrity_percentage": final_report.get("integrity_percentage"),
            "verification": final_report,
            "message": (
                f"Restored {len(repaired_files)} core file(s); {len(errors)} file(s) could not be restored."
                if errors else f"Verified core integrity after restoring {len(repaired_files)} file(s)."
            )
        }
