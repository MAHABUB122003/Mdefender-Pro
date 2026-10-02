import time
from collections import defaultdict

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = 120
        self.window_seconds = 60

    def is_rate_limited(self, ip, max_requests=None, window_seconds=None):
        if not ip:
            return False
        now = time.time()
        win = window_seconds or self.window_seconds
        limit = max_requests if max_requests is not None else self.max_requests
        window_start = now - win
        if ip in self.requests:
            self.requests[ip] = [t for t in self.requests[ip] if t > window_start]
        if len(self.requests.get(ip, [])) >= limit:
            return True
        return False

    def increment(self, ip):
        if not ip:
            return
        self.requests[ip].append(time.time())

    def get_count(self, ip, window_seconds=None):
        if not ip or ip not in self.requests:
            return 0
        now = time.time()
        win = window_seconds or self.window_seconds
        window_start = now - win
        self.requests[ip] = [t for t in self.requests[ip] if t > window_start]
        return len(self.requests[ip])

    def set_limit(self, max_requests):
        self.max_requests = max_requests

    def reset(self, ip=None):
        if ip:
            self.requests.pop(ip, None)
        else:
            self.requests.clear()

