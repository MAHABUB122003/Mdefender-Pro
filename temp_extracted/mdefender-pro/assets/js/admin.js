jQuery(document).ready(function($) {
    $(document).on('click', '.waf-fw-modal-close, .waf-fw-modal', function(e) {
        if ($(e.target).hasClass('waf-fw-modal') || $(e.target).hasClass('waf-fw-modal-close')) {
            $(this).closest('.waf-fw-modal').hide();
        }
    });

    var userDropdown = document.getElementById('warUserDropdown');
    if (userDropdown) {
        userDropdown.addEventListener('click', function() {
            window.location.href = ajaxurl.replace('admin-ajax.php', 'profile.php');
        });
    }

    // CSRF protection: transparently attach the plugin nonce to every
    // MDefender-Pro AJAX request so the server-side check can validate it.
    // Covers both form-encoded POST data and query-string action requests.
    if (typeof waf_fw_ajax !== 'undefined' && waf_fw_ajax.nonce) {
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
            var action = options.data ? (options.data.action || '') : '';
            if (!action && options.url) {
                var m = /[?&]action=([^&]+)/.exec(options.url);
                if (m) action = decodeURIComponent(m[1]);
            }
            if (/^(waf_fw_|waf_harden_)/.test(action || '')) {
                var sent = false;
                if (options.data) {
                    var d = options.data;
                    if (typeof d === 'string') {
                        options.data = d + (d.indexOf('nonce=') === -1 ? '&nonce=' + encodeURIComponent(waf_fw_ajax.nonce) : '');
                    } else if (typeof d === 'object') {
                        d.nonce = waf_fw_ajax.nonce;
                    }
                }
                if (options.url && options.url.indexOf('action=') !== -1 && !/nonce=/.test(options.url)) {
                    options.url += (options.url.indexOf('?') === -1 ? '?' : '&') + 'nonce=' + encodeURIComponent(waf_fw_ajax.nonce);
                }
            }
        });
    }
});

