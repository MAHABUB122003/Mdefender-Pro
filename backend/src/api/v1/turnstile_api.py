import time
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import JSONResponse, Response as PlainResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from src.engine.turnstile_service import TurnstileService
from src.utils.logger import Logger

router = APIRouter(prefix="/turnstile", tags=["Turnstile"])
logger = Logger()


class VerifyRequest(BaseModel):
    token: str
    solution: str
    telemetry: Optional[Dict[str, Any]] = None


@router.get("/challenge")
async def get_challenge(request: Request, domain: Optional[str] = None):
    """Generates a dynamic cryptographic Proof-of-Work challenge."""
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    host_domain = domain or request.headers.get("host", "localhost").split(":")[0]
    
    challenge = TurnstileService.create_challenge(
        domain=host_domain,
        client_ip=client_ip,
        difficulty=3  # Fast, seamless 3-hex-zero challenge (< 50ms on mobile/desktop)
    )
    return challenge


@router.post("/verify")
async def verify_challenge(body: VerifyRequest, request: Request, response: Response):
    """Verifies Proof-of-Work computation and sets signed clearance cookie."""
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    
    is_valid, reason, clearance_token = TurnstileService.verify_solution(
        token=body.token,
        solution=body.solution,
        telemetry=body.telemetry,
        client_ip=client_ip
    )

    if not is_valid:
        return JSONResponse(
            status_code=403,
            content={"success": False, "reason": reason}
        )

    # Set secure HttpOnly 24-hour clearance cookie
    response.set_cookie(
        key="__mdef_challenge_token",
        value=clearance_token,
        max_age=86400,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False  # Allow local HTTP testing; in production HTTPS handles it
    )

    return {
        "success": True,
        "reason": reason,
        "clearance_token": clearance_token
    }


@router.get("/widget.js")
async def get_widget_js():
    """Serves the standalone, embeddable MDefender Turnstile JavaScript widget."""
    js_content = """
/**
 * MDefender Turnstile - Embedded Bot Verification Library v2.2.0
 * Ultra-fast client-side WebCrypto Proof-of-Work & Human Verification
 */
(function() {
    window.mdefenderTurnstile = {
        render: function(targetSelector, options) {
            options = options || {};
            var el = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
            if (!el) return;

            var siteKey = options.siteKey || el.getAttribute('data-sitekey') || 'mdef_default';
            var action = options.action || el.getAttribute('data-action') || 'login';
            var apiBase = options.apiBase || '';

            var theme = options.theme || el.getAttribute('data-theme') || 'auto';

            el.innerHTML = [
                '<div class="mdef-ts-embed" data-theme="' + theme + '" style="font-family:-apple-system,BlinkMacSystemFont,\\'Segoe UI\\',Roboto,\\'Inter\\',sans-serif;margin:14px 0 16px;user-select:none;max-width:320px;">',
                '  <div class="mdef-card" style="display:flex;align-items:center;justify-content:space-between;height:65px;padding:0 14px 0 12px;border-radius:8px;background:#ffffff;border:1px solid #dcdfe4;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);box-sizing:border-box;position:relative;overflow:hidden;">',
                '    <div style="display:flex;align-items:center;gap:12px;">',
                '      <div class="mdef-chk" style="width:28px;height:28px;border-radius:6px;border:2px solid #cbd5e1;background:#ffffff;display:flex;align-items:center;justify-content:center;transition:all 0.22s ease;position:relative;flex-shrink:0;box-sizing:border-box;">',
                '        <div class="mdef-spinner" style="display:none;width:24px;height:24px;"><svg viewBox="0 0 28 28" style="width:100%;height:100%;animation:mdefSpin 0.75s linear infinite;"><circle cx="14" cy="14" r="11" fill="none" stroke="rgba(37,99,235,0.15)" stroke-width="2.8"/><circle cx="14" cy="14" r="11" fill="none" stroke="#2563eb" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="40 35"/></svg></div>',
                '        <div class="mdef-check-svg" style="display:none;width:18px;height:18px;"><svg viewBox="0 0 24 24" style="width:100%;height:100%;"><path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="24" stroke-dashoffset="0"/></svg></div>',
                '      </div>',
                '      <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">',
                '        <div class="mdef-label" style="font-size:13.5px;font-weight:500;color:#1e293b;line-height:1.25;">Verify you are human</div>',
                '        <div class="mdef-sub" style="font-size:11px;color:#64748b;line-height:1.2;">Cloud security check</div>',
                '      </div>',
                '    </div>',
                '    <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;flex-shrink:0;">',
                '      <div style="display:inline-flex;align-items:center;gap:4.5px;">',
                '        <svg style="width:15px;height:16px;fill:#2563eb" viewBox="0 0 24 24"><path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z"/></svg>',
                '        <span style="font-size:11px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#1e293b;">MDefender</span>',
                '      </div>',
                '      <div style="font-size:9px;color:#94a3b8;display:flex;align-items:center;gap:3px;">',
                '        <span>Turnstile</span><span>&bull;</span><span>Privacy</span><span>&bull;</span><span>Terms</span>',
                '      </div>',
                '    </div>',
                '  </div>',
                '  <input type="hidden" name="mdefender_turnstile_token" class="mdef-input-token" value="">',
                '  <input type="hidden" name="mdefender_turnstile_solution" class="mdef-input-solution" value="">',
                '</div>',
                '<style>',
                '  @keyframes mdefSpin{to{transform:rotate(360deg)}}',
                '  .mdef-card:hover{border-color:#2563eb!important;background:#fbfdff!important;box-shadow:0 3px 8px rgba(37,99,235,0.1)!important;}',
                '  .mdef-ts-embed[data-theme="dark"] .mdef-card{background:#0f172a!important;border-color:rgba(255,255,255,0.12)!important;color:#fff!important;}',
                '  .mdef-ts-embed[data-theme="dark"] .mdef-label{color:#f8fafc!important;}',
                '  .mdef-ts-embed[data-theme="dark"] .mdef-chk{background:rgba(255,255,255,0.04)!important;border-color:rgba(255,255,255,0.25)!important;}',
                '</style>'
            ].join('');

            var box = el.querySelector('.mdef-card');
            var check = el.querySelector('.mdef-chk');
            var spin = el.querySelector('.mdef-spinner');
            var svg = el.querySelector('.mdef-check-svg');
            var text = el.querySelector('.mdef-label');
            var sub = el.querySelector('.mdef-sub');
            var inputToken = el.querySelector('.mdef-input-token');
            var inputSol = el.querySelector('.mdef-input-solution');

            var isRunning = false;
            var isSolved = false;

            box.addEventListener('click', async function() {
                if (isRunning || isSolved) return;
                isRunning = true;

                check.style.border = '2px solid transparent';
                check.style.background = 'transparent';
                spin.style.display = 'block';
                text.textContent = 'Verifying...';
                sub.textContent = 'Cryptographic verification';

                var t0 = performance.now();

                try {
                    // Fetch challenge
                    var endpoint = (apiBase ? apiBase : '') + '/api/v1/turnstile/challenge';
                    var r1 = await fetch(endpoint);
                    if (!r1.ok) throw new Error('Challenge request failed');
                    var ch = await r1.json();

                    // Solve PoW in browser
                    var target = '0'.repeat(ch.difficulty);
                    var count = 0;
                    var enc = new TextEncoder();
                    var sol = '0';

                    while (count < 2000000) {
                        var msg = ch.nonce + ':' + ch.salt + ':' + count;
                        var buf = await crypto.subtle.digest('SHA-256', enc.encode(msg));
                        var arr = Array.from(new Uint8Array(buf));
                        var hex = arr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
                        if (hex.indexOf(target) === 0) {
                            sol = String(count);
                            break;
                        }
                        count++;
                    }

                    var t1 = performance.now();
                    var telemetry = {
                        webdriver: navigator.webdriver === true,
                        screen_width: window.screen ? window.screen.width : 0,
                        screen_height: window.screen ? window.screen.height : 0,
                        duration_ms: Math.round(t1 - t0)
                    };

                    // Submit verification
                    var verifyEndpoint = (apiBase ? apiBase : '') + '/api/v1/turnstile/verify';
                    var r2 = await fetch(verifyEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: ch.token,
                            solution: sol,
                            telemetry: telemetry
                        })
                    });

                    var verifyData = await r2.json();
                    if (verifyData.success) {
                        isSolved = true;
                        spin.style.display = 'none';
                        svg.style.display = 'block';
                        check.style.background = '#10b981';
                        check.style.borderColor = '#10b981';
                        check.style.boxShadow = '0 0 10px rgba(16,185,129,0.4)';
                        text.textContent = 'Success! Verification complete.';
                        text.style.color = '#059669';
                        sub.textContent = '✓ Verification complete';
                        sub.style.color = '#059669';
                        inputToken.value = verifyData.clearance_token || ch.token;
                        inputSol.value = sol;
                        if (options.onSuccess) options.onSuccess(verifyData);
                    } else {
                        throw new Error(verifyData.reason || 'Verification failed');
                    }
                } catch (e) {
                    isRunning = false;
                    spin.style.display = 'none';
                    check.style.borderColor = '#ef4444';
                    check.style.background = 'rgba(239,68,68,0.1)';
                    text.textContent = 'Verification failed. Click to retry.';
                    text.style.color = '#dc2626';
                    sub.textContent = e.message || 'Error occurred';
                }
            });
        }
    };

    // Auto-mount any elements with class mdefender-turnstile
    document.addEventListener('DOMContentLoaded', function() {
        var targets = document.querySelectorAll('.mdefender-turnstile, #mdefender-turnstile');
        for (var i = 0; i < targets.length; i++) {
            window.mdefenderTurnstile.render(targets[i]);
        }
    });
})();
"""
    return PlainResponse(content=js_content, media_type="application/javascript")
