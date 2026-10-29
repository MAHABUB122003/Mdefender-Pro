import requests
import urllib3
urllib3.disable_warnings()

site_url = "https://mahabubur.shop"
site_key = "j0Yha3keHkO3_gZn7a5bv3IdMjzly_hmB2PpY1XZ1kInlqdjfqN_GQe58b5iX-5p"
headers = {
    'Authorization': f'Bearer {site_key}',
    'X-API-Key': site_key,
    'User-Agent': 'MDefender-Cloud/2.0'
}

try:
    res = requests.get(f"{site_url}/?waf_cloud_sync=1&action=get_country_blocks", headers=headers, timeout=5, verify=False)
    print("Status:", res.status_code)
    print("Body:", res.text[:500])
except Exception as e:
    print("Error:", e)

