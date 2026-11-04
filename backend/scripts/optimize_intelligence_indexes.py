import sqlite3
import os
import time

DB_PATH = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\database\wp_checksums.db"

def optimize_indexes():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH, timeout=60)
    c = conn.cursor()
    
    # Enable WAL mode and performance pragmas
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA cache_size = -64000;")  # 64MB cache
    
    start = time.time()
    
    print("Checking and creating indexes on core_checksums...")
    c.execute("CREATE INDEX IF NOT EXISTS idx_core_md5 ON core_checksums(md5);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_core_path ON core_checksums(file_path);")
    
    print("Checking and creating indexes on plugin_checksums...")
    c.execute("CREATE INDEX IF NOT EXISTS idx_plug_md5 ON plugin_checksums(md5);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_plug_sha256 ON plugin_checksums(sha256);")
    
    print("Checking and creating indexes on malicious_signatures...")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sig_hash ON malicious_signatures(pattern_or_hash);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sig_cat ON malicious_signatures(category);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sig_type ON malicious_signatures(signature_type);")
    
    print("Checking and creating indexes on db_and_config_signatures...")
    c.execute("CREATE INDEX IF NOT EXISTS idx_db_target ON db_and_config_signatures(target_type);")
    
    conn.commit()
    conn.close()
    print(f"Index optimization completed in {time.time() - start:.2f} seconds!")

if __name__ == "__main__":
    optimize_indexes()

