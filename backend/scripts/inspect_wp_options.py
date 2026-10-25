import pymysql

try:
    conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='mahabub')
    c = conn.cursor()
    c.execute("SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'waf_fw_%' OR option_name LIKE 'mdefender_%'")
    rows = c.fetchall()
    print(f"Total options found: {len(rows)}")
    for k, v in rows:
        val_disp = v if len(str(v)) < 80 else str(v)[:80] + '...'
        print(f"  {k} = {val_disp}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
