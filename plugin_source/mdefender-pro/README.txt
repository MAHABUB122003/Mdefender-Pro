=== MDefender-Pro ===
Contributors: mdefenderpro
Tags: firewall, security, waf, web application firewall, ml, machine learning, ai, wordpress security, malware, scanner, protection
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 3.5.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI/ML-Powered Web Application Firewall and Malware Scanner, powered by the MDefender-Pro cloud service.

== Description ==

MDefender-Pro is a professional, AI/ML-powered WordPress security plugin that combines a Web Application Firewall with a deep malware scanner. It protects your site from OWASP Top 10 attacks and detects malicious code using the MDefender-Pro cloud machine learning service, activated with a simple API key.

== Features ==

* Real-time WAF protection against SQL Injection, XSS, LFI, RCE, CSRF, and more
* ML-powered threat detection via the MDefender-Pro backend service
* Deep malware scanner backed by the MDefender-Pro malware model
* Comprehensive dashboard with live attack monitoring
* Firewall rules management
* IP blocking and blacklist management
* Security logs with filtering and export
* Website vulnerability scanner
* Website hardening suite
* Geographic attack mapping
* OWASP Top 10 coverage

== Installation ==

1. Upload the `wp-waf-firewall` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to the MDefender-Pro menu in your admin panel
4. Enter your MDefender-Pro Website API key in Settings
5. Click Save & Connect (or Test Connection)
6. Enable protection

== MDefender-Pro Service ==

The MDefender-Pro cloud service provides ML WAF analysis and the malware scanner model to the plugin. Simply enter your website API key under Settings > MDefender-Pro Cloud Service. Malware and suspicious files found during scans are analyzed by the MDefender-Pro malware model, returning a verdict, risk score, confidence, and malware family.

== Changelog ==

= 3.5.0 =
* Rebranded as MDefender-Pro
* Removed registration, subscription, and Stripe payment system
* Malware scanner now uses the MDefender-Pro malware model via API key
* ML engine status reports both WAF and malware model state

= 3.0.0 =
* Complete rebuild with professional admin interface
* Added website vulnerability scanner
* Simplified menu structure
* Improved security features

= 2.0.0 =
* ML-powered detection engine
* Advanced analytics dashboard
* OWASP Top 10 protection

= 1.0.0 =
* Initial release
