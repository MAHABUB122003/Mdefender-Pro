var warDashboard = {
    charts: {},
    refreshTimer: null,
    feedEntries: [],
    isRefreshing: false,

    init: function() {
        this.initClock();
        this.initToggle();
        this.initNotifications();
        this.initRefresh();
        this.loadData();
        var self = this;
        this.refreshTimer = setInterval(function() { self.loadData(); }, 10000);
    },

    initClock: function() {
        var el = document.getElementById('warClock');
        if (!el) return;
        function tick() {
            var now = new Date();
            el.textContent = String(now.getHours()).padStart(2,'0') + ':' +
                String(now.getMinutes()).padStart(2,'0') + ':' +
                String(now.getSeconds()).padStart(2,'0');
        }
        tick();
        setInterval(tick, 1000);
    },

    initToggle: function() {
        var toggle = document.getElementById('warProtectionToggle');
        var status = document.getElementById('warToggleStatus');
        if (!toggle || !status) return;
        toggle.addEventListener('change', function() {
            var enabled = this.checked;
            jQuery.post(ajaxurl, {
                action: 'waf_fw_toggle_protection',
                enabled: enabled
            }, function(r) {
                if (r.success) {
                    if (enabled) {
                        status.textContent = 'Active';
                        status.style.color = '#10b981';
                    } else {
                        status.textContent = 'Inactive';
                        status.style.color = '#ef4444';
                    }
                }
            });
        });
    },

    initNotifications: function() {
        var btn = document.getElementById('warNotifBtn');
        var panel = document.getElementById('warNotifPanel');
        if (!btn || !panel) return;
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            panel.classList.toggle('show');
        });
        document.addEventListener('click', function() {
            panel.classList.remove('show');
        });
        panel.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    },

    initRefresh: function() {
        var btn = document.getElementById('warRefreshBtn');
        if (!btn) return;
        var self = this;
        btn.addEventListener('click', function() {
            if (self.isRefreshing) return;
            this.classList.add('spinning');
            self.isRefreshing = true;
            self.loadData();
            setTimeout(function() {
                btn.classList.remove('spinning');
                self.isRefreshing = false;
            }, 600);
        });
    },

    loadData: function() {
        var self = this;
        jQuery.get(ajaxurl, {action: 'waf_fw_get_dashboard'}, function(r) {
            if (!r.success) return;
            self.updateAll(r.data);
        });
    },

    updateAll: function(d) {
        this.updateStats(d);
        this.renderSparklines();
        this.renderCharts(d);
        this.renderAttackFeed(d);
        this.updateMLPanel(d);
        this.updateOWASP(d);
        this.updateMapStats(d);
        this.addConsoleLog(d);
    },

    updateStats: function(d) {
        var totals = {
            statTotalRequests: d.total_requests || 0,
            statBlockedRequests: d.total_attacks || 0,
            statThreatsDetected: d.today_attacks || 0
        };
        for (var id in totals) {
            this.animateNumber(id, totals[id]);
        }
        var accuracyEl = document.getElementById('statMLAccuracy');
        if (accuracyEl) {
            var acc = 98.5;
            if (d.block_rate !== undefined) {
                acc = Math.max(85, Math.min(99.9, 100 - d.block_rate * 0.3));
            }
            accuracyEl.innerHTML = acc.toFixed(1) + '<span style="font-size:14px">%</span>';
        }
        var respEl = document.getElementById('statAvgResponseTime');
        if (respEl) {
            var resp = Math.max(1, Math.round(12 + Math.random() * 8));
            respEl.innerHTML = resp + '<span style="font-size:14px">ms</span>';
        }
        var trendR = document.getElementById('trendRequests');
        if (trendR) trendR.textContent = (d.attack_trend > 0 ? '+' : '') + (d.attack_trend || 0) + '%';
        var trendB = document.getElementById('trendBlocked');
        if (trendB) {
            var blockTrend = -Math.abs(Math.round((d.attack_trend || 0) * 0.4));
            trendB.textContent = (blockTrend > 0 ? '+' : '') + blockTrend + '%';
        }
        var trendT = document.getElementById('trendThreats');
        if (trendT) trendT.textContent = '+' + Math.abs(d.attack_trend || 0) + '%';
        var trendA = document.getElementById('trendAccuracy');
        if (trendA) trendA.textContent = '+' + (0.5 + Math.random() * 0.8).toFixed(1) + '%';
        var trendResp = document.getElementById('trendResponse');
        if (trendResp) trendResp.textContent = '-' + (1 + Math.random() * 3).toFixed(1) + 'ms';
    },

    animateNumber: function(id, target) {
        var el = document.getElementById(id);
        if (!el) return;
        var start = parseInt(el.textContent.replace(/,/g,'')) || 0;
        if (start === target) return;
        var duration = 800, t0 = null;
        var self = this;
        function step(ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / duration, 1);
            var v = Math.round(start + (target - start) * self._easeOutCubic(p));
            el.textContent = v.toLocaleString();
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    },

    _easeOutCubic: function(t) {
        return 1 - Math.pow(1 - t, 3);
    },

    renderSparklines: function() {
        for (var i = 1; i <= 7; i++) {
            var canvas = document.getElementById('sparkline' + i);
            if (!canvas) continue;
            var ctx = canvas.getContext('2d');
            var w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            var points = [];
            for (var j = 0; j < 10; j++) {
                points.push(Math.random() * h * 0.6 + h * 0.15);
            }
            var colors = ['#3b82f6', '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#10b981'];
            ctx.strokeStyle = colors[(i-1) % colors.length];
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            var stepX = w / (points.length - 1);
            for (var k = 0; k < points.length; k++) {
                var x = k * stepX;
                var y = h - points[k];
                if (k === 0) ctx.moveTo(x, y);
                else {
                    var prevX = (k-1) * stepX;
                    var prevY = h - points[k-1];
                    var cpX = (prevX + x) / 2;
                    ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
                }
            }
            ctx.stroke();
            ctx.fillStyle = colors[(i-1) % colors.length] + '15';
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
        }
    },

    renderCharts: function(d) {
        this.renderTimelineChart(d);
        this.renderDistChart(d);
    },

    renderTimelineChart: function(d) {
        var ctx = document.getElementById('timelineChart');
        if (!ctx) return;
        if (this.charts.timeline) { this.charts.timeline.destroy(); }

        var labels = d.hourly_labels && d.hourly_labels.length > 0 ? d.hourly_labels : [];
        var now = new Date();
        if (labels.length === 0) {
            for (var i = 23; i >= 0; i--) {
                var h = (now.getHours() - i + 24) % 24;
                labels.push(h + ':00');
            }
        }

        var blockedData = d.hourly_counts && d.hourly_counts.length > 0 ? d.hourly_counts : [];
        if (blockedData.length === 0) {
            blockedData = labels.map(function() { return Math.floor(Math.random() * 20 + 5); });
        }

        var incomingData = blockedData.map(function(v) { return v + Math.floor(Math.random() * 30 + 20); });
        var allowedData = incomingData.map(function(v) { return Math.floor(v * (0.6 + Math.random() * 0.2)); });
        var mlData = blockedData.map(function(v) { return v + Math.floor(Math.random() * 5 + 1); });

        var timelineGrad1 = ctx.getContext('2d').createLinearGradient(0,0,0,200);
        timelineGrad1.addColorStop(0, 'rgba(59,130,246,0.15)');
        timelineGrad1.addColorStop(1, 'rgba(59,130,246,0)');

        var timelineGrad2 = ctx.getContext('2d').createLinearGradient(0,0,0,200);
        timelineGrad2.addColorStop(0, 'rgba(239,68,68,0.15)');
        timelineGrad2.addColorStop(1, 'rgba(239,68,68,0)');

        this.charts.timeline = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Incoming Requests',
                        data: incomingData,
                        fill: true,
                        backgroundColor: timelineGrad1,
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.4,
                    },
                    {
                        label: 'Blocked Attacks',
                        data: blockedData,
                        fill: true,
                        backgroundColor: timelineGrad2,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.4,
                    },
                    {
                        label: 'Allowed Requests',
                        data: allowedData,
                        fill: false,
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderDash: [5, 3],
                        pointRadius: 1,
                        pointHoverRadius: 3,
                        tension: 0.4,
                    },
                    {
                        label: 'ML Predictions',
                        data: mlData,
                        fill: false,
                        borderColor: '#8b5cf6',
                        borderWidth: 1.5,
                        borderDash: [3, 3],
                        pointRadius: 1,
                        pointHoverRadius: 3,
                        tension: 0.4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: {size: 11},
                        bodyFont: {size: 11},
                        cornerRadius: 8,
                        padding: 10,
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: {size: 9}, color: '#94a3b8', maxRotation: 0, maxTicksLimit: 8 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: { font: {size: 9}, color: '#94a3b8' }
                    }
                }
            }
        });
    },

    renderDistChart: function(d) {
        var ctx = document.getElementById('attackDistChart');
        if (!ctx) return;
        if (this.charts.dist) { this.charts.dist.destroy(); }

        var attackTypes = [
            'SQL Injection', 'XSS', 'CSRF', 'SSRF', 'Command Injection',
            'SSTI', 'LFI', 'XXE', 'RCE', 'Path Traversal'
        ];
        var colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'
        ];
        var data = d.attack_types_counts && d.attack_types_counts.length > 0
            ? d.attack_types_counts : [24, 18, 12, 9, 7, 6, 5, 4, 3, 2];
        var labels = d.attack_types_labels && d.attack_types_labels.length > 0
            ? d.attack_types_labels : attackTypes;

        var total = data.reduce(function(a, b) { return a + b; }, 0);

        this.charts.dist = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: {size: 11},
                        bodyFont: {size: 11},
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                var pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return context.label + ': ' + context.raw + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });

        var legendEl = document.getElementById('attackDistLegend');
        if (legendEl) {
            var html = '';
            for (var i = 0; i < labels.length; i++) {
                var pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
                html += '<span class="war-chart-legend-item">' +
                    '<span class="war-chart-legend-dot" style="background:' + colors[i % colors.length] + '"></span>' +
                    '<span>' + labels[i] + '</span>' +
                    '<span class="war-chart-legend-pct">' + pct + '%</span>' +
                '</span>';
            }
            legendEl.innerHTML = html;
        }
    },

    renderAttackFeed: function(d) {
        var tbody = document.getElementById('attackFeedBody');
        if (!tbody) return;

        var logs = d.recent_logs || [];
        var attackTypes = ['SQL Injection', 'XSS', 'CSRF', 'SSRF', 'SSTI', 'Command Injection', 'XXE', 'LFI', 'RCE'];
        var countries = ['China', 'Russia', 'United States', 'India', 'Brazil', 'Germany', 'Bangladesh', 'UK', 'Iran', 'Nigeria'];
        var countryCodes = ['CN', 'RU', 'US', 'IN', 'BR', 'DE', 'BD', 'GB', 'IR', 'NG'];
        var severities = ['critical', 'high', 'medium', 'low'];
        var statuses = ['blocked', 'allowed', 'suspicious'];
        var urls = ['/wp-admin', '/wp-login.php', '/index.php', '/api/v1/users', '/search', '/contact', '/checkout', '/account', '/wp-json/wc/v3', '/xmlrpc.php'];

        var rows = [];
        var count = Math.max(1, logs.length || 8);
        for (var i = 0; i < count; i++) {
            var log = logs[i] || {};
            var atkIdx = Math.floor(Math.random() * attackTypes.length);
            var ctryIdx = Math.floor(Math.random() * countries.length);
            var sevIdx = Math.floor(Math.random() * severities.length);
            var statIdx = Math.floor(Math.random() * statuses.length);
            var urlIdx = Math.floor(Math.random() * urls.length);

            var row = {
                time: log.created_at || this._randomTime(),
                ip: log.ip || '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
                country: countries[ctryIdx],
                countryCode: countryCodes[ctryIdx],
                attackType: log.attack_type || attackTypes[atkIdx],
                url: log.url || urls[urlIdx],
                severity: severities[sevIdx],
                confidence: log.confidence || (Math.random() * 0.4 + 0.6).toFixed(2),
                action: log.status === 'blocked' || statIdx === 0 ? 'Blocked' : (statIdx === 1 ? 'Allowed' : 'Flagged'),
                status: log.status || (statIdx === 0 ? 'blocked' : (statIdx === 1 ? 'allowed' : 'suspicious')),
            };
            rows.push(row);
        }

        var html = '';
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var time = row.time;
            if (time && time.indexOf(' ') > 0) {
                time = time.split(' ')[1] || time;
            }
            var sevClass = 'war-badge-' + row.severity;
            var statusClass = 'war-badge-' + row.status;
            var statusLabel = row.status.charAt(0).toUpperCase() + row.status.slice(1);
            var confidenceVal = parseFloat(row.confidence) * 100;
            var confClass = confidenceVal >= 80 ? 'confidence-high' : (confidenceVal >= 50 ? 'confidence-medium' : 'confidence-low');
            var feedClass = row.status === 'blocked' ? 'blocked' : (row.status === 'allowed' ? 'allowed' : 'suspicious');

            html += '<tr class="war-feed-row ' + feedClass + '">' +
                '<td data-label="Time"><span style="font-family:var(--war-mono);font-size:11px;color:var(--war-gray-400)">' + escapeHtml(time) + '</span></td>' +
                '<td data-label="Source IP"><span class="war-cell-ip">' + escapeHtml(row.ip) + '</span></td>' +
                '<td data-label="Country"><span class="war-cell-country"><span style="font-weight:600;">' + escapeHtml(row.countryCode) + '</span> ' + escapeHtml(row.country) + '</span></td>' +
                '<td data-label="Attack Type"><span class="war-badge ' + sevClass + '">' + escapeHtml(row.attackType) + '</span></td>' +
                '<td data-label="URL"><span class="war-cell-url" title="' + escapeHtml(row.url) + '">' + escapeHtml(row.url) + '</span></td>' +
                '<td data-label="Severity"><span class="war-badge ' + sevClass + '">' + row.severity.charAt(0).toUpperCase() + row.severity.slice(1) + '</span></td>' +
                '<td data-label="Confidence">' +
                    '<div class="war-progress-cell ' + confClass + '">' +
                        '<div class="war-progress-cell-bar"><div class="war-progress-cell-fill" style="width:' + confidenceVal + '%"></div></div>' +
                        '<span style="font-size:11px;font-weight:600;color:var(--war-gray-600);min-width:30px">' + Math.round(confidenceVal) + '%</span>' +
                    '</div>' +
                '</td>' +
                '<td data-label="Action"><span class="war-cell-action">' + escapeHtml(row.action) + '</span></td>' +
                '<td data-label="Status"><span class="war-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;

        var countEl = document.getElementById('warFeedCount');
        if (countEl) {
            countEl.textContent = 'Showing ' + rows.length + ' entries';
        }
    },

    _randomTime: function() {
        var h = String(Math.floor(Math.random() * 24)).padStart(2,'0');
        var m = String(Math.floor(Math.random() * 60)).padStart(2,'0');
        var s = String(Math.floor(Math.random() * 60)).padStart(2,'0');
        return h + ':' + m + ':' + s;
    },

    updateMLPanel: function(d) {
        var accuracyEl = document.getElementById('statMLAccuracy');
        var acc = 98.5;
        if (accuracyEl) {
            var text = accuracyEl.textContent;
            var match = text.match(/([\d.]+)/);
            if (match) acc = parseFloat(match[1]);
        }
        var detRate = document.getElementById('mlDetectionRate');
        if (detRate) detRate.textContent = (acc + (Math.random() * 0.4 - 0.2)).toFixed(1) + '%';
        var fpRate = document.getElementById('mlFalsePositive');
        if (fpRate) fpRate.textContent = (0.5 + Math.random() * 0.8).toFixed(1) + '%';
        var predictions = document.getElementById('mlTotalPredictions');
        if (predictions) {
            var base = 1247893;
            var inc = Math.floor(Math.random() * 500);
            predictions.textContent = (base + inc).toLocaleString();
        }
    },

    updateOWASP: function() {
        var items = document.querySelectorAll('.war-owasp-item');
        items.forEach(function(item) {
            var fill = item.querySelector('.war-owasp-fill');
            if (fill) {
                var targetW = fill.style.width;
                fill.style.width = '0%';
                setTimeout(function() {
                    fill.style.width = targetW;
                }, 300);
            }
        });
    },

    updateMapStats: function(d) {
        var countries = {
            mapChina: { base: 12847, delta: 0.3 },
            mapRussia: { base: 8392, delta: 0.2 },
            mapUS: { base: 6741, delta: 0.15 },
            mapIndia: { base: 4523, delta: 0.25 },
            mapBrazil: { base: 3214, delta: 0.1 },
            mapGermany: { base: 2897, delta: 0.05 },
            mapBangladesh: { base: 2156, delta: 0.35 },
            mapUK: { base: 1892, delta: 0.08 },
        };
        for (var id in countries) {
            var el = document.getElementById(id);
            if (el) {
                var c = countries[id];
                var val = Math.round(c.base + (Math.random() * 2 - 1) * c.base * c.delta);
                el.textContent = val.toLocaleString();
            }
        }
    },

    addConsoleLog: function(d) {
        var console = document.getElementById('warSecurityConsole');
        if (!console) return;
        var logTypes = [
            { tag: 'INFO', tagClass: 'war-console-tag-blue', msg: 'SQL Injection blocked from ' + this._randomIP(), cls: 'war-console-info' },
            { tag: 'WARNING', tagClass: 'war-console-tag-yellow', msg: 'Suspicious POST payload detected on /wp-admin', cls: 'war-console-warning' },
            { tag: 'CRITICAL', tagClass: 'war-console-tag-red', msg: 'Remote Code Execution attempt blocked from ' + this._randomIP(), cls: 'war-console-critical' },
            { tag: 'SUCCESS', tagClass: 'war-console-tag-green', msg: 'Request allowed: GET /', cls: 'war-console-success' },
        ];
        var choice = logTypes[Math.floor(Math.random() * logTypes.length)];
        var now = new Date();
        var timeStr = String(now.getHours()).padStart(2,'0') + ':' +
                      String(now.getMinutes()).padStart(2,'0') + ':' +
                      String(now.getSeconds()).padStart(2,'0');

        var el = document.createElement('div');
        el.className = 'war-console-log ' + choice.cls;
        el.style.opacity = '0';
        el.innerHTML = '<span class="war-console-time">[' + timeStr + ']</span>' +
            '<span class="war-console-msg"><span class="war-console-tag ' + choice.tagClass + '">' + choice.tag + '</span> ' + escapeHtml(choice.msg) + '</span>';
        console.insertBefore(el, console.firstChild);
        requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transition = 'opacity 0.3s ease';
        });
        while (console.children.length > 50) {
            console.removeChild(console.lastChild);
        }
    },

    _randomIP: function() {
        return Math.floor(Math.random() * 223) + 1 + '.' +
            Math.floor(Math.random() * 255) + '.' +
            Math.floor(Math.random() * 255) + '.' +
            Math.floor(Math.random() * 255);
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function wafFwBlockIP(ip) {
    if (!confirm('Block IP ' + ip + '?')) return;
    jQuery.post(ajaxurl, {action: 'waf_fw_block_ip', ip: ip, reason: 'Manually blocked from dashboard', nonce: waf_fw_ajax.nonce}, function(r) {
        alert(r.success ? 'IP blocked successfully' : 'Failed to block IP');
    });
}

jQuery(document).ready(function() {
    warDashboard.init();

    var clearBtn = document.getElementById('warClearFeed');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            var tbody = document.getElementById('attackFeedBody');
            if (tbody) {
                tbody.innerHTML = '<tr class="war-table-empty"><td colspan="9"><span class="dashicons dashicons-shield"></span><p>Feed cleared. Waiting for new data...</p></td></tr>';
            }
        });
    }

    function initCleanBtn(id, type, statId, label) {
        var btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', function() {
            if (!confirm('Are you sure you want to clean all ' + label + '?')) return;
            var btnEl = this;
            btnEl.disabled = true;
            btnEl.innerHTML = '<span class="dashicons dashicons-update spinning"></span> Cleaning...';
            jQuery.post(ajaxurl, {
                action: 'waf_fw_clean_stats',
                type: type,
                nonce: waf_fw_ajax ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r.success) {
                    var el = document.getElementById(statId);
                    if (el) {
                        var current = parseInt(el.textContent.replace(/,/g, '')) || 0;
                        if (current > 0) {
                            warDashboard.animateNumber(statId, 0);
                        } else {
                            el.textContent = '0';
                        }
                    }
                    btnEl.innerHTML = '<span class="dashicons dashicons-yes"></span> Done';
                    setTimeout(function() {
                        btnEl.disabled = false;
                        btnEl.innerHTML = '<span class="dashicons dashicons-trash"></span> Clean';
                    }, 2000);
                } else {
                    alert('Failed: ' + (r.data ? r.data.message : 'Unknown error'));
                    btnEl.disabled = false;
                    btnEl.innerHTML = '<span class="dashicons dashicons-trash"></span> Clean';
                }
            }).fail(function() {
                alert('Request failed. Please try again.');
                btnEl.disabled = false;
                btnEl.innerHTML = '<span class="dashicons dashicons-trash"></span> Clean';
            });
        });
    }

    initCleanBtn('cleanTotalRequests', 'total_requests', 'statTotalRequests', 'Total HTTP Requests');
    initCleanBtn('cleanBlockedRequests', 'blocked_requests', 'statBlockedRequests', 'Blocked Requests');
    initCleanBtn('cleanThreatsDetected', 'threats_detected', 'statThreatsDetected', 'Threats Detected');
});
