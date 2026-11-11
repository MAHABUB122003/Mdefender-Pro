import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { BLOG_POSTS, CATEGORIES } from '../data/threatIntelData';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  ShieldAlert,
  Search,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Check,
  Copy,
  Radio,
  Layers,
  Activity,
  Cpu,
  Lock,
  Globe,
  FileText,
  AlertTriangle,
  Zap,
  Terminal,
  Database,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// HELPER COMPONENTS FOR RICH ARTICLE DETAIL VIEW
// ============================================================================
function CodeSnippetBox({ code }) {
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
        borderRadius: '10px',
        overflow: 'hidden',
        margin: '18px 0',
        background: '#10221F',
        border: '1px solid #233B36',
        boxShadow: '0 4px 14px rgba(16, 34, 31, 0.08)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E85D45' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97735' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28745D' }} />
          <span style={{ marginLeft: '8px', color: '#B7C6C2', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Security Payload Inspection
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: copied ? '#059669' : '#F8F8F4',
            cursor: 'pointer',
            padding: '3px 8px',
            borderRadius: '5px',
            fontSize: '10.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.4} /> : <Copy size={11} strokeWidth={2.2} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          padding: '14px',
          margin: 0,
          fontSize: '12px',
          lineHeight: 1.5,
          color: '#E8EEE8',
          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
          overflowX: 'auto',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function IocSecurityTable({ iocs }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [allCopied, setAllCopied] = useState(false);

  if (!iocs || !iocs.length) return null;

  const handleCopySingle = async (val, index) => {
    const ok = await copyToClipboard(val);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    }
  };

  const handleCopyAll = async () => {
    const text = iocs.map((ioc) => `[${ioc.type}] ${ioc.value} # ${ioc.notes || ''}`).join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        margin: '28px 0 20px',
        borderRadius: '12px',
        border: '1px solid #D9E1DC',
        background: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(16, 34, 31, 0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 18px',
          background: '#F7F6F1',
          borderBottom: '1px solid #D9E1DC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="#E8792F" strokeWidth={2.4} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#10201E', letterSpacing: '-0.01em' }}>
              Forensic Indicators of Compromise (IOCs)
            </div>
            <div style={{ fontSize: '10.5px', color: '#53615D' }}>
              Telemetry Observables &bull; STIX 2.1 Format Reference
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          style={{
            background: allCopied ? '#059669' : '#0B2522',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 750,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'background 0.15s ease',
          }}
        >
          {allCopied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
          <span>{allCopied ? 'All Copied!' : 'Copy All Observables'}</span>
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#FAF9F5', borderBottom: '1px solid #E5EBE4', color: '#4A5D5A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ padding: '8px 14px', fontWeight: 700, width: '25%' }}>Indicator Type</th>
              <th style={{ padding: '8px 14px', fontWeight: 700, width: '45%' }}>Observable Value</th>
              <th style={{ padding: '8px 14px', fontWeight: 700, width: '30%' }}>Forensic Notes</th>
            </tr>
          </thead>
          <tbody>
            {iocs.map((ioc, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: idx === iocs.length - 1 ? 'none' : '1px solid #E5EBE4',
                  background: idx % 2 === 0 ? '#FFFFFF' : '#FBFBFA',
                }}
              >
                <td style={{ padding: '10px 14px', verticalAlign: 'top', fontWeight: 700, color: '#10201E' }}>
                  <span style={{ background: '#E8EEE8', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', color: '#059669', border: '1px solid #D9E1DC' }}>
                    {ioc.type}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', verticalAlign: 'top', fontFamily: 'monospace', color: '#10201E', wordBreak: 'break-all' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', background: 'rgba(232, 121, 47, 0.08)', padding: '2px 5px', borderRadius: '4px', color: '#9A3412' }}>
                      {ioc.value}
                    </span>
                    <button
                      type="button"
                      title="Copy indicator value"
                      onClick={() => handleCopySingle(ioc.value, idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedIndex === idx ? '#059669' : '#87948D',
                        padding: '2px',
                      }}
                    >
                      {copiedIndex === idx ? <Check size={12} strokeWidth={2.4} /> : <Copy size={12} strokeWidth={2} />}
                    </button>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', verticalAlign: 'top', color: '#53615D', fontSize: '11.5px' }}>
                  {ioc.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderFormattedInlineText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#10201E', fontWeight: 750 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            fontFamily: "'SF Mono', Monaco, monospace",
            fontSize: '12px',
            background: '#E8EEE8',
            color: '#9A3412',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid #D9E1DC',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ArticleMarkdownRenderer({ content }) {
  if (!content) return null;
  const blocks = content.split('\n\n');

  return (
    <div className="article-body-content">
      {blocks.map((block, idx) => {
        const text = block.trim();
        if (!text) return null;

        if (text.startsWith('```')) {
          const lines = text.split('\n');
          const code = lines.slice(1, lines[lines.length - 1].startsWith('```') ? -1 : undefined).join('\n');
          return <CodeSnippetBox key={idx} code={code} />;
        }

        if (text.startsWith('### ')) {
          const lines = text.split('\n');
          const headingTitle = lines[0].replace('### ', '').trim();
          const subsequentText = lines.slice(1).join('\n').trim();
          const headingId = headingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          return (
            <div key={idx} id={headingId} style={{ scrollMarginTop: '100px', margin: '30px 0 14px' }}>
              <h3
                style={{
                  fontSize: '19px',
                  lineHeight: 1.25,
                  letterSpacing: '-0.03em',
                  fontWeight: 750,
                  color: '#10201E',
                  margin: '0 0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '3px',
                    height: '18px',
                    borderRadius: '2px',
                    background: '#E8792F',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span>{headingTitle}</span>
              </h3>
              {subsequentText && (
                <p style={{ fontSize: '14.5px', lineHeight: 1.65, color: '#344054', margin: '0 0 16px' }}>
                  {renderFormattedInlineText(subsequentText)}
                </p>
              )}
            </div>
          );
        }

        if (text === '---') {
          return (
            <div key={idx} style={{ margin: '26px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: '#D9E1DC' }} />
              <Shield size={14} strokeWidth={2.4} style={{ color: '#E8792F' }} />
              <div style={{ flex: 1, height: '1px', background: '#D9E1DC' }} />
            </div>
          );
        }

        if (/^\d+\.\s/.test(text)) {
          const items = text.split('\n').filter(Boolean);
          return (
            <div key={idx} style={{ margin: '14px 0 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, i) => {
                const match = item.match(/^(\d+)\.\s+(.*)/);
                const num = match ? match[1] : i + 1;
                const rest = match ? match[2] : item;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#E8EEE8',
                        color: '#10201E',
                        fontWeight: 750,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #D9E1DC',
                        marginTop: '2px',
                      }}
                    >
                      {num}
                    </span>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#344054', flex: 1 }}>
                      {renderFormattedInlineText(rest)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (text.startsWith('- ')) {
          const items = text.split('\n').filter(Boolean);
          return (
            <ul key={idx} style={{ listStyle: 'none', padding: 0, margin: '14px 0 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E8792F', marginTop: '8px', flexShrink: 0 }} />
                  <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#344054' }}>
                    {renderFormattedInlineText(item.replace(/^- /, ''))}
                  </div>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} style={{ fontSize: '14.5px', lineHeight: 1.65, color: '#344054', margin: '0 0 16px' }}>
            {renderFormattedInlineText(text)}
          </p>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: MDEFENDER PRO THREAT RESEARCH & SECURITY LAB
// ============================================================================
export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: urlArticleId } = useParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeArticleId, setActiveArticleId] = useState(urlArticleId || null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setActiveArticleId(urlArticleId || null);
    if (urlArticleId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [urlArticleId]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return BLOG_POSTS.find((p) => p.id === activeArticleId) || null;
  }, [activeArticleId]);

  const featuredPost = useMemo(() => {
    return BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];
  }, []);

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      if (post.id === featuredPost.id) return false;
      const matchCategory = selectedCategory === 'All' || post.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, searchQuery, featuredPost.id]);

  const tableOfContents = useMemo(() => {
    if (!activeArticle) return [];
    const lines = activeArticle.content.split('\n');
    return lines
      .filter((l) => l.startsWith('### '))
      .map((l) => {
        const title = l.replace('### ', '').trim();
        return {
          title,
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        };
      });
  }, [activeArticle]);

  const { prevArticle, nextArticle } = useMemo(() => {
    if (!activeArticle) return { prevArticle: null, nextArticle: null };
    const currentIndex = BLOG_POSTS.findIndex((p) => p.id === activeArticle.id);
    const prev = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null;
    const next = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null;
    return { prevArticle: prev, nextArticle: next };
  }, [activeArticle]);

  const handleOpenArticle = (id) => {
    setActiveArticleId(id);
    navigate(`/threat-intelligence/${id}`, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHub = () => {
    setActiveArticleId(null);
    navigate('/threat-intelligence', { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShareArticle = async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F6F1',
        color: '#10201E',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Global CSS for Animations and Clean Editorial Cards */}
      <style>{`
        * { box-sizing: border-box; }
        .threat-post-card {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease;
        }
        .threat-post-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(11, 37, 34, 0.07) !important;
          border-color: #E8792F !important;
        }
        .threat-post-card:hover .card-thumb-img {
          transform: scale(1.04);
        }
        .threat-post-card:hover .read-link-action {
          color: #E8792F !important;
        }
        .threat-post-card:hover .read-link-action svg {
          transform: translateX(3px);
        }
        .filter-pill-btn {
          transition: all 0.15s ease;
        }
        .filter-pill-btn:hover:not(.active) {
          border-color: #E8792F !important;
          color: #E8792F !important;
        }
        @media (max-width: 900px) {
          .hero-grid-two-col { grid-template-columns: 1fr !important; gap: 28px !important; }
          .featured-card-grid { grid-template-columns: 1fr !important; }
          .featured-img-box { min-height: 220px !important; }
          .research-grid-three-col { grid-template-columns: repeat(2, 1fr) !important; }
          .article-detail-grid { grid-template-columns: 1fr !important; }
          .article-toc-sticky { position: static !important; width: 100% !important; margin-bottom: 24px !important; }
        }
        @media (max-width: 620px) {
          .research-grid-three-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Global Brand Navbar */}
      <PublicNavbar />

      {/* ==================================================================== */}
      {/* VIEW A: DEDICATED ARTICLE DETAIL PAGE                                */}
      {/* ==================================================================== */}
      {activeArticle ? (
        <main id="main-content" style={{ paddingTop: 'calc(76px + 36px)', paddingBottom: '72px' }}>
          <article
            style={{
              maxWidth: '1080px',
              margin: '0 auto',
              padding: '0 clamp(16px, 2.8vw, 28px)',
            }}
          >
            {/* Top Breadcrumb & Return Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '28px',
              }}
            >
              <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6A7E7A' }}>
                <button
                  type="button"
                  onClick={handleBackToHub}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#6A7E7A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6A7E7A')}
                >
                  <ArrowLeft size={12} strokeWidth={2.4} />
                  <span>Threat Intelligence Hub</span>
                </button>
                <span>/</span>
                <span style={{ color: '#4A5D5A' }}>{activeArticle.category}</span>
                <span>/</span>
                <span style={{ color: '#10201E', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  {activeArticle.title}
                </span>
              </nav>

              <button
                type="button"
                onClick={handleShareArticle}
                aria-label="Share this briefing"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  borderRadius: '7px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: copiedLink ? '#059669' : '#10201E',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 3px rgba(16, 34, 31, 0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedLink ? <Check size={12} strokeWidth={2.4} /> : <Share2 size={12} strokeWidth={2.2} />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Briefing'}</span>
              </button>
            </div>

            {/* Centered Article Header */}
            <header
              style={{
                maxWidth: '780px',
                margin: '0 auto 28px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: '#E8EEE8',
                  border: '1px solid #D9E1DC',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#E8792F',
                  marginBottom: '14px',
                }}
              >
                <Radio size={11} strokeWidth={2.4} />
                <span>{activeArticle.category} &bull; {activeArticle.cve || 'SECURITY LAB'}</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(26px, 3.4vw, 38px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.04em',
                  fontWeight: 800,
                  color: '#10201E',
                  margin: '0 auto 14px',
                }}
              >
                {activeArticle.title}
              </h1>

              <p
                style={{
                  fontSize: '14.5px',
                  lineHeight: 1.6,
                  color: '#4A5D5A',
                  maxWidth: '640px',
                  margin: '0 auto 20px',
                }}
              >
                {activeArticle.excerpt}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  fontSize: '11px',
                  color: '#6A7E7A',
                  paddingTop: '12px',
                  borderTop: '1px solid #D9E1DC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#0B2522',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {activeArticle.authorInitials}
                  </div>
                  <span style={{ color: '#10201E', fontWeight: 600 }}>{activeArticle.author}</span>
                </div>
                <span>&bull;</span>
                <span>{activeArticle.date}</span>
                <span>&bull;</span>
                <span>{activeArticle.readTime}</span>
                {activeArticle.cvss && (
                  <span
                    style={{
                      background: '#FEE2E2',
                      color: '#991B1B',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '10px',
                    }}
                  >
                    CVSS {activeArticle.cvss}
                  </span>
                )}
              </div>
            </header>

            {/* High-Resolution Article Banner Image */}
            {activeArticle.image && (
              <div
                style={{
                  maxWidth: '820px',
                  margin: '0 auto 36px',
                  height: '320px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #D9E1DC',
                  boxShadow: '0 8px 24px rgba(11, 37, 34, 0.05)',
                  background: '#F7F6F1',
                }}
              >
                <img
                  src={activeArticle.image}
                  alt={activeArticle.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Article Body Grid */}
            <div
              className="article-detail-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr',
                gap: '32px',
                alignItems: 'start',
              }}
            >
              {/* Sticky TOC */}
              <aside
                className="article-toc-sticky"
                style={{
                  position: 'sticky',
                  top: '100px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #D9E1DC',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.03)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10201E', marginBottom: '10px' }}>
                  Dossier Sections
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tableOfContents.map((toc, tIdx) => (
                    <a
                      key={tIdx}
                      href={`#${toc.id}`}
                      style={{
                        fontSize: '11.5px',
                        color: '#4A5D5A',
                        textDecoration: 'none',
                        lineHeight: 1.4,
                        padding: '3px 0',
                        borderLeft: '2px solid transparent',
                        paddingLeft: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#E8792F';
                        e.currentTarget.style.borderLeftColor = '#E8792F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#4A5D5A';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }}
                    >
                      {toc.title}
                    </a>
                  ))}
                </nav>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E6ECE8' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>
                    PROTECTION STATUS
                  </div>
                  <div style={{ fontSize: '11px', color: '#10201E', fontWeight: 600 }}>
                    Active &bull; Mitigated on Cloud Edge
                  </div>
                </div>
              </aside>

              {/* Main Content Box */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #D9E1DC',
                  padding: 'clamp(20px, 3.2vw, 36px)',
                  boxShadow: '0 4px 18px rgba(11, 37, 34, 0.03)',
                }}
              >
                <ArticleMarkdownRenderer content={activeArticle.content} />
                <IocSecurityTable iocs={activeArticle.iocs} />
              </div>
            </div>

            {/* Bottom Prev / Next Nav */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '36px',
              }}
            >
              {prevArticle ? (
                <div
                  onClick={() => handleOpenArticle(prevArticle.id)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #D9E1DC',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0B2522')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D9E1DC')}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#6A7E7A', textTransform: 'uppercase', marginBottom: '4px' }}>
                    &larr; Previous Dossier
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10201E', lineHeight: 1.3 }}>
                    {prevArticle.title}
                  </div>
                </div>
              ) : <div />}

              {nextArticle ? (
                <div
                  onClick={() => handleOpenArticle(nextArticle.id)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #D9E1DC',
                    padding: '16px',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0B2522')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D9E1DC')}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#6A7E7A', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Next Dossier &rarr;
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10201E', lineHeight: 1.3 }}>
                    {nextArticle.title}
                  </div>
                </div>
              ) : <div />}
            </div>
          </article>
        </main>
      ) : (
        /* ================================================================== */
        /* VIEW B: MAIN THREAT INTELLIGENCE & RESEARCH LAB HUB (WITH IMAGES)  */
        /* ================================================================== */
        <main id="main-content">
          {/* ===================== HERO / HEADER SECTION ===================== */}
          <section
            style={{
              paddingTop: 'calc(76px + 40px)',
              paddingBottom: '48px',
              position: 'relative',
              background: 'radial-gradient(circle at 75% 20%, rgba(232, 121, 47, 0.08) 0%, rgba(232, 238, 232, 0.35) 45%, rgba(247, 246, 241, 0) 70%)',
              borderBottom: '1px solid #D9E1DC',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(16px, 2.8vw, 28px)',
              }}
            >
              <div
                className="hero-grid-two-col"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 380px',
                  gap: '48px',
                  alignItems: 'center',
                }}
              >
                {/* Left Column: Eyebrow, Main Title & Description */}
                <div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.13em',
                      color: '#E8792F',
                      marginBottom: '12px',
                    }}
                  >
                    THREAT INTELLIGENCE &amp; SECURITY LAB
                  </div>

                  <h1
                    style={{
                      fontSize: 'clamp(34px, 4.4vw, 52px)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.05em',
                      fontWeight: 800,
                      color: '#10201E',
                      margin: '0 0 16px',
                    }}
                  >
                    Know what’s coming.{' '}
                    <span style={{ color: '#E8792F' }}>Build what lasts.</span>
                  </h1>

                  <p
                    style={{
                      fontSize: 'clamp(14.5px, 1.5vw, 16px)',
                      lineHeight: 1.6,
                      color: '#4A5D5A',
                      margin: 0,
                      maxWidth: '560px',
                    }}
                  >
                    Reverse-engineered exploit vectors, emerging polymorphic mutations, and sub-millisecond edge
                    countermeasures published directly by the MDefender Pro research fleet.
                  </p>
                </div>

                {/* Right Column: Clean Search Card */}
                <div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D9E1DC',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      boxShadow: '0 4px 18px rgba(11, 37, 34, 0.04)',
                    }}
                  >
                    <label
                      htmlFor="lab-search-input"
                      style={{
                        display: 'block',
                        fontSize: '10.5px',
                        fontWeight: 750,
                        color: '#10201E',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '8px',
                      }}
                    >
                      Search Intelligence Archive
                    </label>

                    <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
                      <Search
                        size={15}
                        strokeWidth={2.4}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '12px',
                          color: '#7A928B',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="lab-search-input"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search CVE, SQLi, malware, RCE..."
                        style={{
                          width: '100%',
                          height: '38px',
                          paddingLeft: '34px',
                          paddingRight: '12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD8CF',
                          background: '#FBFCFA',
                          fontSize: '13px',
                          color: '#10201E',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    </div>

                    <p style={{ margin: 0, fontSize: '11px', color: '#7A928B', lineHeight: 1.45 }}>
                      Filter by CVE identifier, SQLi evasion, RCE pattern, or threat taxonomy tag.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== FEATURED BRIEFING SECTION (WITH HERO IMAGE) ===================== */}
          <section
            style={{
              padding: '48px 0 36px',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(16px, 2.8vw, 28px)',
              }}
            >
              <div style={{ marginBottom: '18px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: '#E8792F',
                    marginBottom: '4px',
                  }}
                >
                  KEY ADVISORY
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(22px, 2.6vw, 30px)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.04em',
                    fontWeight: 800,
                    color: '#10201E',
                    margin: 0,
                  }}
                >
                  Featured Research Briefing
                </h2>
              </div>

              {/* Clean, High-Impact Featured Card with Image Side */}
              <div
                onClick={() => handleOpenArticle(featuredPost.id)}
                className="threat-post-card"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E1DC',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(11, 37, 34, 0.05)',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="featured-card-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 1fr',
                  }}
                >
                  {/* Left Column: Real Image Container */}
                  <div
                    className="featured-img-box"
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      background: '#F7F6F1',
                      minHeight: '280px',
                      borderRight: '1px solid #E6ECE8',
                    }}
                  >
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      loading="eager"
                      className="card-thumb-img"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.35s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(8px)',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#E8792F',
                        border: '1px solid rgba(232, 121, 47, 0.25)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      }}
                    >
                      Featured Advisory &bull; CVSS {featuredPost.cvss || '9.8'}
                    </div>
                  </div>

                  {/* Right Column: Editorial Summary */}
                  <div
                    style={{
                      padding: '24px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#E8792F',
                          background: 'rgba(232, 121, 47, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(232, 121, 47, 0.2)',
                        }}
                      >
                        {featuredPost.category}
                      </span>
                      <span style={{ fontSize: '11px', color: '#7A928B' }}>{featuredPost.readTime}</span>
                    </div>

                    <h3
                      style={{
                        fontSize: 'clamp(18px, 2.2vw, 22px)',
                        lineHeight: 1.25,
                        letterSpacing: '-0.03em',
                        fontWeight: 800,
                        color: '#10201E',
                        margin: '0 0 10px',
                      }}
                    >
                      {featuredPost.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: '#4A5D5A',
                        margin: '0 0 16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {featuredPost.excerpt}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                        paddingTop: '14px',
                        borderTop: '1px solid #E6ECE8',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: '#0B2522',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {featuredPost.authorInitials}
                        </div>
                        <span style={{ color: '#10201E', fontWeight: 600 }}>{featuredPost.author}</span>
                        <span style={{ color: '#7A928B' }}>&bull; {featuredPost.date}</span>
                      </div>

                      <div
                        className="read-link-action"
                        style={{
                          fontSize: '12px',
                          fontWeight: 750,
                          color: '#0B2522',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        <span>Read briefing</span>
                        <ArrowRight size={13} strokeWidth={2.4} style={{ transition: 'transform 0.15s ease' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== RESEARCH DOSSIERS LIBRARY (COMPACT CARDS WITH IMAGES) ===================== */}
          <section
            style={{
              padding: '36px 0 80px',
              borderTop: '1px solid #D9E1DC',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(16px, 2.8vw, 28px)',
              }}
            >
              {/* Header & Filter Row */}
              <div style={{ marginBottom: '28px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: '#E8792F',
                    marginBottom: '4px',
                  }}
                >
                  INVESTIGATIVE DOSSIERS
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <h2
                    style={{
                      fontSize: 'clamp(22px, 2.6vw, 30px)',
                      lineHeight: 1.2,
                      letterSpacing: '-0.04em',
                      fontWeight: 800,
                      color: '#10201E',
                      margin: 0,
                    }}
                  >
                    Research Library
                  </h2>

                  <div style={{ fontSize: '11.5px', color: '#6A7E7A', fontWeight: 600 }}>
                    Showing {filteredPosts.length} of {BLOG_POSTS.length - 1} research reports
                  </div>
                </div>

                {/* Filter Pills Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  {CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`filter-pill-btn ${isActive ? 'active' : ''}`}
                        style={{
                          padding: '5px 14px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isActive ? '1px solid #0B2522' : '1px solid #D9E1DC',
                          background: isActive ? '#0B2522' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#4A5D5A',
                          boxShadow: isActive ? '0 2px 6px rgba(11, 37, 34, 0.15)' : 'none',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Research Cards Grid: 3 Columns Desktop, Gap: 18px */}
              {filteredPosts.length > 0 ? (
                <div
                  className="research-grid-three-col"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '18px',
                  }}
                >
                  {filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      onClick={() => handleOpenArticle(post.id)}
                      className="threat-post-card"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #D9E1DC',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 10px rgba(11, 37, 34, 0.03)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        {/* Card Image Banner */}
                        <div
                          style={{
                            height: '145px',
                            position: 'relative',
                            overflow: 'hidden',
                            background: '#F7F6F1',
                            borderBottom: '1px solid #E6ECE8',
                          }}
                        >
                          <img
                            src={post.image}
                            alt={post.title}
                            loading="lazy"
                            className="card-thumb-img"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.3s ease',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              background: 'rgba(255, 255, 255, 0.94)',
                              backdropFilter: 'blur(6px)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '9.5px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: '#E8792F',
                              border: '1px solid rgba(232, 121, 47, 0.2)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}
                          >
                            {post.category}
                          </div>

                          {post.cvss && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: Number(post.cvss) >= 9.0 ? 'rgba(220, 38, 38, 0.94)' : 'rgba(217, 119, 53, 0.94)',
                                color: '#FFFFFF',
                                backdropFilter: 'blur(6px)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              }}
                            >
                              CVSS {post.cvss}
                            </div>
                          )}
                        </div>

                        {/* Card Body Padding */}
                        <div style={{ padding: '16px 18px 12px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '6px',
                              fontSize: '10.5px',
                            }}
                          >
                            {post.cve ? (
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#10201E' }}>
                                {post.cve}
                              </span>
                            ) : (
                              <span style={{ color: '#7A928B', fontWeight: 600 }}>RESEARCH BRIEFING</span>
                            )}
                            <span style={{ color: '#7A928B', fontWeight: 600 }}>{post.readTime}</span>
                          </div>

                          {/* Title: Clamped to 2 lines */}
                          <h3
                            style={{
                              fontSize: '15px',
                              lineHeight: 1.3,
                              letterSpacing: '-0.02em',
                              fontWeight: 750,
                              color: '#10201E',
                              margin: '0 0 6px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {post.title}
                          </h3>

                          {/* Excerpt: Clamped to 2-3 lines */}
                          <p
                            style={{
                              fontSize: '12px',
                              lineHeight: 1.5,
                              color: '#53615D',
                              margin: '0 0 12px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {post.excerpt}
                          </p>

                          {/* Feature Tags */}
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {post.tags.slice(0, 3).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  color: '#53615D',
                                  background: '#F7F6F1',
                                  border: '1px solid #D9E1DC',
                                  padding: '2px 6px',
                                  borderRadius: '999px',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div
                        style={{
                          padding: '10px 18px 12px',
                          borderTop: '1px solid #E6ECE8',
                          background: '#FBFCFA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#E8EEE8',
                              color: '#0B2522',
                              fontSize: '9px',
                              fontWeight: 750,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #D9E1DC',
                            }}
                          >
                            {post.authorInitials}
                          </div>
                          <span style={{ color: '#7A928B' }}>{post.date}</span>
                        </div>

                        <div
                          className="read-link-action"
                          style={{
                            fontWeight: 700,
                            color: '#0B2522',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'color 0.15s ease',
                          }}
                        >
                          <span>Read</span>
                          <ArrowRight size={12} strokeWidth={2.4} style={{ transition: 'transform 0.15s ease' }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                /* Clean Empty State */
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px dashed #CBD8CF',
                    borderRadius: '12px',
                    padding: '42px 20px',
                    textAlign: 'center',
                    maxWidth: '480px',
                    margin: '20px auto',
                  }}
                >
                  <Search size={28} style={{ color: '#7A928B', margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '17px', fontWeight: 750, color: '#10201E', margin: '0 0 6px' }}>
                    No matching dossiers found
                  </h3>
                  <p style={{ fontSize: '13px', color: '#53615D', margin: '0 0 16px' }}>
                    We could not find any research reports matching &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    style={{
                      background: '#0B2522',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ===================== FOCUS AREAS SECTION (#0B2522) ===================== */}
          <section
            style={{
              padding: '64px 0',
              background: '#0B2522',
              color: '#FFFFFF',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(16px, 2.8vw, 28px)',
              }}
            >
              <div style={{ maxWidth: '600px', marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: '#E8792F',
                    marginBottom: '6px',
                  }}
                >
                  SECURITY LAB PILLARS
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(22px, 2.8vw, 30px)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.04em',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: '0 0 8px',
                  }}
                >
                  Core Research Focus Disciplines
                </h2>
                <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#A3B8B2', margin: 0 }}>
                  MDefender Pro researchers publish active vulnerability intelligence across four critical enterprise cybersecurity disciplines.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px',
                }}
              >
                {[
                  {
                    num: '01',
                    accentColor: '#E8792F',
                    title: 'Web Application Security',
                    desc: 'Deep deterministic AST token parsing for zero-day SQL injection, RCE, XSS, and SSRF attacks across modern web runtimes.',
                  },
                  {
                    num: '02',
                    accentColor: '#38BDF8',
                    title: 'Cloud & Infrastructure',
                    desc: 'Hardening multi-cluster Kubernetes ingress, Docker exposures, and Layer-7 volumetric HTTP/2 floods at edge line-rates.',
                  },
                  {
                    num: '03',
                    accentColor: '#E8792F',
                    title: 'AI & Machine Learning',
                    desc: 'Shielding LLMs against adversarial prompt injection, jailbreaks, data exfiltration, and polymorphic payload mutation.',
                  },
                  {
                    num: '04',
                    accentColor: '#059669',
                    title: 'Enterprise Fleet Defense',
                    desc: 'Unified security telemetry, instant WordPress RASP auto-patching, and automated IP reputation degradation.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px 22px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: item.accentColor,
                        fontFamily: "'SF Mono', Monaco, monospace",
                        marginBottom: '8px',
                      }}
                    >
                      {item.num} / CORE PILLAR
                    </div>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 750,
                        color: '#FFFFFF',
                        margin: '0 0 8px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#A3B8B2', margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ===================== GLOBAL FOOTER (#FBFCFA) ===================== */}
      <footer
        style={{
          background: '#FBFCFA',
          borderTop: '1px solid #D9E1DC',
          padding: '44px 0 24px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '0 clamp(16px, 2.8vw, 28px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              gap: 'clamp(20px, 3.5vw, 36px)',
              marginBottom: '32px',
            }}
          >
            {/* Col 1 */}
            <div style={{ maxWidth: '320px' }}>
              <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(11, 37, 34, 0.08)',
                    flexShrink: 0,
                  }}
                >
                  <img src="/assets/mdefender_logo.png" alt="MDefender Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#10201E', letterSpacing: '-0.02em' }}>
                  MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
                </span>
              </Link>
              <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#4A5D5A', margin: 0 }}>
                Enterprise autonomous cloud WAF, sub-millisecond edge threat intelligence, and zero-day defense for global infrastructure.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
                Platform
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <Link to="/products/waf" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Cloud WAF</Link>
                <Link to="/products/wordpress" style={{ color: '#4A5D5A', textDecoration: 'none' }}>WordPress Security</Link>
                <Link to="/pricing" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Pricing Plans ($4/mo)</Link>
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
                Threat Lab
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <Link to="/threat-intelligence" style={{ color: '#E8792F', fontWeight: 600, textDecoration: 'none' }}>Research Briefings</Link>
                <Link to="/docs" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Documentation</Link>
                <Link to="/about" style={{ color: '#4A5D5A', textDecoration: 'none' }}>About MDefender</Link>
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10201E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
                Account
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <Link to="/user/login" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Sign In</Link>
                <Link to="/register" style={{ color: '#4A5D5A', textDecoration: 'none' }}>Create Account (Free Trial)</Link>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #D9E1DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '11px',
              color: '#6A7E7A',
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} MDefender Pro. All rights reserved.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669', fontWeight: 600 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669', boxShadow: '0 0 5px #059669' }} />
              <span>Systems operational &bull; Continuous Security Telemetry</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
