import sqlite3
import os

db_path = os.path.abspath("datasets/wordpress_malware/database/wp_checksums.db")
uri = f"file:{db_path}?mode=ro"

try:
    conn = sqlite3.connect(uri, uri=True, timeout=5)
    c = conn.cursor()
    for table in ["core_checksums", "plugin_checksums", "malicious_signatures", "db_and_config_signatures"]:
        try:
            cnt = c.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            print(f"{table}: {cnt:,} rows", flush=True)
        except Exception as e:
            print(f"{table}: error ({e})", flush=True)
    conn.close()
except Exception as e:
    print(f"Connection error: {e}", flush=True)
