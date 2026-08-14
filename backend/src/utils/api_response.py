"""MDefender Pro API response helpers.

Consistent response envelope for v1 APIs:

    {"success": true, "data": {...}, "request_id": "..."}
    {"success": false, "error": {"code": "X", "message": "..."}, "request_id": "..."}

Never return Python stack traces to production clients.
"""

import secrets
import uuid
from datetime import datetime
from bson import ObjectId


def new_request_id():
    return secrets.token_urlsafe(8)


def new_reference_id():
    return "MDF-" + secrets.token_hex(4).upper()


def success(data=None, request_id=None, message=None):
    payload = {"success": True, "request_id": request_id or new_request_id()}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    return payload


def error(code, message, request_id=None, status_code=400):
    payload = {
        "success": False,
        "error": {"code": code, "message": message},
        "request_id": request_id or new_request_id(),
    }
    return payload, status_code


def serialize(doc):
    """Convert a Mongo doc / nested structures to JSON-safe values."""
    if isinstance(doc, dict):
        return {k: serialize(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [serialize(v) for v in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


def clean_datetime(obj):
    """Deep-copy structure replacing datetime/bytes with string reprs."""
    if isinstance(obj, dict):
        return {k: clean_datetime(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_datetime(v) for v in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, bytes):
        return "<binary>"
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj


def parse_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None
