import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Layers,
  Radio,
  Zap,
  Lock,
  Globe,
  Database,
  Terminal,
  Activity,
  AlertTriangle,
  Server,
  FileCode,
  Network,
  Binary,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/**
 * ThreatIntelVisual
 * 
 * High-end, professional cybersecurity architecture & telemetry visual
 * designed specifically for MDefender Pro Threat Intelligence.
 * 
 * 100% human-designed vector SaaS UI cards with warm cream palette (#F7F5EE / #F8F8F4),
 * deep pine green (#0B2522), terracotta (#E8792F), and emerald (#28745D).
 * Completely eliminates generic dark neon sci-fi AI-generated imagery.
 */
export default function ThreatIntelVisual({ articleId, category, title, size = 'card' }) {
  const isHero = size === 'hero';
  const isFeatured = size === 'featured';

  // Base container sizing
  const minHeight = isHero ? '380px' : isFeatured ? '360px' : '190px';

  const renderVisualContent = () => {
    switch (articleId) {
      case 'ai-zeroday-threats':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>NEURAL AST VECTORIZER</span>
              </div>
              <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                CVSS 9.8 CRITICAL
              </span>
            </div>

            {/* Pipeline Stage Diagram */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: isHero ? '20px 0' : '10px 0' }}>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD8CF', boxShadow: '0 2px 6px rgba(11,37,34,0.04)' }}>
                <div style={{ fontSize: '9px', color: '#4A5D5A', fontWeight: 700, textTransform: 'uppercase' }}>Token Parser</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0B2522', fontFamily: 'monospace' }}>6,501,208 Set</div>
                <div style={{ fontSize: '9px', color: '#10B981', fontWeight: 600 }}>AST Tree Extracted</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1.5px solid #E8792F', boxShadow: '0 2px 8px rgba(232,121,47,0.12)' }}>
                <div style={{ fontSize: '9px', color: '#E8792F', fontWeight: 800, textTransform: 'uppercase' }}>Entropy Score</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#E8792F', fontFamily: 'monospace' }}>0.941 / 1.00</div>
                <div style={{ fontSize: '9px', color: '#DC2626', fontWeight: 700 }}>Polymorphic Detected</div>
              </div>
              <div style={{ background: '#0B2522', padding: '10px', borderRadius: '8px', color: '#FFFFFF' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Edge Verdict</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>0.11ms BLOCK</div>
                <div style={{ fontSize: '9px', color: '#E8EEE8' }}>HTTP 403 Served</div>
              </div>
            </div>

            {/* Simulated Deconstructed Token Stream */}
            <div style={{ background: '#0B2522', borderRadius: '6px', padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#E8EEE8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ color: '#EF4444' }}>[PAYLOAD_EVASION]</span> admin&apos;/*%!50000UnIoN*/0x6e756c6c... <span style={{ color: '#10B981' }}>&rarr; NEUTRALIZED</span>
            </div>
          </div>
        );

      case 'layer7-ddos-mitigation':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={14} style={{ color: '#E8792F' }} className="animate-pulse" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>BGP ANYCAST SCRUBBER</span>
              </div>
              <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                280K REQ/SEC SCRUBBED
              </span>
            </div>

            {/* Rate Limiting Telemetry Graph Simulation */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #CBD8CF', padding: '12px', margin: isHero ? '18px 0' : '8px 0', boxShadow: '0 2px 8px rgba(11,37,34,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '10px', color: '#4A5D5A', fontWeight: 600 }}>
                <span>Incoming Volumetric Burst (HTTP/2)</span>
                <span style={{ color: '#10B981', fontWeight: 800 }}>Origin Load: 0.8% Nominal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: isHero ? '60px' : '36px' }}>
                {[30, 45, 60, 95, 100, 85, 20, 18, 15, 16, 14, 15, 16, 14].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: h > 70 ? '#EF4444' : h > 40 ? '#F59E0B' : '#10B981', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#0B2522', fontWeight: 700 }}>
              <span>Token-Bucket: Adaptive Surge Buffer</span>
              <span style={{ color: '#28745D' }}>180+ Anycast PoPs Filtering</span>
            </div>
          </div>
        );

      case 'wordpress-rce-hardening':
      case 'runtime-application-self-protection-rasp':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={14} style={{ color: '#28745D' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>WP IN-MEMORY RASP SHIELD</span>
              </div>
              <span style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                PRE-WRITE HOOK ACTIVE
              </span>
            </div>

            {/* Architecture Sandbox Box */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #CBD8CF', padding: '12px', margin: isHero ? '18px 0' : '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#0B2522', fontWeight: 700 }}>
                <span>class-waf-engine.php</span>
                <span style={{ color: '#E8792F' }}>HOOK: wp_handle_upload</span>
              </div>
              <div style={{ marginTop: '8px', padding: '6px 10px', background: '#F8F9F8', borderRadius: '6px', border: '1px dashed #CBD8CF', fontSize: '10px', color: '#4A5D5A', fontFamily: 'monospace' }}>
                polyglot_shell.jpg &rarr; PHP Header Detected &rarr; <span style={{ color: '#EF4444', fontWeight: 800 }}>FILE_WRITE_ABORTED</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#4A5D5A', fontWeight: 600 }}>
              <span>19,480 WP Core Checksums Validated</span>
              <span style={{ color: '#10B981', fontWeight: 800 }}>0 False Positives</span>
            </div>
          </div>
        );

      case 'ssrf-cloud-metadata-protection':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={14} style={{ color: '#E8792F' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>CLOUD METADATA CLOAKING</span>
              </div>
              <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                IMDSv1 / IMDSv2 GUARD
              </span>
            </div>

            {/* Blocked SSRF Inspection Card */}
            <div style={{ background: '#0B2522', borderRadius: '8px', padding: '12px', margin: isHero ? '18px 0' : '8px 0', color: '#E8EEE8', fontFamily: 'monospace', fontSize: '11px' }}>
              <div style={{ color: '#94A3B8', fontSize: '9px', marginBottom: '4px' }}>INTERCEPTED HTTP GET VECTOR:</div>
              <div style={{ color: '#F87171', fontWeight: 700 }}>GET http://169.254.169.254/latest/meta-data/iam/</div>
              <div style={{ color: '#34D399', fontSize: '10px', marginTop: '6px' }}>&check; RULE #SSRF-9042 TRIGGERED &bull; 0.07ms REJECT</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#0B2522', fontWeight: 700 }}>
              <span>AWS, GCP &amp; Azure Metadata Protected</span>
              <span style={{ color: '#28745D' }}>RFC 1918 Private CIDR Banned</span>
            </div>
          </div>
        );

      case 'submillisecond-waf-engineering':
      case 'hyperscale-threat-indexing':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} style={{ color: '#10B981' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>COMPILED RADIX-TRIE DFA</span>
              </div>
              <span style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                0.08ms LATENCY
              </span>
            </div>

            {/* Execution Benchmark Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: isHero ? '18px 0' : '8px 0' }}>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD8CF' }}>
                <div style={{ fontSize: '9px', color: '#4A5D5A', fontWeight: 700 }}>Signatures Indexed</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0B2522', fontFamily: 'monospace' }}>2,000,000+</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD8CF' }}>
                <div style={{ fontSize: '9px', color: '#4A5D5A', fontWeight: 700 }}>Lookup Complexity</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#E8792F', fontFamily: 'monospace' }}>O(1) Trigram</div>
              </div>
              <div style={{ background: '#0B2522', padding: '10px', borderRadius: '8px', color: '#FFFFFF' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700 }}>Throughput</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>120k req/s</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#0B2522', fontWeight: 700 }}>
              <span>Zero-Copy Byte Slice Traversal</span>
              <span style={{ color: '#28745D' }}>Deterministic Finite Automata</span>
            </div>
          </div>
        );

      case 'attack-learning-engine':
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} style={{ color: '#E8792F' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>HEURISTIC VECTOR CLUSTERING</span>
              </div>
              <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                CROSS-TENANT IMMUNITY
              </span>
            </div>

            {/* Neural Cluster Graph Preview */}
            <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid #CBD8CF', padding: '12px', margin: isHero ? '18px 0' : '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4A5D5A', fontWeight: 600, marginBottom: '6px' }}>
                <span>Autonomous Signature Synthesis</span>
                <span style={{ color: '#E8792F', fontWeight: 700 }}>Campaign ID #ATK-7801</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#F1F5F9', fontSize: '10px', fontFamily: 'monospace', color: '#0B2522' }}>SQLi Cluster (98%)</span>
                <span style={{ fontSize: '11px', color: '#CBD8CF' }}>&rarr;</span>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', fontSize: '10px', fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>Edge Virtual Patch Auto-Deployed</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#0B2522', fontWeight: 700 }}>
              <span>Autonomous Feedback Loop Active</span>
              <span style={{ color: '#28745D' }}>Zero Manual Intervention</span>
            </div>
          </div>
        );

      case 'global-threat-intelligence-ingestion':
      default:
        return (
          <div style={{ width: '100%', height: '100%', padding: isHero ? '28px' : '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} style={{ color: '#28745D' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B2522', letterSpacing: '0.06em' }}>GLOBAL THREAT FEEDS</span>
              </div>
              <span style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                53,817 ACTIVE BANS
              </span>
            </div>

            {/* Ingestion Stream Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: isHero ? '18px 0' : '8px 0' }}>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD8CF' }}>
                <div style={{ fontSize: '9px', color: '#4A5D5A', fontWeight: 700 }}>FireHOL L1-3</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0B2522', fontFamily: 'monospace' }}>28,400 IPs</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD8CF' }}>
                <div style={{ fontSize: '9px', color: '#4A5D5A', fontWeight: 700 }}>EmergingThreats</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#E8792F', fontFamily: 'monospace' }}>16,210 IPs</div>
              </div>
              <div style={{ background: '#0B2522', padding: '10px', borderRadius: '8px', color: '#FFFFFF' }}>
                <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700 }}>Blocklist.de</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>9,207 IPs</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#0B2522', fontWeight: 700 }}>
              <span>Subnet Trie IPv4/IPv6 Binary Match</span>
              <span style={{ color: '#28745D' }}>Updated Every 15 Minutes</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight,
        height: '100%',
        background: '#F7F5EE',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderBottom: '1px solid #CBD8CF',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Technical Grid Lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(11, 37, 34, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(11, 37, 34, 0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

      {/* Actual Technical Visual */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {renderVisualContent()}
      </div>
    </div>
  );
}
