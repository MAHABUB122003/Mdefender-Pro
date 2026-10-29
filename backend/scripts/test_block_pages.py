import requests

# 1. Test Country Block with country_test=FR (FR is blocked)
res_country = requests.get('http://localhost/mahabub/?country_test=FR')
print(f"Country block test (FR): HTTP {res_country.status_code}")
has_geo_badge = 'GeoIP Country Restriction' in res_country.text
has_geo_title = 'Geographic Restriction' in res_country.text
has_ref_id = 'Reference ID' in res_country.text
print(f"Country block renders GeoIP badge: {has_geo_badge}, Title: {has_geo_title}, Reference ID: {has_ref_id}")

# 2. Test IP Blacklist with test_ip=198.51.100.44 (this IP is blacklisted)
res_ip = requests.get('http://localhost/mahabub/?test_ip=198.51.100.44')
print(f"\nIP Blacklist test (198.51.100.44): HTTP {res_ip.status_code}")
has_ip_badge = 'IP Blacklist Policy' in res_ip.text
has_ip_title = 'IP Blacklisted' in res_ip.text
has_ref_id_ip = 'Reference ID' in res_ip.text
print(f"IP blacklist renders IP Blacklist badge: {has_ip_badge}, Title: {has_ip_title}, Reference ID: {has_ref_id_ip}")

# 3. Test Attack Block with malicious script
res_attack = requests.get('http://localhost/mahabub/?waf_test=<script>alert("hack")</script>')
print(f"\nMalicious Attack test: HTTP {res_attack.status_code}")
has_xss = 'XSS' in res_attack.text or 'Script Tag' in res_attack.text or 'Access Denied' in res_attack.text
print(f"Attack renders Threat Blocked page: {has_xss}")
