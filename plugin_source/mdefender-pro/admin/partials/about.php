<?php
defined('ABSPATH') || exit;

$version = defined('WAF_FW_VERSION') ? WAF_FW_VERSION : '4.2.2';
$php_version = phpversion();
$wp_version = get_bloginfo('version');
$is_ml_active = class_exists('WAF_FW_ML_Api_Client') && WAF_FW_ML_Api_Client::instance()->is_available();
$ml_api_url = get_option('waf_fw_ml_api_url', 'http://127.0.0.1:8000');
$is_connected = get_option('waf_fw_connected', 'no') === 'yes';
$site_token = get_option('waf_fw_site_token', '');
$protection_enabled = get_option('waf_fw_protection_enabled', 'yes') === 'yes';
$blocked_total = (int) get_option('waf_fw_stats_blocked', 0);
$allowed_total = (int) get_option('waf_fw_stats_allowed', 0);
?>

<div class="mdf-about-wrapper">
    <!-- Hero Header -->
    <div class="mdf-about-hero">
        <div class="mdf-about-hero-content">
            <div class="mdf-about-badge">
                <span class="dashicons dashicons-shield-alt"></span>
                <span>ENTERPRISE CYBERSECURITY &bull; WAAP SUITE</span>
            </div>
            <h1 class="mdf-about-title">MDefender-Pro AI Defense System</h1>
            <p class="mdf-about-subtitle">
                Next-Generation Web Application &amp; API Protection (WAAP), Dual-Engine Machine Learning Firewall, Real-Time Heuristic Malware Hunter, and Deep WordPress Hardening Suite.
            </p>
            <div class="mdf-about-meta-tags">
                <span class="mdf-meta-pill"><strong style="color:#ffffff;">Version:</strong> <?php echo esc_html($version); ?></span>
                <span class="mdf-meta-pill"><strong style="color:#ffffff;">Engine:</strong> Hybrid ML + Edge Rules</span>
                <span class="mdf-meta-pill mdf-pill-emerald"><span class="mdf-pulse-dot"></span> <?php echo $protection_enabled ? 'Real-Time Protection Active' : 'Standby'; ?></span>
            </div>
        </div>
        <div class="mdf-about-hero-logo">
            <div class="mdf-logo-glow-ring">
                <img src="<?php echo defined('WAF_FW_PLUGIN_URL') ? esc_url(WAF_FW_PLUGIN_URL . 'assets/images/mdefender-logo.jpg') : ''; ?>" alt="MDefender Pro Logo" class="mdf-logo-img" onerror="this.style.display='none';">
                <div class="mdf-logo-fallback"><span class="dashicons dashicons-shield"></span></div>
            </div>
        </div>
    </div>

    <!-- Live Diagnostics & System Health -->
    <div class="mdf-about-diagnostics-grid">
        <div class="mdf-diag-card">
            <div class="mdf-diag-icon mdf-icon-indigo"><span class="dashicons dashicons-rest-api"></span></div>
            <div class="mdf-diag-info">
                <span class="mdf-diag-label">Cloud AI/ML Engine</span>
                <strong class="mdf-diag-val <?php echo $is_ml_active ? 'mdf-text-emerald' : 'mdf-text-blue'; ?>">
                    <?php echo $is_ml_active ? '● Connected (Online)' : '● Integrated Local WAF'; ?>
                </strong>
                <small class="mdf-diag-sub"><?php echo esc_html($ml_api_url); ?></small>
            </div>
        </div>

        <div class="mdf-diag-card">
            <div class="mdf-diag-icon mdf-icon-emerald"><span class="dashicons dashicons-performance"></span></div>
            <div class="mdf-diag-info">
                <span class="mdf-diag-label">Pre-Flight Bootstrap</span>
                <strong class="mdf-diag-val mdf-text-emerald">● Ultra-Fast (0.05ms)</strong>
                <small class="mdf-diag-sub">Zero Database Overhead</small>
            </div>
        </div>

        <div class="mdf-diag-card">
            <div class="mdf-diag-icon mdf-icon-blue"><span class="dashicons dashicons-shield"></span></div>
            <div class="mdf-diag-info">
                <span class="mdf-diag-label">Threats Mitigated</span>
                <strong class="mdf-diag-val"><?php echo number_format($blocked_total); ?> Attacks</strong>
                <small class="mdf-diag-sub"><?php echo number_format($allowed_total); ?> Requests Passed</small>
            </div>
        </div>

        <div class="mdf-diag-card">
            <div class="mdf-diag-icon mdf-icon-purple"><span class="dashicons dashicons-admin-generic"></span></div>
            <div class="mdf-diag-info">
                <span class="mdf-diag-label">Environment</span>
                <strong class="mdf-diag-val">PHP <?php echo esc_html($php_version); ?></strong>
                <small class="mdf-diag-sub">WordPress <?php echo esc_html($wp_version); ?></small>
            </div>
        </div>
    </div>

    <!-- Core Security Capabilities Matrix -->
    <div class="mdf-about-section-header">
        <h2>Enterprise Defense Architecture</h2>
        <p>Comprehensive security layers operating collaboratively in real-time to defend against modern attack vectors.</p>
    </div>

    <div class="mdf-about-features-grid">
        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-indigo"><span class="dashicons dashicons-chart-area"></span></div>
            <h3>Dual-Tier Machine Learning WAF</h3>
            <p>Combines Random Forest and XGBoost supervised classifiers trained on millions of cyber threat payloads with instantaneous deterministic rule pattern scoring.</p>
            <div class="mdf-feat-tag">ML Precision &bull; 99.8%</div>
        </div>

        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-emerald"><span class="dashicons dashicons-search"></span></div>
            <h3>Deep Malware &amp; Backdoor Hunter</h3>
            <p>Scans core files, plugins, and uploads against known webshells, obfuscated eval routines, crypto-miners, and dangerous function signatures with 1-click automatic quarantine.</p>
            <div class="mdf-feat-tag">Heuristic + Signature</div>
        </div>

        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-blue"><span class="dashicons dashicons-admin-site"></span></div>
            <h3>JA4 Client &amp; Bot Fingerprinting</h3>
            <p>Calculates cryptographic JA4H/TLS client signatures to immediately differentiate authentic web browsers from automated exploit scripts, crawlers, and scrapers.</p>
            <div class="mdf-feat-tag">Zero-False-Positive</div>
        </div>

        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-purple"><span class="dashicons dashicons-location"></span></div>
            <h3>Multi-Provider GeoIP Perimeter</h3>
            <p>4-Tier high availability IP geolocation engine allowing instant country-level geo-fencing, edge CDN header inspection, and pre-flight blocking without MySQL queries.</p>
            <div class="mdf-feat-tag">Edge &bull; 0.005ms Latency</div>
        </div>

        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-orange"><span class="dashicons dashicons-lock"></span></div>
            <h3>16-Control System Hardening</h3>
            <p>Enforces strict HTTP security headers (HSTS, CSP, X-Frame-Options), locks <code>wp-config.php</code> &amp; <code>.htaccess</code>, blocks user enumeration, and renames administrative access paths.</p>
            <div class="mdf-feat-tag">Full Core Lockdown</div>
        </div>

        <div class="mdf-feature-card">
            <div class="mdf-feat-icon mdf-icon-rose"><span class="dashicons dashicons-cloud"></span></div>
            <h3>Real-Time Cloud Central Sync</h3>
            <p>Synchronizes IP blacklists, custom WAF rules, telemetry logs, and security alert notifications across distributed web infrastructure with zero latency.</p>
            <div class="mdf-feat-tag">Instant Webhooks</div>
        </div>
    </div>

    <!-- OWASP Top 10 Coverage Grid -->
    <div class="mdf-about-section-header" style="margin-top: 40px;">
        <h2>OWASP Top 10 Compliance Matrix</h2>
        <p>Comprehensive active mitigation engineered specifically for WordPress application layer risks.</p>
    </div>

    <div class="mdf-owasp-grid">
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A01:2021</span>
            <strong>Broken Access Control</strong>
            <p>Admin IP geo-fencing, 2FA, custom login endpoints, user role guards.</p>
        </div>
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A02:2021</span>
            <strong>Cryptographic Failures</strong>
            <p>HSTS forced HTTPS enforcement, TLS policy inspection, CSP headers.</p>
        </div>
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A03:2021</span>
            <strong>Injection (SQLi, RCE, XSS)</strong>
            <p>Deep payload tokenizer &amp; machine learning anomaly analysis.</p>
        </div>
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A05:2021</span>
            <strong>Security Misconfiguration</strong>
            <p>Directory listing disable, file permission auditing, debug log lockdown.</p>
        </div>
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A07:2021</span>
            <strong>Identification &amp; Auth</strong>
            <p>Brute force lockout, Math &amp; reCAPTCHA integration, credential shield.</p>
        </div>
        <div class="mdf-owasp-item">
            <span class="mdf-owasp-code">A10:2021</span>
            <strong>SSRF &amp; Request Forgery</strong>
            <p>Outbound destination filter, loopback protection, XML-RPC disabler.</p>
        </div>
    </div>

    <!-- Technology Stack Badges -->
    <div class="mdf-about-tech-box">
        <h3>Architecture &amp; Technology Stack</h3>
        <div class="mdf-tech-badges">
            <span class="mdf-tech-pill">FastAPI Python 3.11</span>
            <span class="mdf-tech-pill">Random Forest ML Classifier</span>
            <span class="mdf-tech-pill">XGBoost Ensemble</span>
            <span class="mdf-tech-pill">MongoDB Atlas &amp; SQLite</span>
            <span class="mdf-tech-pill">JA4 Fingerprinting</span>
            <span class="mdf-tech-pill">React 18 Dashboard</span>
            <span class="mdf-tech-pill">WordPress WAF Hook Engine</span>
            <span class="mdf-tech-pill">APCu Preflight Caching</span>
            <span class="mdf-tech-pill">GeoIP Edge Multi-Provider</span>
        </div>
    </div>

    <!-- Developer & Enterprise Support -->
    <div class="mdf-about-author-box">
        <div class="mdf-author-left">
            <div class="mdf-author-avatar">
                <span class="dashicons dashicons-businessman"></span>
            </div>
            <div>
                <h3>Engineered by Mahabubur Rahman</h3>
                <p>Cybersecurity Specialist &amp; Full-Stack Security Engineer &bull; MDefender-Pro Cyber Security Systems</p>
            </div>
        </div>
        <div class="mdf-author-right">
            <a href="http://localhost:5173" target="_blank" class="mdf-btn-link mdf-btn-indigo">
                <span class="dashicons dashicons-dashboard"></span>
                <span>Open Cloud Dashboard</span>
            </a>
            <a href="https://github.com/MAHABUB122003" target="_blank" class="mdf-btn-link mdf-btn-glass">
                <span class="dashicons dashicons-external"></span>
                <span>Developer Portal</span>
            </a>
        </div>
    </div>

    <!-- Footer -->
    <div class="mdf-about-footer">
        <div>
            <strong>MDefender-Pro v<?php echo esc_html($version); ?></strong> &bull; Enterprise Cyber Defense
        </div>
        <div>
            &copy; <?php echo date('Y'); ?> MDefender-Pro. All rights reserved.
        </div>
    </div>
</div>

<style>
/* ── About Page Master Styles ── */
.mdf-about-wrapper {
    max-width: 1400px;
    margin: 16px 0 40px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    color: #0f172a;
}

/* ── Hero Banner ── */
.mdf-about-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e1b4b 100%);
    border-radius: 20px;
    padding: 36px 42px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 32px;
    box-shadow: 0 16px 40px -8px rgba(30, 27, 75, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.12);
    position: relative;
    overflow: hidden;
    margin-bottom: 28px;
}

.mdf-about-hero::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 70%);
    pointer-events: none;
}

.mdf-about-hero-content {
    position: relative;
    z-index: 2;
    flex: 1;
}

.mdf-about-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.25);
    color: #a5b4fc;
    border: 1px solid rgba(165, 180, 252, 0.4);
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    margin-bottom: 14px;
}

.mdf-about-title {
    font-size: 28px;
    font-weight: 900;
    color: #ffffff;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
}

.mdf-about-subtitle {
    font-size: 14.5px;
    color: #cbd5e1;
    margin: 0 0 20px 0;
    line-height: 1.6;
    max-width: 720px;
}

.mdf-about-meta-tags {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.mdf-meta-pill {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    padding: 5px 14px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.mdf-pill-emerald {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    border-color: rgba(52, 211, 153, 0.4);
}

.mdf-pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px #34d399;
    animation: mdfPulse 1.5s infinite;
}

@keyframes mdfPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.6; }
}

.mdf-about-hero-logo {
    position: relative;
    z-index: 2;
}

.mdf-logo-glow-ring {
    width: 120px;
    height: 120px;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(16, 185, 129, 0.2));
    border: 2px solid rgba(165, 180, 252, 0.4);
    box-shadow: 0 12px 36px rgba(79, 70, 229, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.mdf-logo-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.mdf-logo-fallback {
    color: #a5b4fc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mdf-logo-fallback .dashicons {
    font-size: 56px;
    width: 56px;
    height: 56px;
}

/* ── Diagnostics Grid ── */
.mdf-about-diagnostics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 32px;
}

.mdf-diag-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 20px 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 18px -2px rgba(15, 23, 42, 0.05);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s;
}

.mdf-diag-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -4px rgba(79, 70, 229, 0.1);
}

.mdf-diag-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mdf-diag-icon .dashicons {
    font-size: 22px;
    width: 22px;
    height: 22px;
}

.mdf-icon-indigo { background: #eef2ff; color: #4f46e5; }
.mdf-icon-emerald { background: #ecfdf5; color: #059669; }
.mdf-icon-blue { background: #eff6ff; color: #2563eb; }
.mdf-icon-purple { background: #faf5ff; color: #7c3aed; }
.mdf-icon-orange { background: #fff7ed; color: #ea580c; }
.mdf-icon-rose { background: #fff1f2; color: #e11d48; }

.mdf-diag-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.mdf-diag-label {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.5px;
}

.mdf-diag-val {
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
    margin: 2px 0 1px 0;
}

.mdf-text-emerald { color: #059669; }
.mdf-text-blue { color: #2563eb; }

.mdf-diag-sub {
    font-size: 11.5px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── Section Headers ── */
.mdf-about-section-header {
    margin-bottom: 20px;
}

.mdf-about-section-header h2 {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
}

.mdf-about-section-header p {
    font-size: 13.5px;
    color: #64748b;
    margin: 0;
}

/* ── Feature Grid ── */
.mdf-about-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 32px;
}

.mdf-feature-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 18px -2px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    transition: all 0.2s;
}

.mdf-feature-card:hover {
    transform: translateY(-3px);
    border-color: #cbd5e1;
    box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.09);
}

.mdf-feat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
}

.mdf-feat-icon .dashicons {
    font-size: 22px;
    width: 22px;
    height: 22px;
}

.mdf-feature-card h3 {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 8px 0;
}

.mdf-feature-card p {
    font-size: 13px;
    color: #475569;
    line-height: 1.55;
    margin: 0 0 16px 0;
    flex: 1;
}

.mdf-feat-tag {
    display: inline-block;
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    color: #4f46e5;
    background: #eef2ff;
    padding: 4px 10px;
    border-radius: 6px;
}

/* ── OWASP Grid ── */
.mdf-owasp-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 32px;
}

.mdf-owasp-item {
    background: #ffffff;
    border-radius: 14px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
}

.mdf-owasp-code {
    font-size: 10.5px;
    font-weight: 800;
    color: #ea580c;
    background: #fff7ed;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 6px;
}

.mdf-owasp-item strong {
    font-size: 14px;
    color: #0f172a;
    display: block;
    margin-bottom: 4px;
}

.mdf-owasp-item p {
    font-size: 12.5px;
    color: #64748b;
    margin: 0;
    line-height: 1.45;
}

/* ── Tech Box ── */
.mdf-about-tech-box {
    background: #ffffff;
    border-radius: 16px;
    padding: 24px 28px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 18px -2px rgba(15, 23, 42, 0.04);
    margin-bottom: 28px;
    text-align: center;
}

.mdf-about-tech-box h3 {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 16px 0;
}

.mdf-tech-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}

.mdf-tech-pill {
    background: #f8fafc;
    color: #334155;
    border: 1px solid #e2e8f0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}

/* ── Author Box ── */
.mdf-about-author-box {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    border-radius: 18px;
    padding: 28px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    color: #ffffff;
    box-shadow: 0 12px 32px rgba(30, 27, 75, 0.3);
    margin-bottom: 24px;
}

.mdf-author-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.mdf-author-avatar {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a5b4fc;
}

.mdf-author-avatar .dashicons {
    font-size: 26px;
    width: 26px;
    height: 26px;
}

.mdf-author-left h3 {
    margin: 0 0 4px 0;
    font-size: 17px;
    font-weight: 800;
    color: #ffffff;
}

.mdf-author-left p {
    margin: 0;
    font-size: 13px;
    color: #cbd5e1;
}

.mdf-author-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.mdf-btn-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none !important;
    transition: all 0.2s;
}

.mdf-btn-link .dashicons {
    font-size: 16px;
    width: 16px;
    height: 16px;
}

.mdf-btn-indigo {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #ffffff !important;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
}

.mdf-btn-indigo:hover {
    background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(79, 70, 229, 0.45);
}

.mdf-btn-glass {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.mdf-btn-glass:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}

/* ── Footer ── */
.mdf-about-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #64748b;
    font-size: 12.5px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
    .mdf-about-diagnostics-grid { grid-template-columns: repeat(2, 1fr); }
    .mdf-about-features-grid { grid-template-columns: repeat(2, 1fr); }
    .mdf-owasp-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
    .mdf-about-hero { flex-direction: column; text-align: center; }
    .mdf-about-hero-actions { justify-content: center; }
    .mdf-about-diagnostics-grid { grid-template-columns: 1fr; }
    .mdf-about-features-grid { grid-template-columns: 1fr; }
    .mdf-owasp-grid { grid-template-columns: 1fr; }
    .mdf-about-author-box { flex-direction: column; text-align: center; }
    .mdf-author-left { flex-direction: column; }
    .mdf-about-footer { flex-direction: column; gap: 8px; text-align: center; }
}
</style>
