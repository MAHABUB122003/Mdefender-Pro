<?php
/**
 * MDefender Pro - Enterprise Cloudflare-Grade Interstitial Human Verification Screen
 *
 * Clean, minimal white architecture matching Cloudflare Turnstile:
 * - Pure white background (#ffffff)
 * - Clear typography: "We need to confirm you're human."
 * - Minimalist Turnstile capsule widget (Silent auto-verify + Click fallback)
 * - Zero dark screens, zero progress bars
 *
 * @package MDefender-Pro
 */

defined('ABSPATH') || exit;

$ray_id = substr(md5($ip . microtime(true)), 0, 16);
$challenge_json = json_encode($challenge_data);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Just a moment... | <?php echo function_exists('esc_html') ? esc_html($site_name) : htmlspecialchars($site_name); ?></title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: #ffffff;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            user-select: none;
            -webkit-font-smoothing: antialiased;
        }

        .challenge-container {
            width: 100%;
            max-width: 520px;
            padding: 40px 20px;
        }

        h1.challenge-title {
            font-size: 28px;
            font-weight: 700;
            color: #000000;
            letter-spacing: -0.02em;
            margin-bottom: 12px;
            line-height: 1.25;
        }

        p.challenge-desc {
            font-size: 15px;
            color: #374151;
            line-height: 1.5;
            margin-bottom: 28px;
        }

        /* The Minimalist Capsule (Matches Cloudflare Turnstile) */
        .mdef-cf-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 320px;
            height: 68px;
            padding: 0 16px 0 14px;
            border-radius: 6px;
            background: #fafafa;
            border: 1px solid #dcdfe4;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 28px;
            position: relative;
        }

        .mdef-cf-box:hover {
            background: #f8faf9;
            border-color: #0B2522;
        }

        .mdef-cf-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .mdef-cf-checkbox {
            width: 26px;
            height: 26px;
            border-radius: 4px;
            border: 2px solid #525252;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
            position: relative;
        }

        .mdef-cf-box:hover .mdef-cf-checkbox {
            border-color: #0B2522;
        }

        .mdef-cf-checkbox.state-loading {
            border-color: transparent !important;
            background: transparent !important;
        }

        .mdef-cf-checkbox.state-success {
            background: #0B2522 !important;
            border-color: #0B2522 !important;
            box-shadow: 0 0 10px rgba(11, 37, 34, 0.35);
        }

        .mdef-cf-spinner {
            display: none;
            width: 22px;
            height: 22px;
            animation: cfSpin 0.75s linear infinite;
        }

        @keyframes cfSpin {
            to { transform: rotate(360deg); }
        }

        .mdef-cf-spinner circle.sp-track {
            fill: none;
            stroke: rgba(11, 37, 34, 0.12);
            stroke-width: 3;
        }

        .mdef-cf-spinner circle.sp-head {
            fill: none;
            stroke: #E8792F;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-dasharray: 38 32;
        }

        .mdef-cf-check {
            display: none;
            width: 17px;
            height: 17px;
        }

        .mdef-cf-text {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
            line-height: 1.25;
            transition: color 0.2s;
        }

        .mdef-cf-text.is-success {
            color: #0B2522;
            font-weight: 700;
        }

        /* Brand on Right */
        .mdef-cf-brand {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            gap: 2px;
            flex-shrink: 0;
        }

        .mdef-brand-row {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .mdef-logo {
            width: 16px;
            height: 17px;
        }

        .mdef-brand-name {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: #0B2522;
        }

        .mdef-brand-legal {
            font-size: 9.5px;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 500;
        }

        .mdef-brand-legal a {
            color: #6b7280;
            text-decoration: underline;
        }

        .mdef-brand-legal a:hover {
            color: #E8792F;
        }

        /* Telemetry Footer */
        .challenge-meta {
            font-size: 13.5px;
            color: #6b7280;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="challenge-container">
        <h1 class="challenge-title">We need to confirm you're human.</h1>
        <p class="challenge-desc">Thanks for helping us keep the bots away. Check the box and let's get you where you're going.</p>

        <!-- Turnstile Capsule Widget -->
        <div class="mdef-cf-box" id="cfBox">
            <div class="mdef-cf-left">
                <div class="mdef-cf-checkbox" id="cfCheck">
                    <!-- High-Tech Spinner -->
                    <svg class="mdef-cf-spinner" id="cfSpinner" viewBox="0 0 24 24">
                        <circle class="sp-track" cx="12" cy="12" r="9"/>
                        <circle class="sp-head" cx="12" cy="12" r="9"/>
                    </svg>
                    <!-- Flame Checkmark -->
                    <svg class="mdef-cf-check" id="cfCheckSvg" viewBox="0 0 24 24">
                        <path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="#E8792F" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <span class="mdef-cf-text" id="cfText">Verify you are human</span>
            </div>

            <div class="mdef-cf-brand">
                <div class="mdef-brand-row">
                    <svg class="mdef-logo" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient id="cfShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#0B2522"/>
                                <stop offset="55%" stop-color="#164E48"/>
                                <stop offset="100%" stop-color="#E8792F"/>
                            </linearGradient>
                        </defs>
                        <path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z" fill="url(#cfShieldGrad)"/>
                        <path d="M12 4L5.5 6.8v5c0 4.2 2.7 8.2 6.5 9.5 3.8-1.3 6.5-5.3 6.5-9.5v-5L12 4z" fill="#ffffff" fill-opacity="0.18"/>
                        <path d="M9.5 12.2l1.8 1.8 3.5-3.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                    <span class="mdef-brand-name">MDEFENDER</span>
                </div>
                <div class="mdef-brand-legal">
                    <a href="https://mdefender.io" target="_blank" rel="noopener">Privacy</a>
                    <span>&bull;</span>
                    <a href="https://mdefender.io" target="_blank" rel="noopener">Help</a>
                </div>
            </div>
        </div>

        <div class="challenge-meta">
            <div>Request ID: <?php echo function_exists('esc_html') ? esc_html($ray_id) : htmlspecialchars($ray_id); ?></div>
            <div>IP: <?php echo function_exists('esc_html') ? esc_html($ip) : htmlspecialchars($ip); ?></div>
        </div>
    </div>

    <script>
    (function() {
        var challengeData = <?php echo $challenge_json; ?>;
        var targetUrl = <?php echo json_encode($target_url); ?>;
        var box = document.getElementById('cfBox');
        var check = document.getElementById('cfCheck');
        var spinner = document.getElementById('cfSpinner');
        var checkSvg = document.getElementById('cfCheckSvg');
        var label = document.getElementById('cfText');

        var isSolving = false;
        var isSolved = false;

        async function sha256(str) {
            var enc = new TextEncoder();
            var buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
            return Array.from(new Uint8Array(buf)).map(function(b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        }

        async function solvePoW() {
            var challenge = challengeData.challenge;
            var targetPrefix = challengeData.difficulty || '000';
            var nonce = 0;
            while (nonce < 2000000) {
                var candidate = challenge + nonce;
                var hash = await sha256(candidate);
                if (hash.startsWith(targetPrefix)) {
                    return nonce;
                }
                nonce++;
            }
            return nonce;
        }

        async function runVerification() {
            if (isSolving || isSolved) return;
            isSolving = true;

            check.className = 'mdef-cf-checkbox state-loading';
            spinner.style.display = 'block';
            checkSvg.style.display = 'none';
            label.textContent = 'Verifying...';

            try {
                var nonce = await solvePoW();

                var fd = new FormData();
                fd.append('mdf_pow_action', 'verify');
                fd.append('mdf_pow_nonce', nonce);
                fd.append('mdf_pow_challenge', challengeData.challenge);
                fd.append('mdf_pow_sig', challengeData.signature);
                fd.append('mdf_pow_redirect', targetUrl);

                var res = await fetch(window.location.href, {
                    method: 'POST',
                    body: fd
                });

                var json = await res.json();
                if (json.success) {
                    isSolved = true;
                    spinner.style.display = 'none';
                    checkSvg.style.display = 'block';
                    check.className = 'mdef-cf-checkbox state-success';
                    label.textContent = 'Success!';
                    label.className = 'mdef-cf-text is-success';

                    setTimeout(function() {
                        if (json.data && json.data.redirect) {
                            window.location.href = json.data.redirect;
                        } else {
                            window.location.reload();
                        }
                    }, 350);
                } else {
                    throw new Error('Verification rejected');
                }
            } catch(e) {
                isSolving = false;
                spinner.style.display = 'none';
                check.className = 'mdef-cf-checkbox';
                label.textContent = 'Verification required. Click to retry.';
            }
        }

        // 1. Silent Verification: Runs on load automatically in clean browsers (< 150ms)
        var isSuspicious = navigator.webdriver === true || !window.crypto || !window.crypto.subtle;
        if (!isSuspicious) {
            setTimeout(runVerification, 80);
        }

        // 2. Interactive Click Fallback: User can click anytime
        box.addEventListener('click', function() {
            runVerification();
        });
    })();
    </script>
</body>
</html>
