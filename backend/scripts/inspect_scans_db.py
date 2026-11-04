import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
from src.database.mongodb_connection import MongoDB

db = MongoDB()
for s in db.malware_scans.find().sort("started_at", -1).limit(10):
    print(f"Scan ID: {s.get('_id')} | Site: {s.get('website_id')} | Domain: {s.get('domain')} | Status: {s.get('status')} | Findings: {len(s.get('findings') or [])} | Score: {s.get('score')} | Started: {s.get('started_at')}")

