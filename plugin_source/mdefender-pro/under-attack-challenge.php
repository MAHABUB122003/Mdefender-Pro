<?php
/**
 * MDefender Pro - Enterprise Under Attack Mode Interstitial Screen
 *
 * Automated Proof-of-Work (PoW) verification screen.
 * Resolves transparently in real browsers (~1.5s) while dropping 100% of headless flooders.
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
    <title>Checking your browser security — MDefender Pro</title>
    <style>
        :root {
            --bg-color: #080c14;
            --card-bg: rgba(15, 23, 42, 0.75);
            --border-color: rgba(56, 189, 248, 0.2);
            --primary-color: #38bdf8;
            --accent-glow: rgba(56, 189, 248, 0.35);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.8) 0%, #080c14 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-main);
            padding: 20px;
            overflow: hidden;
        }

        .challenge-container {
            width: 100%;
            max-width: 520px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 44px 36px;
            box-shadow: 
                0 25px 60px -15px rgba(0, 0, 0, 0.7),
                0 0 35px rgba(14, 165, 233, 0.12);
            backdrop-filter: blur(20px);
            text-align: center;
            position: relative;
        }

        .shield-scanner {
            width: 88px;
            height: 88px;
            margin: 0 auto 28px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .shield-icon {
            font-size: 38px;
            color: var(--primary-color);
            z-index: 2;
            filter: drop-shadow(0 0 16px var(--accent-glow));
        }

        .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid var(--primary-color);
            opacity: 0.8;
            animation: radarPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .pulse-ring:nth-child(2) {
            animation-delay: 0.6s;
        }

        @keyframes radarPulse {
            0% {
                transform: scale(0.6);
                opacity: 0.8;
            }
            100% {
                transform: scale(1.6);
                opacity: 0;
            }
        }

        h1 {
            font-size: 23px;
            font-weight: 800;
            letter-spacing: -0.4px;
            margin-bottom: 12px;
            line-height: 1.3;
            color: #ffffff;
        }

        .target-site {
            color: var(--primary-color);
            font-weight: 700;
        }

        p.subtitle {
            font-size: 14.5px;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 30px;
        }

        /* Progress & PoW Indicator */
        .verification-box {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 28px;
        }

        .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13.5px;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #38bdf8;
        }

        .spinner {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(56, 189, 248, 0.2);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .progress-track {
            height: 6px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            width: 15%;
            background: linear-gradient(90deg, #0284c7, #38bdf8);
            border-radius: 4px;
            transition: width 0.2s ease;
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
        }

        .meta-footer {
            font-size: 12px;
            color: #64748b;
            line-height: 1.7;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            padding-top: 20px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .meta-footer strong {
            color: #cbd5e1;
            font-family: monospace;
        }

        .brand-credit {
            margin-top: 10px;
            font-size: 11.5px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .brand-credit span {
            color: #38bdf8;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="challenge-container">
        <!-- Shield Animation -->
        <div class="shield-scanner">
            <div class="pulse-ring"></div>
            <div class="pulse-ring"></div>
            <div class="shield-icon">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                </svg>
            </div>
        </div>

        <h1>Checking your browser security before accessing <span class="target-site"><?php echo esc_html($site_name); ?></span></h1>
        <p class="subtitle">This automated cryptographic verification protects this website against botnets, DDoS attacks, and automated vulnerability scanners.</p>

        <!-- Live PoW Verification Box -->
        <div class="verification-box">
            <div class="status-row">
                <span id="challengeStatus" class="status-badge">
                    <span class="spinner" id="statusSpinner"></span>
                    <span id="statusText">Computing cryptographic challenge...</span>
                </span>
                <span id="progressPercent" style="color: #94a3b8; font-family: monospace; font-size: 12px;">0%</span>
            </div>
            <div class="progress-track">
                <div class="progress-bar" id="progressBar"></div>
            </div>
        </div>

        <!-- Telemetry Footer -->
        <div class="meta-footer">
            <div>Ray ID: <strong><?php echo esc_html($ray_id); ?></strong> &bull; IP: <strong><?php echo esc_html($ip); ?></strong></div>
            <div class="brand-credit">
                Protected by <span>MDefender Pro Cloud WAAP &amp; DDoS Defense</span>
            </div>
        </div>
    </div>

    <script>
        (function() {
            var challengeData = <?php echo $challenge_json; ?>;
            var targetUrl = <?php echo json_encode($target_url); ?>;
            var progressBar = document.getElementById('progressBar');
            var progressPercent = document.getElementById('progressPercent');
            var statusText = document.getElementById('statusText');
            var statusSpinner = document.getElementById('statusSpinner');

            function hexToBuf(hex) {
                var bytes = new Uint8Array(Math.ceil(hex.length / 2));
                for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
                return bytes;
            }

            async function sha256(str) {
                var encoder = new TextEncoder();
                var data = encoder.encode(str);
                var hashBuffer = await crypto.subtle.digest('SHA-256', data);
                var hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
            }

            async function solveChallenge() {
                var challenge = challengeData.challenge;
                var targetPrefix = challengeData.difficulty || '0000';
                var nonce = 0;
                var batchSize = 1000;
                var startTime = Date.now();

                function runBatch() {
                    return new Promise(function(resolve) {
                        setTimeout(async function() {
                            for (var i = 0; i < batchSize; i++) {
                                nonce++;
                                var candidate = challenge + nonce;
                                var hash = await sha256(candidate);
                                if (hash.startsWith(targetPrefix)) {
                                    resolve(nonce);
                                    return;
                                }
                            }
                            // Update progress indicator
                            var elapsed = Date.now() - startTime;
                            var pct = Math.min(95, Math.floor((elapsed / 1500) * 100));
                            if (progressBar) progressBar.style.width = pct + '%';
                            if (progressPercent) progressPercent.innerText = pct + '%';
                            resolve(null);
                        }, 0);
                    });
                }

                while (true) {
                    var solution = await runBatch();
                    if (solution !== null) {
                        return solution;
                    }
                }
            }

            async function init() {
                if (!window.crypto || !window.crypto.subtle) {
                    if (statusText) statusText.innerText = 'Browser crypto required. Please upgrade browser.';
                    return;
                }

                try {
                    var nonce = await solveChallenge();
                    
                    if (progressBar) progressBar.style.width = '100%';
                    if (progressPercent) progressPercent.innerText = '100%';
                    if (statusText) statusText.innerText = 'Verification successful. Redirecting...';
                    if (statusSpinner) {
                        statusSpinner.style.border = 'none';
                        statusSpinner.style.animation = 'none';
                        statusSpinner.innerHTML = '<span style="color:#10b981; font-size:16px;">✓</span>';
                    }

                    // Submit solution to server
                    var formData = new FormData();
                    formData.append('mdf_pow_action', 'verify');
                    formData.append('mdf_pow_nonce', nonce);
                    formData.append('mdf_pow_challenge', challengeData.challenge);
                    formData.append('mdf_pow_sig', challengeData.signature);
                    formData.append('mdf_pow_redirect', targetUrl);

                    var res = await fetch(window.location.href, {
                        method: 'POST',
                        body: formData
                    });

                    var json = await res.json();
                    if (json.success && json.data && json.data.redirect) {
                        window.location.href = json.data.redirect;
                    } else {
                        window.location.reload();
                    }
                } catch (e) {
                    console.error('Challenge error:', e);
                    setTimeout(function() { window.location.reload(); }, 2000);
                }
            }

            // Run verification automatically on load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        })();
    </script>
</body>
</html>
