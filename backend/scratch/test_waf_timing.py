import requests
import time

def test():
    api_key = "Ix2TtXbbBHJolIam3MYLui0jphKy9oRvF_D3AJjY1tO8MGfWU-NCQzvDuwc_6Dri"
    payload = {
        "domain": "bookstore.local",
        "request": {
            "method": "GET",
            "url": "/api/books",
            "query_string": "",
            "query_params": {},
            "ip": "127.0.0.1",
            "headers": {"host": "localhost:5005"},
            "body": ""
        }
    }
    
    for i in range(3):
        t0 = time.time()
        r = requests.post(
            "http://127.0.0.1:8000/api/analyze",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10
        )
        dt = (time.time() - t0) * 1000
        print(f"Request {i+1}: Status {r.status_code} in {dt:.1f}ms - Decision: {r.json().get('status')}")

if __name__ == "__main__":
    test()
