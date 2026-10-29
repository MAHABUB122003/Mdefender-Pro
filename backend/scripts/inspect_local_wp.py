import pymysql

try:
    conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='mahabub')
    with conn.cursor() as cur:
        cur.execute("SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'waf_%'")
        rows = cur.fetchall()
        print(f"Total waf_ options: {len(rows)}")
        for name, val in rows:
            if any(k in name for k in ['api_key', 'token', 'blocked_countries', 'local_blacklist', 'cloud_mode']):
                print(f"{name}: {val}")
except Exception as e:
    print("Error:", e)
