import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import {
  Layers,
  Shield,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Sliders,
  FileText,
  Clock,
  Sparkles,
  Download,
  Terminal,
  ExternalLink,
  ChevronRight,
  Globe,
  Lock,
  Boxes,
  Check
} from 'lucide-react';

export default function AgencySolution() {
  // Interactive Fleet ROI Calculator State
  const [siteCount, setSiteCount] = useState(35);
  const [retainerFee, setRetainerFee] = useState(250);
  const [hourlyDevRate, setHourlyDevRate] = useState(85);

  // Computed ROI Metrics
  const manualHoursPerSite = 3.5;
  const totalManualHours = Math.round(siteCount * manualHoursPerSite);
  const fleetHours = Math.round(siteCount * 0.25);
  const hoursSaved = totalManualHours - fleetHours;
  const monthlyCostSavings = hoursSaved * hourlyDevRate;
  const annualSavings = monthlyCostSavings * 12;
  const totalMonthlyRetainerRevenue = siteCount * retainerFee;

  // Active Tab in Interactive Simulator
  const [activeSimTab, setActiveSimTab] = useState('updates');
  const [updateSimState, setUpdateSimState] = useState('idle');

  const triggerUpdateSim = (type) => {
    setUpdateSimState('running');
    setTimeout(() => {
      setUpdateSimState(type === 'rollback' ? 'rollback' : 'success');
    }, 1200);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== AGENCY HERO: FLEET COMMAND CENTER ===================== */}
      <section style={{
        paddingTop: 'calc(76px + 54px)',
        paddingBottom: '72px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(40, 116, 93, 0.08), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A5D5A', marginBottom: '22px' }}>
            <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Solutions</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#E8792F', fontWeight: 600 }}>Digital Agencies &amp; Multi-Site Fleet SaaS</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* Left Column: Hero Text */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#E8EEE8',
                border: '1px solid #D9E1DC',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0B2522',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#28745D' }} />
                <span>Centralized Multi-Site WordPress Fleet SaaS</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.05em',
                color: '#10201E',
                marginBottom: '20px'
              }}>
                Govern 10, 50, or 100+ WordPress sites from{' '}
                <span style={{ color: '#28745D' }}>One Sovereign Console.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                marginBottom: '32px'
              }}>
                Eliminate tedious manual logins, fatal PHP crashes (WSOD), and plugin update dread. Orchestrate 1-click bulk updates, autonomous &lt;800ms rollbacks, and concurrent 5.2M+ checksum malware scans across all client properties simultaneously.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
                <Link
                  to="/register?plan=enterprise_pro"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 26px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(11, 37, 34, 0.16)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#153B34'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0B2522'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>Launch Agency Fleet Trial</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
                </Link>

                <Link
                  to="/pricing"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 22px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD8CF',
                    color: '#10201E',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E8EEE8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <span>View Agency Quotas (15-50+ Sites)</span>
                </Link>
              </div>

              {/* Stat Quads */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '16px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #D9E1DC',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bulk Dispatch</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>1-Click Entire Fleet</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Auto-Rollback</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>&lt; 800ms In-Memory</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Integrity DB</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>5.2M+ Core Checksums</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Origin Impact</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>0.0% Server CPU</div>
                </div>
              </div>
            </div>

            {/* Right Column: Fleet Command Center Executive Console */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #D9E1DC',
              boxShadow: '0 20px 50px rgba(11, 37, 34, 0.08)',
              overflow: 'hidden'
            }}>
              {/* Command Center Topbar */}
              <div style={{
                padding: '14px 18px',
                background: '#0B2522',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10B981' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    MDEFENDER FLEET CONSOLE v3.4
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ADE80' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                  <span>35 Sites Connected · Hot Sync</span>
                </div>
              </div>

              {/* Live Client Sites Quick Roster */}
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #ECEEEA' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#7A8C89', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }}>
                  Active Client Fleet Status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { domain: 'mahabubshop.com', wp: 'v6.7.1', plugins: '18 Active', status: 'Optimal', waf: 'Shielded (0.11ms)' },
                    { domain: 'apex-finance.io', wp: 'v6.7.0', plugins: '1 Update Pending', status: 'Warning', waf: 'Shielded (0.09ms)' },
                    { domain: 'global-logistics.net', wp: 'v6.7.1', plugins: '24 Active', status: 'Optimal', waf: 'Shielded (0.12ms)' },
                  ].map((s, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#F7F6F1',
                      borderRadius: '8px',
                      border: '1px solid #E2DDD5',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={14} style={{ color: '#28745D' }} />
                        <span style={{ fontWeight: 600, color: '#10201E' }}>{s.domain}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ color: '#4A5D5A', fontSize: '11px' }}>{s.wp}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: s.status === 'Optimal' ? '#E8EEE8' : '#FFF3EB',
                          color: s.status === 'Optimal' ? '#28745D' : '#E8792F'
                        }}>{s.plugins}</span>
                        <span style={{ color: '#7A8C89', fontSize: '11px' }}>{s.waf}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fleet Interactive Action Bar */}
              <div style={{ padding: '16px 18px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <button
                    onClick={() => setActiveSimTab('updates')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: activeSimTab === 'updates' ? '#0B2522' : '#F7F6F1',
                      color: activeSimTab === 'updates' ? '#FFFFFF' : '#4A5D5A',
                      border: '1px solid #D9E1DC'
                    }}
                  >
                    1-Click Safe Update
                  </button>
                  <button
                    onClick={() => setActiveSimTab('scanner')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: activeSimTab === 'scanner' ? '#0B2522' : '#F7F6F1',
                      color: activeSimTab === 'scanner' ? '#FFFFFF' : '#4A5D5A',
                      border: '1px solid #D9E1DC'
                    }}
                  >
                    5.2M+ Malware Audit
                  </button>
                  <button
                    onClick={() => setActiveSimTab('hardening')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: activeSimTab === 'hardening' ? '#0B2522' : '#F7F6F1',
                      color: activeSimTab === 'hardening' ? '#FFFFFF' : '#4A5D5A',
                      border: '1px solid #D9E1DC'
                    }}
                  >
                    Fleet Hardening
                  </button>
                </div>

                {activeSimTab === 'updates' && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#4A5D5A', marginBottom: '12px', lineHeight: 1.5 }}>
                      Dispatch updates to all 35 sites concurrently. If any plugin triggers a fatal PHP error, MDefender autonomously rolls back that specific site in &lt;800ms.
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => triggerUpdateSim('success')}
                        disabled={updateSimState === 'running'}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#28745D',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {updateSimState === 'running' ? 'Updating 35 Sites...' : 'Simulate Fleet Safe Update'}
                      </button>
                      <button
                        onClick={() => triggerUpdateSim('rollback')}
                        disabled={updateSimState === 'running'}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#FFF3EB',
                          border: '1px solid #FDCFBA',
                          color: '#E8792F',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Simulate WSOD &amp; Rollback
                      </button>
                    </div>

                    {updateSimState === 'success' && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', background: '#E8EEE8', border: '1px solid #CBD8CF', fontSize: '11px', color: '#28745D' }}>
                        ✓ 35 of 35 sites updated successfully. All synthetic health checks passed with HTTP 200.
                      </div>
                    )}
                    {updateSimState === 'rollback' && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', background: '#FFF3EB', border: '1px solid #FDCFBA', fontSize: '11px', color: '#E8792F' }}>
                        ⚠ Fatal PHP exception detected on apex-finance.io (WooCommerce hook crash). Rollback triggered: Site restored to pre-update snapshot in 640ms. Zero client downtime.
                      </div>
                    )}
                  </div>
                )}

                {activeSimTab === 'scanner' && (
                  <div style={{ fontSize: '12px', color: '#4A5D5A' }}>
                    <p style={{ marginBottom: '8px' }}>Auditing 148,200 files across 35 sites against 5,214,098 official WordPress.org hashes:</p>
                    <div style={{ background: '#10201E', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', color: '#E4EAE6' }}>
                      [0.00s] Connected to 35 client RASP agents via HMAC-SHA256.<br />
                      [0.34s] Auditing /wp-includes/ and /wp-admin/ core binaries... 100% MATCH.<br />
                      [0.82s] Checking 312 active plugins against official repo checksums... CLEAN.<br />
                      [1.15s] Scan complete across fleet. 0 webshells, 0 unauthorized modifications.
                    </div>
                  </div>
                )}

                {activeSimTab === 'hardening' && (
                  <div style={{ fontSize: '12px', color: '#4A5D5A' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { title: 'XML-RPC Barrier', desc: 'Disabled across 35 sites' },
                        { title: 'File Editor Lockdown', desc: 'DISALLOW_FILE_EDIT enforced' },
                        { title: 'Uploads PHP Execution', desc: '.htaccess / NGINX blocked' },
                        { title: 'Author Enumeration', desc: '?author=1 queries dropped' },
                      ].map((h, i) => (
                        <div key={i} style={{ padding: '8px', background: '#F7F6F1', borderRadius: '6px', border: '1px solid #E2DDD5' }}>
                          <div style={{ color: '#10201E', fontWeight: 700 }}>{h.title}</div>
                          <div style={{ color: '#28745D', fontSize: '10.5px' }}>{h.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== INTERACTIVE FLEET ROI CALCULATOR ===================== */}
      <section style={{
        padding: '80px 0',
        background: '#FFFFFF',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#28745D', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Agency Financial Impact
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Calculate Your Agency’s Monthly Profit Lift
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              See how replacing manual client WordPress maintenance with MDefender Pro Fleet Command turns painful maintenance hours into high-margin recurring retainer profit.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '36px',
            alignItems: 'center',
            background: '#FAF9F5',
            borderRadius: '20px',
            border: '1.5px solid #E2DDD5',
            padding: 'clamp(24px, 3vw, 40px)'
          }}>
            {/* Left: Interactive Sliders */}
            <div>
              {/* Slider 1: Sites */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#10201E' }}>Client WordPress Sites Under Management</label>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>{siteCount} Sites</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={siteCount}
                  onChange={(e) => setSiteCount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#28745D', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A8C89', marginTop: '4px' }}>
                  <span>5 sites (Boutique)</span>
                  <span>50 sites (Growth)</span>
                  <span>150+ sites (Enterprise)</span>
                </div>
              </div>

              {/* Slider 2: Retainer Fee */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#10201E' }}>Monthly Maintenance Retainer Charged per Client</label>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>${retainerFee} / mo</span>
                </div>
                <input
                  type="range"
                  min="99"
                  max="750"
                  step="25"
                  value={retainerFee}
                  onChange={(e) => setRetainerFee(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#0B2522', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A8C89', marginTop: '4px' }}>
                  <span>$99/mo (Basic)</span>
                  <span>$350/mo (Standard)</span>
                  <span>$750/mo (High-Care SLA)</span>
                </div>
              </div>

              {/* Slider 3: Dev Rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#10201E' }}>Internal Senior Developer Hourly Cost</label>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>${hourlyDevRate} / hr</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="150"
                  step="5"
                  value={hourlyDevRate}
                  onChange={(e) => setHourlyDevRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#E8792F', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A8C89', marginTop: '4px' }}>
                  <span>$45/hr</span>
                  <span>$85/hr</span>
                  <span>$150/hr</span>
                </div>
              </div>
            </div>

            {/* Right: Calculated Metrics Display */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #D9E1DC',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                Monthly Fleet Economy Projection
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89' }}>Dev Hours Saved / Mo</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#28745D' }}>{hoursSaved} hrs</div>
                  <div style={{ fontSize: '11px', color: '#4A5D5A' }}>From {totalManualHours}h down to {fleetHours}h</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89' }}>Monthly Labor Recovered</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#10201E' }}>${monthlyCostSavings.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#4A5D5A' }}>Reclaimed engineering capacity</div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F7F6F1', borderRadius: '10px', marginBottom: '20px', border: '1px solid #E2DDD5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#4A5D5A' }}>Annual Agency Retainer Revenue:</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#10201E' }}>${(totalMonthlyRetainerRevenue * 12).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#4A5D5A' }}>Annual Labor Cost Savings:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#28745D' }}>+${annualSavings.toLocaleString()}</span>
                </div>
              </div>

              <Link
                to="/pricing"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  textDecoration: 'none'
                }}
              >
                <span>Select Agency Tier for {siteCount} Sites</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== ASYMMETRIC DEEP FEATURE BREAKDOWN ===================== */}
      <section style={{ padding: '96px 0', background: '#F7F6F1' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8792F', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Deep Engineering Breakdown
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              How MDefender Pro Governs Your WordPress Portfolio
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Every feature is built from the ground up to protect digital agencies from emergency client escalations, broken updates, and security liabilities.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {[
              {
                icon: RefreshCw,
                badge: 'AUTOMATED DISPATCH',
                title: '1-Click Fleetwide Plugin & Core Updates',
                desc: 'Select individual plugins (e.g. WooCommerce, Yoast, Elementor) or bulk-select all outdated components. Dispatch updates across 50+ sites in parallel without manually logging into a single wp-admin panel.',
                specs: 'Parallel async workers · Zero wp-admin cookies needed · Rate-throttled to avoid host overload'
              },
              {
                icon: ShieldCheck,
                badge: 'ZERO WSOD LIABILITY',
                title: 'Autonomous <800ms Atomic Rollback Engine',
                desc: 'Before touching any code, the agent creates an atomic snapshot of the plugin directory and database schema. It fires synthetic HTTP requests to verify the homepage and checkout. If a PHP fatal error occurs, it restores pre-update state in <800ms.',
                specs: 'Synthetic HTTP/2 status validation · Fast directory pointer swap · Zero client downtime guarantee'
              },
              {
                icon: HardDrive,
                badge: 'ZERO SERVER CPU',
                title: '5.2M+ Checksum Remote Malware Audit',
                desc: 'Audits every PHP, JS, and theme file against official cryptographic hashes from WordPress.org. Any modified core file, inserted webshell, or obfuscated base64 backdoor is flagged immediately without consuming your client’s host CPU.',
                specs: '5,214,098 core & plugin hashes · 2.5M+ malicious pattern regexes · Non-blocking remote worker execution'
              },
              {
                icon: Lock,
                badge: 'PORTFOLIO GOVERNANCE',
                title: 'Centralized Hardening & Security Barriers',
                desc: 'Enforce security policies across every site with one toggle: disable XML-RPC brute force attacks, block the built-in theme/plugin file editor, prevent PHP script execution inside /uploads/, and obscure the WordPress version number.',
                specs: 'Immediate .htaccess & NGINX rules hot sync · Complete enumeration blocking · Zero code edits'
              },
              {
                icon: FileText,
                badge: 'CLIENT REPORTING',
                title: 'Automated White-Label Security PDF Reports',
                desc: 'Generate branded monthly maintenance and security audit reports for your agency clients. Show blocked attacks, updated plugins, verified uptime, and integrity status with your agency logo and custom domain.',
                specs: 'Automated monthly cron delivery · Custom agency branding · Exportable PDF and CSV format'
              },
              {
                icon: Activity,
                badge: 'REAL-TIME TELEMETRY',
                title: 'Centralized Uptime & Threat Intelligence Grid',
                desc: 'Monitor global HTTP status codes, origin response times, and threat telemetry across all client domains in one unified dashboard. Receive instant Slack or webhook alerts if a client host goes offline or suffers volumetric attacks.',
                specs: '60-second multi-region pings · Instant Slack / Discord alerts · Real-time WAF event streaming'
              }
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #D9E1DC',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#E8EEE8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#28745D'
                      }}>
                        <FeatIcon size={20} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#E8792F', letterSpacing: '0.12em' }}>
                        {feat.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10201E', marginBottom: '10px' }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#4A5D5A', lineHeight: 1.6, marginBottom: '20px' }}>
                      {feat.desc}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '14px',
                    borderTop: '1px solid #ECEEEA',
                    fontSize: '11.5px',
                    color: '#28745D',
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}>
                    {feat.specs}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== AGENCY CASE STUDY ===================== */}
      <section style={{ padding: '80px 0', background: '#FFFFFF', borderTop: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{
            background: '#FAF9F5',
            borderRadius: '20px',
            border: '1.5px solid #E2DDD5',
            padding: 'clamp(28px, 4vw, 48px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#0B2522', color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>
                CASE STUDY
              </span>
              <span style={{ color: '#4A5D5A', fontSize: '13px', fontWeight: 600 }}>Apex Digital Agency · 64 WordPress Client Sites</span>
            </div>

            <p style={{ fontSize: 'clamp(17px, 2.2vw, 22px)', fontStyle: 'italic', color: '#10201E', lineHeight: 1.5, fontWeight: 600 }}>
              “Managing 64 client WordPress sites used to require an entire weekend every month just to test plugin updates and recover broken checkout flows. With MDefender Pro Fleet Command, our senior engineer completes fleetwide updates in 12 minutes. The auto-rollback alone saved us three high-value client contracts.”
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid #E2DDD5' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#10201E' }}>David K. Vance</div>
                <div style={{ fontSize: '12px', color: '#7A8C89' }}>Head of Infrastructure &amp; Client Operations</div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#28745D' }}>88%</div>
                  <div style={{ fontSize: '11px', color: '#7A8C89' }}>Maintenance Hours Saved</div>
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#10201E' }}>0 mins</div>
                  <div style={{ fontSize: '11px', color: '#7A8C89' }}>Unplanned WSOD Downtime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FINAL ENTERPRISE CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Ready to scale your agency without maintenance nightmares?
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Connect your first 5 client sites in under 3 minutes. Test 1-click updates, safe rollbacks, and remote malware scanning risk-free with our 14-day agency trial.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <Link
              to="/register?plan=enterprise_pro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 28px',
                height: '48px',
                borderRadius: '10px',
                background: '#4ADE80',
                color: '#0B2522',
                fontSize: '14px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)'
              }}
            >
              <span>Start Agency 14-Day Free Trial</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 22px',
                height: '48px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Compare Agency Fleet Tiers</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
