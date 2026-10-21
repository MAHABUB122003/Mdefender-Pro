"""Merges 128k+ verified threat intelligence IPs and open-source feeds into MDefender's central threat database."""
import os
import sqlite3
import ipaddress

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/data/threat_intel/threat_intelligence.db"))
MERGED_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../datasets/threat_intelligence/02_malicious_ips/merged/all_malicious_ips_merged.txt"))

def merge_ips():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM malicious_ips")
    before_count = cur.fetchone()[0]
    print(f"Initial malicious_ips count: {before_count:,}")

    if not os.path.exists(MERGED_FILE):
        print(f"Warning: {MERGED_FILE} not found. Skipping file merge.")
    else:
        print(f"Reading IPs from {MERGED_FILE}...")
        batch = []
        with open(MERGED_FILE, "r", encoding="utf-8") as f:
            for line in f:
                ip_str = line.strip()
                if not ip_str:
                    continue
                batch.append((ip_str, "threat_intelligence_merged", "malicious_actor", "high"))
                if len(batch) >= 10000:
                    cur.executemany("INSERT OR IGNORE INTO malicious_ips (ip_or_cidr, source, threat_type, severity) VALUES (?, ?, ?, ?)", batch)
                    batch = []
        if batch:
            cur.executemany("INSERT OR IGNORE INTO malicious_ips (ip_or_cidr, source, threat_type, severity) VALUES (?, ?, ?, ?)", batch)
        conn.commit()

    cur.execute("SELECT count(*) FROM malicious_ips")
    after_count = cur.fetchone()[0]
    print(f"Updated malicious_ips count: {after_count:,} (+{after_count - before_count:,} new threat actors)")
    conn.close()

if __name__ == "__main__":
    merge_ips()
