"""
==============================================================================
MDefender Pro — Enterprise Load Balancing & Stress Testing Suite
==============================================================================
Tests MDefender Pro under concurrent load:
  1. Baseline Throughput (FastAPI core concurrency & connection handling)
  2. Clean Visitor Load (WAF inspection pipeline under concurrent clean traffic)
  3. Attack Vector Flood (Concurrent SQLi, XSS, RCE, Traversal detection under load)
  4. DDoS & Rate-Limiting Defense (Burst attack mitigation & progressive blocking)
  5. Concurrency Ramp-Up (Stress-to-saturation curve)

Usage:
  python mdefender_load_test.py [--scenario all|baseline|clean|attacks|ddos|ramp]
                                [--target http://127.0.0.1:8000]
                                [--concurrency 50]
                                [--requests 500]
==============================================================================
"""

import sys
import os
import time
import asyncio
import argparse
import random
import statistics
from typing import List, Dict, Any, Tuple

try:
    import aiohttp
except ImportError:
    print("[!] aiohttp is required. Please install it with: pip install aiohttp")
    sys.exit(1)

# Common Attack Payloads for Load Testing
ATTACK_PAYLOADS = [
    ("/?id=1%27%20OR%201=1--", "SQL Injection (Classic OR 1=1)"),
    ("/?query=UNION%20SELECT%20null,username,password%20FROM%20users--", "SQL Injection (UNION SELECT)"),
    ("/?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E", "Reflected XSS (<script>)"),
    ("/?name=%3Csvg/onload=alert(1)%3E", "XSS (SVG onload)"),
    ("/?file=../../../../etc/passwd", "Path Traversal (etc/passwd)"),
    ("/?doc=..\\..\\..\\windows\\system.ini", "Path Traversal (Windows)"),
    ("/?exec=cat%20/etc/shadow", "Command Injection (cat /etc/shadow)"),
    ("/?cmd=%7C%20id", "Command Injection (pipe id)"),
    ("/wp-config.php.bak", "Sensitive File Disclosure (wp-config)"),
    ("/.env", "Environment File Exposure (.env)"),
    ("/xmlrpc.php", "WordPress Brute Force Vector (xmlrpc)"),
]

CLEAN_PATHS = [
    ("/", "Homepage"),
    ("/about-us/", "About Page"),
    ("/contact/", "Contact Page"),
    ("/blog/latest-security-trends/", "Blog Post"),
    ("/shop/category/software/", "Catalog Category"),
    ("/wp-content/themes/twentytwentyfour/style.css", "Static Asset CSS"),
]

class LoadTestReport:
    def __init__(self, name: str):
        self.name = name
        self.total_requests = 0
        self.successful_requests = 0
        self.blocked_requests = 0
        self.rate_limited_requests = 0
        self.failed_requests = 0
        self.status_codes: Dict[int, int] = {}
        self.latencies: List[float] = []
        self.waf_eval_times: List[float] = []
        self.start_time = 0.0
        self.end_time = 0.0

    def start(self):
        self.start_time = time.perf_counter()

    def stop(self):
        self.end_time = time.perf_counter()

    def record(self, status: int, latency_ms: float, waf_eval_ms: float = 0.0):
        self.total_requests += 1
        self.status_codes[status] = self.status_codes.get(status, 0) + 1
        self.latencies.append(latency_ms)
        if waf_eval_ms > 0:
            self.waf_eval_times.append(waf_eval_ms)

        if status in (200, 301, 302, 304):
            self.successful_requests += 1
        elif status in (403, 502):
            self.blocked_requests += 1
        elif status == 429:
            self.rate_limited_requests += 1
        elif 400 <= status < 500:
            self.successful_requests += 1  # Expected client-side status (e.g. 401/404 handled gracefully)
        else:
            self.failed_requests += 1

    def print_summary(self):
        duration = max(0.001, self.end_time - self.start_time)
        rps = self.total_requests / duration
        self.latencies.sort()

        print("\n" + "=" * 70)
        print(f"📊 BENCHMARK REPORT: {self.name.upper()}")
        print("=" * 70)
        print(f"Total Completed:   {self.total_requests:,} requests in {duration:.2f}s")
        print(f"Throughput:        {rps:,.1f} requests/sec (RPS)")
        print(f"Status Breakdown:  2xx/3xx={self.successful_requests} | 403 Blocked={self.blocked_requests} | 429 RateLimit={self.rate_limited_requests} | Errors={self.failed_requests}")
        print(f"Status Codes:      {dict(sorted(self.status_codes.items()))}")

        if self.latencies:
            p50 = self.latencies[int(len(self.latencies) * 0.50)]
            p90 = self.latencies[int(len(self.latencies) * 0.90)]
            p95 = self.latencies[int(len(self.latencies) * 0.95)]
            p99 = self.latencies[int(len(self.latencies) * 0.99)] if len(self.latencies) >= 100 else self.latencies[-1]
            avg = statistics.mean(self.latencies)
            min_l = min(self.latencies)
            max_l = max(self.latencies)

            print("-" * 70)
            print("⏱️  LATENCY DISTRIBUTION (End-to-End):")
            print(f"  Min:   {min_l:6.2f} ms")
            print(f"  Avg:   {avg:6.2f} ms")
            print(f"  p50:   {p50:6.2f} ms (Median)")
            print(f"  p90:   {p90:6.2f} ms")
            print(f"  p95:   {p95:6.2f} ms")
            print(f"  p99:   {p99:6.2f} ms")
            print(f"  Max:   {max_l:6.2f} ms")

        if self.waf_eval_times:
            self.waf_eval_times.sort()
            avg_waf = statistics.mean(self.waf_eval_times)
            p95_waf = self.waf_eval_times[int(len(self.waf_eval_times) * 0.95)]
            print("-" * 70)
            print(f"🛡️  WAF ENGINE INLINE EVALUATION SPEED ({len(self.waf_eval_times)} samples):")
            print(f"  Avg WAF Eval:  {avg_waf:.2f} ms")
            print(f"  p95 WAF Eval:  {p95_waf:.2f} ms")
            print(f"  Min / Max:     {min(self.waf_eval_times):.2f} ms / {max(self.waf_eval_times):.2f} ms")
        print("=" * 70 + "\n")


class MDefenderLoadTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8000", host_header: str = "mahabubur.shop"):
        self.base_url = base_url.rstrip("/")
        self.host_header = host_header

    def _parse_waf_eval_header(self, headers: aiohttp.typedefs.LooseHeaders) -> float:
        val = headers.get("x-waf-eval-time", "")
        if val.endswith("ms"):
            try:
                return float(val[:-2])
            except ValueError:
                pass
        return 0.0

    async def run_scenario_baseline(self, concurrency: int = 50, total_requests: int = 500) -> LoadTestReport:
        """Scenario 1: Baseline Concurrent Throughput against core endpoints."""
        report = LoadTestReport(f"1. Baseline Core API Throughput ({concurrency} workers, {total_requests} reqs)")
        print(f"\n[+] Starting Scenario 1: Baseline Core Concurrency ({concurrency} concurrent connections)...")

        connector = aiohttp.TCPConnector(limit=concurrency * 2, ttl_dns_cache=300, resolver=aiohttp.ThreadedResolver())
        timeout = aiohttp.ClientTimeout(total=15)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            queue = asyncio.Queue()
            for _ in range(total_requests):
                queue.put_nowait("/docs")

            report.start()

            async def worker():
                while not queue.empty():
                    try:
                        path = queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                    t0 = time.perf_counter()
                    try:
                        async with session.get(f"{self.base_url}{path}") as resp:
                            await resp.read()
                            latency = (time.perf_counter() - t0) * 1000
                            report.record(resp.status, latency)
                    except Exception as e:
                        latency = (time.perf_counter() - t0) * 1000
                        report.record(599, latency)
                    finally:
                        queue.task_done()

            workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
            await queue.join()
            for w in workers:
                w.cancel()
            report.stop()

        report.print_summary()
        return report

    async def run_scenario_clean_traffic(self, concurrency: int = 30, total_requests: int = 300) -> LoadTestReport:
        """Scenario 2: Real-World Clean Visitor Load with WAF inspection & simulated IPs."""
        report = LoadTestReport(f"2. Clean Visitor Load with WAF Inspection ({concurrency} workers, {total_requests} reqs)")
        print(f"\n[+] Starting Scenario 2: Clean Traffic with WAF Inspection ({concurrency} workers)...")

        connector = aiohttp.TCPConnector(limit=concurrency * 2, ttl_dns_cache=300, resolver=aiohttp.ThreadedResolver())
        timeout = aiohttp.ClientTimeout(total=20)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            queue = asyncio.Queue()
            for _ in range(total_requests):
                path, desc = random.choice(CLEAN_PATHS)
                ip = f"198.51.{random.randint(10, 99)}.{random.randint(2, 250)}"
                queue.put_nowait((path, ip))

            report.start()

            async def worker():
                while not queue.empty():
                    try:
                        path, client_ip = queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                    t0 = time.perf_counter()
                    headers = {
                        "Host": self.host_header,
                        "X-Forwarded-For": client_ip,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }
                    try:
                        async with session.get(f"{self.base_url}{path}", headers=headers) as resp:
                            await resp.read()
                            latency = (time.perf_counter() - t0) * 1000
                            waf_ms = self._parse_waf_eval_header(resp.headers)
                            report.record(resp.status, latency, waf_ms)
                    except Exception:
                        latency = (time.perf_counter() - t0) * 1000
                        report.record(599, latency)
                    finally:
                        queue.task_done()

            workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
            await queue.join()
            for w in workers:
                w.cancel()
            report.stop()

        report.print_summary()
        return report

    async def run_scenario_attack_flood(self, concurrency: int = 50, total_requests: int = 500) -> LoadTestReport:
        """Scenario 3: Multi-Vector Malicious Attack Flood (SQLi, XSS, RCE, Traversal)."""
        report = LoadTestReport(f"3. Multi-Vector Cyber Attack Flood ({concurrency} workers, {total_requests} reqs)")
        print(f"\n[+] Starting Scenario 3: Attack Flood Stress Test (Expecting ~100% 403 Forbidden)...")

        connector = aiohttp.TCPConnector(limit=concurrency * 2, ttl_dns_cache=300, resolver=aiohttp.ThreadedResolver())
        timeout = aiohttp.ClientTimeout(total=20)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            queue = asyncio.Queue()
            for _ in range(total_requests):
                payload_path, attack_name = random.choice(ATTACK_PAYLOADS)
                attacker_ip = f"198.51.{random.randint(100, 200)}.{random.randint(2, 250)}"
                queue.put_nowait((payload_path, attacker_ip))

            report.start()

            async def worker():
                while not queue.empty():
                    try:
                        path, client_ip = queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                    t0 = time.perf_counter()
                    headers = {
                        "Host": self.host_header,
                        "X-Forwarded-For": client_ip,
                        "User-Agent": "Mozilla/5.0 (Security Scanner Bot v3)",
                        "Accept": "*/*"
                    }
                    try:
                        async with session.get(f"{self.base_url}{path}", headers=headers) as resp:
                            await resp.read()
                            latency = (time.perf_counter() - t0) * 1000
                            waf_ms = self._parse_waf_eval_header(resp.headers)
                            report.record(resp.status, latency, waf_ms)
                    except Exception:
                        latency = (time.perf_counter() - t0) * 1000
                        report.record(599, latency)
                    finally:
                        queue.task_done()

            workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
            await queue.join()
            for w in workers:
                w.cancel()
            report.stop()

        report.print_summary()
        return report

    async def run_scenario_ddos_burst(self, concurrency: int = 40, total_requests: int = 400) -> LoadTestReport:
        """Scenario 4: DDoS Burst from a Single Attacker IP to test rate-limiting / blocking."""
        report = LoadTestReport(f"4. Single Attacker DDoS Burst Mitigation ({concurrency} workers, {total_requests} reqs)")
        single_attacker_ip = "203.0.113.88"
        print(f"\n[+] Starting Scenario 4: DDoS Burst from target IP {single_attacker_ip}...")

        connector = aiohttp.TCPConnector(limit=concurrency * 2, ttl_dns_cache=300, resolver=aiohttp.ThreadedResolver())
        timeout = aiohttp.ClientTimeout(total=15)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            queue = asyncio.Queue()
            for i in range(total_requests):
                queue.put_nowait(f"/api/test-flood-{i % 5}")

            report.start()

            async def worker():
                while not queue.empty():
                    try:
                        path = queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                    t0 = time.perf_counter()
                    headers = {
                        "Host": self.host_header,
                        "X-Forwarded-For": single_attacker_ip,
                        "User-Agent": "MassiveFloodBot/1.0"
                    }
                    try:
                        async with session.get(f"{self.base_url}{path}", headers=headers) as resp:
                            await resp.read()
                            latency = (time.perf_counter() - t0) * 1000
                            report.record(resp.status, latency)
                    except Exception:
                        latency = (time.perf_counter() - t0) * 1000
                        report.record(599, latency)
                    finally:
                        queue.task_done()

            workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
            await queue.join()
            for w in workers:
                w.cancel()
            report.stop()

        report.print_summary()
        return report

    async def run_scenario_ramp_up(self) -> List[Tuple[int, float, float]]:
        """Scenario 5: Concurrency Ramp-Up Stress Test (10 -> 25 -> 50 -> 100 workers)."""
        print("\n" + "=" * 70)
        print("📈 SCENARIO 5: CONCURRENCY RAMP-UP (FINDING PEAK THROUGHPUT)")
        print("=" * 70)

        concurrency_levels = [10, 25, 50, 100]
        results = []

        print(f"{'Concurrency':<15} | {'Requests':<10} | {'Throughput (RPS)':<20} | {'p50 Latency':<15} | {'p95 Latency':<15}")
        print("-" * 80)

        for c in concurrency_levels:
            reqs = c * 10
            connector = aiohttp.TCPConnector(limit=c * 2, resolver=aiohttp.ThreadedResolver())
            timeout = aiohttp.ClientTimeout(total=15)
            latencies = []
            queue = asyncio.Queue()
            for _ in range(reqs):
                queue.put_nowait("/docs")

            t0 = time.perf_counter()
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                async def worker():
                    while not queue.empty():
                        try:
                            path = queue.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                        w_t0 = time.perf_counter()
                        try:
                            async with session.get(f"{self.base_url}{path}") as resp:
                                await resp.read()
                                latencies.append((time.perf_counter() - w_t0) * 1000)
                        except Exception:
                            latencies.append((time.perf_counter() - w_t0) * 1000)
                        finally:
                            queue.task_done()

                workers = [asyncio.create_task(worker()) for _ in range(c)]
                await queue.join()
                for w in workers:
                    w.cancel()

            duration = max(0.001, time.perf_counter() - t0)
            rps = reqs / duration
            latencies.sort()
            p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0.0
            p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0

            results.append((c, rps, p50))
            print(f"{c:<15} | {reqs:<10} | {rps:>16.1f} req/s | {p50:>12.2f} ms | {p95:>12.2f} ms")

        print("=" * 80 + "\n")
        return results


async def main_async():
    parser = argparse.ArgumentParser(description="MDefender Pro Load Balancing & Stress Testing Suite")
    parser.add_argument("--scenario", choices=["all", "baseline", "clean", "attacks", "ddos", "ramp"], default="all")
    parser.add_argument("--target", default="http://127.0.0.1:8000", help="Target base URL (default: http://127.0.0.1:8000)")
    parser.add_argument("--host", default="mahabubur.shop", help="Target Host header (default: mahabubur.shop)")
    parser.add_argument("--concurrency", type=int, default=50, help="Concurrency workers (default: 50)")
    parser.add_argument("--requests", type=int, default=500, help="Total requests per test (default: 500)")
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("🛡️  MDEFENDER PRO — ADVANCED LOAD & STRESS TESTING SUITE")
    print(f"Target:        {args.target}")
    print(f"Domain Host:   {args.host}")
    print(f"Concurrency:   {args.concurrency} concurrent workers")
    print(f"Requests:      {args.requests} per scenario")
    print("=" * 70)

    tester = MDefenderLoadTester(base_url=args.target, host_header=args.host)

    if args.scenario in ("all", "baseline"):
        await tester.run_scenario_baseline(concurrency=args.concurrency, total_requests=args.requests)

    if args.scenario in ("all", "attacks"):
        await tester.run_scenario_attack_flood(concurrency=args.concurrency, total_requests=args.requests)

    if args.scenario in ("all", "clean"):
        # Use slightly lower concurrency for clean to avoid overwhelming remote origin
        clean_conc = min(args.concurrency, 25)
        clean_reqs = min(args.requests, 250)
        await tester.run_scenario_clean_traffic(concurrency=clean_conc, total_requests=clean_reqs)

    if args.scenario in ("all", "ddos"):
        await tester.run_scenario_ddos_burst(concurrency=args.concurrency, total_requests=args.requests)

    if args.scenario in ("all", "ramp"):
        await tester.run_scenario_ramp_up()

    print("\n[+] All requested load testing scenarios completed successfully.")


if __name__ == "__main__":
    asyncio.run(main_async())
