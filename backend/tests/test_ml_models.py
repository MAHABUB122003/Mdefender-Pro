import sys
sys.path.insert(0, r"D:\Documents\ML_all_Payloads\Mdefender-Pro\backend")

from src.engine.ml_detector import MLDetector
from src.engine.malware_detector import MalwareDetector

d = MLDetector()
print("WAF status:", d.get_status())
print("WAF benign:", d.detect("GET /index.php?page=home HTTP/1.1 Host: example.com"))
print("WAF sqli:", d.detect("GET /index.php?id=1' UNION SELECT username,password FROM users-- HTTP/1.1"))
print("WAF xss:", d.detect("GET /search?q=<script>alert(1)</script> HTTP/1.1"))
print("WAF traversal:", d.detect("GET /../../etc/passwd HTTP/1.1"))
print("WAF normal with =:", d.detect("GET /shop?product_id=42&ref=utm_campaign"))

m = MalwareDetector()
print("\nMalware status:", m.get_status())

clean_php = b"""<?php
/** A simple greeting page */
function say_hello($name) {
    return 'Hello, ' . htmlspecialchars($name);
}
echo say_hello(isset($_GET['name']) ? $_GET['name'] : 'world');
"""
webshell = b"""<?php
$c = base64_decode('c3lzdGVtKCRfR0VUW2NdKTs=');
@eval($c);
echo 'owned';
"""
backdoor = b"""<?php
if (isset($_POST['x'])) {
    $f = gzinflate(base64_decode($_POST['x']));
    eval($f);
}
"""
print("malware clean.php:", m.scan("index.php", clean_php))
print("malware webshell:", m.scan("shell.php", webshell))
print("malware backdoor:", m.scan("upload.php", backdoor))
