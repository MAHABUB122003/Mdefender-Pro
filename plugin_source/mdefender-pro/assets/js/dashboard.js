var warDashboard = {
    charts: {},
    refreshTimer: null,
    feedEntries: [],
    isRefreshing: false,

    init: function() {
        if (!document.getElementById('statTotalRequests') && !document.getElementById('timelineChart') && !document.getElementById('attackDistChart')) {
            return; // Not on the dashboard page
        }
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
        this.renderSparklines(d);
        this.renderCharts(d);
        this.renderAttackFeed(d);
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
            var rules = (d.feature_stats && d.feature_stats.waf_rules) ? d.feature_stats.waf_rules : 27272;
            accuracyEl.innerHTML = rules.toLocaleString() + '<span style="font-size:13px;font-weight:600;margin-left:2px;">Rules</span>';
        }
        var respEl = document.getElementById('statAvgResponseTime');
        if (respEl) {
            respEl.innerHTML = '<span style="font-size:14px">In-Memory</span>';
        }
        var trendR = document.getElementById('trendRequests');
        if (trendR) {
            var tr = d.attack_trend || 0;
            trendR.textContent = (tr > 0 ? '+' : '') + tr + '%';
        }
        var trendB = document.getElementById('trendBlocked');
        if (trendB) {
            trendB.textContent = (d.total_attacks || 0) + ' Dropped';
        }

        if (d.feature_stats) {
            var fs = d.feature_stats;
            if (fs.waf_blocked !== undefined) {
                this.animateNumber('featWafBlocked', fs.waf_blocked);
            }
            if (fs.login_blocked !== undefined) {
                this.animateNumber('featLoginBlocked', fs.login_blocked);
            }
            var featHarden = document.getElementById('featHardeningCount');
            if (featHarden && fs.hardening_active !== undefined) {
                featHarden.textContent = fs.hardening_active + '/16';
            }
            var featMalware = document.getElementById('featMalwareFindings');
            if (featMalware && fs.malware_findings !== undefined) {
                featMalware.textContent = fs.malware_findings === 0 ? 'Clean (0)' : fs.malware_findings + ' Threats';
            }
            var statInteg = document.getElementById('statFileIntegrity');
            if (statInteg && fs.malware_findings !== undefined) {
                statInteg.textContent = fs.malware_findings === 0 ? 'Clean (0)' : fs.malware_findings + ' Findings';
            }
        }
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

    renderSparklines: function(d) {
        var counts = (d && d.hourly_counts && d.hourly_counts.length > 0) ? d.hourly_counts : [];
        var reqs = (d && d.hourly_requests && d.hourly_requests.length > 0) ? d.hourly_requests : [];

        for (var i = 1; i <= 4; i++) {
            var canvas = document.getElementById('sparkline' + i);
            if (!canvas) continue;
            var ctx = canvas.getContext('2d');
            var w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            var dataSource = (i === 1 || i === 2) ? reqs : counts;
            var points = [];

            if (dataSource.length > 0) {
                var maxVal = Math.max.apply(null, dataSource);
                if (maxVal <= 0) maxVal = 1;
                for (var j = 0; j < dataSource.length; j++) {
                    points.push((dataSource[j] / maxVal) * (h * 0.7) + (h * 0.15));
                }
            } else {
                for (var j = 0; j < 10; j++) {
                    points.push(h * 0.2); // Clean subtle flat baseline
                }
            }

            var colors = ['#059669', '#E8792F', '#dc2626', '#0B2522'];
            ctx.strokeStyle = colors[(i-1) % colors.length];
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            var stepX = w / Math.max(points.length - 1, 1);
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
            ctx.fillStyle = colors[(i-1) % colors.length] + '14';
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

        var labels = (d && d.hourly_labels && d.hourly_labels.length > 0) ? d.hourly_labels : [];
        if (labels.length === 0) {
            var now = new Date();
            for (var i = 23; i >= 0; i--) {
                var h = (now.getHours() - i + 24) % 24;
                labels.push(h + ':00');
            }
        }

        var blockedData = (d && d.hourly_counts && d.hourly_counts.length > 0) ? d.hourly_counts : labels.map(function() { return 0; });
        var incomingData = (d && d.hourly_requests && d.hourly_requests.length > 0) ? d.hourly_requests.slice() : blockedData.slice();

        // Ensure incoming is at least equal to blocked
        for (var i = 0; i < labels.length; i++) {
            if ((incomingData[i] || 0) < (blockedData[i] || 0)) {
                incomingData[i] = blockedData[i] || 0;
            }
        }
        var cleanData = incomingData.map(function(v, idx) {
            return Math.max(0, v - (blockedData[idx] || 0));
        });

        var timelineGrad1 = ctx.getContext('2d').createLinearGradient(0,0,0,160);
        timelineGrad1.addColorStop(0, 'rgba(232, 121, 47, 0.18)');
        timelineGrad1.addColorStop(1, 'rgba(232, 121, 47, 0.01)');

        var timelineGrad2 = ctx.getContext('2d').createLinearGradient(0,0,0,160);
        timelineGrad2.addColorStop(0, 'rgba(220, 38, 38, 0.20)');
        timelineGrad2.addColorStop(1, 'rgba(220, 38, 38, 0.01)');

        this.charts.timeline = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingress Requests',
                        data: incomingData,
                        fill: true,
                        backgroundColor: timelineGrad1,
                        borderColor: '#E8792F',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#E8792F',
                        tension: 0.3,
                    },
                    {
                        label: 'Blocked Attacks',
                        data: blockedData,
                        fill: true,
                        backgroundColor: timelineGrad2,
                        borderColor: '#dc2626',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#dc2626',
                        tension: 0.3,
                    },
                    {
                        label: 'Clean Traffic',
                        data: cleanData,
                        fill: false,
                        borderColor: '#059669',
                        borderWidth: 1.6,
                        borderDash: [5, 3],
                        pointRadius: 1,
                        pointHoverRadius: 3,
                        pointBackgroundColor: '#059669',
                        tension: 0.3,
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
                        backgroundColor: '#0B2522',
                        titleColor: '#ffffff',
                        bodyColor: '#e2e8f0',
                        borderColor: '#1E3E3B',
                        borderWidth: 1,
                        titleFont: { size: 11, family: "'Inter', sans-serif", weight: 'bold' },
                        bodyFont: { size: 11, family: "'Inter', sans-serif" },
                        cornerRadius: 8,
                        padding: 10,
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 9, family: "'Inter', sans-serif" }, color: '#94a3b8', maxRotation: 0, maxTicksLimit: 8 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(226, 232, 240, 0.6)' },
                        ticks: { font: { size: 9, family: "'Inter', sans-serif" }, color: '#94a3b8', precision: 0 }
                    }
                }
            }
        });
    },

    renderDistChart: function(d) {
        var ctx = document.getElementById('attackDistChart');
        if (!ctx) return;
        if (this.charts.dist) { this.charts.dist.destroy(); }

        var colors = [
            '#dc2626', '#E8792F', '#0B2522', '#d97706', '#6366f1',
            '#0284c7', '#059669', '#8b5cf6', '#db2777', '#4f46e5'
        ];
        var rawData = (d && d.attack_types_counts) ? d.attack_types_counts : [];
        var rawLabels = (d && d.attack_types_labels) ? d.attack_types_labels : [];

        var items = [];
        for (var k = 0; k < rawLabels.length; k++) {
            var cnt = Number(rawData[k]) || 0;
            if (cnt > 0) {
                items.push({ label: rawLabels[k], count: cnt, color: colors[k % colors.length] });
            }
        }
        items.sort(function(a, b) { return b.count - a.count; });

        var total = items.reduce(function(a, b) { return a + b.count; }, 0);
        var centerTotalEl = document.getElementById('distCenterTotal');
        if (centerTotalEl) {
            centerTotalEl.textContent = total.toLocaleString();
        }

        var chartItems = items.slice();
        if (chartItems.length === 0) {
            chartItems = [{ label: 'Clean Traffic (0 Attacks)', count: 1, color: '#059669' }];
        }

        this.charts.dist = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: chartItems.map(function(it) { return it.label; }),
                datasets: [{
                    data: chartItems.map(function(it) { return it.count; }),
                    backgroundColor: chartItems.map(function(it) { return it.color; }),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0B2522',
                        titleColor: '#ffffff',
                        bodyColor: '#e2e8f0',
                        borderColor: '#1E3E3B',
                        borderWidth: 1,
                        titleFont: { size: 11, family: "'Inter', sans-serif", weight: 'bold' },
                        bodyFont: { size: 11, family: "'Inter', sans-serif" },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                if (items.length === 0) return ' Perimeter 100% Protected';
                                var pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return ' ' + context.label + ': ' + context.raw + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });

        var legendEl = document.getElementById('attackDistLegend');
        if (legendEl) {
            if (items.length === 0) {
                legendEl.innerHTML = '<div style="padding:14px 16px;background:#FBFCFA;border-radius:12px;border:1px dashed #CBD8CF;text-align:center;">' +
                    '<div style="font-size:12px;font-weight:700;color:#059669;display:flex;align-items:center;justify-content:center;gap:6px;">' +
                        '<span class="dashicons dashicons-yes-alt" style="font-size:16px;width:16px;height:16px;"></span> 0 Attacks Encountered' +
                    '</div>' +
                    '<div style="font-size:11px;color:#4A5D5A;margin-top:4px;">No malicious signatures matched. All 27,272+ rules active.</div>' +
                '</div>';
            } else {
                var html = '';
                var maxItems = Math.min(items.length, 5);
                for (var i = 0; i < maxItems; i++) {
                    var it = items[i];
                    var pct = total > 0 ? ((it.count / total) * 100).toFixed(1) : 0;
                    html += '<div style="display:flex;flex-direction:column;gap:3px;">' +
                        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;">' +
                            '<div style="display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">' +
                                '<span style="width:7px;height:7px;border-radius:50%;background:' + it.color + ';display:inline-block;"></span>' +
                                '<span>' + escapeHtml(it.label) + '</span>' +
                            '</div>' +
                            '<div style="display:inline-flex;align-items:center;gap:6px;">' +
                                '<span style="font-weight:700;color:#0f172a;font-size:11.5px;">' + it.count.toLocaleString() + '</span>' +
                                '<span style="color:#94a3b8;font-size:10.5px;">(' + pct + '%)</span>' +
                            '</div>' +
                        '</div>' +
                        '<div style="width:100%;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden;">' +
                            '<div style="width:' + Math.max(pct, 4) + '%;height:100%;background:' + it.color + ';border-radius:2px;"></div>' +
                        '</div>' +
                    '</div>';
                }
                legendEl.innerHTML = html;
            }
        }
    },

    renderAttackFeed: function(d) {
        var tbody = document.getElementById('attackFeedBody');
        if (!tbody) return;

        var logs = (d && d.recent_logs) ? d.recent_logs : [];
        var countEl = document.getElementById('warFeedCount');

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr class="war-table-empty">' +
                '<td colspan="9" style="text-align:center;padding:36px 16px;color:#64748b;">' +
                    '<span class="dashicons dashicons-shield" style="font-size:32px;width:32px;height:32px;color:#059669;margin-bottom:6px;"></span>' +
                    '<div style="font-size:13px;font-weight:700;color:#0f172a;">No hostile events recorded in current window</div>' +
                    '<div style="font-size:11.5px;color:#64748b;margin-top:2px;">Your site is actively protected by MDefender Pro Core Engine.</div>' +
                '</td>' +
            '</tr>';
            if (countEl) countEl.textContent = 'Showing 0 events';
            return;
        }

        var html = '';
        var displayCount = Math.min(logs.length, 5);
        for (var i = 0; i < displayCount; i++) {
            var log = logs[i];
            var time = log.created_at || '';
            if (time.indexOf(' ') > 0) {
                time = time.split(' ')[1] || time;
            }
            var ip = log.ip || 'Unknown';
            var ctry = log.country_code || 'LOCAL';
            var atkType = log.attack_type || 'Malicious Payload';
            var url = log.url || '/';
            var isBlocked = (log.status === 'blocked' || log.status === 'drop');
            var statusLabel = isBlocked ? 'Blocked' : (log.status === 'flagged' ? 'Flagged' : 'Allowed');
            var statusBadgeClass = isBlocked ? 'war-badge-critical' : 'war-badge-medium';
            var confidence = log.confidence ? Math.round(parseFloat(log.confidence) * 100) : 100;

            html += '<tr class="war-feed-row ' + (isBlocked ? 'blocked' : 'allowed') + '">' +
                '<td data-label="Time"><span style="font-family:monospace;font-size:11px;color:#64748b;">' + escapeHtml(time) + '</span></td>' +
                '<td data-label="Source IP"><span class="war-cell-ip" style="font-weight:600;color:#0f172a;">' + escapeHtml(ip) + '</span></td>' +
                '<td data-label="Country"><span class="war-cell-country" style="font-size:11px;font-weight:700;color:#334155;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + escapeHtml(ctry) + '</span></td>' +
                '<td data-label="Attack Type"><span class="war-badge ' + statusBadgeClass + '">' + escapeHtml(atkType) + '</span></td>' +
                '<td data-label="Target URL"><span class="war-cell-url" style="font-size:11px;color:#475569;" title="' + escapeHtml(url) + '">' + escapeHtml(url) + '</span></td>' +
                '<td data-label="Severity"><span class="war-badge ' + (isBlocked ? 'war-badge-critical' : 'war-badge-low') + '">' + (isBlocked ? 'Critical' : 'Notice') + '</span></td>' +
                '<td data-label="Confidence"><span style="font-size:11px;font-weight:700;color:#059669;">' + confidence + '%</span></td>' +
                '<td data-label="Action"><span style="font-size:11.5px;font-weight:700;color:' + (isBlocked ? '#dc2626' : '#2563eb') + ';">' + (isBlocked ? '403 Denied' : 'Inspected') + '</span></td>' +
                '<td data-label="Status"><span class="war-badge ' + (isBlocked ? 'war-badge-blocked' : 'war-badge-allowed') + '">' + statusLabel + '</span></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
        if (countEl) countEl.textContent = 'Showing latest ' + displayCount + ' events';
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
