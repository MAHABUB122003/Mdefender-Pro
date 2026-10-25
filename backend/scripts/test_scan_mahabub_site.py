import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from src.engine.malware_detector import MalwareDetector

def scan_mahabub_plugins():
    detector = MalwareDetector()
    print("MDefender MalwareDetector Initialized successfully.")
    print("Status:", detector.get_status())
    print("=" * 65)

    test_dir = r"C:\xampp\htdocs\mahabub\wp-content\plugins"
    target_files = [
        "index.php",
        "create_backdoor_admin.php",
        "mdefender_test_backdoor.php",
        "rce_backdoor.php"
    ]

    for fname in target_files:
        fpath = os.path.join(test_dir, fname)
        if not os.path.exists(fpath):
            print(f"[-] File not found: {fname}")
            continue
        try:
            with open(fpath, "rb") as f:
                content = f.read()
            res = detector.scan(fname, content)
            print(f"\n[File: {fname}] ({len(content)} bytes)")
            print(f"  Verdict:    {res.get('verdict').upper()}")
            print(f"  Risk Score: {res.get('risk_score')}/100")
            print(f"  Family:     {res.get('family')}")
            print(f"  Reasons:    {res.get('reasons')}")
        except Exception as e:
            print(f"[-] Error scanning {fname}: {e}")
    print("\n" + "=" * 65)

if __name__ == "__main__":
    scan_mahabub_plugins()
