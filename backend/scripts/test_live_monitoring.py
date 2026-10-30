import sys
import os

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from src.database.mongodb_connection import MongoDB
from src.services.monitoring_service import MonitoringService

def main():
    db = MongoDB()
    svc = MonitoringService()

    site = db.websites.find_one({"domain": "mahabubur.shop"})
    if not site:
        site = db.websites.find_one({"name": {"$regex": "mahabub", "$options": "i"}})

    if not site:
        print("Site not found in DB")
        return

    print("=" * 60)
    print(f"Target Origin: {site.get('domain')} ({site.get('url')})")
    print("=" * 60)

    # 1. Live Health Probe
    probe = svc.probe_website_health(site)
    print("\n[1. LIVE HEALTH PROBE]")
    print(f"  Online:         {probe['is_online']}")
    print(f"  Status Code:    {probe['status_code']} ({probe['status_text']})")
    print(f"  DNS Latency:    {probe['dns_latency_ms']} ms")
    print(f"  TCP Latency:    {probe['tcp_latency_ms']} ms")
    print(f"  TLS Handshake:  {probe['tls_handshake_ms']} ms")
    print(f"  TTFB:           {probe['ttfb_ms']} ms")
    print(f"  Total Latency:  {probe['total_latency_ms']} ms")
    print(f"  IP Address:     {probe['ip_address']}")
    print(f"  Compression:    {probe['compression']}")

    # 2. Live SSL / TLS Handshake
    ssl_res = svc.probe_ssl_certificate(site)
    print("\n[2. SSL / TLS CERTIFICATE LIFECYCLE]")
    print(f"  Has SSL:        {ssl_res['has_ssl']}")
    print(f"  Common Name:    {ssl_res['common_name']}")
    print(f"  Issuer:         {ssl_res['issuer']}")
    print(f"  Days Left:      {ssl_res['days_remaining']} days")
    print(f"  Expires:        {ssl_res['valid_to']}")
    print(f"  TLS Protocol:   {ssl_res['tls_protocol']}")
    print(f"  Cipher Suite:   {ssl_res['cipher_suite']}")
    print(f"  Security Grade: {ssl_res['grade']}")

    # 3. Desktop Performance Audit
    perf_d = svc.run_performance_audit(site, strategy="desktop", force=True)
    print("\n[3. DESKTOP CORE WEB VITALS AUDIT]")
    print(f"  Score:          {perf_d['score']} / 100 ({perf_d['rating']})")
    print(f"  Grade:          {perf_d['grade']}")
    print(f"  TTFB:           {perf_d['metrics']['ttfb_ms']} ms")
    print(f"  FCP:            {perf_d['metrics']['fcp_ms']} ms")
    print(f"  LCP:            {perf_d['metrics']['lcp_ms']} ms")
    print(f"  CLS:            {perf_d['metrics']['cls']}")
    print(f"  HTML Size:      {perf_d['page_composition']['page_size_kb']} KB")
    print(f"  Recommendations ({len(perf_d['recommendations'])}):")
    for r in perf_d['recommendations']:
        print(f"    - [{r['impact']}] {r['title']}: {r['savings']}")

    # 4. Mobile Performance Audit
    perf_m = svc.run_performance_audit(site, strategy="mobile", force=True)
    print("\n[4. MOBILE CORE WEB VITALS AUDIT]")
    print(f"  Score:          {perf_m['score']} / 100 ({perf_m['rating']})")
    print(f"  Grade:          {perf_m['grade']}")
    print(f"  TTFB:           {perf_m['metrics']['ttfb_ms']} ms")
    print(f"  FCP:            {perf_m['metrics']['fcp_ms']} ms")
    print(f"  LCP:            {perf_m['metrics']['lcp_ms']} ms")
    print(f"  CLS:            {perf_m['metrics']['cls']}")

    print("\n" + "=" * 60)
    print("ALL 4 REAL TELEMETRY TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()

