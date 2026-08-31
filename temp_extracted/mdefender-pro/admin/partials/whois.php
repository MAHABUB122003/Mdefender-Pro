<?php defined('ABSPATH') || exit; ?>

<div class="war-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.03);margin-bottom:20px;">
    <div class="war-card-header" style="background:#f8fafc;padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:14px;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0284c7,#0369a1);display:flex;align-items:center;justify-content:center;color:#fff;">
            <span class="dashicons dashicons-admin-links" style="font-size:22px;width:22px;height:22px;margin-top:2px;"></span>
        </div>
        <div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Whois IP Lookup</h3>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Inspect any IP address to look up ownership, region, ASN, and official Whois registry records.</p>
        </div>
    </div>
    
    <div class="war-card-body" style="padding:24px;">
        <div style="display:flex;gap:10px;margin-bottom:24px;max-width:600px;">
            <input type="text" id="wafWhoisIp" placeholder="e.g. 8.8.8.8" value="<?php echo esc_attr($_GET['ip'] ?? ''); ?>" style="flex:1;height:42px;border-radius:8px;border:1px solid #cbd5e1;padding:0 14px;font-size:14px;box-sizing:border-box;">
            <button type="button" class="button button-primary" id="wafWhoisBtn" style="height:42px;line-height:40px;padding:0 24px;border-radius:8px;font-weight:700;font-size:13px;background:#0284c7;border-color:#0284c7;">Lookup IP</button>
        </div>

        <!-- Spinner loader -->
        <div id="wafWhoisLoader" style="display:none;align-items:center;gap:10px;color:#64748b;font-size:13px;margin:20px 0;">
            <span class="waf-spinner-radar"></span> Resolving WHOIS database records...
        </div>

        <!-- Lookup Results Container -->
        <div id="wafWhoisResult" style="display:none;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:24px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">IP Query</span>
                    <strong id="resIp" style="font-size:16px;color:#0f172a;word-break:break-all;">-</strong>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Country</span>
                    <strong id="resCountry" style="font-size:16px;color:#0f172a;">-</strong>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">ISP / Network</span>
                    <strong id="resIsp" style="font-size:16px;color:#0f172a;word-break:break-all;">-</strong>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">ASN & Route</span>
                    <strong id="resAs" style="font-size:16px;color:#0f172a;word-break:break-all;">-</strong>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">City / Region</span>
                    <strong id="resCity" style="font-size:16px;color:#0f172a;">-</strong>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Timezone</span>
                    <strong id="resTimezone" style="font-size:16px;color:#0f172a;">-</strong>
                </div>
            </div>

            <!-- Registry Text Display Accordion -->
            <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <div style="background:#f8fafc;padding:12px 18px;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px;color:#334155;display:flex;align-items:center;justify-content:space-between;">
                    <span>Official Registry WHOIS text</span>
                    <button class="button button-small" id="copyWhoisTxt" style="font-size:11px;height:24px;line-height:22px;">Copy text</button>
                </div>
                <pre id="rawWhoisContent" style="background:#0f172a;color:#cbd5e1;padding:16px 20px;font-family:monospace;font-size:12px;line-height:1.5;overflow-x:auto;max-height:450px;margin:0;"></pre>
            </div>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    function runLookup() {
        var ip = $('#wafWhoisIp').val().trim();
        if (!ip) return;
        $('#wafWhoisLoader').css('display', 'flex');
        $('#wafWhoisResult').hide();

        $.get(ajaxurl + '?action=waf_fw_whois_lookup&ip=' + encodeURIComponent(ip), function(r) {
            $('#wafWhoisLoader').hide();
            if (r.success && r.data) {
                var geo = r.data.geo || {};
                $('#resIp').text(geo.query || ip);
                $('#resCountry').text(geo.country ? (geo.country + ' (' + geo.countryCode + ')') : '-');
                $('#resIsp').text(geo.isp || '-');
                $('#resAs').text(geo.as || '-');
                $('#resCity').text((geo.city || geo.regionName) ? (geo.city + ', ' + geo.regionName) : '-');
                $('#resTimezone').text(geo.timezone || '-');
                $('#rawWhoisContent').text(r.data.raw || 'No whois text returned.');
                $('#wafWhoisResult').fadeIn(150);
            } else {
                alert('WHOIS registry lookup failed.');
            }
        });
    }

    $('#wafWhoisBtn').on('click', runLookup);
    
    // Allow enter key to trigger lookup
    $('#wafWhoisIp').on('keypress', function(e) {
        if(e.which === 13) {
            runLookup();
        }
    });

    $('#copyWhoisTxt').on('click', function() {
        var txt = $('#rawWhoisContent').text();
        navigator.clipboard.writeText(txt).then(function() {
            $('#copyWhoisTxt').text('Copied! ✅');
            setTimeout(function() {
                $('#copyWhoisTxt').text('Copy text');
            }, 1500);
        });
    });

    // Auto run if query param exists
    if ($('#wafWhoisIp').val().trim() !== '') {
        runLookup();
    }
});
</script>
