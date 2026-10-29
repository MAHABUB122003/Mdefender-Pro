var warDashboard = {
    charts: {},
    refreshTimer: null,
    feedEntries: [],
    isRefreshing: false,

    init: function() {
        if (!document.getElementById('statTotalRequests') && !document.getElementById('timelineChart') && !document.getElementById('attackDistChart') && !document.getElementById('trafficSplineChart')) {
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
        var status = document.getElementById('mdfProtectionStatusVal');
        if (!toggle || !status) return;
        toggle.addEventListener('change', function() {
            var enabled = this.checked;
            var previousValue = !enabled;
            toggle.disabled = true;
            jQuery.post(ajaxurl, {
                action: 'waf_fw_toggle_protection',
                enabled: enabled ? 'yes' : 'no',
                nonce: (typeof waf_fw_ajax !== 'undefined') ? waf_fw_ajax.nonce : ''
            }, function(r) {
                if (r && r.success) {
                    status.textContent = enabled ? 'Active & enforcing' : 'Disabled';
                    status.style.color = enabled ? '' : '#ef4444';
                    window.location.reload();
                    return;
                }
                toggle.checked = previousValue;
                window.alert((r && r.data && r.data.message) ? r.data.message : 'Could not update protection status.');
            }).fail(function(xhr) {
                toggle.checked = previousValue;
                var message = xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
                    ? xhr.responseJSON.data.message
                    : 'Request failed. Protection status was not changed.';
                window.alert(message);
            }).always(function() {
                toggle.disabled = false;
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
            statAttackBlocked: d.total_attacks || 0,
            statBlockedRequests: d.total_attacks || 0,
            statBlacklistCount: d.total_blacklisted || 0,
            statThreatsDetected: d.today_attacks || 0
        };
        for (var id in totals) {
            this.animateNumber(id, totals[id]);
        }

        var donutBig = document.getElementById('mdfDonutBigNum');
        if (donutBig) {
            donutBig.textContent = (d.total_attacks || 0).toLocaleString();
        }
        var donutSub = document.getElementById('mdfDonutSubText');
        if (donutSub) {
            donutSub.textContent = (d.total_attacks === 0) ? 'clean' : (d.total_attacks === 1 ? 'threat' : 'blocked');
        }

        var subBlocked = document.getElementById('subAttackBlocked');
        if (subBlocked) {
            subBlocked.textContent = (d.total_attacks > 0) ? '100% of malicious attempts mitigated' : 'Perimeter secured • 0 threats detected';
        }
        var subReq = document.getElementById('subTotalRequests');
        if (subReq) {
            if (d.total_requests > 0) {
                var allowed = (d.total_allowed !== undefined) ? d.total_allowed : Math.max(0, d.total_requests - (d.total_attacks || 0));
                subReq.innerHTML = allowed.toLocaleString() + ' allowed &bull; ' + (d.total_attacks || 0).toLocaleString() + ' blocked';
            } else {
                subReq.textContent = 'Awaiting incoming network traffic';
            }
        }
        var subBl = document.getElementById('subBlacklistCount');
        if (subBl) {
            subBl.textContent = (d.total_blacklisted > 0) ? (d.total_blacklisted.toLocaleString() + ' perimeter blocks active') : 'Zero active perimeter IP blocks';
        }

        var accuracyEl = document.getElementById('statMLAccuracy');
        if (accuracyEl) {
            var rules = (d.feature_stats && d.feature_stats.waf_rules) ? d.feature_stats.waf_rules : 32;
            accuracyEl.innerHTML = rules.toLocaleString() + '<span style="font-size:13px;font-weight:600;margin-left:2px;">Rules</span>';
        }
        var respEl = document.getElementById('statAvgResponseTime');
        if (respEl) {
            respEl.innerHTML = '<span style="font-size:14px">In-Memory</span>';
        }
        var trendR = document.getElementById('trendRequests');
        if (trendR) {
            var tr = d.attack_trend || 0;
            trendR.textContent = (d.total_requests > 0) ? '↑ Live' : '0%';
        }
        var trendB = document.getElementById('trendBlocked');
        if (trendB) {
            trendB.textContent = (d.total_attacks > 0) ? 'Mitigated' : 'Zero Threat';
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
        var ctx = document.getElementById('trafficSplineChart') || document.getElementById('timelineChart');
        if (!ctx) return;
        if (this.charts.timeline) { this.charts.timeline.destroy(); }

        var labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
        var incomingData = [0, 0, 0, 0, 0, 0, 0];
        var blockedData = [0, 0, 0, 0, 0, 0, 0];

        if (d && d.hourly_labels && d.hourly_labels.length > 0) {
            labels = d.hourly_labels;
            blockedData = d.hourly_counts || labels.map(function() { return 0; });
            incomingData = d.hourly_requests || blockedData.slice();
        }

        var gradTeal = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
        gradTeal.addColorStop(0, 'rgba(13, 148, 136, 0.22)');
        gradTeal.addColorStop(1, 'rgba(13, 148, 136, 0.01)');

        var gradCoral = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
        gradCoral.addColorStop(0, 'rgba(223, 90, 56, 0.12)');
        gradCoral.addColorStop(1, 'rgba(223, 90, 56, 0.00)');

        this.charts.timeline = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Normal traffic',
                        data: incomingData,
                        fill: true,
                        backgroundColor: gradTeal,
                        borderColor: '#0D9488',
                        borderWidth: 2.4,
                        tension: 0.38,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#0D9488'
                    },
                    {
                        label: 'Threats blocked',
                        data: blockedData,
                        fill: true,
                        backgroundColor: gradCoral,
                        borderColor: '#DF5A38',
                        borderWidth: 2.0,
                        borderDash: [3, 3],
                        tension: 0.38,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: '#DF5A38'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0F2C26',
                        titleColor: '#FFFFFF',
                        bodyColor: '#A7F3D0',
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '650' },
                        bodyFont: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }, color: '#7A8D87' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(230, 236, 232, 0.7)' },
                        ticks: {
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            color: '#7A8D87',
                            callback: function(val) { return val >= 1000 ? (val/1000) + 'k' : val; }
                        }
                    }
                }
            }
        });
    },

    renderDistChart: function(d) {
        var ctx = document.getElementById('threatVectorsDonutChart') || document.getElementById('attackDistChart');
        if (!ctx) return;
        if (this.charts.dist) { this.charts.dist.destroy(); }

        var labels = [];
        var dataVals = [];
        var palette = ['#DF5A38', '#0D9488', '#059669', '#0284C7', '#64748B', '#D97706'];

        if (d && d.attack_types_labels && d.attack_types_labels.length > 0 && d.total_attacks > 0) {
            labels = d.attack_types_labels;
            dataVals = d.attack_types_counts;
        } else {
            labels = ['Perimeter clean'];
            dataVals = [100];
            palette = ['#10B981'];
        }

        this.charts.dist = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: palette,
                    borderColor: '#FFFFFF',
                    borderWidth: 2.5,
                    hoverOffset: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '74%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0F2C26',
                        titleColor: '#FFFFFF',
                        bodyColor: '#E8F1ED',
                        cornerRadius: 8,
                        padding: 10
                    }
                }
            }
        });

        // Update HTML legend if container exists and dynamic data is loaded
        var legendCol = document.getElementById('mdfDonutLegendCol');
        if (legendCol && d) {
            if (!d.total_attacks || d.total_attacks === 0) {
                legendCol.innerHTML = '<div class="mdf-legend-row">' +
                    '<span class="mdf-bullet-dot" style="background:#10B981;"></span>' +
                    '<span class="mdf-legend-name">Perimeter Clean</span>' +
                    '<span class="mdf-legend-pct">100%</span>' +
                '</div>' +
                '<div style="color:#7A8D87; font-size:11.5px; margin-top:8px; line-height:1.5;">' +
                    'No threats detected yet. Site is actively safeguarded.' +
                '</div>';
            } else if (d.attack_types_labels && d.attack_types_labels.length > 0) {
                var total = d.total_attacks;
                var legHtml = '';
                for (var j = 0; j < d.attack_types_labels.length; j++) {
                    var cnt = d.attack_types_counts[j] || 0;
                    var pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                    var col = palette[j % palette.length];
                    legHtml += '<div class="mdf-legend-row">' +
                        '<span class="mdf-bullet-dot" style="background:' + col + ';"></span>' +
                        '<span class="mdf-legend-name">' + escapeHtml(d.attack_types_labels[j]) + '</span>' +
                        '<span class="mdf-legend-pct">' + pct + '%</span>' +
                    '</div>';
                }
                legendCol.innerHTML = legHtml;
            }
        }
    },

    renderAttackFeed: function(d) {
        var tbody = document.getElementById('mdfLiveEventsBody') || document.getElementById('attackFeedBody');
        if (!tbody) return;

        var isMdfShell = !!document.getElementById('mdfLiveEventsBody');
        var logs = (d && d.recent_logs) ? d.recent_logs : [];

        if (!logs || logs.length === 0) {
            if (isMdfShell) {
                tbody.innerHTML = '<tr>' +
                    '<td colspan="6" style="text-align:center; padding:36px 20px; color:#7A8D87;">' +
                        '<div style="font-weight:700; color:#111F1C; font-size:13px; margin-bottom:4px;">No security events recorded yet</div>' +
                        '<div style="font-size:12px;">Your perimeter firewall is armed and actively inspecting all incoming web traffic.</div>' +
                    '</td>' +
                '</tr>';
            } else {
                tbody.innerHTML = '<tr class="war-table-empty">' +
                    '<td colspan="9" style="text-align:center;padding:36px 16px;color:#64748b;">' +
                        '<span class="dashicons dashicons-shield" style="font-size:32px;width:32px;height:32px;color:#059669;margin-bottom:6px;"></span>' +
                        '<div style="font-size:13px;font-weight:700;color:#0f172a;">No hostile events recorded in current window</div>' +
                        '<div style="font-size:11.5px;color:#64748b;margin-top:2px;">Your site is actively protected by MDefender Pro Core Engine.</div>' +
                    '</td>' +
                '</tr>';
            }
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
            var ctry = (log.country_code && log.country_code !== '') ? log.country_code.toUpperCase() : ((ip === '127.0.0.1' || ip === '::1') ? 'LOCAL' : 'INT');
            var atkType = log.attack_type || 'Threat Block';
            var isBlocked = (log.status === 'blocked' || log.status === 'drop');

            if (isMdfShell) {
                var actionText = isBlocked ? 'DROPPED 403' : 'CHALLENGED';
                var confVal = parseFloat(log.confidence) || 0.90;
                var threatLevel = confVal >= 0.90 ? 'CRITICAL' : (confVal >= 0.75 ? 'HIGH' : 'WARNING');
                var pillClass = confVal >= 0.90 ? 'mdf-pill-critical' : (confVal >= 0.75 ? 'mdf-pill-high' : 'mdf-pill-warning');

                html += '<tr>' +
                    '<td class="mdf-mono-time">' + escapeHtml(time) + ' <span class="mdf-utc-small">UTC</span></td>' +
                    '<td><div class="mdf-cell-origin"><span class="mdf-country-tag">' + escapeHtml(ctry) + '</span> <span class="mdf-mono-ip">' + escapeHtml(ip) + '</span></div></td>' +
                    '<td><div class="mdf-cell-attack"><span class="mdf-shield-icon-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><span class="mdf-attack-name">' + escapeHtml(atkType) + '</span></div></td>' +
                    '<td><span class="mdf-pill-badge ' + pillClass + '">' + threatLevel + '</span></td>' +
                    '<td><span class="mdf-action-dot-txt">&bull; ' + actionText + '</span></td>' +
                    '<td class="mdf-cell-action"><a href="admin.php?page=waf-firewall-logs" class="mdf-dots-btn" aria-label="Action" title="View details in logs"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></a></td>' +
                '</tr>';
            } else {
                var url = log.url || '/';
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
        }
        tbody.innerHTML = html;
        var countEl = document.getElementById('warFeedCount');
        if (countEl) countEl.textContent = 'Showing latest ' + displayCount + ' events';
    },

};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function wafFwBlockIP(ip) {
    if (!confirm('Block IP ' + ip + '?')) return;
    jQuery.post(ajaxurl, {action: 'waf_fw_block_ip', ip: ip, reason: 'Manually blocked from dashboard', nonce: waf_fw_ajax.nonce}, function(r) {
        if (r && r.success) {
            alert(r.data && r.data.message ? r.data.message : 'IP blocked successfully.');
            warDashboard.loadData();
            return;
        }
        alert(r && r.data && r.data.message ? r.data.message : 'Failed to block IP.');
    }).fail(function(xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
            ? xhr.responseJSON.data.message
            : 'Request failed. The IP was not blocked.';
        alert(message);
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
