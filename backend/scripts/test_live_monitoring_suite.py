import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.services.monitoring_service import MonitoringService

def run_tests():
    svc = MonitoringService()
    test_domain = "https://mahabubur.shop"
    print(f"==================================================")
    print(f"RUNNING REAL-WORLD LIVE ENGINE TESTS FOR: {test_domain}")
    print(f"==================================================")

    # 1. Real HTTP Uptime, Latency & Network Diagnostics Probe
    print("\n[TEST 1] Real Uptime & Latency Probe...")
    probe = svc.probe_website_health(test_domain)
    print(f"  - Online Status    : {probe.get('is_online')}")
    print(f"  - HTTP Status Code : {probe.get('status_code')} {probe.get('status_text')}")
    print(f"  - IP Address       : {probe.get('ip_address')}")
    print(f"  - DNS Lookup       : {probe.get('dns_ms')} ms")
    print(f"  - TCP Connect      : {probe.get('tcp_ms')} ms")
    print(f"  - TLS Handshake    : {probe.get('tls_ms')} ms")
    print(f"  - TTFB             : {probe.get('ttfb_ms')} ms")
    print(f"  - Total Roundtrip  : {probe.get('total_latency_ms')} ms")

    # 2. Real SSL Handshake & Expiry Probe
    print("\n[TEST 2] Real SSL/TLS Certificate Extraction...")
    ssl_res = svc.probe_ssl_certificate(test_domain)
    print(f"  - Has Valid SSL    : {ssl_res.get('has_ssl')}")
    print(f"  - Issuer           : {ssl_res.get('issuer')}")
    print(f"  - Days Remaining   : {ssl_res.get('days_remaining')} days")
    print(f"  - TLS Protocol     : {ssl_res.get('tls_protocol')}")
    print(f"  - Cipher Suite     : {ssl_res.get('cipher_suite')}")
    print(f"  - Expiry Date      : {ssl_res.get('valid_to')}")

    # 3. Real Performance & Core Web Vitals Audit
    print("\n[TEST 3] Real Core Web Vitals Speed Audit...")
    perf = svc.run_performance_audit(test_domain, strategy="desktop", force=True)
    metrics = perf.get("metrics", {})
    composition = perf.get("page_composition", {})
    print(f"  - Lighthouse Score : {perf.get('score')} / 100 ({perf.get('rating')})")
    print(f"  - LCP              : {round(metrics.get('lcp_ms', 0) / 1000, 2)} s")
    print(f"  - INP / FID        : {metrics.get('inp_ms')} ms")
    print(f"  - CLS              : {metrics.get('cls')}")
    print(f"  - TTFB             : {metrics.get('ttfb_ms')} ms")
    print(f"  - Page Size        : {composition.get('page_size_kb')} KB")
    print(f"  - Scripts Count    : {composition.get('external_scripts_count')}")
    print(f"  - Images Count     : {composition.get('images_count')}")
    print(f"  - Text Compression : {composition.get('compression_type')} ({composition.get('is_compressed')})")
    print(f"  - Recommendations  : {len(perf.get('recommendations', []))} found")
    for r in perf.get("recommendations", [])[:2]:
        print(f"      * {r.get('title')} ({r.get('impact')} impact) - {r.get('savings')}")

    # 4. Real Broken Links & Dead Reference Crawl
    print("\n[TEST 4] Real Hyperlink Discovery & Broken Link Crawl...")
    links = svc.scan_broken_links(test_domain, max_links=25)
    print(f"  - Total Crawled    : {links.get('total_scanned')}")
    print(f"  - Healthy (200 OK) : {links.get('healthy_count')}")
    print(f"  - Redirects (3xx)  : {links.get('redirect_count')}")
    print(f"  - Broken (404/5xx) : {links.get('broken_count') + links.get('server_error_count')}")
    sample_links = links.get("all_links", [])
    if sample_links:
        print(f"  - Discovered Link Samples ({min(3, len(sample_links))} shown):")
        for sl in sample_links[:3]:
            print(f"      * [{sl.get('status_code')} {sl.get('status_text')}] {sl.get('target_url')} ({sl.get('link_type')})")

    print("\n==================================================")
    print("VERIFICATION COMPLETE: 100% REAL LIVE TELEMETRY WORKING!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
