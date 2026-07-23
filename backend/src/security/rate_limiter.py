import time
from collections import defaultdict

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = 100
        self.window_seconds = 60

    def is_rate_limited(self, ip):
        now = time.time()
        window_start = now - self.window_seconds
        if ip in self.requests:
            self.requests[ip] = [t for t in self.requests[ip] if t > window_start]
        if len(self.requests.get(ip, [])) >= self.max_requests:
            return True
        return False

    def increment(self, ip):
        self.requests[ip].append(time.time())

    def get_count(self, ip):
        now = time.time()
        window_start = now - self.window_seconds
        if ip in self.requests:
            self.requests[ip] = [t for t in self.requests[ip] if t > window_start]
        return len(self.requests.get(ip, []))

    def set_limit(self, max_requests):
        self.max_requests = max_requests

    def reset(self, ip=None):
        if ip:
            self.requests.pop(ip, None)
        else:
            self.requests.clear()
