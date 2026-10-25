import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import {
  Scale,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  FileText,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Database,
  Layers,
  Award,
  Key,
  Download,
  Activity,
  Server,
  Zap,
  Check
} from 'lucide-react';

export default function FintechSolution() {
  // Regulatory Framework Matrix State
  const [activeFramework, setActiveFramework] = useState('pci_dss');

  const frameworks = {
    pci_dss: {
      name: 'PCI-DSS v4.0 Compliance',
      badge: 'PAYMENT CARD INDUSTRY MANDATE',
      requirement: 'Requirement 6.4.2 & 6.4.3: Automated technical solution for detecting and preventing web-based attacks, and continuous script integrity management on payment pages.',
      mdefenderControl: 'Autonomous DFA Line-Rate WAF intercepts SQLi and XSS before transaction processing. Inline script SHA-384 hashing blocks unauthorized Magecart form-jacking.',
      auditorEvidence: 'Automated weekly technical attestation export with tamper-evident SHA-256 cryptographic signatures.'
    },
    soc2: {
      name: 'SOC2 Type II Certification',
      badge: 'SECURITY, AVAILABILITY & CONFIDENTIALITY',
      requirement: 'CC6.1 & CC6.6: Perimeter boundary protection, logical access controls, and prevention of unauthorized or malicious code execution.',
      mdefenderControl: 'Edge Anycast reverse proxy isolates internal networks. Real-time SIEM streaming to Datadog/Splunk with 1-year immutable audit log retention.',
      auditorEvidence: 'Continuous monitoring evidence log documenting 100% perimeter inspection and 0 origin bypass events.'
    },
    hipaa: {
      name: 'HIPAA Security Rule (HITECH)',
      badge: 'PROTECTED HEALTH INFORMATION (PHI)',
      requirement: '45 CFR § 164.312: Technical safeguards for electronic protected health information (ePHI) transmission security and audit controls.',
      mdefenderControl: 'Strict TLS 1.3 encryption with modern elliptic-curve ciphers. PII/ePHI masking prevents medical record leakage in error responses.',
      auditorEvidence: 'Business Associate Agreement (BAA) supported with dedicated tenant cryptographic key isolation.'
    },
    gdpr: {
      name: 'GDPR & Sovereign Data Residency',
      badge: 'EU GENERAL DATA PROTECTION REGULATION',
      requirement: 'Chapter V: International transfers of personal data; mandate for strict data processing strictly within compliant geographical jurisdictions.',
      mdefenderControl: 'Geographic traffic geo-fencing guarantees EU customer traffic is inspected strictly within EU scrubbing centers (Frankfurt, Paris, Dublin).',
      auditorEvidence: 'Zero cross-border unencrypted packet transit audit guarantee.'
    }
  };

  const selected = frameworks[activeFramework];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F1', color: '#10201E', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PublicNavbar />

      {/* ===================== FINTECH HERO: INSTITUTIONAL COMPLIANCE ===================== */}
      <section style={{
        paddingTop: 'calc(76px + 54px)',
        paddingBottom: '72px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(202, 138, 4, 0.08), transparent 70%), #F7F6F1',
        borderBottom: '1px solid #D9E1DC'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A5D5A', marginBottom: '22px' }}>
            <Link to="/solutions" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Solutions</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#CA8A04', fontWeight: 600 }}>FinTech, Banking &amp; Regulated Compliance</span>
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
                background: '#FEF9C3',
                border: '1px solid #FEF08A',
                fontSize: '11px',
                fontWeight: 700,
                color: '#854D0E',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}>
                <Award size={13} style={{ color: '#854D0E' }} />
                <span>PCI-DSS 4.0 · SOC2 · HIPAA · Sovereign Residency</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.05em',
                color: '#10201E',
                marginBottom: '20px'
              }}>
                Institutional Security.{' '}
                <span style={{ color: '#CA8A04' }}>Provable Compliance.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.6vw, 17px)',
                lineHeight: 1.6,
                color: '#4A5D5A',
                marginBottom: '32px'
              }}>
                Meet stringent regulatory mandates without sacrificing sub-millisecond transaction speeds. MDefender Pro provides automated PCI-DSS 4.0 Section 6.4 technical controls, tamper-evident cryptographic audit logs, and sovereign geographic traffic fencing for regulated workloads.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
                <Link
                  to="/register?plan=dedicated"
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
                  <span>Request Compliance Package</span>
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
                  <span>View Dedicated SLA Tiers</span>
                </Link>
              </div>

              {/* Fast Specs */}
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
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SLA Guarantee</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#CA8A04' }}>99.999% Uptime</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audit Integrity</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#28745D' }}>SHA-256 Ledger</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Residency</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10201E' }}>Geo-Fenced Scrubbing</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Incident Response</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7' }}>15-Min Dedicated SLA</div>
                </div>
              </div>
            </div>

            {/* Right: Cryptographic Compliance Ledger Mockup */}
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
                  <Scale size={15} style={{ color: '#FACC15' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    CRYPTOGRAPHIC AUDIT LEDGER (SHA-256)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ADE80' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                  <span>Tamper-Evident Active</span>
                </div>
              </div>

              {/* Event Chain Stream */}
              <div style={{ padding: '18px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#7A8C89', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }}>
                  Immutable Regulatory Event Stream
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { block: '#91820', hash: '4f8a...c91e', std: 'PCI-DSS 4.0 Sec 6.4.3', desc: 'Inline checkout script hash verified against authorized baseline (SHA-384).', status: 'COMPLIANT' },
                    { block: '#91821', hash: '8e2b...17da', std: 'SOC2 CC6.6', desc: 'SQL injection AST token normalized; 403 Forbidden issued in 0.10ms.', status: 'MITIGATED' },
                    { block: '#91822', hash: '2a1c...99f0', std: 'GDPR Art. 44', desc: 'EU-Frankfurt PoP routed transaction; zero cross-border transit verified.', status: 'SOVEREIGN' },
                  ].map((ev, i) => (
                    <div key={i} style={{
                      padding: '12px 14px',
                      background: '#F7F6F1',
                      borderRadius: '8px',
                      border: '1px solid #E2DDD5',
                      fontSize: '11.5px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#CA8A04', fontWeight: 700 }}>{ev.block} · Hash: {ev.hash}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#E8EEE8', color: '#28745D', fontSize: '10px', fontWeight: 700 }}>
                          {ev.status}
                        </span>
                      </div>
                      <div style={{ color: '#10201E', fontWeight: 700, marginBottom: '2px' }}>{ev.std}</div>
                      <div style={{ color: '#4A5D5A', fontSize: '11px' }}>{ev.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ledger Footer */}
              <div style={{
                padding: '12px 18px',
                background: '#F7F6F1',
                borderTop: '1px solid #ECEEEA',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#4A5D5A'
              }}>
                <span>SIEM Integration: <strong>Splunk · Datadog · Elastic</strong></span>
                <span>Audit Trail: <strong style={{ color: '#28745D' }}>1-Year Retention</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== REGULATORY FRAMEWORK MATRIX ===================== */}
      <section style={{ padding: '80px 0', background: '#FFFFFF', borderBottom: '1px solid #D9E1DC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#CA8A04', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Standard-by-Standard Mapping
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Direct Regulatory Mandate Alignment
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Select a regulatory framework below to see exact section mandates and how MDefender Pro delivers technical compliance.
            </p>
          </div>

          {/* Selector Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            {Object.keys(frameworks).map((k) => (
              <button
                key={k}
                onClick={() => setActiveFramework(k)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: activeFramework === k ? '#0B2522' : '#F7F6F1',
                  color: activeFramework === k ? '#FFFFFF' : '#10201E',
                  fontWeight: activeFramework === k ? 800 : 600,
                  fontSize: '13px',
                  border: activeFramework === k ? '1px solid #0B2522' : '1px solid #D9E1DC',
                  cursor: 'pointer'
                }}
              >
                {frameworks[k].name}
              </button>
            ))}
          </div>

          {/* Matrix Card */}
          <div style={{
            background: '#FAF9F5',
            borderRadius: '18px',
            border: '1.5px solid #E2DDD5',
            padding: 'clamp(24px, 3vw, 40px)',
            maxWidth: '920px',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#CA8A04', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              {selected.badge}
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#10201E', marginBottom: '14px' }}>
              {selected.name}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D9E1DC' }}>
                <div style={{ fontSize: '11px', color: '#7A8C89', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>Regulatory Requirement</div>
                <div style={{ fontSize: '13px', color: '#10201E', lineHeight: 1.5 }}>{selected.requirement}</div>
              </div>

              <div style={{ padding: '16px', background: '#FEF9C3', borderRadius: '10px', border: '1px solid #FEF08A' }}>
                <div style={{ fontSize: '11px', color: '#854D0E', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>MDefender Technical Control</div>
                <div style={{ fontSize: '13px', color: '#10201E', lineHeight: 1.5 }}>{selected.mdefenderControl}</div>
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#E8EEE8', borderRadius: '8px', border: '1px solid #CBD8CF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#28745D', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>Auditor-Ready Evidence Artifact: {selected.auditorEvidence}</span>
              </div>
              <button
                onClick={() => alert("Enterprise compliance dossier download requested. Our compliance team will provide the complete signed attestation package.")}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#0B2522',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Download size={12} />
                <span>Download Sample Attestation</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 6 DEEP FINTECH FEATURES ===================== */}
      <section style={{ padding: '96px 0', background: '#F7F6F1' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#CA8A04', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Institutional Grade
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#10201E', letterSpacing: '-0.04em', marginBottom: '14px' }}>
              Defensive Architecture for Mission-Critical Finance
            </h2>
            <p style={{ fontSize: '15.5px', color: '#4A5D5A', lineHeight: 1.6 }}>
              Engineered to protect online banking portals, brokerages, payment gateways, and telehealth platforms.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {[
              {
                icon: Database,
                badge: 'FORENSIC AUDITING',
                title: 'Immutable Cryptographic Audit Logging',
                desc: 'All security events, verdict reasons, and blocked payloads are hashed into a tamper-evident SHA-256 block ledger. Ready for immediate export to enterprise SIEM platforms.',
                specs: 'SHA-256 block hash chaining · Splunk & Datadog connector · 1-year compliant retention'
              },
              {
                icon: Globe,
                badge: 'DATA RESIDENCY',
                title: 'Sovereign Geographic Traffic Fencing',
                desc: 'Strictly control which geographical data centers inspect your traffic. Ensure German or Swiss banking data never leaves compliant EU borders during edge packet evaluation.',
                specs: 'Country & ASN routing enforcement · 0 unencrypted cross-border transit · GDPR compliant'
              },
              {
                icon: Lock,
                badge: 'PCI COMPLIANCE',
                title: 'PCI-DSS 4.0 Script Integrity & Form Jacking',
                desc: 'Continuous real-time verification of all JavaScript loaded on checkout and payment pages. Detects and halts unauthorized script alterations (Magecart) before credit cards are harvested.',
                specs: 'Section 6.4.3 compliant · Automated SHA-384 script hashing · Real-time tampering alarm'
              },
              {
                icon: Key,
                badge: 'CRYPTOGRAPHY',
                title: 'TLS 1.3 & Dedicated HSM Key Management',
                desc: 'Support for modern elliptic-curve cryptography (X25519) and Hardware Security Module (HSM) dedicated key isolation. Protects customer sessions against eavesdropping and MITM attacks.',
                specs: 'FIPS 140-2 Level 3 HSM support · 0-RTT session resumption · Automated SSL certificates'
              },
              {
                icon: ShieldAlert,
                badge: 'CREDENTIAL SECURITY',
                title: 'Financial API Credential Stuffing Barrier',
                desc: 'Halts automated botnets attempting to validate breached password dumps against online banking or crypto exchange login endpoints without disrupting legitimate customer logins.',
                specs: 'Behavioral fingerprinting · Zero-friction proof-of-work · Instant IP cluster quarantine'
              },
              {
                icon: Activity,
                badge: 'ENTERPRISE SLA',
                title: '99.999% High Availability & 15-Minute SLA',
                desc: 'Guaranteed five-nines uptime backed by financial penalties. Dedicated enterprise incident response channel with direct access to senior security engineering personnel in under 15 minutes.',
                specs: '99.999% contract SLA · 15-minute emergency response · Dedicated Slack/Teams bridge'
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
                        background: '#FEF9C3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#854D0E'
                      }}>
                        <FeatIcon size={20} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#CA8A04', letterSpacing: '0.12em' }}>
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

      {/* ===================== FINAL FINTECH CTA ===================== */}
      <section style={{
        padding: '96px 0',
        background: '#10201E',
        color: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px, 3.2vw, 36px)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', marginBottom: '18px' }}>
            Elevate compliance and eliminate audit friction.
          </h2>
          <p style={{ fontSize: '16px', color: '#9EBAAF', lineHeight: 1.6, marginBottom: '36px' }}>
            Schedule an enterprise architecture review with our security engineering team and receive a complete PCI-DSS 4.0 technical attestation dossier.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <Link
              to="/register?plan=dedicated"
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
              <span>Schedule Architecture Review</span>
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
              <span>Review Dedicated Enterprise SLA</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
