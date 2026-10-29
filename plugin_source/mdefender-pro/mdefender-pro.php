<?php
/**
 * Plugin Name: MDefender-Pro
 * Plugin URI: https://mdefender-pro.io
 * Description: AI/ML-Powered Web Application Firewall and Malware Scanner, powered by the MDefender-Pro cloud service. Connects to your MDefender-Pro dashboard with a website API key for ML WAF decisions and malware scanning.
 * Version: 4.3.0
 * Author: MDefender-Pro Team
 * Author URI: https://mdefender-pro.io
 * License: GPL v2 or later
 * Text Domain: mdefender-pro
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

if (!defined('WAF_FW_MAIN_FILE')) {
    define('WAF_FW_MAIN_FILE', __FILE__);
}

// 1. Ultra-Fast Pre-Flight Ingress Firewall (Microsecond Edge execution)
if (file_exists(__DIR__ . '/waf-bootstrap.php')) {
    require_once __DIR__ . '/waf-bootstrap.php';
}

require_once __DIR__ . '/waf-firewall.php';
