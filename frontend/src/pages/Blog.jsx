import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import ThreatIntelVisual from '../components/ThreatIntelVisual';
import { BLOG_POSTS, CATEGORIES } from '../data/threatIntelData';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Check,
  Copy,
  Tag,
  ChevronRight,
  Radio,
  ExternalLink,
  Layers,
  Activity,
  Cpu,
  Lock,
  Globe,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// HELPER COMPONENTS FOR RICH ARTICLE RENDERING
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
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '24px 0',
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
          <span style={{ marginLeft: '10px', color: '#B7C6C2', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Security Payload Inspection
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

function renderFormattedInlineText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} style={{ color: '#10221F', fontWeight: 750 }}>
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          style={{
            background: '#E9EEE8',
            color: '#10221F',
            padding: '2px 7px',
            borderRadius: '5px',
            fontSize: '0.88em',
            fontFamily: "'SF Mono', Monaco, monospace",
            border: '1px solid #D9DFD9',
          }}
        >
          {inner}
        </code>
      );
    }
    return part;
  });
}

function ArticleBodyRenderer({ content }) {
  // Extract and replace code blocks with tokens to prevent inner newlines from being split
  const codeBlocks = [];
  let tokenized = content.replace(/\r\n/g, '\n').replace(/```([a-z]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(code);
    return `\n\n${token}\n\n`;
  });

  // Separate headings cleanly from following text
  tokenized = tokenized.replace(/^(###\s+[^\n]+)\n([^\n#])/gm, '$1\n\n$2');

  const blocks = tokenized.trim().split(/\n\s*\n/);

  return (
    <div className="article-body-content">
      {blocks.map((block, idx) => {
        const text = block.trim();
        if (!text) return null;

        // Code block placeholder token
        if (text.startsWith('__CODE_BLOCK_') && text.endsWith('__')) {
          const index = parseInt(text.replace('__CODE_BLOCK_', '').replace('__', ''), 10);
          const rawCode = codeBlocks[index];
          if (!rawCode || !rawCode.trim()) return null;
          return <CodeSnippetBox key={idx} code={rawCode} />;
        }

        // Level 3 Headings
        if (text.startsWith('### ')) {
          const lines = text.split('\n');
          const headingTitle = lines[0].replace('### ', '').trim();
          const subsequentText = lines.slice(1).join('\n').trim();
          const anchorId = headingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <div key={idx} id={anchorId} style={{ scrollMarginTop: '100px', margin: '42px 0 16px' }}>
              <h3
                style={{
                  fontSize: '30px',
                  fontWeight: 750,
                  lineHeight: 1.1,
                  letterSpacing: '-0.05em',
                  color: '#10221F',
                  margin: '0 0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '24px',
                    borderRadius: '2px',
                    background: '#D97735',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span>{headingTitle}</span>
              </h3>
              {subsequentText && (
                <p style={{ fontSize: '17px', lineHeight: 1.78, color: '#344054', margin: '0 0 22px' }}>
                  {renderFormattedInlineText(subsequentText)}
                </p>
              )}
            </div>
          );
        }

        // Horizontal Dividers
        if (text === '---') {
          return (
            <div
              key={idx}
              style={{
                margin: '40px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#D9DFD9' }} />
              <Shield size={16} strokeWidth={2.4} style={{ color: '#D97735' }} />
              <div style={{ flex: 1, height: '1px', background: '#D9DFD9' }} />
            </div>
          );
        }

        // Numbered List
        if (/^\d+\.\s/.test(text)) {
          const items = text.split('\n').filter(Boolean);
          return (
            <div key={idx} style={{ margin: '20px 0 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item, i) => {
                const match = item.match(/^(\d+)\.\s+(.*)/);
                const num = match ? match[1] : i + 1;
                const rest = match ? match[2] : item;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#E9EEE8',
                        color: '#10221F',
                        fontWeight: 750,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #D9DFD9',
                        marginTop: '2px',
                      }}
                    >
                      {num}
                    </span>
                    <div style={{ fontSize: '17px', lineHeight: 1.78, color: '#344054', flex: 1 }}>
                      {renderFormattedInlineText(rest)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // Unordered Bullet List
        if (text.startsWith('- ')) {
          const items = text.split('\n').filter(Boolean);
          return (
            <ul
              key={idx}
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '20px 0 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#D97735',
                      marginTop: '11px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: '17px', lineHeight: 1.78, color: '#344054' }}>
                    {renderFormattedInlineText(item.replace(/^- /, ''))}
                  </div>
                </li>
              ))}
            </ul>
          );
        }

        // Standard Paragraph
        return (
          <p
            key={idx}
            style={{
              fontSize: '17px',
              lineHeight: 1.78,
              color: '#344054',
              margin: '0 0 22px',
            }}
          >
            {renderFormattedInlineText(text)}
          </p>
        );
      })}
    </div>
  );
}

function IocSecurityTable({ iocs, advisoryId }) {
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
        margin: '40px 0 24px',
        borderRadius: '12px',
        border: '1.5px solid #CBD8CF',
        background: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(16, 34, 31, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 20px',
          background: '#F7F5EE',
          borderBottom: '1.5px solid #CBD8CF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={18} color="#D97735" strokeWidth={2.4} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0B2522', letterSpacing: '-0.01em' }}>
              Forensic Indicators of Compromise (IOCs)
            </div>
            <div style={{ fontSize: '11px', color: '#53615D' }}>
              Telemetry Observables &bull; STIX 2.1 Format Reference
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          style={{
            background: allCopied ? '#28745D' : '#0B2522',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          {allCopied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
          <span>{allCopied ? 'All Copied to Clipboard!' : 'Copy All Observables'}</span>
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#FAF9F5', borderBottom: '1px solid #E5EBE4', color: '#4A5D5A', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ padding: '10px 18px', fontWeight: 700, width: '22%' }}>Indicator Type</th>
              <th style={{ padding: '10px 18px', fontWeight: 700, width: '43%' }}>Observable Value</th>
              <th style={{ padding: '10px 18px', fontWeight: 700, width: '35%' }}>Forensic Notes</th>
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
                <td style={{ padding: '12px 18px', verticalAlign: 'top', fontWeight: 700, color: '#0B2522' }}>
                  <span style={{ background: '#E9EEE8', padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', color: '#28745D', border: '1px solid #D9DFD9' }}>
                    {ioc.type}
                  </span>
                </td>
                <td style={{ padding: '12px 18px', verticalAlign: 'top', fontFamily: 'monospace', color: '#0B2522', wordBreak: 'break-all' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(232, 121, 47, 0.08)', padding: '2px 6px', borderRadius: '4px', color: '#9A3412' }}>
                      {ioc.value}
                    </span>
                    <button
                      type="button"
                      title="Copy indicator value"
                      onClick={() => handleCopySingle(ioc.value, idx)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #CBD8CF',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: copiedIndex === idx ? '#28745D' : '#53615D',
                      }}
                    >
                      {copiedIndex === idx ? <Check size={11} strokeWidth={2.4} /> : <Copy size={11} strokeWidth={2} />}
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 18px', verticalAlign: 'top', color: '#53615D', fontSize: '11.5px', lineHeight: 1.5 }}>
                  {ioc.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: MDEFENDER PRO THREAT INTELLIGENCE & SECURITY LAB
// ============================================================================
export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: urlArticleId } = useParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeArticleId, setActiveArticleId] = useState(urlArticleId || null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state if URL param changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveArticleId(urlArticleId || null);
    if (urlArticleId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [urlArticleId]);

  // Current active post object if viewing article detail
  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return BLOG_POSTS.find((p) => p.id === activeArticleId) || null;
  }, [activeArticleId]);

  // Featured article: always the designated featured post
  const featuredPost = useMemo(() => {
    return BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];
  }, []);

  // Filter research library: never duplicate the featured article in the grid
  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      // Exclude the featured article from the research grid
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

  // Headings for table of contents in article detail view
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

  // Previous and next article navigation
  const { prevArticle, nextArticle } = useMemo(() => {
    if (!activeArticle) return { prevArticle: null, nextArticle: null };
    const currentIndex = BLOG_POSTS.findIndex((p) => p.id === activeArticle.id);
    const prev = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null;
    const next = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null;
    return { prevArticle: prev, nextArticle: next };
  }, [activeArticle]);

  // Related articles (up to 3, excluding the current one)
  const relatedArticles = useMemo(() => {
    if (!activeArticle) return [];
    return BLOG_POSTS.filter((p) => p.id !== activeArticle.id).slice(0, 3);
  }, [activeArticle]);

  // Navigation handlers
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
        background: '#F8F8F4',
        color: '#53615D',
        fontFamily: "Inter, Geist, Arial, -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Dynamic Global CSS for Typography, Card Animations & Focus Rings */}
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #E9EEE8; color: #10221F; }

        /* Focus rings: accessible orange contrast */
        input:focus-visible, button:focus-visible, a:focus-visible {
          outline: 2px solid #D97735 !important;
          outline-offset: 2px !important;
        }

        .threat-card {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
        }
        .threat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 34px rgba(16, 34, 31, 0.10) !important;
          border-color: #CBD7CC !important;
        }
        .threat-card:hover .card-read-link {
          color: #D97735 !important;
        }
        .threat-card:hover .card-read-link svg {
          transform: translateX(4px);
        }

        .filter-pill {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .filter-pill:hover:not(.active) {
          border-color: #D97735 !important;
          color: #D97735 !important;
        }

        .search-input-field:focus {
          border-color: #D97735 !important;
          box-shadow: 0 0 0 3px rgba(217, 119, 53, 0.18) !important;
        }

        /* Responsive Layout Breakpoints matching prompt */
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .featured-grid {
            grid-template-columns: 1fr !important;
          }
          .featured-img-side {
            min-height: 240px !important;
          }
          .article-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .article-toc-sticky {
            position: static !important;
            width: 100% !important;
            margin-bottom: 32px !important;
          }
          .research-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .focus-areas-grid {
            grid-template-columns: 1fr !important;
          }
          .prev-next-grid {
            grid-template-columns: 1fr !important;
          }
          .related-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 620px) {
          .research-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-main-title {
            font-size: 58px !important;
          }
          .article-main-title {
            font-size: 42px !important;
          }
          .featured-text-side {
            padding: 24px !important;
          }
        }
      `}</style>

      {/* Global Brand Navbar */}
      <PublicNavbar />

      {/* ==================================================================== */}
      {/* VIEW A: DEDICATED ARTICLE DETAIL PAGE ("SHOW LIKE BLOG PAGE")        */}
      {/* ==================================================================== */}
      {activeArticle ? (
        <main id="main-content" style={{ paddingTop: 'calc(76px + 40px)', paddingBottom: '92px' }}>
          <article
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              padding: '0 clamp(18px, 3vw, 32px)',
            }}
          >
            {/* Top Breadcrumb & Return Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '36px',
              }}
            >
              <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#87948D' }}>
                <button
                  type="button"
                  onClick={handleBackToHub}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#87948D',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#87948D')}
                >
                  <ArrowLeft size={13} strokeWidth={2.4} />
                  <span>Threat Intelligence Hub</span>
                </button>
                <span>/</span>
                <span style={{ color: '#53615D' }}>{activeArticle.category}</span>
                <span>/</span>
                <span style={{ color: '#10221F', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                  {activeArticle.title}
                </span>
              </nav>

              <button
                type="button"
                onClick={handleShareArticle}
                aria-label="Share this threat intelligence briefing"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: copiedLink ? '#28745D' : '#10221F',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(16, 34, 31, 0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#D97735')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D9DFD9')}
              >
                {copiedLink ? <Check size={13} strokeWidth={2.4} /> : <Share2 size={13} strokeWidth={2.2} />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Briefing'}</span>
              </button>
            </div>

            {/* Centered Article Header (Max Width 850px) */}
            <header
              style={{
                maxWidth: '850px',
                margin: '0 auto 40px',
                textAlign: 'center',
              }}
            >
              {/* Category Eyebrow */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: '#E9EEE8',
                  border: '1px solid #D9DFD9',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.13em',
                  color: '#D97735',
                  marginBottom: '18px',
                }}
              >
                <Radio size={12} strokeWidth={2.4} />
                <span>{activeArticle.category}</span>
              </div>

              {/* Title */}
              <h1
                className="article-main-title"
                style={{
                  fontSize: 'clamp(42px, 6vw, 72px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.075em',
                  fontWeight: 750,
                  color: '#10221F',
                  margin: '0 auto 20px',
                }}
              >
                {activeArticle.title}
              </h1>

              {/* Summary */}
              <p
                style={{
                  fontSize: '17px',
                  lineHeight: 1.65,
                  color: '#53615D',
                  maxWidth: '670px',
                  margin: '0 auto 26px',
                }}
              >
                {activeArticle.excerpt}
              </p>

              {/* Centered Metadata Bar with Icons and 11px Text */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                  fontSize: '11px',
                  color: '#87948D',
                  paddingTop: '16px',
                  borderTop: '1px solid #D9DFD9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#E9EEE8',
                      color: '#10221F',
                      fontSize: '11px',
                      fontWeight: 750,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #D9DFD9',
                    }}
                  >
                    {activeArticle.authorInitials}
                  </div>
                  <span style={{ color: '#10221F', fontWeight: 600 }}>{activeArticle.author}</span>
                  <span>&bull;</span>
                  <span>{activeArticle.role}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} strokeWidth={2.2} />
                  <span>{activeArticle.date}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} strokeWidth={2.2} />
                  <span>{activeArticle.readTime}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28745D' }}>
                  <Shield size={13} strokeWidth={2.4} />
                  <span style={{ fontWeight: 700 }}>Peer-Reviewed Advisory</span>
                </div>
              </div>
            </header>

            {/* Visual Technical Cover Image with Large Expansive Frame */}
            <div
              style={{
                maxWidth: '1240px',
                margin: '0 auto 40px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1.5px solid #CBD8CF',
                boxShadow: '0 24px 56px rgba(16, 34, 31, 0.09)',
                background: '#F7F6F1',
                aspectRatio: '16/8',
                maxHeight: '520px',
                position: 'relative',
              }}
            >
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '24px',
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(12px)',
                  padding: '6px 14px 6px 10px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD8CF',
                  boxShadow: '0 8px 24px rgba(16, 34, 31, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  zIndex: 10,
                }}
              >
                <img
                  src="/mdefender_shield_logo.png"
                  alt="MDefender Pro"
                  style={{ width: '24px', height: '24px', objectFit: 'contain', display: 'block' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#10221F', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                    MDefender Pro
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#53615D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Threat Intelligence Lab
                  </span>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '24px',
                  background: 'rgba(16, 34, 31, 0.85)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Shield size={14} style={{ color: '#E8792F' }} />
                <span>MDefender Threat Intelligence Lab &bull; {activeArticle.advisoryId}</span>
              </div>
            </div>

            {/* Forensic Threat Dossier Matrix HUD */}
            <div
              style={{
                maxWidth: '1240px',
                margin: '0 auto 46px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #CBD8CF',
                padding: '24px 30px',
                boxShadow: '0 10px 30px rgba(16, 34, 31, 0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '24px',
              }}
            >
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#87948D', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Advisory &amp; CVE Reference
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#10221F', fontFamily: 'monospace' }}>
                  {activeArticle.cve || activeArticle.advisoryId}
                </div>
                <div style={{ fontSize: '11.5px', color: '#53615D', marginTop: '2px' }}>{activeArticle.advisoryId}</div>
              </div>

              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#87948D', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  CVSS v3.1 Severity Rating
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: activeArticle.severity === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                      color: activeArticle.severity === 'Critical' ? '#991B1B' : '#92400E',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${activeArticle.severity === 'Critical' ? '#FECACA' : '#FDE68A'}`,
                    }}
                  >
                    CVSS {activeArticle.cvss || '9.8'} {activeArticle.severity}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#87948D', marginTop: '4px', fontFamily: 'monospace' }}>
                  {activeArticle.vector || 'Network / Low Complexity'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#87948D', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  MDefender Pro Virtual Patch
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#28745D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} />
                  <span>{activeArticle.mitigationRule || 'Rule Active'}</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                  Edge Latency: {activeArticle.mitigationLatency || '<0.12ms'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#87948D', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Campaign Telemetry Status
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#E8792F', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8792F' }} />
                  <span>{activeArticle.status || 'Active Wild Exploitation'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#53615D', marginTop: '3px' }}>
                  {activeArticle.affectedSoftware || 'Multi-Platform'}
                </div>
              </div>
            </div>

            {/* Callout Box: Sage Background */}
            <aside
              style={{
                maxWidth: '1240px',
                margin: '0 auto 46px',
                background: '#E9EEE8',
                borderLeft: '4px solid #D97735',
                borderTopRightRadius: '12px',
                borderBottomRightRadius: '12px',
                padding: '20px 26px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <Shield size={22} strokeWidth={2.4} style={{ color: '#D97735', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#10221F', marginBottom: '4px' }}>
                  MDefender Security Lab Technical Directive
                </div>
                <div style={{ fontSize: '14.5px', lineHeight: 1.6, color: '#53615D' }}>
                  This research report documents real-world attack vectors observed by MDefender Pro edge inspection telemetry across 240+ global Anycast POPs. Countermeasure signatures are active in the core ruleset.
                </div>
              </div>
            </aside>

            {/* Two-Column Content Layout: 260px Sticky Nav + Expansive Article Body */}
            <div
              className="article-detail-grid"
              style={{
                maxWidth: '1240px',
                margin: '0 auto 64px',
                display: 'grid',
                gridTemplateColumns: '260px 1fr',
                gap: '48px',
                alignItems: 'start',
              }}
            >
              {/* Sticky Table of Contents Desktop */}
              <nav
                className="article-toc-sticky"
                aria-label="Table of contents"
                style={{
                  position: 'sticky',
                  top: '110px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #D9DFD9',
                  padding: '18px',
                  boxShadow: '0 4px 16px rgba(16, 34, 31, 0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.13em',
                    color: '#D97735',
                    marginBottom: '12px',
                  }}
                >
                  Table of Contents
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tableOfContents.map((item, i) => (
                    <li key={i}>
                      <a
                        href={`#${item.id}`}
                        style={{
                          fontSize: '11px',
                          lineHeight: 1.45,
                          color: '#53615D',
                          textDecoration: 'none',
                          display: 'block',
                          borderLeft: '2px solid transparent',
                          paddingLeft: '8px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#D97735';
                          e.currentTarget.style.borderLeftColor = '#D97735';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#53615D';
                          e.currentTarget.style.borderLeftColor = 'transparent';
                        }}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Main Article Body (Expansive 920px width) */}
              <section style={{ width: '100%', maxWidth: '920px' }}>
                <ArticleBodyRenderer content={activeArticle.content} />

                {/* Indicators of Compromise Forensic Matrix */}
                <IocSecurityTable iocs={activeArticle.iocs} advisoryId={activeArticle.advisoryId} />

                {/* Tags Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: '36px',
                    paddingTop: '24px',
                    borderTop: '1px solid #D9DFD9',
                  }}
                >
                  <Tag size={13} strokeWidth={2.4} style={{ color: '#87948D' }} />
                  {activeArticle.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#53615D',
                        background: '#E9EEE8',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        border: '1px solid #D9DFD9',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {/* Previous / Next Article Navigation Cards */}
            <div
              className="prev-next-grid"
              style={{
                maxWidth: '890px',
                margin: '0 auto 64px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '18px',
              }}
            >
              {prevArticle ? (
                <button
                  type="button"
                  onClick={() => handleOpenArticle(prevArticle.id)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9DFD9',
                    borderRadius: '10px',
                    padding: '18px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 34, 31, 0.04)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#D97735';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#D9DFD9';
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '6px' }}>
                    &larr; Previous Briefing
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10221F', lineHeight: 1.35 }}>
                    {prevArticle.title}
                  </div>
                </button>
              ) : <div />}

              {nextArticle ? (
                <button
                  type="button"
                  onClick={() => handleOpenArticle(nextArticle.id)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9DFD9',
                    borderRadius: '10px',
                    padding: '18px 20px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 34, 31, 0.04)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#D97735';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#D9DFD9';
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#87948D', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Next Briefing &rarr;
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10221F', lineHeight: 1.35 }}>
                    {nextArticle.title}
                  </div>
                </button>
              ) : <div />}
            </div>

            {/* Related Research Articles (3 Columns Desktop, 1 Column Mobile) */}
            {relatedArticles.length > 0 && (
              <section style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '42px', borderTop: '1px solid #D9DFD9' }}>
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: 750,
                    letterSpacing: '-0.04em',
                    color: '#10221F',
                    marginBottom: '22px',
                  }}
                >
                  Related Threat Intelligence Briefings
                </h3>

                <div
                  className="related-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '18px',
                  }}
                >
                  {relatedArticles.map((rel) => (
                    <article
                      key={rel.id}
                      onClick={() => handleOpenArticle(rel.id)}
                      className="threat-card"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #D9DFD9',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 8px 24px rgba(16, 34, 31, 0.04)',
                      }}
                    >
                      <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#F7F5EE', position: 'relative', borderBottom: '1px solid #D9DFD9' }}>
                        <img
                          src={rel.image}
                          alt={rel.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#D97735', marginBottom: '6px' }}>
                          {rel.category}
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, color: '#10221F', margin: '0 0 10px' }}>
                          {rel.title}
                        </h4>
                        <div style={{ marginTop: 'auto', fontSize: '11px', color: '#87948D' }}>
                          {rel.date} &bull; {rel.readTime}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </article>
        </main>
      ) : (
        /* ================================================================== */
        /* VIEW B: MAIN THREAT INTELLIGENCE & SECURITY LAB HUB               */
        /* ================================================================== */
        <main id="main-content">
          {/* ===================== HERO SECTION ===================== */}
          <section
            style={{
              paddingTop: 'calc(76px + 92px)',
              paddingBottom: '80px',
              position: 'relative',
              background: 'radial-gradient(circle at 75% 20%, rgba(217, 119, 53, 0.08) 0%, rgba(233, 238, 232, 0.4) 40%, rgba(248, 248, 244, 0) 70%)',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(18px, 3.2vw, 32px)',
              }}
            >
              <div
                className="hero-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 400px',
                  gap: '80px',
                  alignItems: 'center',
                }}
              >
                {/* Left Column: Eyebrow, Main Title & Description */}
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.13em',
                      color: '#D97735',
                      marginBottom: '16px',
                    }}
                  >
                    THREAT INTELLIGENCE &amp; SECURITY LAB
                  </div>

                  <h1
                    className="hero-main-title"
                    style={{
                      fontSize: 'clamp(54px, 7vw, 88px)',
                      lineHeight: 0.92,
                      letterSpacing: '-0.08em',
                      fontWeight: 780,
                      color: '#10221F',
                      margin: '0 0 24px',
                    }}
                  >
                    Know what’s coming.{' '}
                    <span style={{ color: '#D97735' }}>Build what lasts.</span>
                  </h1>

                  <p
                    style={{
                      fontSize: 'clamp(15px, 1.8vw, 17px)',
                      lineHeight: 1.65,
                      color: '#53615D',
                      margin: 0,
                      maxWidth: '560px',
                    }}
                  >
                    Reverse-engineered exploit vectors, emerging polymorphic mutations, and sub-millisecond edge countermeasures published directly by the MDefender Pro research fleet.
                  </p>
                </div>

                {/* Right Column: Search Card */}
                <div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D9DFD9',
                      borderRadius: '14px',
                      padding: '18px',
                      boxShadow: '0 18px 42px rgba(16, 34, 31, 0.07)',
                    }}
                  >
                    <label
                      htmlFor="lab-search-input"
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#10221F',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '10px',
                      }}
                    >
                      Search Intelligence Archive
                    </label>

                    <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                      <Search
                        size={16}
                        strokeWidth={2.4}
                        style={{
                          position: 'absolute',
                          left: '14px',
                          top: '15px',
                          color: '#87948D',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="lab-search-input"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search the lab"
                        className="search-input-field"
                        style={{
                          width: '100%',
                          height: '46px',
                          paddingLeft: '40px',
                          paddingRight: '14px',
                          borderRadius: '8px',
                          border: '1px solid #CBD7CC',
                          background: '#FFFFFF',
                          fontSize: '14px',
                          color: '#10221F',
                          outline: 'none',
                          transition: 'all 0.18s ease',
                        }}
                      />
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '11px',
                        color: '#53615D',
                        lineHeight: 1.5,
                      }}
                    >
                      Filter by CVE identifier, SQLi evasion, RCE pattern, or threat taxonomy tag.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== FEATURED BRIEFING SECTION ===================== */}
          <section
            style={{
              padding: '92px 0',
              background: '#F8F8F4',
              borderTop: '1px solid #D9DFD9',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(18px, 3.2vw, 32px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.13em',
                      color: '#D97735',
                      marginBottom: '6px',
                    }}
                  >
                    KEY ADVISORY
                  </div>
                  <h2
                    style={{
                      fontSize: '38px',
                      lineHeight: 1.05,
                      letterSpacing: '-0.065em',
                      fontWeight: 750,
                      color: '#10221F',
                      margin: 0,
                    }}
                  >
                    Featured Research Briefing
                  </h2>
                </div>
              </div>

              {/* Two-Column Featured Card: White Background, 1px Border, 16px Radius, Overflow Hidden */}
              <div
                onClick={() => handleOpenArticle(featuredPost.id)}
                className="threat-card"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9DFD9',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 18px 42px rgba(16, 34, 31, 0.07)',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="featured-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.05fr 1fr',
                  }}
                >
                  {/* Real Branded Image Side */}
                  <div
                    className="featured-img-side"
                    style={{
                      minHeight: '360px',
                      background: '#F7F5EE',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRight: '1px solid #D9DFD9',
                    }}
                  >
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      loading="eager"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '18px',
                        left: '18px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#D97735',
                        border: '1px solid rgba(217, 119, 53, 0.25)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      Featured Advisory &bull; CVSS {featuredPost.cvss || '9.8'}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '18px',
                        right: '18px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #CBD8CF',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <img src="/mdefender_shield_logo.png" alt="MDefender Pro" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#10221F', letterSpacing: '0.04em' }}>MDefender Pro</span>
                    </div>
                  </div>

                  {/* Text Side: Padding 42px */}
                  <div
                    className="featured-text-side"
                    style={{
                      padding: '42px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.13em',
                        color: '#D97735',
                        marginBottom: '10px',
                      }}
                    >
                      {featuredPost.category}
                    </div>

                    <h3
                      style={{
                        fontSize: '32px',
                        lineHeight: 1.12,
                        letterSpacing: '-0.06em',
                        fontWeight: 750,
                        color: '#10221F',
                        margin: '0 0 14px',
                      }}
                    >
                      {featuredPost.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#53615D',
                        margin: '0 0 24px',
                      }}
                    >
                      {featuredPost.excerpt}
                    </p>

                    {/* Author & Read Action Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        paddingTop: '20px',
                        borderTop: '1px solid #D9DFD9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#E9EEE8',
                            color: '#10221F',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #D9DFD9',
                          }}
                        >
                          {featuredPost.authorInitials}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#10221F' }}>{featuredPost.author}</div>
                          <div style={{ fontSize: '10.5px', color: '#87948D' }}>{featuredPost.date} &bull; {featuredPost.readTime}</div>
                        </div>
                      </div>

                      <div
                        className="card-read-link"
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#D97735',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <span>Read briefing</span>
                        <ArrowRight size={14} strokeWidth={2.4} style={{ transition: 'transform 0.18s ease' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== RESEARCH LIBRARY SECTION (Soft Sage #E9EEE8) ===================== */}
          <section
            style={{
              padding: '92px 0 100px',
              background: '#E9EEE8',
              borderTop: '1px solid #D9DFD9',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(18px, 3.2vw, 32px)',
              }}
            >
              {/* Header & Filter Row */}
              <div style={{ marginBottom: '36px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.13em',
                    color: '#D97735',
                    marginBottom: '6px',
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
                    gap: '20px',
                    marginBottom: '26px',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '38px',
                      lineHeight: 1.05,
                      letterSpacing: '-0.065em',
                      fontWeight: 750,
                      color: '#10221F',
                      margin: 0,
                    }}
                  >
                    Research Library
                  </h2>

                  <div style={{ fontSize: '11px', color: '#53615D', fontWeight: 600 }}>
                    Showing {filteredPosts.length} of {BLOG_POSTS.length - 1} archived dossiers
                  </div>
                </div>

                {/* Filter Row: Pills with White Background and Gray Borders */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
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
                        className={`filter-pill ${isActive ? 'active' : ''}`}
                        style={{
                          padding: '7px 18px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isActive ? '1px solid #10221F' : '1px solid #D9DFD9',
                          background: isActive ? '#10221F' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#53615D',
                          boxShadow: isActive ? '0 2px 8px rgba(16, 34, 31, 0.18)' : '0 1px 3px rgba(16, 34, 31, 0.03)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Article Grid: 3 Columns Desktop, 2 Columns Tablet, 1 Column Mobile. Gap: 18px */}
              {filteredPosts.length > 0 ? (
                <div
                  className="research-grid"
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
                      className="threat-card"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #D9DFD9',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 18px 42px rgba(16, 34, 31, 0.07)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        {/* 16/9 Card Image with Real Brand Asset */}
                        <div
                          style={{
                            aspectRatio: '16/9',
                            position: 'relative',
                            overflow: 'hidden',
                            background: '#F7F5EE',
                            borderBottom: '1px solid #CBD8CF',
                          }}
                        >
                          <img
                            src={post.image}
                            alt={post.title}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.4s ease',
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(255, 255, 255, 0.92)',
                              backdropFilter: 'blur(6px)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              border: '1px solid rgba(16, 34, 31, 0.12)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                            }}
                          >
                            <img src="/mdefender_shield_logo.png" alt="MDefender Pro" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#10221F', letterSpacing: '0.04em' }}>MDefender Pro</span>
                          </div>
                        </div>

                        {/* Card Body Padding: 20px */}
                        <div style={{ padding: '20px' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              marginBottom: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#87948D' }}>
                              <span>{post.date}</span>
                              <span>&bull;</span>
                              <span>{post.readTime}</span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: '#D97735',
                                background: 'rgba(217, 119, 53, 0.08)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(217, 119, 53, 0.2)',
                              }}
                            >
                              {post.category}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            {post.cve && (
                              <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#10221F', letterSpacing: '0.02em' }}>
                                {post.cve}
                              </div>
                            )}
                            {post.cvss && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  color: Number(post.cvss) >= 9.0 ? '#DC2626' : '#D97735',
                                  background: Number(post.cvss) >= 9.0 ? '#FEE2E2' : '#FEF3C7',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${Number(post.cvss) >= 9.0 ? '#FECACA' : '#FDE68A'}`,
                                }}
                              >
                                CVSS {post.cvss}
                              </span>
                            )}
                          </div>

                          <h3
                            style={{
                              fontSize: '18px',
                              lineHeight: 1.17,
                              letterSpacing: '-0.04em',
                              fontWeight: 700,
                              color: '#10221F',
                              margin: '0 0 10px',
                            }}
                          >
                            {post.title}
                          </h3>

                          <p
                            style={{
                              fontSize: '13px',
                              lineHeight: 1.6,
                              color: '#53615D',
                              margin: '0 0 16px',
                            }}
                          >
                            {post.excerpt}
                          </p>

                          {/* Tags: 9-10px, radius 999px */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {post.tags.slice(0, 3).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 600,
                                  color: '#53615D',
                                  background: '#F8F8F4',
                                  border: '1px solid #D9DFD9',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Read Briefing Action */}
                      <div
                        style={{
                          padding: '14px 20px 18px',
                          borderTop: '1px solid #D9DFD9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#87948D' }}>{post.author}</span>
                        <div
                          className="card-read-link"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#10221F',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <span>Read briefing</span>
                          <ArrowRight size={13} strokeWidth={2.4} style={{ transition: 'transform 0.18s ease' }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                /* Empty Search State: Dashed Gray Border, Centered Navy Heading, Muted Copy, Orange Reset Action */
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px dashed #CBD7CC',
                    borderRadius: '16px',
                    padding: '56px 24px',
                    textAlign: 'center',
                    maxWidth: '560px',
                    margin: '20px auto',
                  }}
                >
                  <Search size={32} strokeWidth={2} style={{ color: '#87948D', margin: '0 auto 14px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: 750, color: '#10221F', margin: '0 0 8px' }}>
                    No matching threat dossiers found
                  </h3>
                  <p style={{ fontSize: '13.5px', color: '#53615D', margin: '0 0 20px' }}>
                    We could not find any research reports matching &ldquo;{searchQuery}&rdquo;. Try checking another category or clearing your query.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    style={{
                      background: '#D97735',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Reset Search Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ===================== FOCUS AREAS SECTION (Deep Navy #10221F) ===================== */}
          <section
            style={{
              padding: '92px 0 100px',
              background: '#10221F',
              color: '#FFFFFF',
            }}
          >
            <div
              style={{
                maxWidth: '1180px',
                margin: '0 auto',
                padding: '0 clamp(18px, 3.2vw, 32px)',
              }}
            >
              <div style={{ maxWidth: '640px', marginBottom: '48px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.13em',
                    color: '#E39A63',
                    marginBottom: '8px',
                  }}
                >
                  SECURITY LAB PILLARS
                </div>
                <h2
                  style={{
                    fontSize: '38px',
                    lineHeight: 1.05,
                    letterSpacing: '-0.065em',
                    fontWeight: 750,
                    color: '#FFFFFF',
                    margin: '0 0 14px',
                  }}
                >
                  Core Research Focus Areas
                </h2>
                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: '#B7C6C2',
                    margin: 0,
                  }}
                >
                  MDefender Pro researchers publish active vulnerability intelligence across four critical enterprise cybersecurity disciplines.
                </p>
              </div>

              {/* Grid: Two Columns with Thin Translucent White Dividers */}
              <div
                className="focus-areas-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '32px',
                }}
              >
                {[
                  {
                    num: '01',
                    accentColor: '#D97735',
                    title: 'Web Application Security',
                    desc: 'Deep deterministic and AST token parsing for zero-day SQL injection, remote code execution, cross-site scripting (XSS), and SSRF attacks across modern web runtimes.',
                  },
                  {
                    num: '02',
                    accentColor: '#EAF4FF',
                    title: 'Cloud & Infrastructure',
                    desc: 'Hardening multi-cluster Kubernetes ingress, Docker daemon exposures, AWS/GCP metadata exfiltration vectors, and Layer 7 distributed volumetric HTTP/2 floods.',
                  },
                  {
                    num: '03',
                    accentColor: '#D97735',
                    title: 'AI & Machine Learning',
                    desc: 'Shielding LLMs and generative agents against adversarial prompt injection, jailbreaks, data exfiltration, and synthetic polymorphic payload mutation at edge speed.',
                  },
                  {
                    num: '04',
                    accentColor: '#EAF4FF',
                    title: 'Enterprise Defense',
                    desc: 'Unified security operations telemetry, instant WordPress RASP auto-patching, automated IP reputation degradation, and continuous SOC SIEM compliance integration.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: '14px',
                      padding: '28px 30px',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: item.accentColor,
                        fontFamily: "'SF Mono', Monaco, monospace",
                        marginBottom: '12px',
                      }}
                    >
                      {item.num} / CORE PILLAR
                    </div>
                    <h3
                      style={{
                        fontSize: '22px',
                        fontWeight: 750,
                        letterSpacing: '-0.03em',
                        color: '#FFFFFF',
                        margin: '0 0 10px',
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.65,
                        color: '#B7C6C2',
                        margin: 0,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ===================== FOOTER SECTION (Warm Ivory #F8F8F4) ===================== */}
      <footer
        style={{
          background: '#F8F8F4',
          borderTop: '1px solid #D9DFD9',
          paddingTop: '36px',
          paddingBottom: '26px',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '0 clamp(18px, 3.2vw, 32px)',
          }}
        >
          {/* Main Footer Row: Logo Left, Links Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px',
              paddingBottom: '26px',
            }}
          >
            {/* Logo and Description on Left */}
            <div style={{ maxWidth: '340px' }}>
              <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
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
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#10221F' }}>
                  MDefender <span style={{ color: '#D97735' }}>Pro</span>
                </span>
              </Link>
              <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#53615D', margin: 0 }}>
                Enterprise autonomous cloud WAF, sub-millisecond edge threat intelligence, and zero-day defense for global infrastructure.
              </p>
            </div>

            {/* Links on Right with 11px Text */}
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10221F', marginBottom: '4px' }}>
                  Platform
                </span>
                <Link to="/products/waf" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>Cloud WAF</Link>
                <Link to="/products/wordpress" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>WordPress Security</Link>
                <Link to="/pricing" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>Pricing Plans</Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10221F', marginBottom: '4px' }}>
                  Threat Lab
                </span>
                <Link to="/threat-intelligence" style={{ fontSize: '11px', color: '#D97735', fontWeight: 600, textDecoration: 'none' }}>Research Briefings</Link>
                <Link to="/docs" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>Documentation</Link>
                <Link to="/about" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>About MDefender</Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10221F', marginBottom: '4px' }}>
                  Account
                </span>
                <Link to="/user/login" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>Sign In</Link>
                <Link to="/register" style={{ fontSize: '11px', color: '#53615D', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#D97735')} onMouseLeave={(e) => (e.currentTarget.style.color = '#53615D')}>Create Account</Link>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Row Separated by a 1px Border */}
          <div
            style={{
              paddingTop: '18px',
              borderTop: '1px solid #D9DFD9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '11px',
              color: '#87948D',
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} MDefender Pro Cyber Systems Inc. All rights reserved.
            </div>

            {/* Status Label: Green Dot & "Systems operational" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#28745D',
                  boxShadow: '0 0 6px #28745D',
                }}
              />
              <span style={{ fontWeight: 600, color: '#28745D' }}>Systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
