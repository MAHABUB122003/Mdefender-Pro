import sqlite3
import os

DB_PATH = r"d:\Documents_product\Mdefender-Pro\Mdefender-Pro\Mdefender\datasets\wordpress_malware\database\dataset.db"

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("PRAGMA table_info(samples)")
for col in c.fetchall():
    print(col)

print("\nSample rows:")
for row in c.execute("SELECT * FROM samples LIMIT 2"):
    print(row)

c.execute("SELECT label, count(*) FROM samples GROUP BY label")
print("\nLabels:")
for row in c.fetchall():
    print(row)

conn.close()
