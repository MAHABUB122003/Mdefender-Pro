import time
import sqlite3
from src.engine.decision_engine import DecisionEngine
from src.engine.malware_detector import MalwareDetector

def test_hyper_engine():
    print(">>> Testing MDefender-Pro 2,000,000+ Hyper-Scale Signature & Threat Engine...")
    de = DecisionEngine()
    md = MalwareDetector()

    # 1. SQL Injection Attack
    t0 = time.perf_counter()
    res1 = de.evaluate({"path": "/index.php", "query": "id=1 UNION SELECT 1,user(),3-- -", "headers": {"User-Agent": "Mozilla/5.0"}})
    t1 = time.perf_counter()
    print(f"1. SQL Injection Decision: {res1['decision']} (Risk: {res1['risk_score']}, Category: {res1['attack_type']}) in {(t1-t0)*1000:.2f}ms")

    # 2. XSS Attack (Polyglot SVG / Event handler)
    t0 = time.perf_counter()
    res2 = de.evaluate({"path": "/search", "query": "q=<svg/onload=alert(document.cookie)>", "headers": {"User-Agent": "Mozilla/5.0"}})
    t1 = time.perf_counter()
    print(f"2. XSS Polyglot Decision: {res2['decision']} (Risk: {res2['risk_score']}, Category: {res2['attack_type']}) in {(t1-t0)*1000:.2f}ms")

    # 3. Remote Code Execution (PHP Wrapper / Dynamic sink)
    t0 = time.perf_counter()
    res3 = de.evaluate({"path": "/api.php", "query": "file=php://filter/read=convert.base64-encode/resource=index.php", "headers": {"User-Agent": "Mozilla/5.0"}})
    t1 = time.perf_counter()
    print(f"3. RCE / LFI Wrapper Decision: {res3['decision']} (Risk: {res3['risk_score']}, Category: {res3['attack_type']}) in {(t1-t0)*1000:.2f}ms")

    # 4. SSRF & Cloud Metadata (AWS IMDS)
    t0 = time.perf_counter()
    res4 = de.evaluate({"path": "/fetch", "query": "url=http://169.254.169.254/latest/meta-data/", "headers": {"User-Agent": "Mozilla/5.0"}})
    t1 = time.perf_counter()
    print(f"4. SSRF Cloud Metadata Decision: {res4['decision']} (Risk: {res4['risk_score']}, Category: {res4['attack_type']}) in {(t1-t0)*1000:.2f}ms")

    # 5. Malicious Bot Scanner (Nikto / Sqlmap / Acunetix)
    t0 = time.perf_counter()
    res5 = de.evaluate({"path": "/wp-login.php", "query": "", "headers": {"User-Agent": "Mozilla/5.0 (compatible; sqlmap/1.7#stable)"}})
    t1 = time.perf_counter()
    print(f"5. Malicious Scanner Bot Decision: {res5['decision']} (Risk: {res5['risk_score']}, Category: {res5['attack_type']}) in {(t1-t0)*1000:.2f}ms")


    # 6. Clean Benign Request
    t0 = time.perf_counter()
    res6 = de.evaluate({"path": "/shop", "query": "product_id=42&view=grid", "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}})
    t1 = time.perf_counter()
    print(f"6. Clean Benign Request Decision: {res6['decision']} (Risk: {res6['risk_score']}) in {(t1-t0)*1000:.2f}ms")

if __name__ == "__main__":
    test_hyper_engine()
