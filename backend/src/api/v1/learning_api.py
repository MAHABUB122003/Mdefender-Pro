"""v1 API: WAF Attack Learning, False-Positive Whitelisting & Model Feedback Center.

Enables continuous adaptive security:
  - User-submitted False-Positive and Bypass threat reports
  - 1-Click Whitelisting for legitimate blocked requests (creates whitelist rule + labels as benign in ML dataset)
  - 1-Click Blacklisting for newly discovered/bypassed attack payloads (generates regex rule + labels as attack in ML dataset)
  - Interactive Attack Sandbox for real-time payload testing & decision telemetry
  - Zero-downtime Incremental Retraining (fine-tuning) of WAF ML models
"""

import csv
import io
import json
import os
import re
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field

from src.api.v1.deps import get_db
from src.auth.audit_service import AuditService
from src.auth.dependencies import get_current_admin
from src.engine.decision_engine import DecisionEngine
from src.engine.ml_detector import MLDetector
from src.engine.waf_vectorizer import get_vectorizer, normalize_text
from src.utils.api_response import serialize, success

router = APIRouter(prefix="/admin/learning", tags=["Attack Learning"])
public_router = APIRouter(prefix="/waf", tags=["WAF Public"])

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))


# ==================== SCHEMAS ====================

class FalsePositiveReportBody(BaseModel):
    reference_id: str
    client_ip: Optional[str] = "127.0.0.1"
    url: Optional[str] = "/"
    payload: Optional[str] = ""
    attack_type: Optional[str] = "False Positive"
    reason: Optional[str] = ""
    user_email: Optional[str] = None
    comments: Optional[str] = ""


class WhitelistPayloadBody(BaseModel):
    report_id: Optional[str] = None
    name: str
    pattern: str
    match_type: str = Field(default="contains", description="contains | exact | regex | url_path")
    description: Optional[str] = ""
    target_payload: Optional[str] = ""


class BlacklistPayloadBody(BaseModel):
    report_id: Optional[str] = None
    name: str
    pattern: str
    category: str = Field(default="Generic Attack", description="SQL Injection | XSS | RCE | SSRF | etc.")
    severity: str = Field(default="critical", description="critical | high | medium | low")
    action: str = Field(default="block", description="block | challenge | monitor")
    target_payload: Optional[str] = ""


class SandboxTestBody(BaseModel):
    payload: str
    url_path: Optional[str] = "/"
    method: Optional[str] = "GET"
    headers: Optional[dict] = None


class ManualSampleBody(BaseModel):
    payload: str
    label: int = Field(default=1, description="0=benign, 1=attack")
    category: Optional[str] = "Custom Attack"
    notes: Optional[str] = ""


# ==================== PUBLIC ENDPOINT: USER REPORT ====================

@public_router.post("/report-false-positive")
async def submit_false_positive_report(body: FalsePositiveReportBody):
    """Allows any blocked user or tenant to submit a false-positive / blocked request report."""
    db = get_db()
    report_doc = {
        "reference_id": body.reference_id.strip(),
        "client_ip": body.client_ip.strip() if body.client_ip else "127.0.0.1",
        "url": body.url.strip() if body.url else "/",
        "payload": body.payload.strip() if body.payload else "",
        "attack_type": body.attack_type.strip() if body.attack_type else "Blocked Request",
        "reason": body.reason.strip() if body.reason else "WAF Rule Triggered",
        "user_email": body.user_email.strip() if body.user_email else "Anonymous",
        "comments": body.comments.strip() if body.comments else "",
        "status": "pending",  # pending | whitelisted | blacklisted | dismissed
        "created_at": datetime.now(),
        "resolved_at": None,
    }
    result = db.waf_reports.insert_one(report_doc)
    return success(
        {"report_id": str(result.inserted_id), "reference_id": body.reference_id},
        message="Your report has been submitted to the security operations center for review."
    )


# ==================== ADMIN: DASHBOARD & METRICS ====================

@router.get("/stats")
async def get_learning_stats(admin_email: str = Depends(get_current_admin)):
    """Provides learning hub metrics: pending reports, learned dataset samples, model health."""
    db = get_db()
    
    total_reports = db.waf_reports.count_documents({})
    pending_reports = db.waf_reports.count_documents({"status": "pending"})
    whitelisted_reports = db.waf_reports.count_documents({"status": "whitelisted"})
    blacklisted_reports = db.waf_reports.count_documents({"status": "blacklisted"})

    total_samples = db.learned_samples.count_documents({})
    benign_samples = db.learned_samples.count_documents({"label": 0})
    attack_samples = db.learned_samples.count_documents({"label": 1})
    untrained_samples = db.learned_samples.count_documents({"trained": False})

    total_whitelists = db.waf_whitelists.count_documents({"is_active": True})
    total_custom_rules = db.rules.count_documents({"source": "learning_hub"})

    ml_status = MLDetector().get_status()

    return success({
        "reports": {
            "total": total_reports,
            "pending": pending_reports,
            "whitelisted": whitelisted_reports,
            "blacklisted": blacklisted_reports,
        },
        "dataset": {
            "total_samples": total_samples,
            "benign_samples": benign_samples,
            "attack_samples": attack_samples,
            "untrained_samples": untrained_samples,
        },
        "rules": {
            "active_whitelists": total_whitelists,
            "learned_blocking_rules": total_custom_rules,
        },
        "model_status": ml_status
    })


# ==================== ADMIN: REPORTS INBOX ====================

@router.get("/reports")
async def list_reports(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin_email: str = Depends(get_current_admin)
):
    """Lists feedback and threat reports with filtering."""
    db = get_db()
    query = {}
    if status and status != "all":
        query["status"] = status
    if q:
        rx = re.compile(re.escape(q), re.IGNORECASE)
        query["$or"] = [
            {"reference_id": rx},
            {"client_ip": rx},
            {"url": rx},
            {"payload": rx},
            {"user_email": rx},
            {"attack_type": rx}
        ]

    total = db.waf_reports.count_documents(query)
    reports = list(db.waf_reports.find(query).sort("created_at", -1).skip(skip).limit(limit))

    return success({
        "reports": [serialize(r) for r in reports],
        "total": total,
        "skip": skip,
        "limit": limit
    })


@router.delete("/reports/{report_id}")
async def dismiss_or_delete_report(report_id: str, admin_email: str = Depends(get_current_admin)):
    """Dismisses or deletes a false positive / threat report."""
    db = get_db()
    oid = ObjectId(report_id) if ObjectId.is_valid(report_id) else report_id
    res = db.waf_reports.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    AuditService().log(user_id=admin_email, action="waf_report_deleted", ip_address="admin_panel",
                       details={"report_id": report_id})
    return success(message="Report dismissed successfully.")


# ==================== ADMIN: 1-CLICK WHITELIST ====================

@router.post("/whitelist")
async def whitelist_pattern_or_report(body: WhitelistPayloadBody, admin_email: str = Depends(get_current_admin)):
    """
    1-Click Whitelist Action:
    1. Adds a pattern/path whitelist rule to `waf_whitelists`
    2. Updates report status to 'whitelisted'
    3. Feeds the benign sample (Label 0) into `learned_samples` for ML continuous learning
    """
    db = get_db()
    now = datetime.now()

    # 1. Create Whitelist Rule
    whitelist_doc = {
        "name": body.name.strip(),
        "pattern": body.pattern.strip(),
        "match_type": body.match_type.strip().lower(),  # contains, exact, regex, url_path
        "description": body.description.strip() or "Whitelisted via Attack Learning Hub",
        "is_active": True,
        "created_by": admin_email,
        "created_at": now,
        "updated_at": now,
    }
    wl_res = db.waf_whitelists.insert_one(whitelist_doc)

    # 2. Update Report if provided
    if body.report_id:
        oid = ObjectId(body.report_id) if ObjectId.is_valid(body.report_id) else body.report_id
        db.waf_reports.update_one(
            {"_id": oid},
            {"$set": {"status": "whitelisted", "resolved_at": now, "resolution_note": f"Whitelisted with rule: {body.name}"}}
        )

    # 3. Add to ML Training Dataset as Benign Sample (Label 0)
    sample_text = body.target_payload.strip() or body.pattern.strip()
    if sample_text:
        db.learned_samples.update_one(
            {"payload": sample_text},
            {"$set": {
                "payload": sample_text,
                "label": 0,  # 0 = Benign / Safe
                "category": "Benign / Whitelisted",
                "source": "admin_whitelist",
                "trained": False,
                "updated_at": now,
            }},
            upsert=True
        )

    AuditService().log(user_id=admin_email, action="waf_pattern_whitelisted", ip_address="admin_panel",
                       details={"name": body.name, "pattern": body.pattern, "match_type": body.match_type})

    return success(
        {"whitelist_id": str(wl_res.inserted_id), "name": body.name},
        message=f"Pattern '{body.name}' has been successfully whitelisted. WAF will allow matching requests and ML model recorded the benign sample."
    )


# ==================== ADMIN: 1-CLICK BLACKLIST / LEARN NEW ATTACK ====================

@router.post("/blacklist")
async def blacklist_and_learn_attack(body: BlacklistPayloadBody, admin_email: str = Depends(get_current_admin)):
    """
    1-Click Blacklist & New Attack Learning Action:
    1. Generates an active regex signature rule in `rules` collection
    2. Updates report status to 'blacklisted'
    3. Feeds the malicious sample (Label 1) + Attack Category into `learned_samples` for ML continuous learning
    """
    db = get_db()
    now = datetime.now()

    # 1. Format regex pattern safely if not already regex
    pattern = body.pattern.strip()
    if not pattern.startswith("(?i)") and not pattern.startswith("^"):
        # Auto-escape special chars if raw text
        escaped = re.escape(pattern)
        regex_pattern = f"(?i)({escaped})"
    else:
        regex_pattern = pattern

    # 2. Insert into rules collection
    rule_doc = {
        "name": body.name.strip(),
        "pattern": regex_pattern,
        "category": body.category.strip() or "Generic Attack",
        "severity": body.severity.strip().lower(),
        "action": body.action.strip().lower(),
        "enabled": True,
        "source": "learning_hub",
        "created_by": admin_email,
        "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
    }
    rule_res = db.rules.insert_one(rule_doc)

    # 3. Update Report if provided
    if body.report_id:
        oid = ObjectId(body.report_id) if ObjectId.is_valid(body.report_id) else body.report_id
        db.waf_reports.update_one(
            {"_id": oid},
            {"$set": {"status": "blacklisted", "resolved_at": now, "resolution_note": f"Blacklisted with rule: {body.name}"}}
        )

    # 4. Add to ML Training Dataset as Malicious Sample (Label 1)
    sample_text = body.target_payload.strip() or pattern
    if sample_text:
        db.learned_samples.update_one(
            {"payload": sample_text},
            {"$set": {
                "payload": sample_text,
                "label": 1,  # 1 = Malicious / Attack
                "category": body.category.strip(),
                "source": "admin_blacklist_learning",
                "trained": False,
                "updated_at": now,
            }},
            upsert=True
        )

    AuditService().log(user_id=admin_email, action="waf_attack_blacklisted", ip_address="admin_panel",
                       details={"name": body.name, "category": body.category, "pattern": regex_pattern})

    return success(
        {"rule_id": str(rule_res.inserted_id), "name": body.name},
        message=f"Attack signature '{body.name}' created and activated globally. ML training dataset updated."
    )


# ==================== ADMIN: INTERACTIVE ATTACK SANDBOX ====================

@router.post("/test")
async def test_payload_in_sandbox(body: SandboxTestBody, admin_email: str = Depends(get_current_admin)):
    """
    Live Interactive Sandbox:
    Runs the input payload through all detection layers (Semantic AST, Regex Rules, ML Model, Whitelist Check)
    and returns a deep multi-engine breakdown.
    """
    engine = DecisionEngine()
    request_data = {
        "url": body.url_path or "/",
        "path": body.url_path or "/",
        "method": body.method or "GET",
        "query_string": body.payload,
        "body": body.payload,
        "headers": body.headers or {},
        "user_agent": "MDefender-Admin-Attack-Lab/3.0",
        "ip": "127.0.0.1",
    }

    decision_result = engine.evaluate(request_data)

    # Check Whitelist Match
    db = get_db()
    whitelists = list(db.waf_whitelists.find({"is_active": True}))
    whitelist_hit = None
    for wl in whitelists:
        pat = wl.get("pattern", "")
        mtype = wl.get("match_type", "contains")
        if mtype == "contains" and pat in body.payload:
            whitelist_hit = wl["name"]
            break
        elif mtype == "exact" and pat.strip() == body.payload.strip():
            whitelist_hit = wl["name"]
            break
        elif mtype == "regex":
            try:
                if re.search(pat, body.payload, re.IGNORECASE):
                    whitelist_hit = wl["name"]
                    break
            except Exception:
                pass
        elif mtype == "url_path" and pat in (body.url_path or ""):
            whitelist_hit = wl["name"]
            break

    # ML direct score
    ml_detector = MLDetector()
    ml_eval = ml_detector.detect(body.payload)

    return success({
        "decision": decision_result.get("decision"),
        "risk_score": decision_result.get("risk_score"),
        "risk_level": decision_result.get("risk_level"),
        "reason": decision_result.get("reason"),
        "components": decision_result.get("components"),
        "signals": decision_result.get("signals"),
        "attack_type": decision_result.get("attack_type"),
        "whitelist_match": whitelist_hit,
        "ml_direct": ml_eval,
        "tested_payload": body.payload,
    })


# ==================== ADMIN: MODEL CONTINUOUS RETRAINING ====================

@router.post("/retrain")
async def retrain_waf_ml_model(admin_email: str = Depends(get_current_admin)):
    """
    Zero-Downtime Incremental Fine-Tuning:
    1. Gathers all newly learned samples from `learned_samples`
    2. Performs partial_fit / incremental SGD step with HashingVectorizer
    3. Persists updated model and metadata
    4. Automatically hot-reloads MLDetector in memory
    """
    db = get_db()
    samples = list(db.learned_samples.find({}))
    if not samples:
        raise HTTPException(status_code=400, detail="No learned samples available in dataset for training.")

    import joblib
    import numpy as np
    from sklearn.linear_model import SGDClassifier

    waf_model_path = os.path.join(MODEL_DIR, "waf_model.pkl")
    meta_path = os.path.join(MODEL_DIR, "waf_meta.json")

    # Load existing model or initialize fresh SGDClassifier
    if os.path.exists(waf_model_path):
        try:
            clf = joblib.load(waf_model_path)
        except Exception:
            clf = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-5, random_state=42)
    else:
        clf = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-5, random_state=42)

    vectorizer = get_vectorizer()

    # Prepare training batch
    texts = [normalize_text(s["payload"]) for s in samples if s.get("payload")]
    labels = [int(s.get("label", 1)) for s in samples if s.get("payload")]

    if not texts:
        raise HTTPException(status_code=400, detail="No valid payload text found in training samples.")

    X = vectorizer.transform(texts)
    y = np.array(labels)

    # Ensure both classes (0 and 1) are present for partial_fit
    classes = np.array([0, 1])
    try:
        clf.partial_fit(X, y, classes=classes)
    except Exception:
        clf.fit(X, y)

    # Save fine-tuned model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, waf_model_path)

    # Update metadata
    meta = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            meta = {}

    current_version = meta.get("version", "2.0.0")
    try:
        parts = current_version.split(".")
        new_patch = int(parts[-1]) + 1
        new_version = f"{parts[0]}.{parts[1]}.{new_patch}"
    except Exception:
        new_version = "2.1.0"

    meta["version"] = new_version
    meta["training_date"] = datetime.now().isoformat()
    meta["last_retrained_by"] = admin_email
    meta["incremental_samples_count"] = len(samples)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # Mark samples as trained
    db.learned_samples.update_many({}, {"$set": {"trained": True, "trained_at": datetime.now()}})

    # Hot-reload in memory
    MLDetector()._load()

    AuditService().log(user_id=admin_email, action="waf_model_fine_tuned", ip_address="admin_panel",
                       details={"new_version": new_version, "samples_trained": len(samples)})

    return success({
        "new_version": new_version,
        "samples_trained": len(samples),
        "training_date": meta["training_date"]
    }, message=f"WAF ML model successfully fine-tuned to version {new_version} with {len(samples)} feedback samples.")


# ==================== ADMIN: DATASET SAMPLES & WHITELISTS ====================

@router.get("/samples")
async def list_learned_samples(
    label: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin_email: str = Depends(get_current_admin)
):
    """Browses all learned dataset samples."""
    db = get_db()
    query = {}
    if label in ("0", "1"):
        query["label"] = int(label)
    if q:
        rx = re.compile(re.escape(q), re.IGNORECASE)
        query["$or"] = [{"payload": rx}, {"category": rx}, {"source": rx}]

    total = db.learned_samples.count_documents(query)
    samples = list(db.learned_samples.find(query).sort("updated_at", -1).skip(skip).limit(limit))

    return success({
        "samples": [serialize(s) for s in samples],
        "total": total,
        "skip": skip,
        "limit": limit
    })


@router.post("/samples")
async def add_manual_sample(body: ManualSampleBody, admin_email: str = Depends(get_current_admin)):
    """Manually adds a training sample (benign or attack) to the active dataset."""
    db = get_db()
    doc = {
        "payload": body.payload.strip(),
        "label": int(body.label),
        "category": body.category.strip() or ("Malicious" if body.label == 1 else "Benign"),
        "notes": body.notes.strip() if body.notes else "",
        "source": "admin_manual_entry",
        "trained": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    db.learned_samples.update_one({"payload": body.payload.strip()}, {"$set": doc}, upsert=True)
    return success(message="Sample added to active WAF training dataset.")


@router.delete("/samples/{sample_id}")
async def delete_sample(sample_id: str, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    oid = ObjectId(sample_id) if ObjectId.is_valid(sample_id) else sample_id
    db.learned_samples.delete_one({"_id": oid})
    return success(message="Sample deleted from dataset.")


@router.get("/whitelists")
async def list_whitelists(admin_email: str = Depends(get_current_admin)):
    """Lists all active WAF whitelist rules."""
    db = get_db()
    items = list(db.waf_whitelists.find({}).sort("created_at", -1))
    return success({"whitelists": [serialize(w) for w in items]})


@router.delete("/whitelists/{rule_id}")
async def delete_whitelist_rule(rule_id: str, admin_email: str = Depends(get_current_admin)):
    db = get_db()
    oid = ObjectId(rule_id) if ObjectId.is_valid(rule_id) else rule_id
    res = db.waf_whitelists.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Whitelist rule not found")
    AuditService().log(user_id=admin_email, action="waf_whitelist_deleted", ip_address="admin_panel",
                       details={"rule_id": rule_id})
    return success(message="Whitelist rule removed successfully.")
