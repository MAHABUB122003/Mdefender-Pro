import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import {
  FileCode,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ArrowRight,
  ChevronRight,
  HardDrive,
  Cpu,
  RefreshCw,
  Lock,
  Download,
  AlertTriangle,
  FolderCheck,
  FileCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Server,
  Terminal,
  Check
} from 'lucide-react';

const downloadUrl = `${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`;

export default function WordPressSolution() {
  // Integrity Scanner Simulation State
  const [scanState, setScanState] = useState('clean');

  const triggerMalwareInject = () => {
    setScanState('infected');
    setTimeout(() => {
      setScanState('quarantined');
    }, 1200);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== WORDPRESS HERO: IN-MEMORY RASP DEFENSE ===================== */}
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
            <span style={{ color: '#28745D', fontWeight: 600 }}>WordPress Sovereign Hardening &amp; RASP</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* Left: Value Proposition */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#E8EEE8',
                border: '1px solid #CBD8CF',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0B2522',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}>
                <FileCode size={13} style={{ color: '#28745D' }} />
                <span>Runtime Application Self-Protection (RASP)</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.05em',
                color: '#10201E',
                marginBottom: '20px'
              }}>
                In-Memory WordPress Defense.{' '}
                <span style={{ color: '#28745D' }}>Zero Origin Load.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                marginBottom: '32px'
              }}>
                Traditional WordPress security plugins execute inside slow PHP runtime, crashing your origin server under simple brute force attacks. MDefender Pro delivers dual-layer defense: line-rate edge filtering and Priority 1 in-memory RASP that drops attacks before MySQL or heavy themes initialize.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
                <a
                  href={downloadUrl}
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
                  <Download size={15} />
                  <span>Download Free WordPress Agent</span>
                </a>

                <Link
                  to="/products/wordpress"
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
                  <span>Explore WordPress Suite</span>
                </Link>
              </div>

              {/* Fast Stats */}
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
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hook Priority</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>Priority 1 RASP</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PHP Overhead</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>&lt; 0.05ms Memory</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Official Hashes</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>5.2M+ Checksums</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>WSOD Rollback</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>&lt; 800ms Autonomous</div>
                </div>
              </div>
            </div>

            {/* Right: Interactive 5.2M+ Checksum Scanner Simulator */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #D9E1DC',
              boxShadow: '0 20px 50px rgba(11, 37, 34, 0.08)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                background: '#0B2522',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={15} style={{ color: '#4ADE80' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    WORDPRESS INTEGRITY &amp; WEBSHELL SHIELD
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ADE80' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                  <span>5,214,098 Checksums Synced</span>
                </div>
              </div>

              {/* File System Inspector */}
              <div style={{ padding: '18px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#7A8C89', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }}>
                  Active WordPress File System Audit
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F7F6F1', borderRadius: '6px', border: '1px solid #E2DDD5', fontSize: '11.5px', fontFamily: 'monospace' }}>
                    <span style={{ color: '#10201E', fontWeight: 600 }}>/wp-includes/version.php</span>
                    <span style={{ color: '#28745D', fontWeight: 700 }}>✓ Official SHA-256 Match</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F7F6F1', borderRadius: '6px', border: '1px solid #E2DDD5', fontSize: '11.5px', fontFamily: 'monospace' }}>
                    <span style={{ color: '#10201E', fontWeight: 600 }}>/wp-content/plugins/woocommerce/</span>
                    <span style={{ color: '#28745D', fontWeight: 700 }}>✓ 1,280 files verified against repo</span>
                  </div>

                  {scanState === 'infected' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '6px', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      <span style={{ color: '#C53030', fontWeight: 700 }}>/wp-content/uploads/2026/10/c99.php</span>
                      <span style={{ color: '#C53030', fontWeight: 700 }}>⚠ Backdoor WebShell Inserted</span>
                    </div>
                  )}

                  {scanState === 'quarantined' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#E8EEE8', border: '1px solid #CBD8CF', borderRadius: '6px', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      <span style={{ color: '#28745D', fontWeight: 700 }}>/wp-content/uploads/2026/10/c99.php</span>
                      <span style={{ color: '#28745D', fontWeight: 700 }}>🛡 Quarantined (Execution chmod 000)</span>
                    </div>
                  )}
                </div>

                {/* Simulator Action */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={triggerMalwareInject}
                    disabled={scanState === 'infected'}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {scanState === 'infected' ? 'Scanning & Isolating...' : 'Simulate Dropped WebShell Attack'}
                  </button>
                  <button
                    onClick={() => setScanState('clean')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#F7F6F1',
                      color: '#4A5D5A',
                      fontWeight: 600,
                      fontSize: '12px',
                      border: '1px solid #D9E1DC',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* RASP Lifecycle Details */}
              <div style={{
                padding: '12px 18px',
                background: '#F7F6F1',
                borderTop: '1px solid #ECEEEA',
                fontSize: '11px',
                color: '#4A5D5A'
              }}>
                <span>Hook Execution: <strong style={{ color: '#28745D' }}>Priority 1 (Before MySQL connect)</strong> · Host CPU: <strong style={{ color: '#28745D' }}>0.0%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 6 DEEP WORDPRESS SOVEREIGN FEATURES ===================== */}
      <section style={{ padding: '96px 0', background: '#FFFFFF', borderBottom: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#28745D', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              WordPress Native Hardening
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Total Immunity Against WordPress Attack Vectors
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Built specifically for the WordPress runtime ecosystem, protecting plugins, core files, and wp-admin from takeover.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {[
              {
                icon: FileCode,
                badge: 'IN-MEMORY DEFENSE',
                title: 'Priority 1 RASP Hook Interceptor',
                desc: 'MDefender loads as a Must-Use (mu-plugin) at Priority 1. It validates GET, POST, COOKIE, and file upload streams in memory before WordPress loads heavy active plugins or queries the MySQL database.',
                specs: 'mu-plugins integration · Drops attacks in <0.05ms · Prevents database thread exhaustion'
              },
              {
                icon: HardDrive,
                badge: 'CORE & PLUGIN INTEGRITY',
                title: '5.2M+ Official WP.org Checksum Scanner',
                desc: 'Audits every core file, theme, and plugin against official cryptographic hashes from WordPress.org. Any injected backdoors, eval() webshells, or unauthorized modifications are flagged and neutralized.',
                specs: '5,214,098 core & plugin hashes · Remote non-blocking scan · Zero host disk thrashing'
              },
              {
                icon: Zap,
                badge: 'BRUTE FORCE BARRIER',
                title: 'XML-RPC & wp-login.php Flood Absorber',
                desc: 'Automated botnets constantly hammer xmlrpc.php and wp-login.php, causing 100% CPU lockups. MDefender drops these requests at the line-rate edge before they reach your PHP-FPM pool.',
                specs: 'Cryptographic proof-of-work · Author enumeration disabled · Zero server load'
              },
              {
                icon: ShieldCheck,
                badge: 'VIRTUAL PATCHING',
                title: 'Zero-Day Virtual Patching Engine',
                desc: 'When critical CVEs are discovered in popular plugins (WooCommerce, Elementor, LiteSpeed Cache), MDefender deploys virtual edge rules immediately, shielding your site before vendor patches are released.',
                specs: 'Instant global rule propagation · Zero code modification · Protects legacy WP installs'
              },
              {
                icon: RefreshCw,
                badge: 'SAFE MAINTENANCE',
                title: 'Safe Updates & <800ms Atomic Rollback',
                desc: 'Never fear the White Screen of Death (WSOD) again. MDefender creates an atomic snapshot before applying any plugin or core update. If synthetic health checks detect a PHP error, it rolls back in <800ms.',
                specs: 'Pre-flight atomic snapshots · Synthetic HTTP/2 verification · <800ms autonomous recovery'
              },
              {
                icon: Lock,
                badge: 'HOST LOCKDOWN',
                title: '1-Click Server Hardening Suite',
                desc: 'Enforce best-practice server security with a single switch: disable PHP execution inside /wp-content/uploads/, disable the built-in theme/plugin editor (DISALLOW_FILE_EDIT), and hide WordPress version leaks.',
                specs: '.htaccess & NGINX rules injected · Hides generator tags · Blocks ?author= queries'
              }
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} style={{
                  background: '#FAF9F5',
                  borderRadius: '16px',
                  border: '1px solid #E2DDD5',
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
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#28745D', letterSpacing: '0.12em' }}>
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

      {/* ===================== FINAL WORDPRESS CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Give your WordPress sites enterprise immunity today.
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Download our free official WordPress security plugin or deploy our Cloud Anycast proxy for line-rate edge defense.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <a
              href={downloadUrl}
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
              <Download size={15} />
              <span>Download Free Plugin (.zip)</span>
            </a>
            <Link
              to="/products/wordpress"
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
              <span>Explore Fleet SaaS Capabilities</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
