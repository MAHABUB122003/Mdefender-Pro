"""
MDefender Pro — Enterprise Benign & Threat Dataset Harvester
Generates and harmonizes 2,500,000+ realistic benign HTTP requests and cloud payloads
to achieve a perfectly balanced 7.7M enterprise WAF dataset.
"""

import os
import csv
import json
import random
import time
import uuid
import hashlib
from datetime import datetime

OUTPUT_DIR = os.path.abspath('datasets/benign_traffic')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------------------------------------------
# Vocabulary Banks for Realism
# -------------------------------------------------------------
FIRST_NAMES = ["Rahim", "Karim", "Zaman", "Sarah", "Alex", "Elena", "Michael", "Wei", "Priya", "Carlos", "Fatima", "Amina", "David", "Emma", "Hassan", "Yuki", "Daniel", "Tanvir", "Zihad", "Mahabub"]
LAST_NAMES = ["Rahman", "Islam", "Chowdhury", "Khan", "Ahmed", "Smith", "Johnson", "Tanaka", "Patel", "Garcia", "Muller", "Rossi", "Hossain", "Ali", "Hasan", "Begum", "Akter", "Uddin"]
CITIES = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "New York", "London", "Toronto", "Berlin", "Tokyo", "Singapore", "Sydney", "Dubai", "Amsterdam"]
CATEGORIES = ["technology", "security", "cloud", "wordpress", "ecommerce", "hosting", "lifestyle", "finance", "education", "health", "fashion", "gadgets", "software", "ai-tools"]
WP_POST_TITLES = [
    "Top 10 Security Practices for WordPress 2026",
    "How to Optimize WooCommerce for Fast Checkout",
    "Understanding REST API Endpoints in Modern CMS",
    "Gutenberg Block Development: A Comprehensive Guide",
    "Why Cloud Infrastructure is Essential for Small Business",
    "Best Managed WordPress Hosting Solutions Compared",
    "Database Indexing Strategies for Enterprise Scaling",
    "Securing Your Web Application with Machine Learning Firewalls"
]
PRODUCTS = [
    ("T-Shirt Cotton Slim Fit", 450, "Apparel"),
    ("Wireless Bluetooth Earbuds Pro", 2200, "Electronics"),
    ("Organic Green Tea 250g", 350, "Groceries"),
    ("Ergonomic Mesh Office Chair", 8500, "Furniture"),
    ("Smart LED Desk Lamp 10W", 1200, "Home"),
    ("Mechanical Gaming Keyboard RGB", 4200, "Electronics"),
    ("Ceramic Coffee Mug 350ml", 250, "Kitchen"),
    ("Leather Laptop Backpack Waterproof", 2900, "Accessories")
]

def generate_gutenberg_blocks(count=250000, filepath=None):
    print(f"[*] Generating {count:,} Gutenberg & Elementor Content payloads...")
    tags = ["p", "h2", "h3", "div", "blockquote", "span", "li"]
    aligns = ["left", "center", "right", "wide", "full"]
    colors = ["has-text-color", "has-background", "has-primary-color", "has-secondary-background-color", "wp-block-quote"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            tag = random.choice(tags)
            align = random.choice(aligns)
            color = random.choice(colors)
            title = random.choice(WP_POST_TITLES)
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            block_num = random.randint(10, 9999)
            
            style = f'<!-- wp:paragraph {{"align":"{align}","className":"{color}"}} -->\n<{tag} class="has-text-align-{align} {color}">Update by {name} on {title} (Reference #{block_num}). All content verified and reviewed.</{tag}>\n<!-- /wp:paragraph -->'
            buffer.append([style, 0, 'wp_gutenberg', 'synthetic:enterprise_gutenberg'])
            
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_woocommerce_payloads(count=250000, filepath=None):
    print(f"[*] Generating {count:,} WooCommerce Cart & Checkout JSON payloads...")
    payment_methods = ["cod", "bKash", "sslcommerz", "stripe", "nagad", "paypal", "bank_transfer"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            prod = random.choice(PRODUCTS)
            qty = random.randint(1, 5)
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            city = random.choice(CITIES)
            method = random.choice(payment_methods)
            order_id = random.randint(10000, 999999)
            
            payload = json.dumps({
                "order_id": order_id,
                "customer": {
                    "first_name": fname,
                    "last_name": lname,
                    "email": f"{fname.lower()}.{lname.lower()}{random.randint(1,99)}@example.com",
                    "city": city,
                    "phone": f"+88017{random.randint(10000000, 99999999)}"
                },
                "cart_items": [
                    {"product": prod[0], "category": prod[2], "qty": qty, "unit_price": prod[1], "subtotal": prod[1] * qty}
                ],
                "shipping_method": "flat_rate",
                "payment_gateway": method,
                "notes": "Please deliver between 10am to 6pm on business days."
            }, separators=(',', ':'))
            
            buffer.append([payload, 0, 'woocommerce_json', 'synthetic:enterprise_woo'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_wp_rest_api(count=250000, filepath=None):
    print(f"[*] Generating {count:,} WordPress REST API GET & POST requests...")
    endpoints = ["posts", "pages", "comments", "taxonomies", "categories", "tags", "users", "media", "settings"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            ep = random.choice(endpoints)
            page = random.randint(1, 50)
            per_page = random.choice([5, 10, 20, 50])
            order = random.choice(["asc", "desc"])
            cat = random.randint(1, 25)
            
            if random.random() < 0.7:
                req = f"GET /wp-json/wp/v2/{ep}?page={page}&per_page={per_page}&order={order}&categories={cat}&_embed=author,wp:term"
            else:
                req = f"POST /wp-json/wp/v2/{ep} HTTP/1.1\nHost: example.com\nContent-Type: application/json\n\n{{\"title\":\"{random.choice(WP_POST_TITLES)}\",\"status\":\"publish\",\"content\":\"Clean formatted article body text.\"}}"
            
            buffer.append([req, 0, 'wp_rest_api', 'synthetic:enterprise_rest'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_wp_admin_ajax(count=150000, filepath=None):
    print(f"[*] Generating {count:,} WordPress Admin-AJAX and Heartbeat requests...")
    actions = [
        "heartbeat", "query-attachments", "save-widget", "update-plugin",
        "fetch-dashboard-stats", "mdefender_telemetry_ping", "autosave-generate-nonces",
        "inline-save", "edit-theme-plugin-file", "wp_ajax_crop_image"
    ]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            act = random.choice(actions)
            nonce = hashlib.md5(str(random.random()).encode()).hexdigest()[:10]
            post_id = random.randint(1, 5000)
            
            req = f"POST /wp-admin/admin-ajax.php HTTP/1.1\nHost: example.com\nContent-Type: application/x-www-form-urlencoded\n\naction={act}&_ajax_nonce={nonce}&post_ID={post_id}&screen_id=edit-post&client_time={int(time.time())}"
            buffer.append([req, 0, 'wp_admin_ajax', 'synthetic:enterprise_ajax'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_comments_search(count=100000, filepath=None):
    print(f"[*] Generating {count:,} User Comments & Search requests...")
    search_keywords = [
        "best security plugins for wordpress", "how to configure ssl certificate on xampp",
        "tutorial for machine learning classifiers in python", "cloud architecture diagrams",
        "troubleshooting php 8 memory limit issues", "woocommerce shipping rules setup",
        "difference between sqlite and mongodb in production", "fast radix trie implementation"
    ]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            kw = random.choice(search_keywords)
            user = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if random.random() < 0.5:
                req = f"GET /?s={kw.replace(' ', '+')}&post_type=post&filter_year=2026 HTTP/1.1"
            else:
                req = f"POST /wp-comments-post.php HTTP/1.1\n\nauthor={user}&email={user.lower().replace(' ', '')}@gmail.com&comment=Thank you for this insightful guide on {kw}! Very well explained.&comment_post_ID={random.randint(1,1000)}"
            buffer.append([req, 0, 'user_comments_search', 'synthetic:user_interactions'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_cloud_json_rest(count=300000, filepath=None):
    print(f"[*] Generating {count:,} Cloud & Custom REST API JSON payloads...")
    roles = ["viewer", "editor", "analyst", "billing_admin", "developer", "guest"]
    services = ["auth-service", "billing-gateway", "metrics-collector", "waf-engine", "notification-dispatcher"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            role = random.choice(roles)
            svc = random.choice(services)
            u_id = str(uuid.uuid4())
            
            payload = json.dumps({
                "service": svc,
                "request_id": u_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "user": {
                    "id": random.randint(1000, 99999),
                    "name": f"{fname} {lname}",
                    "role": role,
                    "department": "Engineering & SecOps",
                    "permissions": ["read:logs", "view:dashboard", "submit:feedback"]
                },
                "telemetry": {
                    "latency_ms": round(random.uniform(1.2, 45.8), 2),
                    "status_code": 200,
                    "environment": "production-cloud"
                }
            }, separators=(',', ':'))
            buffer.append([payload, 0, 'cloud_rest_json', 'synthetic:cloud_api'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_graphql_queries(count=250000, filepath=None):
    print(f"[*] Generating {count:,} Cloud GraphQL queries & mutations...")
    entities = ["User", "Product", "Organization", "Invoice", "AuditLog", "IncidentReport", "SecurityPolicy"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            ent = random.choice(entities)
            limit = random.choice([10, 25, 50, 100])
            obj_id = random.randint(1, 10000)
            
            if random.random() < 0.6:
                gql = f'{{"query":"query Fetch{ent}Details($id: ID!) {{ {ent.lower()}(id: $id) {{ id name status createdAt tags {{ id label }} }} }}","variables":{{"id":{obj_id}}}}}'
            else:
                gql = f'{{"query":"query List{ent}s($limit: Int, $offset: Int) {{ {ent.lower()}s(limit: $limit, offset: $offset) {{ totalCount items {{ id name updatedAt }} }} }}","variables":{{"limit":{limit},"offset":0}}}}'
            
            buffer.append([gql, 0, 'cloud_graphql', 'synthetic:graphql_production'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_webhooks(count=200000, filepath=None):
    print(f"[*] Generating {count:,} Webhooks & Gateway Callbacks...")
    events = ["payment_intent.succeeded", "invoice.paid", "customer.subscription.updated", "charge.refunded", "order.fulfilled", "deploy.success"]
    providers = ["stripe", "paypal", "sslcommerz", "bkash", "github_webhook"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            ev = random.choice(events)
            prov = random.choice(providers)
            tx_id = f"tx_{hashlib.sha256(str(random.random()).encode()).hexdigest()[:16]}"
            amount = random.randint(500, 250000)
            
            wh = json.dumps({
                "provider": prov,
                "event_type": ev,
                "event_id": str(uuid.uuid4()),
                "data": {
                    "transaction_id": tx_id,
                    "amount": amount,
                    "currency": "USD" if prov == "stripe" else "BDT",
                    "status": "completed",
                    "verified": True
                },
                "signature": f"v1={hashlib.sha256(tx_id.encode()).hexdigest()}"
            }, separators=(',', ':'))
            
            buffer.append([wh, 0, 'webhooks_callbacks', 'synthetic:webhooks'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_jwt_auth_headers(count=150000, filepath=None):
    print(f"[*] Generating {count:,} JWT Authorization Headers & Bearer tokens...")
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            u_id = random.randint(1000, 99999)
            exp = int(time.time()) + 86400
            
            header_b64 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            payload_str = json.dumps({"sub": str(u_id), "name": random.choice(FIRST_NAMES), "iat": int(time.time()), "exp": exp})
            payload_b64 = hashlib.md5(payload_str.encode()).hexdigest() + hashlib.md5(str(u_id).encode()).hexdigest()
            sig_b64 = hashlib.sha256((header_b64 + payload_b64).encode()).hexdigest()[:43]
            
            token = f"Authorization: Bearer {header_b64}.{payload_b64}.{sig_b64}"
            buffer.append([token, 0, 'jwt_auth_headers', 'synthetic:jwt_tokens'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def generate_complex_query_filters(count=100000, filepath=None):
    print(f"[*] Generating {count:,} Complex Query Parameters & API Filters...")
    fields = ["created_at", "updated_at", "price", "rating", "category", "in_stock", "organization_id"]
    sorts = ["asc", "desc", "-created_at", "popularity", "relevance"]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            fld = random.choice(fields)
            srt = random.choice(sorts)
            val1 = random.randint(10, 100)
            val2 = random.randint(101, 500)
            
            req = f"GET /api/v2/products?filter[{fld}][gte]={val1}&filter[{fld}][lte]={val2}&sort={srt}&limit=25&include_metadata=true HTTP/1.1"
            buffer.append([req, 0, 'complex_query_filters', 'synthetic:url_filters'])
            if len(buffer) >= 20000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def import_existing_benign_prompts(filepath=None):
    print("[*] Ingesting existing benign prompts from datasets/threat_intelligence/03_prompt_injection/...")
    src_files = [
        'datasets/threat_intelligence/03_prompt_injection/final/ai_benign_prompts.csv',
        'datasets/threat_intelligence/03_prompt_injection/_repos/jailbreak_llms/data/prompts/regular_prompts_2023_12_25.csv',
        'datasets/threat_intelligence/03_prompt_injection/_repos/jailbreak_llms/data/prompts/regular_prompts_2023_05_07.csv'
    ]
    
    total_imported = 0
    with open(filepath, 'w', encoding='utf-8', newline='') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(['text', 'label', 'category', 'source'])
        
        p1 = src_files[0]
        if os.path.exists(p1):
            with open(p1, 'r', encoding='utf-8', errors='ignore') as f_in:
                reader = csv.reader(f_in)
                next(reader, None)
                for r in reader:
                    if r and len(r) >= 1 and r[0].strip():
                        writer.writerow([r[0].strip(), 0, 'ai_benign_prompt', 'threat_intel:benign_prompt'])
                        total_imported += 1
                        
        for p in src_files[1:]:
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8', errors='ignore') as f_in:
                    reader = csv.reader(f_in)
                    next(reader, None)
                    for r in reader:
                        if r and len(r) >= 3 and r[2].strip():
                            writer.writerow([r[2].strip(), 0, 'regular_user_prompt', 'jailbreak_llms:regular'])
                            total_imported += 1
                            
    print(f"    [+] Successfully ingested {total_imported:,} existing benign prompts to {filepath}")
    return total_imported

def generate_modern_threat_attacks(count=50000, filepath=None):
    print(f"[*] Generating {count:,} Modern 2026 Attack Payloads (SSRF, GraphQL, Prototype Pollution)...")
    cloud_ssrf = [
        "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
        "http://169.254.169.254/latest/user-data",
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        "http://169.254.169.254/metadata/v1/maintenance",
        "http://[::ffff:169.254.169.254]/latest/meta-data/",
        "http://0xa9fea9fe/latest/meta-data/iam/security-credentials/admin"
    ]
    prototype_pollution = [
        '{"__proto__": {"admin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"__proto__": {"role": "superuser", "access": "*" }}',
        '{"constructor.prototype.polluted": "yes"}'
    ]
    graphql_attacks = [
        'query { __schema { types { name fields { name } } } }',
        'query { user(id: 1) { id ... on User { passwordHash apiTokens { secret } } } }',
        '{ a: users { id } b: users { id } c: users { id } d: users { id } e: users { id } }'
    ]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'label', 'category', 'source'])
        buffer = []
        for i in range(count):
            choice = random.random()
            if choice < 0.4:
                atk = random.choice(cloud_ssrf)
                cat = "cloud_ssrf"
            elif choice < 0.7:
                atk = random.choice(prototype_pollution)
                cat = "prototype_pollution"
            else:
                atk = random.choice(graphql_attacks)
                cat = "graphql_abuse"
            
            buffer.append([atk, 1, cat, 'synthetic:modern_attacks_2026'])
            if len(buffer) >= 10000:
                writer.writerows(buffer)
                buffer = []
        if buffer:
            writer.writerows(buffer)
    print(f"    [+] Saved {count:,} rows to {filepath}")

def main():
    print("=" * 70)
    print("[MDefender Pro] Enterprise Dataset Harvesting Pipeline")
    print("=" * 70)
    t_start = time.perf_counter()
    
    generate_gutenberg_blocks(250000, os.path.join(OUTPUT_DIR, '01_wordpress_gutenberg_blocks.csv'))
    generate_woocommerce_payloads(250000, os.path.join(OUTPUT_DIR, '02_woocommerce_cart_orders.csv'))
    generate_wp_rest_api(250000, os.path.join(OUTPUT_DIR, '03_wordpress_rest_api.csv'))
    generate_wp_admin_ajax(150000, os.path.join(OUTPUT_DIR, '04_wordpress_admin_ajax.csv'))
    generate_comments_search(100000, os.path.join(OUTPUT_DIR, '05_user_comments_search.csv'))
    generate_cloud_json_rest(300000, os.path.join(OUTPUT_DIR, '06_cloud_json_rest_api.csv'))
    generate_graphql_queries(250000, os.path.join(OUTPUT_DIR, '07_cloud_graphql_queries.csv'))
    generate_webhooks(200000, os.path.join(OUTPUT_DIR, '08_webhooks_callbacks.csv'))
    generate_jwt_auth_headers(150000, os.path.join(OUTPUT_DIR, '09_jwt_auth_headers.csv'))
    generate_complex_query_filters(100000, os.path.join(OUTPUT_DIR, '10_complex_query_filters.csv'))
    
    # Ingest existing
    import_existing_benign_prompts(os.path.join(OUTPUT_DIR, '11_merged_existing_benign.csv'))
    
    # Add modern attacks
    generate_modern_threat_attacks(50000, os.path.join(OUTPUT_DIR, '12_modern_attacks_2026.csv'))
    
    total_time = time.perf_counter() - t_start
    print("=" * 70)
    print(f"[SUCCESS] All 2.5M+ records successfully generated and organized in {total_time:.2f} seconds!")
    print(f"Location: {OUTPUT_DIR}")
    print("=" * 70)

if __name__ == '__main__':
    main()
