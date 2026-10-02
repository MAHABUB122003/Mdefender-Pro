import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='', db='mahabub')
with conn.cursor() as cur:
    cur.execute("SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'waf_%' OR option_name IN ('siteurl', 'home', 'active_plugins')")
    for row in cur.fetchall():
        val = row[1] if row[1] else ''
        preview = val[:120] if len(val) > 120 else val
        print(f"{row[0]} = {preview}")
