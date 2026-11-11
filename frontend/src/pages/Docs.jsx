import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import Docs3DArchitecture from '../components/Docs3DArchitecture';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Check,
  Copy,
  Terminal,
  Cpu,
  Layers,
  Radio,
  ExternalLink,
  BookOpen,
  Code,
  Zap,
  Lock,
  Globe,
  Sliders,
  Server,
  FileText,
  AlertTriangle,
  HelpCircle,
  Database,
  CheckCircle2,
  FolderOpen,
  Activity,
  Key,
  Menu,
  X,
  Share2,
  RefreshCw,
  EyeOff,
  Flame,
  Gauge,
  Sparkles,
  RotateCcw,
  Bug,
  HardDrive,
  Network,
} from 'lucide-react';

// ============================================================================
// CONCISE, STREAMLINED DOCUMENTATION TAXONOMY (4 Groups, 12 Focused Topics)
// ============================================================================
const DOC_SECTIONS = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview', label: 'Platform Overview', icon: Shield, readTime: '3 min' },
      { id: 'quickstart', label: 'Quickstart Guide', icon: Zap, readTime: '4 min' },
      { id: 'cloud-waf', label: 'Cloud DNS Proxy', icon: Globe, readTime: '4 min' },
    ],
  },
  {
    group: 'WordPress Fleet SaaS',
    items: [
      { id: 'fleet-management', label: 'Multi-Site Central Console', icon: Layers, readTime: '4 min' },
      { id: 'safe-updates', label: 'Safe Updates & Auto-Rollback', icon: RotateCcw, readTime: '5 min' },
      { id: 'malware-remediation', label: 'Malware Hunter & 1-Click Repair', icon: Bug, readTime: '5 min' },
      { id: 'site-hardening', label: '16-Point Hardening & RASP', icon: Lock, readTime: '4 min' },
    ],
  },
  {
    group: 'Edge WAF & Threat Defense',
    items: [
      { id: 'waf-defense', label: 'Cloud WAF & OWASP Shield', icon: Cpu, readTime: '5 min' },
      { id: 'ddos-access', label: 'Anti-DDoS & Smart Challenge', icon: Flame, readTime: '4 min' },
      { id: 'stealth-cloaking', label: 'Stealth Cloaking & Virtual Patches', icon: EyeOff, readTime: '4 min' },
    ],
  },
  {
    group: 'Operations & Compliance',
    items: [
      { id: 'faqs', label: 'Frequently Asked Questions', icon: HelpCircle, readTime: '5 min' },
      { id: 'security-compliance', label: 'Security & Data Privacy', icon: Shield, readTime: '4 min' },
    ],
  },
];

const ALL_DOC_ITEMS = DOC_SECTIONS.flatMap((g) => g.items);

// ============================================================================
// REUSABLE DOCUMENTATION UI COMPONENTS
// ============================================================================
function CodeSnippet({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '14px 0 20px',
        background: '#10221F',
        border: '1px solid #233B36',
        boxShadow: '0 4px 16px rgba(16, 34, 31, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: '#0B1A17',
          borderBottom: '1px solid #1C332E',
          fontSize: '11px',
          color: '#87948D',
          fontFamily: "'SF Mono', Monaco, monospace",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#E85D45' }} />
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F5B83D' }} />
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#44A066' }} />
          <span style={{ marginLeft: '6px', color: '#CBD7CC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {language}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#44A066' : '#87948D',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            borderRadius: '4px',
          }}
        >
          {copied ? <Check size={12} strokeWidth={2.4} /> : <Copy size={12} strokeWidth={2.2} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '14px 16px',
          color: '#E5EBE4',
          fontSize: '12.5px',
          lineHeight: '1.6',
          fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
          overflowX: 'auto',
        }}
      >
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

function CalloutBox({ title, children, icon: Icon = Shield, type = 'sage' }) {
  const isOrange = type === 'orange';
  return (
    <aside
      style={{
        background: isOrange ? '#FFF8F4' : '#E9EEE8',
        borderLeft: `3px solid ${isOrange ? '#D97735' : '#10221F'}`,
        borderTopRightRadius: '8px',
        borderBottomRightRadius: '8px',
        padding: '14px 18px',
        margin: '18px 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <Icon size={17} strokeWidth={2.4} style={{ color: isOrange ? '#D97735' : '#10221F', flexShrink: 0, marginTop: '2px' }} />
      <div>
        {title && (
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#10221F', marginBottom: '3px' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#53615D' }}>
          {children}
        </div>
      </div>
    </aside>
  );
}

function ParamTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '16px 0 22px', border: '1px solid #D9DFD9', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', background: '#FFFFFF' }}>
        <thead>
          <tr style={{ background: '#F8F8F4', color: '#10221F', borderBottom: '1px solid #D9DFD9' }}>
            <th style={{ padding: '9px 14px', fontWeight: 750 }}>Parameter</th>
            <th style={{ padding: '9px 14px', fontWeight: 750 }}>Type</th>
            <th style={{ padding: '9px 14px', fontWeight: 750 }}>Requirement</th>
            <th style={{ padding: '9px 14px', fontWeight: 750 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #EAEFEA' : 'none' }}>
              <td style={{ padding: '9px 14px', fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 700, color: '#10221F' }}>
                {row.name}
              </td>
              <td style={{ padding: '9px 14px', color: '#87948D', fontFamily: 'monospace' }}>
                {row.type}
              </td>
              <td style={{ padding: '9px 14px' }}>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: row.required ? '#FFF4ED' : '#F8F8F4',
                    color: row.required ? '#D97735' : '#87948D',
                    border: `1px solid ${row.required ? '#FCD3B6' : '#D9DFD9'}`,
                  }}
                >
                  {row.required ? 'Required' : 'Optional'}
                </span>
              </td>
              <td style={{ padding: '9px 14px', color: '#53615D', lineHeight: 1.5 }}>
                {row.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// MAIN DOCUMENTATION COMPONENT
// ============================================================================
export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K search focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('docs-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter sections by search query
  const filteredDocSections = useMemo(() => {
    if (!searchFilter.trim()) return DOC_SECTIONS;
    const q = searchFilter.toLowerCase();
    return DOC_SECTIONS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchFilter]);

  // Current active doc metadata
  const currentItem = useMemo(() => {
    return ALL_DOC_ITEMS.find((i) => i.id === activeSection) || ALL_DOC_ITEMS[0];
  }, [activeSection]);

  const currentGroup = useMemo(() => {
    return DOC_SECTIONS.find((g) => g.items.some((i) => i.id === activeSection))?.group || 'Documentation';
  }, [activeSection]);

  // Prev / Next topic navigation
  const { prevItem, nextItem } = useMemo(() => {
    const currentIndex = ALL_DOC_ITEMS.findIndex((i) => i.id === activeSection);
    const prev = currentIndex > 0 ? ALL_DOC_ITEMS[currentIndex - 1] : null;
    const next = currentIndex < ALL_DOC_ITEMS.length - 1 ? ALL_DOC_ITEMS[currentIndex + 1] : null;
    return { prevItem: prev, nextItem: next };
  }, [activeSection]);

  const handleSelectSection = (id) => {
    setActiveSection(id);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyPageLink = async () => {
    await copyToClipboard(window.location.href);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2200);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8F8F4',
        color: '#53615D',
        fontFamily: "Inter, Geist, Arial, -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #E9EEE8; color: #10221F; }

        .doc-sidebar-btn {
          transition: all 0.15s ease;
        }
        .doc-sidebar-btn:hover:not(.active) {
          background: #E9EEE8 !important;
          color: #10221F !important;
        }
        .doc-sidebar-btn.active {
          background: #10221F !important;
          color: #FFFFFF !important;
        }

        .doc-card-link {
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .doc-card-link:hover {
          transform: translateY(-2px);
          border-color: #D97735 !important;
          box-shadow: 0 8px 20px rgba(16, 34, 31, 0.08) !important;
        }

        @media (max-width: 1024px) {
          .docs-right-toc {
            display: none !important;
          }
        }

        @media (max-width: 860px) {
          .docs-left-sidebar {
            position: fixed !important;
            top: 76px !important;
            left: 0 !important;
            bottom: 0 !important;
            z-index: 99 !important;
            background: #FFFFFF !important;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          }
          .docs-left-sidebar.open {
            transform: translateX(0) !important;
          }
          .docs-main-pane {
            padding: 24px 16px 70px !important;
          }
        }
      `}</style>

      {/* Global Brand Navbar */}
      <PublicNavbar />

      {/* Top Secondary Action Bar (Breadcrumbs & Quick Jump) */}
      <div
        style={{
          marginTop: '76px',
          background: '#FFFFFF',
          borderBottom: '1px solid #D9DFD9',
          padding: '10px clamp(16px, 3vw, 32px)',
          position: 'sticky',
          top: '76px',
          zIndex: 40,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Mobile Drawer Toggle & Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #D9DFD9',
                background: '#F8F8F4',
                color: '#10221F',
                cursor: 'pointer',
              }}
              aria-label="Toggle Navigation Drawer"
            >
              {mobileSidebarOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <Link to="/docs" style={{ color: '#87948D', textDecoration: 'none', fontWeight: 600 }}>Docs</Link>
              <ChevronRight size={13} color="#87948D" />
              <span style={{ color: '#87948D', fontWeight: 600 }}>{currentGroup}</span>
              <ChevronRight size={13} color="#87948D" />
              <span style={{ color: '#10221F', fontWeight: 700 }}>{currentItem.label}</span>
            </div>
          </div>

          {/* Quick Jump Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleSelectSection('quickstart')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#53615D',
                background: '#FFFFFF',
                border: '1px solid #D9DFD9',
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              Quickstart
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('fleet-management')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#53615D',
                background: '#FFFFFF',
                border: '1px solid #D9DFD9',
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              WordPress Fleet
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('waf-defense')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#53615D',
                background: '#FFFFFF',
                border: '1px solid #D9DFD9',
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              Cloud WAF
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Documentation Canvas */}
      <div
        style={{
          maxWidth: '1380px',
          margin: '0 auto',
          display: 'flex',
          minHeight: 'calc(100vh - 128px)',
        }}
      >
        {/* ===================== LEFT SIDEBAR (CONCISE & COMPACT) ===================== */}
        <aside
          className={`docs-left-sidebar ${mobileSidebarOpen ? 'open' : ''}`}
          style={{
            width: '270px',
            flexShrink: 0,
            borderRight: '1px solid #D9DFD9',
            background: '#FFFFFF',
            padding: '20px 14px',
            height: 'calc(100vh - 128px)',
            position: 'sticky',
            top: '128px',
            overflowY: 'auto',
          }}
        >
          {/* Search Box with Ctrl+K shortcut indicator */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search
              size={13}
              strokeWidth={2.4}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#87948D',
                pointerEvents: 'none',
              }}
            />
            <input
              id="docs-search-input"
              type="search"
              placeholder="Search docs..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '54px',
                borderRadius: '6px',
                border: '1px solid #CBD7CC',
                background: '#F8F8F4',
                color: '#10221F',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                fontWeight: 700,
                color: '#87948D',
                background: '#FFFFFF',
                border: '1px solid #D9DFD9',
                borderRadius: '4px',
                padding: '1px 4px',
                pointerEvents: 'none',
              }}
            >
              ⌘K
            </span>
          </div>

          {/* Grouped Documentation Items (Clean 4 Sections) */}
          <nav aria-label="Documentation hierarchy">
            {filteredDocSections.map((group, gIdx) => (
              <div key={gIdx} style={{ marginBottom: '18px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.11em',
                    color: '#87948D',
                    marginBottom: '5px',
                    paddingLeft: '8px',
                  }}
                >
                  {group.group}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    const ItemIcon = item.icon || Shield;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSection(item.id)}
                        className={`doc-sidebar-btn ${isActive ? 'active' : ''}`}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 9px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? '#10221F' : 'transparent',
                          color: isActive ? '#FFFFFF' : '#53615D',
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                          <ItemIcon size={13} strokeWidth={2.2} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '9.5px',
                            opacity: isActive ? 0.8 : 0.5,
                            flexShrink: 0,
                          }}
                        >
                          {item.readTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Active Protection Indicator */}
          <div
            style={{
              marginTop: '16px',
              padding: '11px',
              borderRadius: '8px',
              background: '#F8F8F4',
              border: '1px solid #D9DFD9',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D', fontWeight: 700, marginBottom: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
              <span>MDefender Cloud Engine</span>
            </div>
            <div style={{ color: '#87948D', fontSize: '10.5px' }}>
              Edge &bull; Line-rate &lt;0.12ms
            </div>
          </div>
        </aside>

        {/* ===================== CENTER CONTENT PANE ===================== */}
        <main
          className="docs-main-pane"
          style={{
            flex: 1,
            padding: '32px 40px 80px',
            maxWidth: '880px',
            minWidth: 0,
          }}
        >
          {/* Header Row: Title, Read Time & Action Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid #D9DFD9',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#D97735',
                  marginBottom: '4px',
                }}
              >
                {currentGroup}
              </div>
              <h1
                style={{
                  fontSize: 'clamp(22px, 3vw, 28px)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.03em',
                  color: '#10221F',
                  margin: 0,
                }}
              >
                {currentItem.label}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyPageLink}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: copiedPage ? '#28745D' : '#10221F',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {copiedPage ? <Check size={12} strokeWidth={2.4} /> : <Share2 size={12} strokeWidth={2.2} />}
                <span>{copiedPage ? 'Copied' : 'Share'}</span>
              </button>

              <span
                style={{
                  background: '#E9EEE8',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#53615D',
                }}
              >
                {currentItem.readTime}
              </span>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 12 FOCUSED TOPIC CONTENTS (Zero Backend API Leaks)               */}
          {/* ================================================================ */}

          {/* 1. PLATFORM OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                <strong style={{ color: '#10221F' }}>MDefender Pro</strong> provides enterprise-grade cloud protection and multi-site security management for WordPress websites, web applications, and digital agencies. It pairs high-speed edge inspection (<strong style={{ color: '#10221F' }}>&lt;0.12ms</strong> line-rate) with in-depth WordPress runtime self-protection (RASP).
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  margin: '20px 0',
                }}
              >
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '16px' }}>
                  <Shield size={18} strokeWidth={2.4} style={{ color: '#28745D', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Autonomous Cloud WAF</h3>
                  <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Filters malicious requests at the edge before they touch your server, stopping SQLi, XSS, RCE, and zero-day exploits.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '16px' }}>
                  <Layers size={18} strokeWidth={2.4} style={{ color: '#D97735', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Central WordPress Fleet</h3>
                  <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Manage updates, scans, malware cleanup, and security settings across 10, 50, or 100+ sites from one unified dashboard.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '16px' }}>
                  <RotateCcw size={18} strokeWidth={2.4} style={{ color: '#10221F', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Safe Updates & Rollback</h3>
                  <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Automatic health checks on every plugin update. If a fatal White-Screen-of-Death occurs, it rolls back in under 800ms.
                  </p>
                </div>
              </div>

              {/* Interactive Threat Simulator */}
              <div style={{ marginTop: '26px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', marginBottom: '8px' }}>
                  Live Edge Defense Simulator
                </h3>
                <p style={{ fontSize: '12.5px', color: '#53615D', marginBottom: '14px' }}>
                  Select an attack pattern below to observe how the edge filter inspects and neutralizes hostile traffic:
                </p>
                <Docs3DArchitecture />
              </div>
            </div>
          )}

          {/* 2. QUICKSTART GUIDE */}
          {activeSection === 'quickstart' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Connecting a WordPress site to MDefender Pro takes less than 3 minutes using our official companion plugin. Follow these three steps:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '18px 0' }}>
                {[
                  {
                    step: '1',
                    title: 'Download the Official Plugin',
                    desc: 'Log in to your MDefender Pro User Dashboard, go to "Connect Website", and download the latest mdefender-pro.zip package.',
                  },
                  {
                    step: '2',
                    title: 'Install in WordPress Admin',
                    desc: 'In your WordPress dashboard, navigate to Plugins → Add New → Upload Plugin. Choose mdefender-pro.zip and click "Install Now", then click "Activate".',
                  },
                  {
                    step: '3',
                    title: 'Pair with One-Click Token',
                    desc: 'Copy your unique pairing key from the MDefender dashboard and paste it into MDefender Pro settings in your WordPress admin. Your site is instantly connected and protected!',
                  },
                ].map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#10221F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F' }}>{s.title}</div>
                      <div style={{ fontSize: '12.5px', color: '#53615D', marginTop: '2px', lineHeight: 1.55 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <CalloutBox title="Automated Verification" icon={CheckCircle2}>
                Once paired, the plugin performs an automatic handshake with the cloud engine, enables Runtime Application Self-Protection (RASP), and begins real-time integrity monitoring.
              </CalloutBox>
            </div>
          )}

          {/* 3. CLOUD DNS PROXY */}
          {activeSection === 'cloud-waf' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                For non-WordPress applications or complete origin IP cloaking, deploy MDefender as your cloud Anycast DNS Proxy. All traffic passes through our edge scrubbing centers before reaching your hosting origin.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '18px 0 10px' }}>
                DNS Record Configuration
              </h3>
              <p style={{ fontSize: '13px', color: '#53615D', marginBottom: '12px' }}>
                In your domain registrar or DNS provider (Cloudflare, Namecheap, GoDaddy), update your records:
              </p>

              <ParamTable
                rows={[
                  { name: 'A Record (@)', type: 'IPv4', required: true, desc: 'Point root domain to MDefender Anycast Edge VIP 185.199.108.153' },
                  { name: 'CNAME (www)', type: 'FQDN', required: true, desc: 'Point www to edge.mdefender-proxy.net' },
                ]}
              />

              <CalloutBox title="Automatic Edge SSL" icon={Lock}>
                MDefender automatically provisions and renews Let's Encrypt TLS 1.3 certificates at the edge with zero configuration needed.
              </CalloutBox>
            </div>
          )}

          {/* 4. MULTI-SITE CENTRAL CONSOLE */}
          {activeSection === 'fleet-management' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Agencies and multi-brand businesses can manage <strong>10, 50, or 100+ WordPress installations</strong> without logging into individual WordPress admin dashboards.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', margin: '18px 0' }}>
                {[
                  { label: 'Bulk Plugin Updates', val: '1-Click Fleet Action', note: 'Update or deactivate plugins across all sites' },
                  { label: 'Security Health Score', val: 'Live Telemetry', note: 'Instant visibility on outdated themes or vulnerabilities' },
                  { label: 'Automated Backups', val: 'Pre-Update Snapshots', note: 'Safe restore points before running changes' },
                  { label: 'Tag & Group Filtering', val: 'Client Segmentation', note: 'Group sites by client, staging, or production' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#87948D' }}>{item.label}</div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#10221F', margin: '4px 0 2px' }}>{item.val}</div>
                    <div style={{ fontSize: '11.5px', color: '#53615D' }}>{item.note}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '13px', color: '#53615D', lineHeight: 1.6 }}>
                All fleet commands are transmitted through secure, authenticated HMAC handshakes between your MDefender user dashboard and the installed plugin.
              </p>
            </div>
          )}

          {/* 5. SAFE UPDATES & AUTO-ROLLBACK */}
          {activeSection === 'safe-updates' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                WordPress updates are notorious for causing unexpected plugin conflicts and White-Screen-of-Death (WSOD). MDefender Pro's <strong>Safe Updates Engine</strong> automates update testing and instant recovery:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
                {[
                  { step: '1', title: 'Pre-Update Snapshot', desc: 'Creates a lightweight snapshot of the target plugin and active database options before touching any code.' },
                  { step: '2', title: 'Controlled In-Place Update', desc: 'Applies the latest official update from WordPress.org under active filesystem monitoring.' },
                  { step: '3', title: 'Automated Health Probes', desc: 'Simulates synthetic visits to your homepage, wp-admin, and checkout to ensure HTTP 200 and zero fatal PHP errors.' },
                  { step: '4', title: 'Sub-Second Auto-Rollback', desc: 'If any 500 error or fatal exception is detected, MDefender immediately restores the snapshot in <800ms.' },
                ].map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E8792F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 750, color: '#10221F' }}>{s.title}</div>
                      <div style={{ fontSize: '12px', color: '#53615D', marginTop: '2px' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <CalloutBox title="Worry-Free Maintenance" icon={RotateCcw}>
                Update plugins across dozens of websites simultaneously with confidence, knowing every site will remain online without manual supervision.
              </CalloutBox>
            </div>
          )}

          {/* 6. MALWARE HUNTER & 1-CLICK REPAIR */}
          {activeSection === 'malware-remediation' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                MDefender's Malware Hunter audits your files against <strong>5.32M+ verified official WordPress checksums</strong> and uses intelligent heuristic patterns to uncover obfuscated backdoors.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', margin: '16px 0' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Official Checksum Matching</h4>
                  <p style={{ fontSize: '12px', color: '#53615D', margin: 0, lineHeight: 1.5 }}>
                    Compares WordPress core and plugin files with clean upstream releases, pinpointing any injected malicious modifications.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>WebShell & Backdoor Detection</h4>
                  <p style={{ fontSize: '12px', color: '#53615D', margin: 0, lineHeight: 1.5 }}>
                    Heuristic scanning uncovers c99, r57, WSO shells, base64 eval droppers, and disguised PHP files inside uploads folders.
                  </p>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '22px 0 10px' }}>
                1-Click Automated Disinfection
              </h3>
              <p style={{ fontSize: '13px', color: '#53615D', lineHeight: 1.6 }}>
                When malware is detected, you don't need to manually hunt through code. Click <strong>"1-Click Disinfect"</strong> in your dashboard to:
              </p>
              <ul style={{ paddingLeft: '18px', fontSize: '13px', lineHeight: 1.7, color: '#53615D', margin: '10px 0' }}>
                <li>Quarantine confirmed backdoors and remove execution permissions.</li>
                <li>Download fresh, original file copies from WordPress.org to replace modified files.</li>
                <li>Purge active sessions and rotate security keys to block unauthorized persistent access.</li>
              </ul>
            </div>
          )}

          {/* 7. 16-POINT HARDENING & RASP */}
          {activeSection === 'site-hardening' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Harden WordPress against the most common entry points with a single toggle from your MDefender dashboard:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', margin: '16px 0' }}>
                {[
                  { label: 'Disable File Editing', desc: 'Locks theme & plugin editor in wp-admin to prevent attacker code tampering.' },
                  { label: 'XML-RPC Protection', desc: 'Blocks brute force amplification and pingback attacks targeting xmlrpc.php.' },
                  { label: 'Uploads PHP Execution Barrier', desc: 'Prevents PHP scripts from executing inside the wp-content/uploads/ directory.' },
                  { label: 'User Enumeration Defense', desc: 'Stops automated scanners from guessing administrator usernames via /?author=N.' },
                  { label: 'Sensitive REST Route Lock', desc: 'Restricts user directory REST endpoints to authenticated sessions.' },
                  { label: 'In-Memory RASP Hook', desc: 'Intercepts dangerous PHP functions (eval, system) before execution in memory.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 750, color: '#10221F', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: '#53615D', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <CodeSnippet
                language="php"
                code={`// MDefender Pro automatic hardening constants in wp-config.php
define('DISALLOW_FILE_EDIT', true);
define('MDEFENDER_HARDENING_ACTIVE', true);`}
              />
            </div>
          )}

          {/* 8. CLOUD WAF & OWASP SHIELD */}
          {activeSection === 'waf-defense' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                MDefender's Cloud WAF operates at the edge, inspecting every incoming HTTP/S request in under 0.12 milliseconds. It comprehensively mitigates the OWASP Top 10 vulnerabilities:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', margin: '16px 0' }}>
                {[
                  { title: 'SQL Injection (SQLi)', desc: 'AST normalization neutralizes stacked, union, and boolean query injections.' },
                  { title: 'Cross-Site Scripting (XSS)', desc: 'Interception of reflected, stored, and DOM polyglot SVG/HTML event vectors.' },
                  { title: 'Remote Code Execution (RCE)', desc: 'Blocks hostile command execution wrappers and uploaded web shell scripts.' },
                  { title: 'Path Traversal (LFI)', desc: 'Prevents attempts to traverse directories and read sensitive files like /etc/passwd.' },
                  { title: 'SSRF & Cloud Metadata', desc: 'Protects server metadata endpoints (169.254.169.254) from unauthorized querying.' },
                  { title: 'Bad Bots & Scanners', desc: 'Identifies and blocks vulnerability scanners (sqlmap, Nikto, Burp Suite).' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 750, color: '#10221F', marginBottom: '3px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#53615D', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. ANTI-DDOS & SMART CHALLENGE */}
          {activeSection === 'ddos-access' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Protect against Layer-7 volumetric attacks and automated brute force bots without frustrating legitimate customers with difficult image captchas:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F' }}>Cryptographic Proof-of-Work Challenge</div>
                  <div style={{ fontSize: '12.5px', color: '#53615D', marginTop: '3px', lineHeight: 1.55 }}>
                    When suspicious traffic spikes occur, the visitor's browser solves a brief background mathematical challenge. Real users see zero puzzles, while automated botnets are stopped because they cannot afford the CPU cost.
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F' }}>Sliding-Window Rate Limiting</div>
                  <div style={{ fontSize: '12.5px', color: '#53615D', marginTop: '3px', lineHeight: 1.55 }}>
                    Set custom request limits on login pages (/wp-login.php) and checkout endpoints to eliminate brute force password guessing and cart scraping.
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F' }}>Geo-Fencing & IP Quarantine</div>
                  <div style={{ fontSize: '12.5px', color: '#53615D', marginTop: '3px', lineHeight: 1.55 }}>
                    Restrict access from countries where you have no business presence, and automatically quarantine high-risk Tor exit nodes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. STEALTH CLOAKING & VIRTUAL PATCHES */}
          {activeSection === 'stealth-cloaking' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Standard WAF block pages (HTTP 403) inform attackers that a security tool is active, prompting them to rotate IPs and tweak payloads. MDefender Pro uses <strong>Stealth Deception</strong> to trick attackers:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', margin: '16px 0' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Synthetic 502 Bad Gateway</h4>
                  <p style={{ fontSize: '12px', color: '#53615D', margin: 0, lineHeight: 1.5 }}>
                    Returns authentic web server error responses. Automated scanners assume the server is dead or down and stop scanning.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>15-Minute Virtual Patching</h4>
                  <p style={{ fontSize: '12px', color: '#53615D', margin: 0, lineHeight: 1.5 }}>
                    When a zero-day vulnerability in a popular plugin is disclosed, MDefender pushes an edge virtual patch globally in 15 minutes, protecting your site before a patch is even available.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 11. FAQS */}
          {activeSection === 'faqs' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                Frequently asked questions about using MDefender Pro on your websites:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    q: 'Will MDefender Pro slow down my website?',
                    a: 'No. The entire inspection pipeline executes at line rate in under 0.12 milliseconds. Your visitors will experience zero perceptible delay.',
                  },
                  {
                    q: 'Can I use MDefender Pro alongside Cloudflare or other CDNs?',
                    a: 'Yes. You can use MDefender Pro as an origin protection layer behind Cloudflare or AWS CloudFront, or use MDefender DNS directly.',
                  },
                  {
                    q: 'What happens if a plugin update fails during Safe Updates?',
                    a: 'MDefender automatically detects the 500 error or WSOD and restores your pre-update snapshot in under 800ms, keeping your site online 100% of the time.',
                  },
                  {
                    q: 'How does MDefender prevent false positives?',
                    a: 'Our dual-core engine scores request confidence mathematically. Ambiguous requests with low anomaly scores are logged for review rather than blocked immediately.',
                  },
                ].map((faq, fIdx) => (
                  <div key={fIdx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '8px', padding: '14px 16px' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#10221F', margin: '0 0 5px' }}>{faq.q}</h4>
                    <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#53615D', margin: 0 }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. COMPLIANCE & DATA PRIVACY */}
          {activeSection === 'security-compliance' && (
            <div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#53615D', marginBottom: '18px' }}>
                MDefender Pro is built with a privacy-first architectural foundation designed for strict regulatory compliance:
              </p>

              <ul style={{ paddingLeft: '18px', fontSize: '13px', lineHeight: 1.7, color: '#53615D', margin: '14px 0' }}>
                <li><strong>No PII Payload Storage:</strong> Customer personal identifiable information (PII) or credit card data is never stored on disk.</li>
                <li><strong>TLS 1.3 Encryption:</strong> All communication between the edge proxy, user dashboard, and origin WordPress sites enforces modern TLS 1.3 encryption.</li>
                <li><strong>GDPR &amp; SOC 2 Aligned:</strong> Compliant with GDPR Article 32 security standards, providing encrypted audit trails and automated log rotation.</li>
              </ul>
            </div>
          )}

          {/* ===================== PREVIOUS / NEXT TOPIC CARDS ===================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid #D9DFD9',
            }}
          >
            {prevItem ? (
              <button
                type="button"
                onClick={() => handleSelectSection(prevItem.id)}
                className="doc-card-link"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '7px',
                  padding: '12px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 34, 31, 0.04)',
                }}
              >
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '2px' }}>
                  &larr; Previous Topic
                </div>
                <div style={{ fontSize: '13px', fontWeight: 750, color: '#10221F' }}>
                  {prevItem.label}
                </div>
              </button>
            ) : <div />}

            {nextItem ? (
              <button
                type="button"
                onClick={() => handleSelectSection(nextItem.id)}
                className="doc-card-link"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '7px',
                  padding: '12px 16px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 34, 31, 0.04)',
                }}
              >
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Next Topic &rarr;
                </div>
                <div style={{ fontSize: '13px', fontWeight: 750, color: '#10221F' }}>
                  {nextItem.label}
                </div>
              </button>
            ) : <div />}
          </div>
        </main>

        {/* ===================== RIGHT SIDEBAR: QUICK ACTIONS & RESOURCES ===================== */}
        <aside
          className="docs-right-toc"
          style={{
            width: '230px',
            flexShrink: 0,
            padding: '32px 16px',
            position: 'sticky',
            top: '128px',
            height: 'calc(100vh - 128px)',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#D97735',
              marginBottom: '10px',
            }}
          >
            Quick Actions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <Link
              to="/pricing"
              style={{
                display: 'block',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#10221F',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Start Free Trial
            </Link>

            <Link
              to="/threat-intelligence"
              style={{
                display: 'block',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#E9EEE8',
                border: '1px solid #D9DFD9',
                color: '#10221F',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Threat Intelligence
            </Link>
          </div>

          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#87948D',
              marginBottom: '8px',
            }}
          >
            Resources
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
            <li>
              <Link to="/about" style={{ color: '#53615D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={12} />
                <span>Security Disclosures</span>
              </Link>
            </li>
            <li>
              <Link to="/pricing" style={{ color: '#53615D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={12} />
                <span>SLA &amp; Uptime Guarantees</span>
              </Link>
            </li>
          </ul>
        </aside>
      </div>

      {/* ===================== FOOTER ===================== */}
      <footer
        style={{
          background: '#F8F8F4',
          borderTop: '1px solid #D9DFD9',
          padding: '20px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '0 clamp(16px, 3vw, 32px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '11px',
            color: '#87948D',
          }}
        >
          <div>&copy; {new Date().getFullYear()} MDefender Pro Cyber Systems. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
            <span>All Global Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
