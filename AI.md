# MDefender Pro — AI Project Context & Comprehensive Knowledge Base

> **File:** `AI.md`  
> **Last Updated:** October 2026  
> **Purpose:** এই ফাইলটি যে কোনো AI অ্যাসিস্ট্যান্ট বা ডেভেলপারের জন্য প্রোজেক্টের পূর্ণাঙ্গ রেফারেন্স হিসেবে তৈরি করা হয়েছে। পরবর্তীতে যে কোনো সেশনে কাজ শুরু করার সময় এই ফাইলটি পড়লে কোনো পূর্ববর্তী তথ্য নষ্ট হবে না এবং সরাসরি কাজ শুরু করা যাবে।

---

## ১. প্রোজেক্টের পরিচিতি (Project Overview)

**MDefender Pro** হলো একটি এন্টারপ্রাইজ-গ্রেড নেক্সট-জেনারেশন ক্লাউড WAF (Web Application Firewall), অ্যান্টি-DDoS, DNS জোন ম্যানেজার এবং ওয়ার্ডপ্রেস সাইবার সিকিউরিটি প্ল্যাটফর্ম।

### মূল ফিচারসমূহ:
1. **Cloud WAF & DNS Zone Protection:** ডোমেন-ভিত্তিক প্রটেকশন (Cloudflare স্টাইল, কিন্তু নিজস্ব MDefender Cyber Blue ব্র্যান্ডিং)। ব্যবহারকারী ডোমেন যোগ করলে পাবলিক DoH দিয়ে রিয়েল DNS রেকর্ড খুঁজে বের করে এবং ট্রাফিক ফিল্টার করে।
2. **WordPress Security Plugin (`mdefender-pro`):** সরাসরি ওয়ার্ডপ্রেস সাইটে প্লাগইন ইনস্টল করে WAF, IP ব্ল্যাকলিস্ট/হোয়াইটলিস্ট, ম্যালওয়্যার স্ক্যানার এবং রিয়েল-টাইম থ্রেট ব্লকিং কার্যকর করা।
3. **AI/ML WAF Engine:** মেশিন লার্নিং মডেল (RandomForest / GradientBoosting) দিয়ে SQL Injection (SQLi), Cross-Site Scripting (XSS), Command Injection, Path Traversal শনাক্তকরণ।
4. **PHP Malware Detection Engine:** ওয়ার্ডপ্রেস থিম/প্লাগইন ফাইলে ব্যাকডোর, ওয়েবশেল ও ম্যালিসিয়াস কোড শনাক্ত করার ML মডেল।
5. **Real-time DDoS Shield:** রিকোয়েস্ট রেট লিমিটিং, আচরণ বিশ্লেষণ ও অটোমেটিক ব্লকিং।

---

## ২. লাইভ পরিবেশ ও ডিপ্লয়মেন্ট স্ট্যাটাস (Live Deployments)

| পরিবেশ (Environment) | লিঙ্ক / আইপি | বিবরণ |
| :--- | :--- | :--- |
| **Production VPS** | `217.15.170.82` | Ubuntu/Debian VPS, অবস্থান: `/var/www/Mdefender-Pro` |
| **Live Web App** | `https://217.15.170.82.sslip.io/` | Nginx রিভার্স প্রক্সি + Let's Encrypt SSL সহ লাইভ চলছে |
| **Local WordPress Testbed** | `http://localhost/mahabub` | Windows XAMPP (Apache + MySQL), PHP 8.0+ |
| **টেস্ট ডোমেন (Verified)** | `mahabubur.shop` | Origin IP: `49.12.82.48`, NS: `ns1/ns2.procloudify.com` |

---

## ৩. টেকনোলজি স্ট্যাক (Tech Stack)

### ব্যাকএন্ড (Backend)
- **Language & Framework:** Python 3.10+, FastAPI, Uvicorn ASGI
- **Database Driver:** PyMongo / Motor (`backend/src/database/mongodb_connection.py`)
- **Machine Learning:** Scikit-learn, Joblib, NumPy, Pandas
- **DNS Engine:** `dnspython`, Multi-provider Public DNS-over-HTTPS (Google & Cloudflare DoH APIs)

### ফ্রন্টএন্ড (Frontend)
- **Framework:** React 18, Vite, React Router v6
- **UI & Icons:** Vanilla CSS / Tailwind Utilities, Lucide React Icons
- **Branding Tokens:** MDefender Cyber Blue (`#2563eb`), Dark Navy Indigo (`#0f172a`, `#1e293b`), Emerald Active (`#10b981`)
- **API Base:** `VITE_API_BASE` (লোকালে `http://localhost:8000/api/v1` অথবা প্রোডাকশনে `/api/v1`)

### ওয়ার্ডপ্রেস প্লাগইন (`plugin_source/mdefender-pro`)
- **Language:** PHP 8.0+
- **Security Hooks:** `plugins_loaded` প্রায়োরিটি 1-এ ট্রাফিক ইন্টারসেপ্ট করে, ব্লকিং পেজ রেন্ডার করে।
- **বিল্ড আর্টফ্যাক্ট:** `plugin_source/mdefender-pro.zip` (ড্যাশবোর্ড থেকে ডাউনলোডযোগ্য)

---

## ৪. ডেটাবেজ আর্কিটেকচার ও কালেকশন (Database Collections)

সিস্টেমটি MongoDB 7.0 ব্যবহার করে (অফলাইন বা ব্যাকআপের জন্য `mongodb_connection.py`-তে স্বয়ংক্রিয় ইন-মেমোরি ফলব্যাক সংযুক্ত রয়েছে)।

### প্রধান MongoDB Collections:

| Collection Name | ফিল্ড ও বিবরণ |
| :--- | :--- |
| **`websites`** | ডোমেন এবং ক্লাউড WAF প্রোটেকশন রেকর্ড। ফিল্ড: `domain`, `name`, `status`, `nameservers`, `current_nameservers`, `plan` (Free/Go/Pro/Ultra), `created_at`, `user_id` |
| **`dns_records`** | প্রতিটি ডোমেনের DNS রেকর্ডসমূহ। ফিল্ড: `website_id`, `domain`, `type` (A/AAAA/CNAME/MX/TXT/NS), `name`, `content`, `proxied` (boolean), `ttl` ("Auto"), `priority` |
| **`wordpress_sites`** | প্লাগইন কানেক্টেড ওয়ার্ডপ্রেস সাইটসমূহ। ফিল্ড: `site_url`, `api_key`, `sync_status`, `wp_version`, `plugin_version`, `last_ping` |
| **`waf_events`** | ব্লকিং ও ডিটেকশন ইভেন্ট লগ। ফিল্ড: `client_ip`, `request_method`, `path`, `attack_type`, `action` (BLOCKED/ALLOWED), `severity`, `timestamp` |
| **`rules` / `user_rules`** | গ্লোবাল এবং কাস্টম WAF রুলস। ফিল্ড: `rule_id`, `rule_name`, `pattern`, `action`, `enabled` |
| **`blacklist` / `whitelist`** | ম্যানুয়াল এবং অটোমেটিক আইপি তালিকা। ফিল্ড: `ip`, `reason`, `expires_at`, `created_at` |
| **`auto_blocks`** | রেট লিমিট বা হাই-থ্রেট ডিটেকশনের কারণে সিস্টেম দ্বারা অটো-ব্লক হওয়া আইপি। |
| **`users`** | ব্যবহারকারীর প্রোফাইল ও ক্রেডেনশিয়ালস। ফিল্ড: `email`, `hashed_password`, `role` (admin/user), `plan`, `created_at` |
| **`sessions` / `user_tokens`** | JWT অথেন্টিকেশন ও সেশন ট্র্যাকিং। |
| **`malware_scans` / `malware_findings`** | ওয়ার্ডপ্রেস সাইট বা আপলোড ফাইলের ম্যালওয়্যার স্ক্যান রিপোর্ট। |
| **`subscriptions` / `payments`** | সাবস্ক্রিপশন প্ল্যান, পেমেন্ট ও ইনভয়েস ডেটা। |

---

## ৫. মেশিন লার্নিং (AI/ML) মডেল ও ডেটাসেট

মডেল ফাইল লোকেশন: `backend/models/`
- **`waf_model.pkl` & `waf_category_model.pkl`**:
  - ট্রেনিং ডেটা: `datasets/waf_requests/`
  - ক্যাটাগরি: SQLi, XSS, Path Traversal, Command Injection, Malicious Payload, Normal.
  - মেটাডেটা: `waf_meta.json`, `scaler.pkl`, `feature_engineer.pkl`.
- **`malware_model.pkl` & `malware_family_model.pkl`**:
  - ট্রেনিং ডেটা: `datasets/wordpress_malware/`
  - ক্যাটাগরি: Webshells, eval/base64 obfuscators, PHP backdoors, crypto miners.
  - মেটাডেটা: `malware_features.json`, `malware_meta.json`.

---

## ৬. গুরুত্বপূর্ণ সাম্প্রতিক সমাধান ও ইমপ্লিমেন্টেশন (Recent Fixes)

1. **ডোমেন অনবোর্ডিং ও DNS Discovery Engine:**
   - ডোমেন যোগ করার সময় পূর্বে ডামি ফলব্যাক আইপি `203.0.113.10` তৈরি হতো। এটি **সম্পূর্ণ মুছে ফেলা হয়েছে**।
   - **Multi-provider DoH Engine (`dns_zone_service.py`):** Google Public DNS (`https://dns.google/resolve`) এবং Cloudflare DoH (`https://cloudflare-dns.com/dns-query`) ব্যবহার করে পোর্ট 443 (HTTPS) দিয়ে রিয়েল পাবলিক রেকর্ড এক্সট্র্যাক্ট করে।
   - **ক্লায়েন্ট-সাইড ব্রাউজার DoH ফলব্যাক (`DnsOnboardingModal.jsx`):** যদি কোনো কারণে VPS ব্যাকএন্ড কন্টেইনার রিস্টার্ট না থাকে বা 404 দেয়, ব্রাউজার সরাসরি গুগল DoH এপিআই কল করে তাৎক্ষণিকভাবে রিয়েল DNS রেকর্ড বের করে আনে।
   - টেস্ট ডোমেন `mahabubur.shop`-এর সকল 7টি আসল রেকর্ড (A, CNAME, MX, TXT SPF, DMARC, NS) সঠিকভাবে লোড হচ্ছে।

2. **UI & ব্র্যান্ডিং পরিচ্ছন্নতা:**
   - ডোমেন ও ওয়ার্ডপ্রেস সম্পূর্ণ পৃথক মেনুতে বিভক্ত:
     - `/user/domains` ➔ ক্লাউড WAF ও DNS জোন।
     - `/user/websites` ➔ ওয়ার্ডপ্রেস প্লাগইন ও সাইট।
   - Cloudflare-এর ট্রেডমার্ক ও কমলা ক্লাউড আইকন সম্পূর্ণ বাদ দিয়ে MDefender Pro-এর নিজস্ব Cyber Blue/Indigo স্টাইল (`#2563eb`) ও টগল সুইচ দেওয়া হয়েছে।
   - ড্রপডাউনে মিনিটের বিভ্রান্তিকর TTL অপশন বাদ দিয়ে প্রফেশনাল `Auto` রাখা হয়েছে।

3. **ওয়ার্ডপ্রেস প্লাগইন পিএইচপি 8 ফিক্স ও ভেরিফিকেশন:**
   - `class-ip-filter.php`-এ `waf_fw_ip_whitelist` অ্যারে আসার কারণে হওয়া PHP 8.0 `TypeError` সমাধান করা হয়েছে।
   - ব্লক পেজ টেমপ্লেট নীল সাইবার ক্রেস্টে আপডেট করা হয়েছে।
   - লোকাল XAMPP-তে `test_full_xampp_site.php` দিয়ে টেস্ট করা হয়েছে: **14 / 14 টেস্ট সফল (100% SUCCESS)**।

---

## ৭. কীভাবে ডোমেন এবং নেমসার্ভার VPS-এ কানেক্ট করবেন (Custom Domain & NS Setup)

ব্যবহারকারী নতুন কোনো ডোমেন (যেমন: `yourdomain.com`) কিনে VPS (`217.15.170.82`)-এ যুক্ত করতে চাইলে:

### ক. ডোমেন রেজিস্ট্রারে (Registrar DNS):
1. **A Record:** `@` ➔ `217.15.170.82`
2. **A Record:** `www` ➔ `217.15.170.82`
3. **Glue Records (Child Nameservers):**
   - `ns1.yourdomain.com` ➔ `217.15.170.82`
   - `ns2.yourdomain.com` ➔ `217.15.170.82`

### খ. VPS Nginx ও SSL (Certbot):
1. `/etc/nginx/sites-available/mdefender.conf` এ ডোমেন কনফিগার করা।
2. `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com` চালিয়ে ফ্রি HTTPS নেওয়া।
3. ফ্রন্টএন্ড `.env` এ `VITE_API_BASE=https://yourdomain.com/api/v1` দিয়ে রিবিল্ড করা।

---

## ৮. পরবর্তী ধাপসমূহ (Next Roadmap / Pending Actions)

পরের বার যখন প্রোজেক্টে কাজ শুরু করবেন, এই ধাপগুলো অনুসরণ করুন:

1. [ ] **VPS ব্যাকএন্ড কন্টেইনার রিস্টার্ট (Sync Check):**
   - VPS টার্মিনালে গিয়ে:
     ```bash
     cd /var/www/Mdefender-Pro
     git pull origin main
     docker compose restart
     # অথবা: systemctl restart mdefender
     ```
   - এটি নিশ্চিত করবে যে সার্ভার-সাইড `/api/v1/websites/dns/discover` 404 ছাড়া লাইভ আছে।
2. [ ] **কাস্টম ডোমেন বাইন্ডিং:** ব্যবহারকারী ডোমেন কিনলে তার ডোমেন নাম দিয়ে VPS Nginx কনফিগার করা।
3. [ ] **Authoritative DNS Daemon (Port 53):** যদি অন্য গ্রাহকদের ডোমেনের নেমসার্ভার সরাসরি VPS-এ হ্যান্ডেল করতে হয়, তবে VPS-এ BIND9 বা PowerDNS অথবা কাস্টম DNS লিসেনার কনফিগার করা।
4. [ ] **WAF Reverse Proxy Traffic Routing:** প্রক্সি অন করা রেকর্ডগুলোর ট্রাফিক MDefender রিভার্স প্রক্সি দিয়ে পাস করিয়ে অ্যাটাক ফিল্টার করা।

---

> **AI Instruction:** এই ফাইলটি প্রোজেক্টের বর্তমান বাস্তব অবস্থার সত্য প্রতিচ্ছবি। কোনো কাজ শুরু করার আগে এই ফাইলের স্ট্যাটাস এবং Git লগ চেক করুন।
