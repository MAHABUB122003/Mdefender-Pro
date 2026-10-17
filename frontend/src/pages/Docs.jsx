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
} from 'lucide-react';

// ============================================================================
// DOCUMENTATION SECTION TAXONOMY & GROUPS
// ============================================================================
const DOC_SECTIONS = [
  {
    group: 'Getting Started',
    items: [
      { id: 'intro', label: 'What is MDefender Pro', icon: Shield, readTime: '4 min' },
      { id: 'hybrid-architecture', label: 'Hybrid WAF + ML Engine', icon: Layers, readTime: '5 min' },
      { id: 'quickstart', label: '5-Minute Quickstart', icon: Zap, readTime: '5 min' },
      { id: 'website-connect', label: 'Connect Website Guide', icon: Globe, readTime: '6 min' },
    ],
  },
  {
    group: '6,501,208+ Dataset ML Core',
    items: [
      { id: 'ml-overview', label: 'Machine Learning Model', icon: Cpu, readTime: '7 min' },
      { id: 'ml-vectorizer', label: 'Character N-Gram Vectorizer', icon: Code, readTime: '6 min' },
      { id: 'ml-classification', label: 'Risk Scoring & Categories', icon: Activity, readTime: '5 min' },
    ],
  },
  {
    group: '2,000,000+ Hyper-Scale Signatures',
    items: [
      { id: 'rules-overview', label: 'Signatures Overview', icon: FileText, readTime: '5 min' },
      { id: 'sqli-defense', label: 'SQL Injection (400k+ Vectors)', icon: Database, readTime: '6 min' },
      { id: 'xss-defense', label: 'Cross-Site Scripting (350k+)', icon: Code, readTime: '5 min' },
      { id: 'rce-webshells', label: 'RCE & WebShells (300k+)', icon: Terminal, readTime: '6 min' },
      { id: 'lfi-traversal', label: 'LFI & Traversal (200k+)', icon: FolderOpen, readTime: '4 min' },
      { id: 'cms-vulnerabilities', label: 'CMS Exploits (250k+)', icon: Shield, readTime: '5 min' },
      { id: 'bots-scanners', label: 'Bots & Scanners (150k+)', icon: Radio, readTime: '4 min' },
      { id: 'ssrf-xxe', label: 'SSRF & Cloud IMDS (150k+)', icon: Globe, readTime: '5 min' },
    ],
  },
  {
    group: 'Cloud Edge & SDKs',
    items: [
      { id: 'cloud-waf', label: 'Cloud WAF (Smart Anycast DNS)', icon: Globe, readTime: '6 min' },
      { id: 'sdk-wordpress', label: 'WordPress Official Plugin', icon: Zap, readTime: '5 min' },
      { id: 'nginx-proxy', label: 'NGINX Reverse Proxy Gateway', icon: Server, readTime: '6 min' },
      { id: 'sdk-python', label: 'Python / FastAPI / Django', icon: Code, readTime: '5 min' },
      { id: 'sdk-php', label: 'PHP / Laravel Integration', icon: Code, readTime: '5 min' },
    ],
  },
  {
    group: 'Custom Rules Builder',
    items: [
      { id: 'custom-rules-guide', label: 'Authoring Regex Policies', icon: Sliders, readTime: '6 min' },
      { id: 'tenant-isolation', label: 'Tenant Isolation & Actions', icon: Lock, readTime: '4 min' },
    ],
  },
  {
    group: 'REST API Reference',
    items: [
      { id: 'api-auth', label: 'Authentication Endpoints', icon: Key, readTime: '4 min' },
      { id: 'api-rules', label: 'Custom Rules CRUD API', icon: Sliders, readTime: '6 min' },
      { id: 'api-telemetry', label: 'Logs & Metrics Streams', icon: Activity, readTime: '5 min' },
    ],
  },
  {
    group: 'Operations & Compliance',
    items: [
      { id: 'learning-lab', label: 'Attack Learning Lab', icon: Cpu, readTime: '5 min' },
      { id: 'benchmarks', label: 'Latency & Benchmarks', icon: Zap, readTime: '4 min' },
      { id: 'compliance', label: 'SOC 2 & GDPR Privacy', icon: Shield, readTime: '5 min' },
      { id: 'faqs', label: 'Frequently Asked Questions', icon: HelpCircle, readTime: '6 min' },
    ],
  },
];

// Flat list of all items for previous/next navigation
const ALL_DOC_ITEMS = DOC_SECTIONS.flatMap((g) => g.items);

// ============================================================================
// HELPER COMPONENTS FOR HIGH-END DOCUMENTATION
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
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '20px 0 24px',
        background: '#10221F',
        border: '1px solid #233B36',
        boxShadow: '0 8px 24px rgba(16, 34, 31, 0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          background: '#0B1A17',
          borderBottom: '1px solid #1C332E',
          fontSize: '11px',
          color: '#87948D',
          fontFamily: "'SF Mono', Monaco, monospace",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#E85D45' }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#D97735' }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#28745D' }} />
          <span style={{ marginLeft: '10px', color: '#B7C6C2', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: copied ? '#28745D' : '#F8F8F4',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={12} strokeWidth={2.4} /> : <Copy size={12} strokeWidth={2.2} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '20px 22px',
          color: '#E5EBE4',
          fontSize: '13.5px',
          lineHeight: '1.65',
          fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
          overflowX: 'auto',
        }}
      >
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

function MultiLangCodeSnippet({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);
  const current = tabs[activeTab] || tabs[0];

  return (
    <div
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '22px 0 26px',
        background: '#10221F',
        border: '1px solid #233B36',
        boxShadow: '0 8px 24px rgba(16, 34, 31, 0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0B1A17',
          borderBottom: '1px solid #1C332E',
          padding: '0 12px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isActive ? '#D97735' : '#87948D',
                  borderBottom: isActive ? '2px solid #D97735' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.title}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={async () => {
            await copyToClipboard(current.code);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#87948D',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Copy size={12} strokeWidth={2.2} />
          <span>Copy</span>
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '20px 22px',
          color: '#E5EBE4',
          fontSize: '13.5px',
          lineHeight: '1.65',
          fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
          overflowX: 'auto',
        }}
      >
        <code>{current.code.trim()}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const styles = {
    GET: { bg: '#E8F3EC', color: '#28745D', border: '#CFE2D4' },
    POST: { bg: '#FFF4ED', color: '#D97735', border: '#FCD3B6' },
    PUT: { bg: '#EAF4FF', color: '#1B5EAA', border: '#C9DFF5' },
    DELETE: { bg: '#FDF2F2', color: '#C53030', border: '#FBD5D5' },
  };
  const s = styles[method] || styles.GET;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '5px',
        fontSize: '10.5px',
        fontWeight: '800',
        fontFamily: "'SF Mono', Monaco, monospace",
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        marginRight: '8px',
        letterSpacing: '0.04em',
      }}
    >
      {method}
    </span>
  );
}

function CalloutBox({ title, children, icon: Icon = Shield, type = 'sage' }) {
  const isOrange = type === 'orange';
  return (
    <aside
      style={{
        background: isOrange ? '#FFF8F4' : '#E9EEE8',
        borderLeft: `3px solid ${isOrange ? '#D97735' : '#10221F'}`,
        borderTopRightRadius: '10px',
        borderBottomRightRadius: '10px',
        padding: '18px 22px',
        margin: '24px 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
      }}
    >
      <Icon size={19} strokeWidth={2.4} style={{ color: isOrange ? '#D97735' : '#10221F', flexShrink: 0, marginTop: '2px' }} />
      <div>
        {title && (
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#10221F', marginBottom: '4px' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#53615D' }}>
          {children}
        </div>
      </div>
    </aside>
  );
}

function ParamTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '20px 0 28px', border: '1px solid #D9DFD9', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', background: '#FFFFFF' }}>
        <thead>
          <tr style={{ background: '#F8F8F4', color: '#10221F', borderBottom: '1px solid #D9DFD9' }}>
            <th style={{ padding: '12px 16px', fontWeight: 750 }}>Parameter</th>
            <th style={{ padding: '12px 16px', fontWeight: 750 }}>Type</th>
            <th style={{ padding: '12px 16px', fontWeight: 750 }}>Requirement</th>
            <th style={{ padding: '12px 16px', fontWeight: 750 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #D9DFD9' : 'none' }}>
              <td style={{ padding: '12px 16px', fontFamily: "'SF Mono', Monaco, monospace", fontWeight: 700, color: '#10221F' }}>
                {row.name}
              </td>
              <td style={{ padding: '12px 16px', color: '#87948D', fontFamily: 'monospace' }}>
                {row.type}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    background: row.required ? '#FFF4ED' : '#F8F8F4',
                    color: row.required ? '#D97735' : '#87948D',
                    border: `1px solid ${row.required ? '#FCD3B6' : '#D9DFD9'}`,
                  }}
                >
                  {row.required ? 'Required' : 'Optional'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', color: '#53615D', lineHeight: 1.5 }}>
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
// MAIN DOCS COMPONENT
// ============================================================================
export default function Docs() {
  const [activeSection, setActiveSection] = useState('intro');
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
          box-shadow: 0 12px 28px rgba(16, 34, 31, 0.08) !important;
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
            padding: 24px 18px 80px !important;
          }
        }
      `}</style>

      {/* Global Brand Navbar */}
      <PublicNavbar />

      {/* Top Secondary Action Bar (Quick Navigation & Mobile Toggle) */}
      <div
        style={{
          marginTop: '76px',
          background: '#FFFFFF',
          borderBottom: '1px solid #D9DFD9',
          padding: '12px clamp(18px, 3.2vw, 32px)',
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
            gap: '16px',
          }}
        >
          {/* Breadcrumb row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden"
              style={{
                background: '#E9EEE8',
                border: '1px solid #D9DFD9',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#10221F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              <Menu size={14} />
              <span>Topics</span>
            </button>

            <span style={{ color: '#87948D', fontWeight: 600 }}>Docs</span>
            <ChevronRight size={13} style={{ color: '#87948D' }} />
            <span style={{ color: '#53615D' }}>{currentGroup}</span>
            <ChevronRight size={13} style={{ color: '#87948D' }} />
            <span style={{ color: '#10221F', fontWeight: 700 }}>{currentItem.label}</span>
          </div>

          {/* Quick jump badges for popular developer flows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hidden sm:flex">
            <button
              type="button"
              onClick={() => handleSelectSection('quickstart')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10221F',
                background: '#E9EEE8',
                border: '1px solid #D9DFD9',
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              5-Min Quickstart
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('sdk-wordpress')}
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
              WordPress SDK
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('api-auth')}
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
              REST API
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
        {/* ===================== LEFT SIDEBAR ===================== */}
        <aside
          className={`docs-left-sidebar ${mobileSidebarOpen ? 'open' : ''}`}
          style={{
            width: '300px',
            flexShrink: 0,
            borderRight: '1px solid #D9DFD9',
            background: '#FFFFFF',
            padding: '24px 18px',
            height: 'calc(100vh - 128px)',
            position: 'sticky',
            top: '128px',
            overflowY: 'auto',
          }}
        >
          {/* Search Box with Ctrl+K shortcut indicator */}
          <div style={{ position: 'relative', marginBottom: '22px' }}>
            <Search
              size={15}
              strokeWidth={2.4}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#87948D',
                pointerEvents: 'none',
              }}
            />
            <input
              id="docs-search-input"
              type="search"
              placeholder="Search documentation..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '34px',
                paddingRight: '64px',
                borderRadius: '8px',
                border: '1px solid #CBD7CC',
                background: '#F8F8F4',
                color: '#10221F',
                fontSize: '12.5px',
                outline: 'none',
                transition: 'all 0.15s ease',
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
                padding: '2px 5px',
                pointerEvents: 'none',
              }}
            >
              ⌘K
            </span>
          </div>

          {/* Grouped Documentation Items */}
          <nav aria-label="Documentation hierarchy">
            {filteredDocSections.map((group, gIdx) => (
              <div key={gIdx} style={{ marginBottom: '22px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#87948D',
                    marginBottom: '8px',
                    paddingLeft: '10px',
                  }}
                >
                  {group.group}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          background: isActive ? '#10221F' : 'transparent',
                          color: isActive ? '#FFFFFF' : '#53615D',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                          <ItemIcon
                            size={14}
                            strokeWidth={2.4}
                            style={{
                              color: isActive ? '#D97735' : '#87948D',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                        </div>
                        {isActive && (
                          <div
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: '#D97735',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Live Edge Status Widget at Sidebar Bottom */}
          <div
            style={{
              marginTop: '32px',
              padding: '14px',
              borderRadius: '10px',
              background: '#F8F8F4',
              border: '1px solid #D9DFD9',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D', fontWeight: 700, marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D', boxShadow: '0 0 6px #28745D' }} />
              <span>MDefender Edge v3.4.2</span>
            </div>
            <div style={{ color: '#87948D' }}>
              All 180+ Anycast PoPs active &bull; Latency &lt;0.12ms
            </div>
          </div>
        </aside>

        {/* ===================== CENTER CONTENT PANE ===================== */}
        <main
          className="docs-main-pane"
          style={{
            flex: 1,
            padding: '40px 52px 100px',
            maxWidth: '920px',
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
              gap: '14px',
              marginBottom: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #D9DFD9',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.13em',
                  color: '#D97735',
                  marginBottom: '6px',
                }}
              >
                {currentGroup}
              </div>
              <h1
                style={{
                  fontSize: 'clamp(28px, 3.8vw, 38px)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.05em',
                  color: '#10221F',
                  margin: 0,
                }}
              >
                {currentItem.label}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCopyPageLink}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: copiedPage ? '#28745D' : '#10221F',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(16, 34, 31, 0.04)',
                }}
              >
                {copiedPage ? <Check size={12} strokeWidth={2.4} /> : <Share2 size={12} strokeWidth={2.2} />}
                <span>{copiedPage ? 'Copied Link' : 'Share'}</span>
              </button>

              <span
                style={{
                  background: '#E9EEE8',
                  padding: '6px 10px',
                  borderRadius: '6px',
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
          {/* DYNAMIC TOPIC CONTENT ROUTING                                    */}
          {/* ================================================================ */}

          {/* 1. INTRO SECTION */}
          {activeSection === 'intro' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '24px' }}>
                <strong style={{ color: '#10221F' }}>MDefender Pro</strong> is an autonomous, hyper-scale cloud Web Application Firewall (WAF) and real-time API shield. It unifies a deterministic catalog of <strong>2,000,000+ verified exploit signatures</strong> with a deep machine learning neural core trained on <strong>6,501,208+ verified cyber attack payloads</strong> and 639K+ Generative AI prompt injection vectors.
              </p>

              {/* 3 Pillar Feature Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  margin: '28px 0',
                }}
              >
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 14px rgba(16, 34, 31, 0.04)' }}>
                  <Cpu size={22} strokeWidth={2.4} style={{ color: '#D97735', marginBottom: '10px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '0 0 6px' }}>6.5M+ ML Neural Core</h3>
                  <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Trained across CSIC HTTP, CICIDS, and 639K+ jailbreak corpora using character n-gram TF-IDF vectorization with 99.23% precision.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 14px rgba(16, 34, 31, 0.04)' }}>
                  <Shield size={22} strokeWidth={2.4} style={{ color: '#28745D', marginBottom: '10px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '0 0 6px' }}>2M+ Signatures</h3>
                  <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Exhaustive regex catalog covering SQLi, XSS, RCE, LFI, CMS zero-days, and automated bot scanners in O(1) Radix trie traversal.
                  </p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 14px rgba(16, 34, 31, 0.04)' }}>
                  <Zap size={22} strokeWidth={2.4} style={{ color: '#10221F', marginBottom: '10px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '0 0 6px' }}>&lt;0.12ms Edge Execution</h3>
                  <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                    Pre-compiled in-memory Radix lookup tables guarantee single-pass packet inspection with zero perceptible application latency.
                  </p>
                </div>
              </div>

              {/* Interactive 3D Execution Pipeline */}
              <Docs3DArchitecture />
            </div>
          )}

          {/* 2. HYBRID ARCHITECTURE */}
          {activeSection === 'hybrid-architecture' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '24px' }}>
                MDefender employs a dual-stage pipeline that executes deterministic signature matching alongside statistical machine learning classification in parallel:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
                {[
                  {
                    step: '01',
                    title: 'Request Extraction & Recursive Normalization',
                    desc: 'Extracts URL path, query string, request headers (User-Agent, Referer, Cookies), and multipart/JSON body fields. Executes recursive URL decoding to defeat nested encoding evasion.',
                  },
                  {
                    step: '02',
                    title: 'Tier 1: Deterministic Filter Ring (2M+ Signatures)',
                    desc: 'Evaluates pre-compiled DFA state machines in O(1) Radix time. Drops known malicious patterns, scanner fingerprints, and RFC compliance violations in under 0.05ms.',
                  },
                  {
                    step: '03',
                    title: 'Tier 2: 6.5M+ Payload-Trained Neural Vectorizer',
                    desc: 'Vectorizes unparsed text into token character n-grams. Evaluates token distribution entropy and syntax anomaly confidence, detecting unseen polymorphic mutations in <0.07ms.',
                  },
                  {
                    step: '04',
                    title: 'Decision Engine & Instant Mitigation',
                    desc: 'Correlates rule hits and ML confidence score. If threat threshold exceeds 80%, the packet is dropped and served a customizable 403 Cyber Block Page.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D9DFD9',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '18px',
                    }}
                  >
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#10221F',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '15.5px', fontWeight: 750, color: '#10221F', margin: '0 0 6px' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#53615D', margin: 0 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <CalloutBox title="Sub-Millisecond Guarantees" icon={Zap}>
                Both tiers execute within a shared memory buffer. MDefender never buffers response payloads from your origin server, preserving streaming HTTP/2 and WebSocket connections intact.
              </CalloutBox>
            </div>
          )}

          {/* 3. 5-MINUTE QUICKSTART */}
          {activeSection === 'quickstart' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Deploy enterprise web application defense across your stack in under five minutes using our cloud proxy, native WordPress plugin, or REST API.
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#10221F', margin: '28px 0 12px' }}>
                Step 1: Obtain Your Workspace API Key
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#53615D' }}>
                Log in to your MDefender Pro User Dashboard and navigate to <strong>Settings &rarr; API Keys</strong>. Generate a tenant API key with read/write edge inspection permissions.
              </p>

              <CodeSnippet
                language="bash"
                code={`# Verify your tenant API key status
curl -X GET "https://api.mdefender.io/api/v1/auth/status" \\
  -H "Authorization: Bearer YOUR_MDEFENDER_API_KEY"`}
              />

              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#10221F', margin: '28px 0 12px' }}>
                Step 2: Choose Your Deployment Architecture
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', margin: '18px 0' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px' }}>
                  <Globe size={20} style={{ color: '#D97735', marginBottom: '8px' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>Smart Anycast DNS Proxy</h4>
                  <p style={{ fontSize: '12.5px', color: '#53615D', margin: 0 }}>Zero code changes. Point your domain CNAME/A records to our 180+ global POPs.</p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px' }}>
                  <Zap size={20} style={{ color: '#28745D', marginBottom: '8px' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>WordPress 1-Click Plugin</h4>
                  <p style={{ fontSize: '12.5px', color: '#53615D', margin: 0 }}>Install directly from WordPress admin with automated RASP pre-write protection.</p>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px' }}>
                  <Terminal size={20} style={{ color: '#10221F', marginBottom: '8px' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#10221F', margin: '0 0 4px' }}>SDK / Middleware Hook</h4>
                  <p style={{ fontSize: '12.5px', color: '#53615D', margin: 0 }}>One-line middleware for FastAPI, Express, Django, Laravel, and NGINX.</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. CONNECT WEBSITE GUIDE */}
          {activeSection === 'website-connect' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Connecting your domain to MDefender Pro enables automated SSL provisioning, Layer 7 DDoS scrubbing, and instant zero-day virtual patching.
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#10221F', margin: '24px 0 12px' }}>
                DNS Record Configuration
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#53615D' }}>
                Update your authoritative DNS host (Cloudflare, Route 53, GoDaddy) with the following Anycast routing records:
              </p>

              <ParamTable
                rows={[
                  { name: 'A Record', type: 'IPv4', required: true, desc: 'Point root (@) to MDefender Edge Anycast IP 185.199.108.153' },
                  { name: 'CNAME Record', type: 'FQDN', required: true, desc: 'Point www to edge.mdefender-proxy.net' },
                  { name: 'TXT Record', type: 'String', required: false, desc: 'Ownership verification token: mdefender-verify=WORKSPACE_ID' },
                ]}
              />

              <CalloutBox title="Zero Downtime Propagation" icon={CheckCircle2}>
                DNS changes typically take 2 to 5 minutes to propagate globally. During propagation, origin traffic continues flowing smoothly while edge certificates are generated automatically.
              </CalloutBox>
            </div>
          )}

          {/* 5. MACHINE LEARNING OVERVIEW */}
          {activeSection === 'ml-overview' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                MDefender Pro incorporates an advanced machine learning neural classifier trained on <strong>6,501,208+ verified cyber attack payloads</strong> sourced from international research corpora, honeypot captures, and live telemetry feeds.
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#10221F', margin: '28px 0 12px' }}>
                Training Corpus Breakdown
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', margin: '20px 0' }}>
                {[
                  { label: 'CSIC HTTP Dataset', val: '4,100,000+ Requests', note: 'Standard web traffic & injection attacks' },
                  { label: 'CICIDS & CTU Corpus', val: '1,400,000+ Vectors', note: 'Botnets, volumetric scans, and brute-force' },
                  { label: 'Generative AI Jailbreaks', val: '639,000+ Prompts', note: 'LLM prompt injection & bypass mutations' },
                  { label: 'Zero-Day Honeypot Feeds', val: '362,208+ Payloads', note: 'Unseen polymorphic RCE & AST variations' },
                ].map((stat, sIdx) => (
                  <div key={sIdx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#87948D', fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10221F', margin: '6px 0 2px' }}>{stat.val}</div>
                    <div style={{ fontSize: '12px', color: '#53615D' }}>{stat.note}</div>
                  </div>
                ))}
              </div>

              <CodeSnippet
                language="python"
                code={`# Inspect live model evaluation via Python SDK
from mdefender import WAFEngine

waf = WAFEngine(api_key="sk_live_...")
verdict = waf.evaluate_payload("admin' UNION SELECT 1,password--")

print(verdict.action)      # "BLOCK"
print(verdict.confidence)  # 0.9984
print(verdict.category)    # "SQL_INJECTION"
print(verdict.latency_ms)  # 0.11`}
              />
            </div>
          )}

          {/* 6. CHARACTER N-GRAM VECTORIZER */}
          {activeSection === 'ml-vectorizer' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Rather than relying on word tokenization that breaks on whitespace evasion, MDefender Pro computes <strong>character n-grams (ranges 2 to 5)</strong> over the entire normalized payload string.
              </p>

              <CodeSnippet
                language="python"
                code={`# Sample N-Gram Tokenization Pipeline
def extract_ngrams(payload: str, n_range=(2, 5)):
    tokens = []
    for n in range(n_range[0], n_range[1] + 1):
        for i in range(len(payload) - n + 1):
            tokens.append(payload[i:i+n])
    return tokens

# Vectorizing "UNION SELECT" yields:
# ['UN', 'NI', 'IO', 'ON', 'UNI', 'NIO', 'ION', 'UNION', ... 'SELECT']`}
              />

              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#53615D' }}>
                This preserves sub-word syntactic markers even when attackers disguise hostile statements using comment blocks (<code>/*%!50000...*/</code>) or character concatenation functions.
              </p>
            </div>
          )}

          {/* 7. RISK SCORING & CATEGORIES */}
          {activeSection === 'ml-classification' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Every request receives a normalized <strong>Threat Score from 0 to 100</strong>. Actions are configured per tenant based on sensitivity thresholds:
              </p>

              <ParamTable
                rows={[
                  { name: '0 – 24 (Low)', type: 'Allow', required: false, desc: 'Legitimate application traffic. Forwarded to origin immediately.' },
                  { name: '25 – 49 (Guarded)', type: 'Log / Watch', required: false, desc: 'Anomalous query parameters or uncommon headers. Logged for audit inspection.' },
                  { name: '50 – 79 (High)', type: 'Challenge', required: false, desc: 'Suspicious bot fingerprint or repeated 404 scans. Served an interactive Turnstile captcha.' },
                  { name: '80 – 100 (Critical)', type: 'Block', required: true, desc: 'Deterministic exploit vector or high ML anomaly score. Instant 403 block with zero origin touch.' },
                ]}
              />
            </div>
          )}

          {/* 8. SIGNATURES OVERVIEW */}
          {activeSection === 'rules-overview' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                MDefender Pro packages over <strong>2,000,000+ active threat signatures</strong> compiled into hyper-scale Radix Trie state machines. Rules update hourly via our automated global threat intelligence feed.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', margin: '20px 0' }}>
                {[
                  { cat: 'SQL Injection', rules: '400,000+ Signatures', desc: 'Boolean-based, error-based, time-based, and stacked queries.' },
                  { cat: 'Cross-Site Scripting (XSS)', rules: '350,000+ Signatures', desc: 'Reflected, stored, and DOM polyglot SVG/HTML5 event vectors.' },
                  { cat: 'RCE & WebShells', rules: '300,000+ Signatures', desc: 'PHP/Python/Perl command execution wrappers and obfuscated shells.' },
                  { cat: 'LFI & Path Traversal', rules: '200,000+ Signatures', desc: 'Null-byte bypasses, /etc/passwd exfiltration, and Windows UNC paths.' },
                  { cat: 'CMS & WordPress CVEs', rules: '250,000+ Signatures', desc: 'Unauthenticated AJAX exploits, arbitrary file write, and plugin CVEs.' },
                  { cat: 'Bots & Scanners', rules: '150,000+ Signatures', desc: 'Automated vulnerability scanners (sqlmap, Nikto, Acunetix, Burp).' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#D97735', marginBottom: '4px' }}>{item.cat}</div>
                    <div style={{ fontSize: '16px', fontWeight: 750, color: '#10221F', margin: '0 0 6px' }}>{item.rules}</div>
                    <div style={{ fontSize: '12.5px', color: '#53615D', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. SQLI DEFENSE */}
          {activeSection === 'sqli-defense' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                SQL injection continues to be the most damaging web vulnerability. MDefender Pro inspects query parameters, form POST fields, JSON objects, and Cookie values for malicious SQL syntax tokens.
              </p>

              <CodeSnippet
                language="sql"
                code={`-- Blocked SQLi Attack Vector Sample
GET /api/products?cat=electronics'/**/UNION/**/ALL/**/SELECT/**/1,CONCAT(user,0x3a,pass),3/**/FROM/**/admin_users-- -`}
              />

              <CalloutBox title="Active Countermeasure" icon={Shield}>
                MDefender evaluates both AST statement intent and lexical token entropy. Payloads using whitespace obfuscation, hex character encoding, or nested version comments are terminated in 0.12ms.
              </CalloutBox>
            </div>
          )}

          {/* 10. XSS DEFENSE */}
          {activeSection === 'xss-defense' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Cross-Site Scripting (XSS) defenses cover stored, reflected, and DOM-based injection vectors, including polyglots that execute across multiple HTML contexts.
              </p>
              <CodeSnippet
                language="html"
                code={`<!-- Polyglot XSS Payload Intercepted by MDefender -->
jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e`}
              />
            </div>
          )}

          {/* 11. RCE & WEBSHELLS */}
          {activeSection === 'rce-webshells' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Remote Code Execution (RCE) vectors and web shell uploads attempt to execute hostile operating system commands directly on your server.
              </p>
              <CodeSnippet
                language="php"
                code={`<?php
// Obfuscated PHP WebShell Dropper
@eval(gzinflate(base64_decode('7b1rc9pI2jD8Of0VRn7...')));
?>`}
              />
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#53615D' }}>
                MDefender Pro inspects all multipart form file streams before writing to disk, preventing PHP web shell drops regardless of file extension spoofing (e.g. <code>avatar.png.php</code>).
              </p>
            </div>
          )}

          {/* 12. LFI & PATH TRAVERSAL */}
          {activeSection === 'lfi-traversal' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Local File Inclusion (LFI) attempts to read sensitive operating system files (<code>/etc/passwd</code>, <code>win.ini</code>, <code>wp-config.php</code>) by traversing directory trees.
              </p>
              <CodeSnippet
                language="bash"
                code={`# Path Traversal Payload Sample
curl "https://example.com/download.php?file=....//....//....//etc/passwd%00"`}
              />
            </div>
          )}

          {/* 13. CMS VULNERABILITIES */}
          {activeSection === 'cms-vulnerabilities' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                CMS vulnerabilities target unpatched third-party plugins, themes, and obsolete REST endpoints in WordPress, Joomla, Drupal, and Magento installations.
              </p>
              <CalloutBox title="Automated Zero-Day Virtual Patching" icon={CheckCircle2}>
                When a new WordPress plugin vulnerability is disclosed, MDefender Pro pushes edge virtual patches globally within 15 minutes, safeguarding all tenant sites without requiring manual plugin updates.
              </CalloutBox>
            </div>
          )}

          {/* 14. BOTS & SCANNERS */}
          {activeSection === 'bots-scanners' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Automated reconnaissance scanners systematically probe endpoints to discover unpatched vulnerabilities. MDefender Pro identifies scanner fingerprints and quarantines offending IP subnets.
              </p>
              <ParamTable
                rows={[
                  { name: 'sqlmap', type: 'Signature + Behavior', required: true, desc: 'Automated SQL injection exploitation tool.' },
                  { name: 'Nikto', type: 'Header + Path scan', required: true, desc: 'Web server security assessment scanner.' },
                  { name: 'Burp Suite Scanner', type: 'Fingerprint', required: true, desc: 'Active crawler and fuzzing suite.' },
                  { name: 'Acunetix / Nessus', type: 'User-Agent', required: true, desc: 'Commercial vulnerability scanners.' },
                ]}
              />
            </div>
          )}

          {/* 15. SSRF & CLOUD IMDS */}
          {activeSection === 'ssrf-xxe' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Server-Side Request Forgery (SSRF) exploits attempt to induce your backend servers into querying internal metadata endpoints or private LAN resources.
              </p>
              <CodeSnippet
                language="bash"
                code={`# Blocked Cloud IMDS SSRF Vectors:
http://169.254.169.254/latest/meta-data/iam/security-credentials/  # AWS
http://metadata.google.internal/computeMetadata/v1/                # GCP
http://169.254.169.254/metadata/instance?api-version=2021-02-01     # Azure`}
              />
            </div>
          )}

          {/* 16. CLOUD WAF ANYCAST */}
          {activeSection === 'cloud-waf' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                The MDefender Cloud WAF deploys BGP Anycast routing across 180+ global edge data centers. Traffic is inspected at the edge closest to the visitor before reaching your application origin.
              </p>
              <CodeSnippet
                language="bash"
                code={`# Verify Anycast Edge Routing
dig +short A your-domain.com
# Returns MDefender Anycast Edge VIP: 185.199.108.153`}
              />
            </div>
          )}

          {/* 17. WORDPRESS SDK */}
          {activeSection === 'sdk-wordpress' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                The official MDefender Pro WordPress plugin connects your site directly to our cloud WAF and enables native in-memory Runtime Application Self-Protection (RASP).
              </p>

              <h3 style={{ fontSize: '18px', fontWeight: 750, color: '#10221F', margin: '24px 0 12px' }}>
                Installation via WordPress Admin
              </h3>
              <ol style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.7, color: '#53615D' }}>
                <li>Download <code>mdefender-pro.zip</code> from your User Dashboard.</li>
                <li>In your WordPress Admin, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>.</li>
                <li>Activate the plugin and paste your Workspace API Key in the settings panel.</li>
              </ol>
            </div>
          )}

          {/* 18. NGINX REVERSE PROXY */}
          {activeSection === 'nginx-proxy' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Integrate MDefender Pro into your existing NGINX or OpenResty edge gateways using the official Lua / HTTP auth request module.
              </p>

              <CodeSnippet
                language="nginx"
                code={`# /etc/nginx/conf.d/mdefender.conf
upstream origin_backend {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        # Forward request to MDefender inspection gateway
        auth_request /_mdefender_inspect;
        proxy_pass http://origin_backend;
    }

    location = /_mdefender_inspect {
        internal;
        proxy_pass https://api.mdefender.io/api/v1/edge/inspect;
        proxy_pass_request_body on;
        proxy_set_header X-MDefender-Key "YOUR_API_KEY";
    }
}`}
              />
            </div>
          )}

          {/* 19. PYTHON / FASTAPI SDK */}
          {activeSection === 'sdk-python' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Protect FastAPI, Flask, and Django web applications with our asynchronous ASGI/WSGI middleware.
              </p>

              <MultiLangCodeSnippet
                tabs={[
                  {
                    title: 'FastAPI (ASGI)',
                    code: `from fastapi import FastAPI
from mdefender.fastapi import MDefenderMiddleware

app = FastAPI()

app.add_middleware(
    MDefenderMiddleware,
    api_key="sk_live_...",
    block_threshold=80,
    enable_ml=True
)

@app.get("/")
async def root():
    return {"status": "protected by mdefender"}`,
                  },
                  {
                    title: 'Django (WSGI)',
                    code: `# settings.py
MIDDLEWARE = [
    'mdefender.django.MDefenderMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # ...
]

MDEFENDER_API_KEY = "sk_live_..."
MDEFENDER_BLOCK_THRESHOLD = 80`,
                  },
                ]}
              />
            </div>
          )}

          {/* 20. PHP / LARAVEL INTEGRATION */}
          {activeSection === 'sdk-php' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Native middleware for Laravel and raw PHP applications with zero third-party dependencies.
              </p>

              <CodeSnippet
                language="php"
                code={`// app/Http/Middleware/MDefenderWAF.php
namespace App\\Http\\Middleware;

use Closure;
use MDefender\\Client as MDefenderClient;

class MDefenderWAF {
    public function handle($request, Closure $next) {
        $client = new MDefenderClient(env('MDEFENDER_API_KEY'));
        $verdict = $client->inspectRequest($request);

        if ($verdict->isBlocked()) {
            return response($verdict->renderBlockPage(), 403);
        }

        return $next($request);
    }
}`}
              />
            </div>
          )}

          {/* 21. CUSTOM RULES BUILDER */}
          {activeSection === 'custom-rules-guide' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Author tenant-specific regular expression policies that execute directly at the edge before global rules.
              </p>

              <CodeSnippet
                language="json"
                code={`{
  "name": "Block Admin Path from Non-Internal IPs",
  "pattern": "^/wp-admin/.*",
  "target_fields": ["path"],
  "action": "BLOCK",
  "severity": "HIGH",
  "ip_whitelist": ["192.168.1.0/24", "10.0.0.0/8"]
}`}
              />
            </div>
          )}

          {/* 22. TENANT ISOLATION */}
          {activeSection === 'tenant-isolation' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Every workspace operates within a dedicated tenant sandbox. Custom rules, whitelist CIDRs, and rate limiting thresholds apply exclusively to your registered domains.
              </p>
            </div>
          )}

          {/* 23. REST API: AUTH */}
          {activeSection === 'api-auth' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Authenticate requests to the MDefender REST API using Bearer Token authorization headers.
              </p>

              <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px', margin: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <MethodBadge method="POST" />
                  <code style={{ fontSize: '14px', fontWeight: 700, color: '#10221F' }}>/api/v1/auth/token</code>
                </div>
                <p style={{ fontSize: '13px', color: '#53615D', margin: 0 }}>
                  Exchange tenant API credentials for a short-lived JSON Web Token (JWT).
                </p>
              </div>

              <CodeSnippet
                language="bash"
                code={`curl -X POST "https://api.mdefender.io/api/v1/auth/token" \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "YOUR_API_KEY", "client_secret": "YOUR_SECRET"}'`}
              />
            </div>
          )}

          {/* 24. REST API: RULES */}
          {activeSection === 'api-rules' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Create, read, update, and delete custom firewall policies programmatically via REST.
              </p>

              <div style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px', margin: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <MethodBadge method="GET" />
                  <code style={{ fontSize: '14px', fontWeight: 700, color: '#10221F' }}>/api/v1/rules</code>
                </div>
                <p style={{ fontSize: '13px', color: '#53615D', margin: 0 }}>List all active custom rules for the authenticated workspace.</p>
              </div>

              <CodeSnippet
                language="bash"
                code={`curl -X GET "https://api.mdefender.io/api/v1/rules" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
              />
            </div>
          )}

          {/* 25. REST API: TELEMETRY */}
          {activeSection === 'api-telemetry' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Stream real-time attack audit logs into external SIEM tools (Datadog, Splunk, Elastic) via Webhooks or Server-Sent Events (SSE).
              </p>
              <CodeSnippet
                language="bash"
                code={`# Stream real-time attack events via SSE
curl -N "https://api.mdefender.io/api/v1/telemetry/stream" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
              />
            </div>
          )}

          {/* 26. ATTACK LEARNING LAB */}
          {activeSection === 'learning-lab' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                The Attack Learning module captures novel attack vectors blocked across the fleet, anonymizes payload parameters, and continuously fine-tunes the ML model.
              </p>
            </div>
          )}

          {/* 27. BENCHMARKS */}
          {activeSection === 'benchmarks' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                Latency benchmarks measured across 10,000,000 requests on AWS c6i.2xlarge edge instances:
              </p>

              <ParamTable
                rows={[
                  { name: 'Deterministic DFA Match', type: '2M Signatures', required: true, desc: 'Average latency: 0.048ms (p99: 0.082ms)' },
                  { name: 'Neural N-Gram Inference', type: 'SGD Model', required: true, desc: 'Average latency: 0.071ms (p99: 0.114ms)' },
                  { name: 'Total Edge Inspection', type: 'Full Dual Pipeline', required: true, desc: 'Average latency: 0.119ms (p99: 0.142ms)' },
                ]}
              />
            </div>
          )}

          {/* 28. COMPLIANCE */}
          {activeSection === 'compliance' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '20px' }}>
                MDefender Pro is engineered to meet <strong>SOC 2 Type II</strong>, <strong>ISO 27001</strong>, and <strong>GDPR Article 32</strong> technical requirements.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.7, color: '#53615D' }}>
                <li>No customer PII or encrypted payload bodies are stored on disk without explicit audit logging consent.</li>
                <li>All edge-to-origin proxy communication enforces TLS 1.3 encryption.</li>
                <li>Comprehensive audit logs are retained in encrypted storage for up to 365 days.</li>
              </ul>
            </div>
          )}

          {/* 29. FAQS */}
          {activeSection === 'faqs' && (
            <div>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#53615D', marginBottom: '24px' }}>
                Frequently asked engineering and operational questions about MDefender Pro:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    q: 'Will MDefender Pro add latency to my legitimate users?',
                    a: 'No. The entire inspection pipeline executes in under 0.12 milliseconds. Because our edge nodes operate an in-memory DFA and token vectorizer, users experience zero delay.',
                  },
                  {
                    q: 'Can I use MDefender Pro alongside Cloudflare or AWS CloudFront?',
                    a: 'Yes. You can position MDefender Pro behind your CDN as an origin shield, or use our Anycast DNS as your primary edge proxy.',
                  },
                  {
                    q: 'How does MDefender handle false positives?',
                    a: 'Our dual-core engine scores confidence mathematically. If a rule triggers but the ML anomaly confidence is below 35%, the request is tagged for observation rather than blocked.',
                  },
                ].map((faq, fIdx) => (
                  <div key={fIdx} style={{ background: '#FFFFFF', border: '1px solid #D9DFD9', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 750, color: '#10221F', margin: '0 0 8px' }}>{faq.q}</h4>
                    <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#53615D', margin: 0 }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== PREVIOUS / NEXT TOPIC CARDS ===================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginTop: '56px',
              paddingTop: '32px',
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
                  borderRadius: '10px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 34, 31, 0.04)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '4px' }}>
                  &larr; Previous Topic
                </div>
                <div style={{ fontSize: '14px', fontWeight: 750, color: '#10221F' }}>
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
                  borderRadius: '10px',
                  padding: '16px 20px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 34, 31, 0.04)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Next Topic &rarr;
                </div>
                <div style={{ fontSize: '14px', fontWeight: 750, color: '#10221F' }}>
                  {nextItem.label}
                </div>
              </button>
            ) : <div />}
          </div>
        </main>

        {/* ===================== RIGHT SIDEBAR: ON THIS PAGE (DESKTOP) ===================== */}
        <aside
          className="docs-right-toc"
          style={{
            width: '260px',
            flexShrink: 0,
            padding: '40px 24px',
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
              marginBottom: '12px',
            }}
          >
            Quick Actions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
            <Link
              to="/pricing"
              style={{
                display: 'block',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#10221F',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Deploy Cloud WAF
            </Link>

            <Link
              to="/threat-intelligence"
              style={{
                display: 'block',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#E9EEE8',
                border: '1px solid #D9DFD9',
                color: '#10221F',
                fontSize: '12px',
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
              marginBottom: '10px',
            }}
          >
            Developer Resources
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <li>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#53615D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExternalLink size={12} />
                <span>GitHub SDK Repo</span>
              </a>
            </li>
            <li>
              <Link to="/about" style={{ color: '#53615D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={12} />
                <span>Security Disclosures</span>
              </Link>
            </li>
            <li>
              <Link to="/user/login" style={{ color: '#53615D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={12} />
                <span>API Keys Console</span>
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
          padding: '32px 0 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '0 clamp(18px, 3.2vw, 32px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11px',
            color: '#87948D',
          }}
        >
          <div>&copy; {new Date().getFullYear()} MDefender Pro Cyber Systems Inc. Documentation v3.4.2.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28745D' }} />
            <span>All Global Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
