import sqlite3

conn = sqlite3.connect(r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\database\wp_checksums.db")
c = conn.cursor()
c.execute("SELECT pattern_or_hash, category, severity, description FROM malicious_signatures WHERE signature_type='exact_file_sha256' LIMIT 3")
rows = c.fetchall()
for r in rows:
    print(r)
conn.close()

