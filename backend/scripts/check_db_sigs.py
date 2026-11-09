import sqlite3

conn = sqlite3.connect(r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\database\wp_checksums.db")
c = conn.cursor()
c.execute("SELECT target_type, pattern, threat_name, severity FROM db_and_config_signatures WHERE target_type IN ('wp_posts', 'wp_options') LIMIT 5")
for r in c.fetchall():
    print(r)
conn.close()

