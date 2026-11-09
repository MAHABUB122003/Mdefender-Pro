import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from src.database.mongodb_connection import MongoDB

def sync_site_keys():
    db = MongoDB()
    # Get active credentials from localhost website (which is active in XAMPP)
    local_site = db.websites.find_one({"_id": "eab7dc9f-316b-4a72-a71c-7c0a97a55fba"})
    if not local_site:
        print("[-] local_site not found")
        return

    api_key = local_site.get("api_key")
    site_token = local_site.get("site_token")
    url = local_site.get("url")
    print(f"Active XAMPP WP keys -> api_key: {api_key[:20]}..., site_token: {site_token}, url: {url}")

    # Update site_demo_1 (mahabub.shop) with the valid keys
    res = db.websites.update_one(
        {"_id": "site_demo_1"},
        {"$set": {
            "api_key": api_key,
            "site_token": site_token,
            "url": url,
            "wordpress_connection.api_key": api_key,
            "wordpress_connection.site_token": site_token,
            "wordpress_connection.url": url
        }}
    )
    print(f"[+] Updated site_demo_1: matched {res.matched_count}, modified {res.modified_count}")

if __name__ == "__main__":
    sync_site_keys()

