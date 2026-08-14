import sys
sys.path.insert(0, r"D:\Documents\ML_all_Payloads\Mdefender-Pro\backend")
from src.engine.ml_detector import MLDetector

d = MLDetector()
probes = [
    "GET /index.php?page=home HTTP/1.1 Host: example.com",
    "GET /blog/wp-includes/css/admin-bar.min.css?ver=4.9.5 HTTP/1.1",
    "GET /shop/product.php?id=42 HTTP/1.1",
    "GET /wp-admin/admin-ajax.php?action=heartbeat HTTP/1.1",
    "GET /about-us HTTP/1.1 Host: example.com",
    "POST /wp-login.php HTTP/1.1",
    "GET /category/news/page/2 HTTP/1.1",
    "GET /index.php?lang=en&ref=footer HTTP/1.1",
    "GET /checkout?step=2 HTTP/1.1",
    "GET /search?q=apple HTTP/1.1",
    "GET /files/report.pdf HTTP/1.1",
    "/index.php?page=home",
    "/shop?product_id=42&ref=utm_campaign",
]
for p in probes:
    r = d.detect(p)
    print(f"{r['probability']:.4f}  {r['category'] or '-':<22} {p}")
