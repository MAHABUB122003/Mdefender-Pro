# MDefender Pro — 4-Plugin Architecture & Edition Gating Blueprint

> **Status:** Permanent Architecture Standard  
> **Applicability:** All MDefender Pro WordPress Plugins & Central Cloud Platform  
> **Last Updated:** October 2026

---

## ১. ভূমিকা ও মূল দর্শন (Architectural Principles)

MDefender Pro সাইবার নিরাপত্তা ইকোসিস্টেমকে **৪টি স্বতন্ত্র প্লাগইন** এবং **৪টি মূল্যভিত্তিক সংস্করণে (Editions)** ভাগ করা হয়েছে।

### দুটি মৌলিক ভিত্তি:
1. **৪টি স্বতন্ত্র প্লাগইন (Single Responsibility Principle):**
   - **Plugin 01 — MDefender Pro Security:** `Protect` (Firewall, WAF, Login, Brute-force, Rate Limiting, Access Control)
   - **Plugin 02 — MDefender Pro Scanner:** `Detect` (Malware scan, Core integrity, Vulnerability checks, Suspicious PHP, File integrity)
   - **Plugin 03 — MDefender Pro Response:** `Remediate` (Quarantine, Cleanup workflow, Backup/rollback, Incident timeline, Recovery validation)
   - **Plugin 04 — MDefender Pro Threat Intelligence:** `Understand` (Threat feeds, IP reputation, IOC matching, Campaign correlation, Intelligence analytics)

2. **৪টি মূল্যভিত্তিক সংস্করণ (Editions):**
   - **Free (Level 1 - Basic Protection):** WordPress.org-এ প্রকাশিত ওপেন-সোর্স সংস্করণ।
   - **Developer Go (Level 2 - Advanced Security):** একক সাইট ও ডেভেলপারদের জন্য পেইড সংস্করণ।
   - **Enterprise Pro (Level 3 - Centralized Enterprise Management):** মাল্টি-সাইট, টিম পারমিশন ও অ্যাডভান্সড রিপোর্ট সমৃদ্ধ।
   - **Dedicated Enterprise (Level 4 - Dedicated Operations):** ডেডিকেটেড সাপোর্ট, প্রায়োরিটি ইনভেস্টিগেশন ও ২৪/৭ রেসপন্স এসএলএ।

---

## ২. Master Exclusion Matrix (কোন ফিচার কোথায় থাকবে এবং কোথায় থাকবে না)

| ফিচারের মূল দায়িত্ব | Security | Scanner | Response | Threat Intelligence | Central Platform |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **WAF ও Live Request Blocking** |  | — | — | — | — |
| **Login ও Brute-force Protection** |  | — | — | — | — |
| **Rate Limiting ও Bot Control** |  | — | — | — | — |
| **IP Block Enforcement** |  | — | — | — | — |
| **Malware ও File Scanning** | — |  | — | — | — |
| **Core/Plugin/Theme Integrity** | — |  | — | — | — |
| **Vulnerability Detection** | — |  | — | — | — |
| **ML Malware Classification** | — |  | — | — | — |
| **Quarantine ও Cleanup** | — | — |  | — | — |
| **Backup/Rollback ও Recovery** | — | — |  | — | — |
| **Incident Timeline ও Remediation** | — | — |  | — | — |
| **Managed Incident Response (SLA)**| — | — |  | — | — |
| **IP Reputation Database** | — | — | — |  | — |
| **Threat Feed Ingestion** | — | — | — |  | — |
| **IOC Matching & Correlation** | — | — | — |  | — |
| **Global Threat Analytics** | — | — | — |  | — |
| **Subscription & Billing** | — | — | — | — |  |
| **License Entitlement Management**| — | — | — | — |  |
| **ZIP Download & Plugin Updates** | — | — | — | — |  |

> **বিশেষ নিয়ম:** Master Exclusion Matrix-এ `—` চিহ্নের অর্থ এই নয় যে প্লাগইনগুলো একে অপরের সাথে কথা বলতে পারবে না। প্লাগইনগুলো WordPress Action Hooks ও Filters-এর মাধ্যমে একে অপরের সাথে ডিকাপল্ড ইভেন্ট শেয়ার করবে।

---

## ৩. প্লাগইনভিত্তিক ফিচার ও এডিশন ম্যাট্রিক্স

### Plugin 01 — MDefender Pro Security (Protect)
*উদ্দেশ্য: Prevention, Firewall Enforcement এবং WordPress Access Security।*

| ক্রম | ফিচার | Free | Go | Pro | Dedicated |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Web Application Firewall (WAF) | Basic | Advanced | Advanced | Advanced |
| 2 | SQL Injection ও XSS Blocking | Basic | Advanced | Advanced | Advanced |
| 3 | Path Traversal Protection |  |  |  |  |
| 4 | Brute-force Protection |  |  |  |  |
| 5 | Login Attempt Rate Limiting |  |  |  |  |
| 6 | Manual IP Allowlist/Denylist |  |  |  |  |
| 7 | Login Alerts ও Security Logs | Basic | Extended | Extended | Extended |
| 8 | Advanced ML-assisted Request Analysis | — |  |  |  |
| 9 | Cloud Firewall Rule Updates | — |  |  |  |
| 10 | IP Reputation Integration (Query Hook) | — |  |  |  |
| 11 | Country/Region Blocking | — |  |  |  |
| 12 | Advanced Bot Rules | — | Basic | Advanced | Advanced |
| 13 | REST API Access Policies | Basic | Advanced | Advanced | Advanced |
| 14 | Custom Firewall Rules | — | Basic |  |  |
| 15 | Multi-site Firewall Policy Management | — | — |  |  |
| 16 | Team-based Security Permissions | — | — |  |  |
| 17 | Dedicated Policy Configuration | — | — | — |  |

---

### Plugin 02 — MDefender Pro Scanner (Detect)
*উদ্দেশ্য: Malware Detection, Integrity Verification ও Vulnerability Assessment।*

| ক্রম | ফিচার | Free | Go | Pro | Dedicated |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Manual Malware Scan |  |  |  |  |
| 2 | WordPress Core Integrity Verification |  |  |  |  |
| 3 | Plugin/Theme Vulnerability Checks |  |  |  |  |
| 4 | Basic Suspicious PHP Detection |  |  |  |  |
| 5 | File Integrity Monitoring (FIM) | Basic | Advanced | Advanced | Advanced |
| 6 | Scheduled Scanning | Weekly | Daily | Hourly | Custom |
| 7 | ML-assisted Malware Classification | — |  |  |  |
| 8 | Database Malware Scanning | Basic | Advanced | Advanced | Advanced |
| 9 | Obfuscated Code Analysis | Basic | Advanced | Advanced | Advanced |
| 10 | Incremental ও Resumable Scanning | — |  |  |  |
| 11 | Detailed Scan History | 7 Days | 90 Days | 365 Days| Unlimited |
| 12 | CSV/JSON Scan Reports | — |  |  |  |
| 13 | Multi-site Scan Dashboard | — | Basic |  |  |
| 14 | Custom Scan Policies | — | Basic |  |  |
| 15 | Organization-wide Scan Orchestration| — | — |  |  |
| 16 | Expert-assisted Finding Review | — | — |  |  |

---

### Plugin 03 — MDefender Pro Response (Remediate)
*উদ্দেশ্য: Containment, Cleanup, Rollback ও Incident Recovery।*

| ক্রম | ফিচার | Free | Go | Pro | Dedicated |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Remediation Instructions |  |  |  |  |
| 2 | Manual Quarantine | — |  |  |  |
| 3 | Secure Quarantine Storage | — |  |  |  |
| 4 | Pre-cleanup Backup / Snapshot | — |  |  |  |
| 5 | Approved Core-file Repair | — |  |  |  |
| 6 | Guided Malware Cleanup | — | Basic | Advanced | Advanced |
| 7 | Restore ও Rollback Workflow | — | Basic | Advanced | Advanced |
| 8 | Incident Timeline | Basic |  |  |  |
| 9 | Post-cleanup Rescan Trigger |  |  |  |  |
| 10 | Recovery Verification | Basic |  |  |  |
| 11 | Persistence Checks | — |  |  |  |
| 12 | Multi-site Incident Management | — | — |  |  |
| 13 | Expert-assisted Cleanup | — | — | * | * |
| 14 | Priority Incident Escalation | — | — | — | * |
| 15 | Contracted 24/7 Response Service | — | — | — | * |

---

### Plugin 04 — MDefender Pro Threat Intelligence (Understand)
*উদ্দেশ্য: Threat Data, IP Reputation, IOC Analysis ও Attack Intelligence।*

| ক্রম | ফিচার | Free | Go | Pro | Dedicated |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Basic Threat Feed Access |  |  |  |  |
| 2 | Basic IP Reputation Lookup |  |  |  |  |
| 3 | Premium Threat Feeds | — |  |  |  |
| 4 | Real-time Reputation Updates | — |  |  |  |
| 5 | IOC Matching (MD5, SHA256, Signatures)| Basic | Advanced | Advanced | Advanced |
| 6 | Malicious URL/Domain Intelligence | Limited |  |  |  |
| 7 | Threat Activity Dashboard | Basic | Advanced | Advanced | Advanced |
| 8 | Threat Intelligence Export (JSON/STIX)| — |  |  |  |
| 9 | Custom Threat Rules | — | Basic | Advanced | Advanced |
| 10 | Threat Intelligence API | — | Limited |  |  |
| 11 | Multi-site Threat Correlation | — | — |  |  |
| 12 | Organization-wide Intelligence Policies| — | — |  |  |
| 13 | Custom Intelligence Integrations | — | — | Basic | Advanced |
| 14 | Dedicated Threat Investigation | — | — | — |  |

---

## ৪. Inter-Plugin Communication Architecture (Event Bus & Hooks)

প্লাগইনগুলো সরাসরি একে অপরের ফাইল ইনক্লুড করবে না; এর পরিবর্তে তারা স্ট্যান্ডার্ড WordPress Hooks ও Filters ব্যবহার করে সম্পূর্ণ ডিকাপল্ড থাকবে:

### ১. Action Hooks (ইভেন্ট পাবলিশিং):
- `do_action('mdefender_scanner_threat_detected', $finding_data);`
  - *Response Plugin:* এই হুক শুনে সাথে সাথে কোয়ারেন্টাইন বা নোটিফিকেশন রেডি করে।
  - *Security Plugin:* এই হুক শুনে অ্যাটাকারের সংশ্লিষ্ট আইপিকে সাময়িক ব্যান বা ওয়াচলিস্টে নিতে পারে।
  - *Threat Intel Plugin:* ফাইল হ্যাশ ও সিগনেচার দিয়ে IOC কোরিলেশন ট্র্যাক করে।

- `do_action('mdefender_security_request_blocked', $block_data);`
  - *Threat Intel Plugin:* লোকাল অ্যাটাক ট্রেন্ড ও আইপি স্কোর আপডেট করে।

- `do_action('mdefender_response_action_completed', $action_data);`
  - *Scanner Plugin:* ক্লিনআপের পর নির্দিষ্ট ফাইলের পোস্ট-ক্লিনআপ রিকভারি রেজাল্ট ভেরিফাই করে।

### ২. Filter Hooks (তথ্য বিনিময়):
- `apply_filters('mdefender_threat_intel_check_ip', $reputation, $ip);`
  - Security প্লাগইন রিকোয়েস্ট প্রসেস করার সময় থ্রেট ইন্টেলিজেন্স থেকে আইপির স্কোর/ক্যাটাগরি জানতে চায়।
- `apply_filters('mdefender_threat_intel_check_hash', $threat_info, $sha256);`
  - Scanner প্লাগইন সন্দেহজনক ফাইল স্ক্যান করার সময় থ্রেট ইন্টেলিজেন্স থেকে গ্লোবাল IOC ডাটাবেজ চেক করে।

---

## ৫. License & Edition Entitlement Contract

প্রতিটি প্লাগইন একটি ইউনিফাইড `MDefender_Entitlements` কন্ট্রাক্ট মেনে চলে:

```php
class MDefender_Entitlements {
    const EDITION_FREE      = 'free';
    const EDITION_GO        = 'go';
    const EDITION_PRO       = 'pro';
    const EDITION_DEDICATED = 'dedicated';

    public static function get_edition($plugin_slug = '') {
        $license_data = get_option('mdefender_license_data', []);
        return $license_data['edition'] ?? self::EDITION_FREE;
    }

    public static function can($feature_slug, $plugin_slug = '') {
        $edition = self::get_edition($plugin_slug);
        return MDefender_Matrix::is_feature_allowed($feature_slug, $edition);
    }
}
```

---

## ৬. Feature Development Checklist

ভবিষ্যতে যেকোনো নতুন ফিচার যোগ করার সময় এই ৬টি ধাপ কঠোরভাবে মেনে চলতে হবে:
1. **নিরাপত্তা সমস্যা ধরন নির্ধারণ:** এটি কি Prevention (Security), Detection (Scanner), Remediation (Response), নাকি Intelligence (Threat Intel)?
2. **Authoritative Plugin নির্বাচন:** ফিচারের মালিক একটিমাত্র প্লাগইন হবে।
3. **Edition Entitlement নির্ধারণ:** Free বনাম Paid (Go, Pro, Dedicated)-এ কোন সুবিধা থাকবে তা নির্ধারণ।
4. **Central API ও Event Flow যাচাই:** যোগাযোগের জন্য শুধুমাত্র WordPress Hook বা Central API কন্ট্রাক্ট ব্যবহার।
5. **Regression & Standalone টেস্ট:** অন্য ৩টি প্লাগইন ডিঅ্যাক্টিভেটেড থাকলেও এই প্লাগইন যেন নিরবচ্ছিন্ন কাজ করে।
6. **Rollback & Failure Behavior:** লাইসেন্স এক্সপায়ার হলে বা নেটওয়ার্ক ব্যর্থ হলে graceful degradation নিশ্চিত করা।
