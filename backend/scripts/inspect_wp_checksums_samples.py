import sqlite3
import os

DB_PATH = os.path.abspath("datasets/wordpress_malware/database/wp_checksums.db")

print(f"File: {DB_PATH}")
print(f"File Size on Disk: {os.path.getsize(DB_PATH) / (1024*1024):.2f} MB ({os.path.getsize(DB_PATH) / (1024*1024*1024):.2f} GB)\n")

conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
c = conn.cursor()

tables = [
    ("core_checksums", "WordPress Core Checksums"),
    ("plugin_checksums", "Plugin & Theme Checksums"),
    ("malicious_signatures", "Malicious AST & Webshell Signatures"),
    ("db_and_config_signatures", "Database & Config Threat Patterns")
]

total = 0
for tbl, label in tables:
    cnt = c.execute(f"SELECT count(*) FROM {tbl}").fetchone()[0]
    total += cnt
    print(f"[{label}] -> {tbl}")
    print(f"  Total Records: {cnt:,}")
    c.execute(f"SELECT * FROM {tbl} LIMIT 2")
    rows = c.fetchall()
    print("  Sample Rows:")
    for r in rows:
        print(f"    - {r}")
    print()

print(f"=== GRAND TOTAL ROWS IN wp_checksums.db: {total:,} RECORDS ===")
conn.close()
