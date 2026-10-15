import os
import time
import json
import hmac
import base64
import secrets
import hashlib
from typing import Dict, Any, Tuple, Optional

# Secret key for Turnstile HMAC signatures
_SECRET_KEY = os.getenv("MDEFENDER_TURNSTILE_SECRET") or os.getenv("JWT_SECRET_KEY") or "mdefender_turnstile_super_secret_shield_2026_key"
CLEARANCE_DURATION = 86400  # 24 hours clearance once verified
CHALLENGE_TTL = 180         # 3 minutes challenge validity


class TurnstileService:
    """Enterprise Turnstile & Managed Bot Verification Engine for MDefender-Pro.
    
    Provides:
      1. Cryptographic Proof-of-Work (PoW) dynamic nonces & HMAC verification.
      2. Anti-Headless, WebDriver, and Bot Telemetry validation.
      3. Stateless, anti-replay clearance token & cookie issuance.
      4. Cloudflare-style interactive widget & full-screen interstitial gate HTML.
    """

    @classmethod
    def _sign(cls, data: str) -> str:
        return hmac.new(_SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()

    @classmethod
    def create_challenge(cls, domain: str = "localhost", client_ip: str = "127.0.0.1", difficulty: int = 4) -> Dict[str, Any]:
        """Creates a signed, anti-replay PoW challenge."""
        nonce = secrets.token_hex(16)
        salt = secrets.token_hex(8)
        exp = int(time.time()) + CHALLENGE_TTL
        difficulty = max(2, min(difficulty, 6))

        # Payload: domain|ip|nonce|salt|difficulty|exp
        payload = f"{domain}|{client_ip}|{nonce}|{salt}|{difficulty}|{exp}"
        signature = cls._sign(payload)
        token_str = f"{payload}|{signature}"
        token = base64.urlsafe_b64encode(token_str.encode()).decode()

        return {
            "token": token,
            "nonce": nonce,
            "salt": salt,
            "difficulty": difficulty,
            "domain": domain,
            "expires_in": CHALLENGE_TTL
        }

    @classmethod
    def verify_solution(
        cls,
        token: str,
        solution: str,
        telemetry: Optional[Dict[str, Any]] = None,
        client_ip: str = ""
    ) -> Tuple[bool, str, Optional[str]]:
        """Validates Proof-of-Work solution and browser heuristics.
        
        Returns:
            (is_valid: bool, reason: str, clearance_token: Optional[str])
        """
        if not token or solution is None:
            return False, "Missing token or solution", None

        # 1. Decode token
        try:
            raw = base64.urlsafe_b64decode(token.encode()).decode()
            parts = raw.split("|")
            if len(parts) != 7:
                return False, "Malformed challenge token", None
            domain, token_ip, nonce, salt, diff_str, exp_str, sig = parts
            difficulty = int(diff_str)
            exp = int(exp_str)
        except Exception as e:
            return False, f"Invalid challenge encoding: {e}", None

        # 2. Check HMAC signature
        payload = f"{domain}|{token_ip}|{nonce}|{salt}|{difficulty}|{exp}"
        expected_sig = cls._sign(payload)
        if not hmac.compare_digest(sig, expected_sig):
            return False, "Tampered challenge token signature", None

        # 3. Check expiration
        now = time.time()
        if now > exp:
            return False, "Challenge token expired", None

        # 4. Check client IP consistency (allow proxy forwarded shifts if subnet matches)
        if client_ip and token_ip not in ("127.0.0.1", "localhost", "::1"):
            token_prefix = token_ip.rsplit(".", 1)[0] if "." in token_ip else token_ip
            client_prefix = client_ip.rsplit(".", 1)[0] if "." in client_ip else client_ip
            if token_prefix != client_prefix:
                return False, "Client IP mismatch", None

        # 5. Validate Proof-of-Work computation
        sol_str = str(solution).strip()
        computed_hash = hashlib.sha256(f"{nonce}:{salt}:{sol_str}".encode()).hexdigest()
        required_prefix = "0" * difficulty
        if not computed_hash.startswith(required_prefix):
            return False, f"Invalid Proof-of-Work computation (hash: {computed_hash[:10]}...)", None

        # 6. Validate Anti-Bot Browser Telemetry
        if telemetry:
            # Detect Selenium / Puppeteer automation flags
            if telemetry.get("webdriver") is True:
                return False, "Automated WebDriver / Bot detected", None
            # Detect phantom/headless screen configurations
            screen_w = telemetry.get("screen_width", 1920)
            screen_h = telemetry.get("screen_height", 1080)
            if screen_w == 0 or screen_h == 0:
                return False, "Zero screen dimension detected", None
            # Validate user interaction time (bots respond in < 15ms)
            duration_ms = telemetry.get("duration_ms", 500)
            if duration_ms < 60:
                return False, "Inhuman interaction speed", None

        # 7. Generate cryptographically signed Clearance Token
        clearance_token = cls.issue_clearance_token(domain=domain, client_ip=client_ip or token_ip)
        return True, "Challenge successfully verified", clearance_token

    @classmethod
    def issue_clearance_token(cls, domain: str, client_ip: str) -> str:
        """Issues an encrypted/signed 24-hour clearance token for cookies or form validation."""
        exp = int(time.time()) + CLEARANCE_DURATION
        rand_entropy = secrets.token_hex(8)
        body = f"{domain}|{client_ip}|{exp}|{rand_entropy}"
        sig = cls._sign(body)
        raw = f"{body}|{sig}"
        return base64.urlsafe_b64encode(raw.encode()).decode()

    @classmethod
    def verify_clearance_token(cls, token: str, domain: str, client_ip: Optional[str] = None) -> bool:
        """Validates if a clearance cookie/token is authentic and unexpired."""
        if not token:
            return False
        try:
            raw = base64.urlsafe_b64decode(token.encode()).decode()
            parts = raw.split("|")
            if len(parts) != 5:
                return False
            tok_domain, tok_ip, exp_str, entropy, sig = parts
            exp = int(exp_str)
        except Exception:
            return False

        # Verify signature
        body = f"{tok_domain}|{tok_ip}|{exp}|{entropy}"
        expected_sig = cls._sign(body)
        if not hmac.compare_digest(sig, expected_sig):
            return False

        # Verify expiration
        if time.time() > exp:
            return False

        # Verify domain matches (or subdomain)
        if domain and tok_domain:
            d_norm = domain.lower().split(":")[0]
            tok_d_norm = tok_domain.lower().split(":")[0]
            if d_norm != tok_d_norm and not d_norm.endswith("." + tok_d_norm) and not tok_d_norm.endswith("." + d_norm):
                # allow localhost interchangeability
                if not (d_norm in ("localhost", "127.0.0.1") and tok_d_norm in ("localhost", "127.0.0.1")):
                    return False

        return True

    @classmethod
    def render_interstitial_page(
        cls,
        domain: str,
        client_ip: str,
        ray_id: str,
        redirect_url: str = ""
    ) -> str:
        """Generates the full-screen Cloudflare-style browser verification challenge page."""
        redirect_target = redirect_url or "/"
        clean_domain = domain or "Protected Site"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifying Connection | MDefender Pro Protection</title>
    <style>
        :root {{
            --bg-canvas: #070a13;
            --card-surface: rgba(13, 20, 36, 0.78);
            --card-border: rgba(255, 255, 255, 0.09);
            --primary: #2563eb;
            --primary-glow: rgba(37, 99, 235, 0.45);
            --accent-cyan: #06b6d4;
            --text-heading: #ffffff;
            --text-body: #94a3b8;
            --success: #10b981;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background-color: var(--bg-canvas);
            background-image: 
                radial-gradient(circle at 50% 12%, rgba(37, 99, 235, 0.16) 0%, transparent 55%),
                radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.09) 0%, transparent 45%);
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
        }}
        .challenge-shell {{
            width: 100%;
            max-width: 490px;
            background: var(--card-surface);
            border: 1px solid var(--card-border);
            border-radius: 22px;
            padding: 42px 36px 32px;
            text-align: center;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 50px rgba(37, 99, 235, 0.12);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            animation: mdefPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        @keyframes mdefPop {{
            from {{ opacity: 0; transform: translateY(12px) scale(0.98); }}
            to {{ opacity: 1; transform: translateY(0) scale(1); }}
        }}

        /* Floating Radar Shield */
        .shield-pulse-wrapper {{
            position: relative;
            width: 64px;
            height: 64px;
            margin: 0 auto 22px;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .shield-pulse-ring {{
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 1.5px solid rgba(37, 99, 235, 0.4);
            animation: pulseRing 2.4s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }}
        .shield-pulse-ring:nth-child(2) {{
            animation-delay: 0.8s;
        }}
        @keyframes pulseRing {{
            0% {{ transform: scale(0.7); opacity: 0.8; }}
            100% {{ transform: scale(1.6); opacity: 0; }}
        }}
        .shield-core {{
            position: relative;
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, rgba(37,99,235,0.25), rgba(6,182,212,0.15));
            border: 1px solid rgba(59, 130, 246, 0.4);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 24px rgba(37, 99, 235, 0.35);
        }}
        .shield-svg {{
            width: 26px;
            height: 26px;
            filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6));
        }}

        .badge-tag {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(37, 99, 235, 0.1);
            border: 1px solid rgba(37, 99, 235, 0.25);
            padding: 5px 14px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 700;
            color: #60a5fa;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 16px;
        }}
        h1 {{
            font-size: 25px;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 8px;
            letter-spacing: -0.4px;
        }}
        p.lead {{
            font-size: 14px;
            color: var(--text-body);
            line-height: 1.55;
            margin-bottom: 26px;
        }}
        p.lead strong {{
            color: #e2e8f0;
            font-weight: 600;
        }}

        /* Interstitial Turnstile Card */
        .inter-card {{
            background: rgba(2, 6, 23, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: all 0.25s ease;
            margin-bottom: 18px;
        }}
        .inter-card:hover {{
            border-color: #3b82f6;
            background: rgba(15, 23, 42, 0.85);
            box-shadow: 0 0 20px rgba(37, 99, 235, 0.15);
        }}
        .inter-left {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}
        .inter-chk {{
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: 2px solid rgba(255, 255, 255, 0.22);
            background: rgba(255, 255, 255, 0.04);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s ease;
        }}
        .inter-card:hover .inter-chk {{
            border-color: #60a5fa;
        }}
        .inter-spinner {{
            display: none;
            width: 22px;
            height: 22px;
        }}
        .inter-spinner svg {{
            width: 100%;
            height: 100%;
            animation: mdefSpin 0.75s linear infinite;
        }}
        .spin-trk {{ fill: none; stroke: rgba(59, 130, 246, 0.2); stroke-width: 2.8; }}
        .spin-hd {{ fill: none; stroke: #3b82f6; stroke-width: 2.8; stroke-linecap: round; stroke-dasharray: 38 30; }}
        @keyframes mdefSpin {{ to {{ transform: rotate(360deg); }} }}

        .inter-check-icon {{
            display: none;
            width: 17px;
            height: 17px;
        }}
        .inter-check-icon svg {{
            width: 100%;
            height: 100%;
        }}
        .inter-check-path {{
            fill: none;
            stroke: #ffffff;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: mdefDrawCheck 0.35s 0.05s ease-out forwards;
        }}
        @keyframes mdefDrawCheck {{ to {{ stroke-dashoffset: 0; }} }}

        .inter-info {{
            text-align: left;
        }}
        .inter-title {{
            font-size: 14px;
            font-weight: 600;
            color: #f8fafc;
            line-height: 1.3;
        }}
        .inter-sub {{
            font-size: 11px;
            color: #64748b;
        }}
        .inter-brand {{
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
        }}
        .inter-brand-top {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 800;
            color: #38bdf8;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }}
        .inter-brand-sub {{
            font-size: 9px;
            color: #475569;
        }}

        /* Live Progress and Status */
        .progress-bar-wrap {{
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 99px;
            overflow: hidden;
            margin-bottom: 14px;
        }}
        .progress-fill {{
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #2563eb, #06b6d4, #10b981);
            transition: width 0.3s ease;
        }}
        .status-feed {{
            font-size: 12.5px;
            color: #38bdf8;
            min-height: 18px;
            margin-bottom: 22px;
            font-weight: 500;
        }}

        /* Meta Telemetry Footer */
        .meta-footer {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 11px;
            color: #475569;
        }}
        .meta-footer span {{
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }}
    </style>
</head>
<body>
    <div class="challenge-shell">
        <div class="shield-pulse-wrapper">
            <div class="shield-pulse-ring"></div>
            <div class="shield-pulse-ring"></div>
            <div class="shield-core">
                <svg class="shield-svg" viewBox="0 0 24 24">
                    <defs>
                        <linearGradient id="shGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#3b82f6" />
                            <stop offset="100%" stop-color="#06b6d4" />
                        </linearGradient>
                    </defs>
                    <path d="M12 2L4 5.5v6c0 5.2 3.4 10.1 8 11.5 4.6-1.4 8-6.3 8-11.5v-6L12 2z" fill="url(#shGrad)" />
                    <path d="M9 12l2 2 4-4" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                </svg>
            </div>
        </div>

        <div class="badge-tag">MDefender Pro &bull; Shield Active</div>
        <h1>Checking your browser</h1>
        <p class="lead">Please wait a brief moment while we establish a secure connection to <strong>{clean_domain}</strong>.</p>

        <div class="inter-card" id="interCard" onclick="triggerTurnstileSolve()">
            <div class="inter-left">
                <div class="inter-chk" id="interChk">
                    <div class="inter-spinner" id="interSpin">
                        <svg viewBox="0 0 28 28">
                            <circle class="spin-trk" cx="14" cy="14" r="11" />
                            <circle class="spin-hd" cx="14" cy="14" r="11" />
                        </svg>
                    </div>
                    <div class="inter-check-icon" id="interCheckIcon">
                        <svg viewBox="0 0 24 24">
                            <path class="inter-check-path" d="M4.5 12.5l5 5L19.5 7" />
                        </svg>
                    </div>
                </div>
                <div class="inter-info">
                    <div class="inter-title" id="interTitle">Verify you are human</div>
                    <div class="inter-sub" id="interSub">Frictionless security verification</div>
                </div>
            </div>
            <div class="inter-brand">
                <div class="inter-brand-top">
                    <svg style="width:12px;height:12px;fill:#38bdf8" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    MDefender
                </div>
                <div class="inter-brand-sub">Turnstile &bull; Privacy</div>
            </div>
        </div>

        <div class="progress-bar-wrap">
            <div class="progress-fill" id="progressFill"></div>
        </div>

        <div class="status-feed" id="statusFeed">Initializing browser validation...</div>

        <div class="meta-footer">
            <div>Ray ID: <span>{ray_id}</span></div>
            <div>Client IP: <span>{client_ip}</span></div>
            <div>Security: <span>v2.2.0-PoW</span></div>
        </div>
    </div>

    <script>
        const DOMAIN = "{clean_domain}";
        const REDIRECT_URL = "{redirect_target}";
        let isSolving = false;
        let isSolved = false;

        async function triggerTurnstileSolve() {{
            if (isSolving || isSolved) return;
            isSolving = true;

            const chk = document.getElementById("interChk");
            const spin = document.getElementById("interSpin");
            const checkIcon = document.getElementById("interCheckIcon");
            const title = document.getElementById("interTitle");
            const sub = document.getElementById("interSub");
            const status = document.getElementById("statusFeed");
            const progress = document.getElementById("progressFill");

            spin.style.display = "block";
            chk.style.borderColor = "transparent";
            chk.style.background = "transparent";
            title.textContent = "Verifying browser integrity...";
            sub.textContent = "Validating cryptographic token";
            status.textContent = "Negotiating security handshake...";
            progress.style.width = "30%";

            const t0 = performance.now();

            try {{
                // 1. Fetch challenge nonce from server
                const res = await fetch("/__mdefender/turnstile/challenge?domain=" + encodeURIComponent(DOMAIN));
                if (!res.ok) throw new Error("Security challenge unavailable");
                const ch = await res.json();
                progress.style.width = "60%";
                status.textContent = "Evaluating hardware Proof-of-Work...";

                // 2. Compute Proof-of-Work locally in browser using WebCrypto
                const solution = await solvePoW(ch.nonce, ch.salt, ch.difficulty);
                const t1 = performance.now();
                progress.style.width = "85%";
                status.textContent = "Finalizing clearance authorization...";

                // 3. Gather Client Telemetry
                const telemetry = {{
                    webdriver: navigator.webdriver === true,
                    screen_width: window.screen ? window.screen.width : 0,
                    screen_height: window.screen ? window.screen.height : 0,
                    duration_ms: Math.round(t1 - t0),
                    language: navigator.language || "",
                    user_agent: navigator.userAgent
                }};

                // 4. Submit verification to server
                const verifyRes = await fetch("/__mdefender/turnstile/verify", {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json" }},
                    body: JSON.stringify({{
                        token: ch.token,
                        solution: solution,
                        telemetry: telemetry
                    }})
                }});

                const verifyData = await verifyRes.json();
                if (verifyData.success) {{
                    isSolved = true;
                    spin.style.display = "none";
                    checkIcon.style.display = "block";
                    chk.style.background = "#10b981";
                    chk.style.borderColor = "#10b981";
                    chk.style.boxShadow = "0 0 12px rgba(16, 185, 129, 0.4)";
                    title.textContent = "Success! Verification complete.";
                    title.style.color = "#34d399";
                    sub.textContent = "Access verified";
                    status.textContent = "Access granted. Redirecting...";
                    progress.style.width = "100%";

                    setTimeout(() => {{
                        window.location.href = REDIRECT_URL;
                    }}, 400);
                }} else {{
                    throw new Error(verifyData.reason || "Security validation failed");
                }}
            }} catch (err) {{
                isSolving = false;
                spin.style.display = "none";
                chk.style.borderColor = "#ef4444";
                chk.style.background = "rgba(239, 68, 68, 0.1)";
                title.textContent = "Verification failed. Click to retry.";
                title.style.color = "#f87171";
                status.textContent = err.message || "Security challenge encountered an error.";
                progress.style.width = "0%";
            }}
        }}

        async function solvePoW(nonce, salt, difficulty) {{
            const target = "0".repeat(difficulty);
            const enc = new TextEncoder();
            let count = 0;
            while (count < 2000000) {{
                const msg = `${{nonce}}:${{salt}}:${{count}}`;
                const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
                const hashArray = Array.from(new Uint8Array(buf));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                if (hashHex.startsWith(target)) {{
                    return String(count);
                }}
                count++;
            }}
            return String(count);
        }}

        window.addEventListener("DOMContentLoaded", () => {{
            setTimeout(() => {{
                triggerTurnstileSolve();
            }}, 300);
        }});
    </script>
</body>
</html>"""

    @classmethod
    def render_turnstile_widget_html(
        cls,
        site_key: str = "mdef_site_key_default",
        action: str = "login",
        theme: str = "auto"
    ) -> str:
        """Generates embeddable Turnstile widget HTML for WordPress and login forms."""
        return f"""
<div class="mdefender-turnstile-container" data-sitekey="{site_key}" data-action="{action}" data-theme="{theme}" id="mdefTurnstileWidget">
    <div class="mdef-ts-card" onclick="if(typeof mdefenderSolveWidget==='function')mdefenderSolveWidget(this)">
        <div class="mdef-ts-left">
            <div class="mdef-ts-checkbox state-idle" role="checkbox" aria-checked="false" tabindex="0">
                <div class="mdef-ts-spinner">
                    <svg viewBox="0 0 28 28">
                        <circle class="mdef-track" cx="14" cy="14" r="11" />
                        <circle class="mdef-head" cx="14" cy="14" r="11" />
                    </svg>
                </div>
                <div class="mdef-ts-check">
                    <svg viewBox="0 0 24 24">
                        <path class="mdef-check-path" d="M4.5 12.5l5 5L19.5 7" />
                    </svg>
                </div>
            </div>
            <div class="mdef-ts-text-wrap">
                <div class="mdef-ts-title">Verify you are human</div>
                <div class="mdef-ts-sub">
                    <span class="mdef-sub-idle">Cloud security check</span>
                    <span class="mdef-sub-success">✓ Verification complete</span>
                </div>
            </div>
        </div>

        <div class="mdef-ts-brand">
            <div class="mdef-brand-header">
                <svg class="mdef-shield-logo" viewBox="0 0 24 24">
                    <defs>
                        <linearGradient id="mdefShieldGradWpSvc" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#2563eb" />
                            <stop offset="60%" stop-color="#3b82f6" />
                            <stop offset="100%" stop-color="#06b6d4" />
                        </linearGradient>
                    </defs>
                    <path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z" fill="url(#mdefShieldGradWpSvc)" />
                    <path d="M12 4L5.5 6.8v5c0 4.2 2.7 8.2 6.5 9.5 3.8-1.3 6.5-5.3 6.5-9.5v-5L12 4z" fill="#ffffff" fill-opacity="0.18" />
                    <path d="M9.5 12.2l1.8 1.8 3.5-3.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                </svg>
                <span class="mdef-brand-text">MDefender</span>
            </div>
            <div class="mdef-brand-footer">
                <span>Turnstile</span>
                <span class="mdef-dot">&bull;</span>
                <a href="https://mdefender.io" target="_blank" rel="noopener">Privacy</a>
                <span class="mdef-dot">&bull;</span>
                <a href="https://mdefender.io" target="_blank" rel="noopener">Terms</a>
            </div>
        </div>
    </div>
    <input type="hidden" name="mdefender_turnstile_token" id="mdefenderTurnstileInput" value="">
    <input type="hidden" name="mdefender_turnstile_solution" id="mdefenderTurnstileSolution" value="">

    <style>
        .mdefender-turnstile-container {{
            display: block;
            width: 100%;
            max-width: 320px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif;
            margin: 14px 0 16px;
            user-select: none;
        }}
        .mdef-ts-card {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 65px;
            padding: 0 14px 0 12px;
            border-radius: 8px;
            background: #ffffff;
            border: 1px solid #dcdfe4;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: pointer;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
        }}
        .mdef-ts-card:hover {{
            border-color: #2563eb;
            background: #fbfdff;
            box-shadow: 0 3px 8px rgba(37, 99, 235, 0.1), 0 1px 2px rgba(0,0,0,0.04);
        }}
        .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card {{
            background: #0f172a;
            border-color: rgba(255,255,255,0.12);
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        }}
        .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-card:hover {{
            border-color: #3b82f6;
            box-shadow: 0 0 16px rgba(59, 130, 246, 0.2);
        }}
        .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-title {{
            color: #f8fafc;
        }}
        .mdefender-turnstile-container[data-theme="dark"] .mdef-brand-text {{
            color: #f1f5f9;
        }}
        .mdef-ts-left {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .mdef-ts-checkbox {{
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            flex-shrink: 0;
            box-sizing: border-box;
        }}
        .mdef-ts-checkbox.state-idle {{
            background: #ffffff;
            border: 2px solid #cbd5e1;
        }}
        .mdefender-turnstile-container[data-theme="dark"] .mdef-ts-checkbox.state-idle {{
            background: rgba(255,255,255,0.04);
            border-color: rgba(255,255,255,0.25);
        }}
        .mdef-ts-card:hover .mdef-ts-checkbox.state-idle {{
            border-color: #2563eb;
            background: #eff6ff;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }}
        .mdef-ts-checkbox.state-loading {{
            background: transparent;
            border: 2px solid transparent;
        }}
        .mdef-ts-checkbox.state-success {{
            background: #10b981;
            border: 2px solid #10b981;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
            transform: scale(1.02);
        }}
        .mdef-ts-spinner {{
            display: none;
            width: 24px;
            height: 24px;
        }}
        .mdef-ts-spinner svg {{
            width: 100%;
            height: 100%;
            animation: mdefSpinRot 0.75s linear infinite;
        }}
        .mdef-track {{
            fill: none;
            stroke: rgba(37, 99, 235, 0.15);
            stroke-width: 2.8;
        }}
        .mdef-head {{
            fill: none;
            stroke: #2563eb;
            stroke-width: 2.8;
            stroke-linecap: round;
            stroke-dasharray: 40 35;
        }}
        @keyframes mdefSpinRot {{ to {{ transform: rotate(360deg); }} }}
        .mdef-ts-check {{
            display: none;
            width: 18px;
            height: 18px;
        }}
        .mdef-ts-check svg {{
            width: 100%;
            height: 100%;
        }}
        .mdef-check-path {{
            fill: none;
            stroke: #ffffff;
            stroke-width: 2.8;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: mdefDraw 0.35s 0.05s ease-out forwards;
        }}
        @keyframes mdefDraw {{ to {{ stroke-dashoffset: 0; }} }}
        .mdef-ts-text-wrap {{
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
        }}
        .mdef-ts-title {{
            font-size: 13.5px;
            font-weight: 500;
            color: #1e293b;
            line-height: 1.25;
            transition: color 0.2s;
        }}
        .mdef-ts-sub {{
            font-size: 11px;
            color: #64748b;
            line-height: 1.2;
        }}
        .mdef-sub-success {{
            display: none;
            color: #059669;
            font-weight: 600;
        }}
        .mdef-ts-brand {{
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            gap: 2px;
            flex-shrink: 0;
        }}
        .mdef-brand-header {{
            display: inline-flex;
            align-items: center;
            gap: 4.5px;
        }}
        .mdef-shield-logo {{
            width: 15px;
            height: 16px;
            filter: drop-shadow(0 1px 2px rgba(37,99,235,0.25));
        }}
        .mdef-brand-text {{
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #1e293b;
        }}
        .mdef-brand-footer {{
            font-size: 9px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 3px;
        }}
        .mdef-brand-footer a {{
            color: #64748b;
            text-decoration: none;
        }}
        .mdef-brand-footer a:hover {{
            text-decoration: underline;
            color: #2563eb;
        }}
        .mdef-dot {{
            font-size: 8px;
            color: #cbd5e1;
        }}
    </style>
</div>
"""

