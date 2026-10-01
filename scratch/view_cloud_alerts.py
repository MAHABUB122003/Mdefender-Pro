import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from src.database.mongodb_connection import MongoDB

db = MongoDB()
notifs = list(db.notifications.find({}).sort('created_at', -1).limit(10))
print(f'Total notifications found: {len(notifs)}')
for n in notifs:
    title = str(n.get('title', '')).encode('ascii', 'replace').decode('ascii')
    msg = str(n.get('message', '')).encode('ascii', 'replace').decode('ascii')
    print(f"[{n.get('severity', 'info')}] {title}: {msg}")

print('\nRecent Security Events in Cloud:')
events = list(db.security_events.find({}).sort('timestamp', -1).limit(5))
for e in events:
    etitle = str(e.get('title', '')).encode('ascii', 'replace').decode('ascii')
    edet = str(e.get('details', '')).encode('ascii', 'replace').decode('ascii')
    print(f"Event: {etitle} | Severity: {e.get('severity')} | Details: {edet}")
