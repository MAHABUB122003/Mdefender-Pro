import sys, traceback, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"d:\Documents_product\Mdefender-Pro\Mdefender\backend")
from src.api.malware_api import MalwareAPI

api = MalwareAPI()
print("verify key:", api.verify_api_key("testscan123", None))
try:
    r = api.scan("greet.php", b"<?php echo 'hello';", ip="127.0.0.1", domain="localhost", user_id=None)
    print("scan ok:", r)
except Exception:
    traceback.print_exc()
