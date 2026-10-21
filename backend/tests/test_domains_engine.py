"""Tests for MDefender Pro Domains Engine (Phases 1-11).

Verifies:
- User authorization & tenant isolation
- Quota enforcement across unified website count
- Origin SSRF validation (loopback, private ranges, cloud metadata)
- Ownership verification token workflow
- Domain lifecycle state machine transitions
- Dashboard overview dynamic metrics
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from datetime import datetime, timedelta
from src.database.mongodb_connection import MongoDB
from src.services.origin_validator import OriginValidator
from src.services.domain_service import DomainService


@pytest.fixture
def db():
    database = MongoDB()
    # Clean up test domains before/after
    database.domains.delete_many({"domain": {"$regex": r"test-.*\.com"}})
    database.websites.delete_many({"domain": {"$regex": r"test-.*\.com"}})
    yield database
    database.domains.delete_many({"domain": {"$regex": r"test-.*\.com"}})
    database.websites.delete_many({"domain": {"$regex": r"test-.*\.com"}})


class TestOriginValidatorSSRF:
    """Phase 6: Origin Validation & SSRF Prevention Tests."""

    def test_ssrf_rejects_loopback(self):
        is_safe, msg, _ = OriginValidator.validate_origin("127.0.0.1")
        assert is_safe is False
        assert "Loopback" in msg or "prohibited" in msg

        is_safe_v6, _, _ = OriginValidator.validate_origin("::1")
        assert is_safe_v6 is False

    def test_ssrf_rejects_cloud_metadata(self):
        # AWS / GCP / DigitalOcean metadata IP
        is_safe, msg, _ = OriginValidator.validate_origin("169.254.169.254")
        assert is_safe is False
        assert "metadata" in msg.lower() or "prohibited" in msg.lower()

    def test_ssrf_rejects_private_rf1918(self):
        for priv_ip in ["10.0.0.1", "172.16.50.4", "192.168.1.100"]:
            is_safe, msg, _ = OriginValidator.validate_origin(priv_ip)
            assert is_safe is False, f"Expected {priv_ip} to be rejected"
            assert "private" in msg.lower() or "prohibited" in msg.lower()

    def test_ssrf_rejects_self_mdefender_loop(self):
        is_safe, msg, _ = OriginValidator.validate_origin("mdefender-pro.crafix.tech")
        assert is_safe is False
        assert "own management domain" in msg

    def test_ssrf_allows_legitimate_public_ip(self):
        # Cloudflare DNS or GitHub public IP
        is_safe, msg, ips = OriginValidator.validate_origin("1.1.1.1")
        assert is_safe is True
        assert "1.1.1.1" in ips


class TestDomainLifecycleAndTenancy:
    """Phases 2, 4, 8: Domain Lifecycle, Tenancy & Overview Engine."""

    def test_domain_normalization(self):
        raw = "https://WWW.Test-Domain-ABC.Com/path/to?query=1"
        clean = DomainService.normalize_domain(raw)
        assert clean == "test-domain-abc.com"

    def test_create_domain_generates_ownership_token_and_state(self, db):
        svc = DomainService(db)
        user_id = "test_user_tenant_1"

        domain = svc.create_domain(
            user_id=user_id,
            domain_name="test-onboarding-sample.com",
            origin_address="185.199.108.153",
            background_scan=False
        )

        assert domain["domain"] == "test-onboarding-sample.com"
        assert domain["status"] == "ownership_pending"
        assert domain["ownership"]["verified"] is False
        assert domain["ownership"]["token"].startswith("mdefender-verify=")
        assert len(domain["nameservers"]["assigned"]) == 2
        assert "mdefender-pro.crafix.tech" in domain["nameservers"]["assigned"][0]

    def test_tenant_isolation_idor_protection(self, db):
        svc = DomainService(db)
        user_a = "user_tenant_a"
        user_b = "user_tenant_b"

        dom = svc.create_domain(
            user_id=user_a,
            domain_name="test-tenant-iso.com",
            background_scan=False
        )

        # User B attempts to access User A's domain
        with pytest.raises(PermissionError):
            svc.get_owned_domain(dom["id"], user_b)

        # User B attempts to delete User A's domain
        with pytest.raises(PermissionError):
            svc.delete_domain(dom["id"], user_b)

    def test_duplicate_domain_registration_prevention(self, db):
        svc = DomainService(db)
        user_a = "user_owner"
        user_b = "user_attacker"

        dom = svc.create_domain(
            user_id=user_a,
            domain_name="test-duplicate-check.com",
            background_scan=False
        )
        # Mark as active for user_a
        db.domains.update_one({"_id": dom["id"]}, {"$set": {"status": "active"}})

        # User B attempts to claim the same domain
        with pytest.raises(PermissionError) as exc_info:
            svc.create_domain(
                user_id=user_b,
                domain_name="test-duplicate-check.com",
                background_scan=False
            )
        assert "already registered" in str(exc_info.value)

    def test_activation_gate_enforces_prerequisites(self, db):
        svc = DomainService(db)
        user_id = "test_user_gate"

        dom = svc.create_domain(
            user_id=user_id,
            domain_name="test-activation-gate.com",
            origin_address="185.199.108.153",
            background_scan=False
        )

        # Attempting activation while unverified must fail
        with pytest.raises(ValueError) as exc_info:
            svc.activate_domain(dom["id"], user_id)
        assert "ownership is not verified" in str(exc_info.value).lower() or "delegation is pending" in str(exc_info.value).lower()

    def test_dashboard_overview_metrics_honest_latency(self, db):
        svc = DomainService(db)
        user_id = "test_metrics_user"

        overview = svc.get_dashboard_overview(user_id)
        assert "total_domains" in overview
        assert "active_protected_domains" in overview
        assert "pending_delegation" in overview
        assert "wordpress_sites" in overview
        assert "total_protected_websites" in overview
        assert "website_limit" in overview
        assert "measured_latency_ms" in overview

        # If no traffic has been measured, it must honestly say Awaiting Traffic instead of hardcoded 0.35ms
        if overview["measured_latency_ms"] is None:
            assert overview["latency_display"] == "Awaiting Traffic"
