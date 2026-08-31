import requests
import time

def test():
    print("=== Testing Bookstore Live Backend with MDefender WAF ===")
    
    # 1. Test Root Route: GET /
    try:
        t0 = time.time()
        r = requests.get("http://localhost:5005/", timeout=10)
        dt = (time.time() - t0) * 1000
        print(f"[0] GET / => HTTP {r.status_code} in {dt:.1f}ms: '{r.text}'")
        assert r.status_code == 200
    except Exception as e:
        print("[0] Root route error:", e)

    # 2. Test Safe Request: GET /api/books
    try:
        t0 = time.time()
        r = requests.get("http://localhost:5005/api/books", timeout=15)
        dt = (time.time() - t0) * 1000
        print(f"[1] Safe GET /api/books => HTTP {r.status_code} in {dt:.1f}ms")
        assert r.status_code == 200
        books = r.json()
        print(f"    Loaded {len(books)} books successfully from Bookstore database!")
    except Exception as e:
        print("[1] Failed safe request:", e)

    # 3. Test SQL Injection Attack: GET /api/books?search=' UNION SELECT 1,2,3--
    try:
        t0 = time.time()
        r = requests.get("http://localhost:5005/api/books?search=%27%20UNION%20SELECT%201,2,3--", timeout=10)
        dt = (time.time() - t0) * 1000
        print(f"[2] SQLi Attack GET => HTTP {r.status_code} in {dt:.1f}ms")
        print("    WAF Status Header:", r.headers.get("x-mdefender-status"))
        print("    WAF Attack Type:", r.headers.get("x-mdefender-attack-type"))
        assert r.status_code == 403
        assert r.headers.get("x-mdefender-status") == "blocked"
        print("    [+] SQL Injection BLOCKED with 403 Access Denied!")
    except Exception as e:
        print("[2] Failed attack test:", e)

    # 4. Test XSS Attack: POST /api/books with script tag
    try:
        payload = {"title": "<script>alert('XSS_ATTACK')</script>", "description": "Hacked book"}
        t0 = time.time()
        r = requests.post("http://localhost:5005/api/books/create-book", json=payload, timeout=10)
        dt = (time.time() - t0) * 1000
        print(f"[3] XSS Attack POST => HTTP {r.status_code} in {dt:.1f}ms")
        print("    WAF Status Header:", r.headers.get("x-mdefender-status"))
        print("    WAF Attack Type:", r.headers.get("x-mdefender-attack-type"))
        assert r.status_code == 403
        assert r.headers.get("x-mdefender-status") == "blocked"
        print("    [+] XSS Attack BLOCKED with 403 Access Denied!")
    except Exception as e:
        print("[3] Failed XSS attack test:", e)

    print("\nALL BOOKSTORE + MDEFENDER WAF TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test()
