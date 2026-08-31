import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.database.mongodb_connection import MongoDB

def main():
    db = MongoDB()
    blacklist = list(db.blacklist.find({}))
    print(f"Total Blacklisted IPs: {len(blacklist)}")
    for b in blacklist:
        print(f" - IP: {b.get('ip')}, Reason: {b.get('reason')}, Type: {b.get('type')}, Blocked At: {b.get('blocked_at')}")

if __name__ == "__main__":
    main()
