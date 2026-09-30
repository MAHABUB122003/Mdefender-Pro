import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'
import copyToClipboard from '../utils/clipboard'

const blogPosts = [
  {
    id: 'ai-zeroday-threats',
    title: 'Neutralizing AI-Generated Polymorphic Zero-Day Exploits at the Cloud Edge',
    excerpt: 'Threat actors are now weaponizing generative AI to synthesize evasive SQL injection and RCE mutations that bypass static regex signatures. Discover how MDefender Pro’s 5,489,242+ payload-trained neural vectorizer inspects AST syntactic intent in <0.85ms.',
    category: 'Threat Intelligence',
    date: 'Sep 24, 2026',
    readTime: '6 min read',
    author: 'MDefender Threat Lab',
    role: 'Core AI Research',
    icon: 'fa-brain',
    image: '/blog/ai_zeroday_defense.jpg',
    featured: true,
    tags: ['AI Security', 'Zero-Day', 'Neural WAF', 'Polymorphic Attacks'],
    content: `
### Executive Summary
The weaponization of generative artificial intelligence has fundamentally shifted web application defense. Traditional Web Application Firewalls (WAFs) relying exclusively on deterministic regular expressions are increasingly blind to **polymorphic payload mutations**—payloads rewritten dynamically to alter syntactic appearance while preserving hostile execution.

In this research briefing, the MDefender Threat Intelligence team analyzes how neural tokenization and character N-gram embeddings intercept polymorphic zero-days before they reach backend application logic.

---

### The Anatomy of Polymorphic Attack Payloads
Consider a standard SQL Injection targeting an authentication endpoint. A traditional pattern matcher looks for strings such as \`' OR '1'='1\` or \`UNION SELECT\`.

However, an AI-synthesized evasion payload might look like:
\`\`\`sql
admin'/*%!50000UnIoN*//**//*!50000SeLeCt*/0x6e756c6c,(cOnCaT(cHaR(114,111,111,116),0x3a,pAsSwOrD))/**/fRoM/**/uSeRs-- -
\`\`\`
By combining inline C-style comment segmentation, hexadecimal literals, SQL keyword case oscillation, and dialect-specific MySQL version comments (\`/*!50000...\`), the attacker produces an execution tree identical to a raw UNION query while easily evading static string filters.

---

### How MDefender Pro Dual-Engine Neutralizes Mutation
Instead of solely evaluating isolated substrings, MDefender Pro implements a **two-phase hybrid pipeline**:

1. **Deterministic Filter Ring (2,000+ Signatures):** Catches known signatures, scanner user-agents (sqlmap, Nikto), and RFC compliance violations in 0.15ms.
2. **5,489,242+ Payload-Trained Neural Vectorizer:** Evaluates token distribution entropy, syntax tree reconstruction, and token n-grams. When syntactic anomaly confidence exceeds 85%, the request is quarantined and served an instant 403 Cyber Block Page.

\`\`\`
[Incoming Request] ──> [Deterministic Regex Gate] ──> [Neural Token Vectorizer (5.48M+ Dataset)] ──> [Verdict: BLOCK (0.38ms)]
\`\`\`

---

### Key Takeaways for DevOps & SecOps Teams
- **Defense in Depth:** Static rules provide low-latency baseline filtering, but must be paired with ML anomaly inspection.
- **Continuous Edge Telemetry:** MDefender Pro autonomously extracts new mutation vectors from blocked traffic and feeds them into the Attack Learning dataset.
`
  },
  {
    id: 'layer7-ddos-mitigation',
    title: 'Mitigating Sophisticated Layer 7 Volumetric HTTP Flood Attacks',
    excerpt: 'Modern volumetric attacks mimic realistic browser traffic with rotating TLS fingerprints and distributed residential proxies. Learn how token-bucket algorithms and adaptive heuristic scoring keep APIs online during multi-gigabit floods.',
    category: 'DDoS Mitigation',
    date: 'Sep 18, 2026',
    readTime: '8 min read',
    author: 'DevOps & SRE Team',
    role: 'Infrastructure Lead',
    icon: 'fa-network-wired',
    image: '/blog/ddos_mitigation_flood.jpg',
    featured: false,
    tags: ['DDoS', 'Rate Limiting', 'HTTP/2', 'Edge Shield'],
    content: `
### The New Wave of Application-Layer DDoS
Application-layer (Layer 7) DDoS attacks have surged in volume and sophistication. Unlike Layer 3/4 volumetric floods that saturate raw network bandwidth, Layer 7 attacks target resource-intensive backend endpoints (e.g., \`/api/search\`, \`/auth/login\`, checkout workflows) to exhaust server CPU and database connection pools.

---

### The Challenge of Distributed Proxy Networks
Adversaries leverage bulletproof residential proxy networks (spanning 100,000+ unique IPs) to distribute HTTP/2 multiplexed streams. Each individual IP may only send 2 to 3 requests per minute, rendering traditional single-IP rate limiters ineffective.

---

### MDefender Pro's Multi-Tier Mitigation Architecture
MDefender Pro applies an adaptive token-bucket rate limiter combined with client behavioral heuristics:
- **Global Origin Throttling:** Detects cluster-wide deviation from baseline traffic volume.
- **Dynamic IP Reputation Scoring:** Cross-references client IP subnets against known Tor exit nodes, data center hosting providers, and residential proxies.
- **Automatic Burst Buffering:** Absorbs volumetric spikes while serving verified clients with sub-millisecond response times.
`
  },
  {
    id: 'wordpress-rce-hardening',
    title: 'Deep Defense for WordPress: Preventing Plugin Vulnerabilities and Web Shells',
    excerpt: 'WordPress powers over 40% of the web, making third-party plugins a prime target for remote code execution and unauthorized file uploads. Here is how MDefender Pro creates a zero-trust execution perimeter.',
    category: 'WordPress Security',
    date: 'Sep 10, 2026',
    readTime: '7 min read',
    author: 'Security Research Team',
    role: 'Vulnerability Analyst',
    icon: 'fa-wordpress',
    image: '/blog/wordpress_security_shield.jpg',
    featured: false,
    tags: ['WordPress', 'PHP Security', 'Web Shell', 'Plugin Defense'],
    content: `
### The Reality of WordPress Vulnerability Landscape
Over 90% of WordPress security breaches originate not from the WordPress core, but from unpatched or abandoned third-party plugins and themes. Common vectors include:
1. **Unauthenticated Arbitrary File Upload (RCE):** Attackers upload PHP web shells disguised as image attachments.
2. **Broken Object Level Authorization (BOLA):** Flawed AJAX handlers in plugins allowing unauthorized settings updates.
3. **XML-RPC & REST API Brute Force:** Automated credential stuffing bypassing login rate limits.

---

### 1-Click Defense with MDefender Pro Native Plugin
The MDefender Pro WordPress plugin acts as an inline cloud-synchronized shield. Before WordPress parses incoming PHP superglobals (\`$_GET\`, \`$_POST\`, \`$_FILES\`, \`$_COOKIE\`), the request is passed through MDefender Pro WAF.
- Uploaded file contents are analyzed for PHP code execution wrappers (e.g., \`eval(gzinflate(...))\`, \`passthru\`, \`system\`).
- XML-RPC endpoints and sensitive file paths (\`wp-config.php\`, \`.env\`, \`debug.log\`) are shielded automatically.
`
  },
  {
    id: 'ssrf-cloud-metadata-protection',
    title: 'Shielding Cloud Infrastructure from SSRF and Metadata Exfiltration',
    excerpt: 'Server-Side Request Forgery (SSRF) remains one of the most critical threats to cloud-native microservices on AWS, GCP, and Azure. Discover our automated metadata protection rules.',
    category: 'Cloud Security',
    date: 'Sep 02, 2026',
    readTime: '5 min read',
    author: 'Cloud Architecture Team',
    role: 'Security Engineer',
    icon: 'fa-cloud',
    image: '/blog/cloud_metadata_ssrf.jpg',
    featured: false,
    tags: ['SSRF', 'AWS IMDS', 'Cloud Security', 'Metadata API'],
    content: `
### Understanding Server-Side Request Forgery (SSRF)
SSRF occurs when a web application fetches a remote resource (such as a profile picture from a URL, a webhook test, or an image converter) without validating user-supplied destination addresses.

In modern cloud environments, attackers use SSRF to force the server to query internal IP addresses:
- \`http://169.254.169.254/latest/meta-data/\` (AWS IMDSv1 token extraction)
- \`http://metadata.google.internal/computeMetadata/v1/\` (GCP service account tokens)
- \`http://127.0.0.1:6379\` (Redis internal command injection)

---

### MDefender Pro Autonomous Cloud Guard
MDefender Pro automatically inspects and sanitizes all URL parameters, JSON body fields, and GraphQL arguments for RFC 1918 private IP subnets, loopback addresses, and cloud provider metadata hostnames, dropping the exploit attempt before any internal request can be initiated.
`
  },
  {
    id: 'submillisecond-waf-engineering',
    title: 'Engineering Sub-Millisecond WAF Latency: Why Performance is a Security Feature',
    excerpt: 'A security solution that introduces 50ms of latency gets disabled by developers. Learn the low-level optimizations that enable MDefender Pro to inspect 2,000 rules in under 0.85ms.',
    category: 'Engineering',
    date: 'Aug 26, 2026',
    readTime: '9 min read',
    author: 'Core Performance Team',
    role: 'Lead Systems Architect',
    icon: 'fa-bolt',
    image: '/blog/submillisecond_waf_chip.jpg',
    featured: false,
    tags: ['Performance', 'C/Rust', 'Latency', 'Architecture'],
    content: `
### The Latency Dilemma in Web Security
Security measures must never degrade end-user experience. Studies show that every 100ms of additional latency reduces e-commerce conversion rates by up to 7%.

When developing MDefender Pro, our primary engineering objective was: **Zero Compromise on Speed**.

---

### Key Architectural Optimizations
1. **Single-Pass Memory Parsing:** HTTP payloads are parsed into immutable byte slices, avoiding redundant string allocations.
2. **Aho-Corasick & DFA Rule Grouping:** 2,000+ regular expressions are compiled into unified Deterministic Finite Automata (DFA), evaluating hundreds of conditions in a single traversal.
3. **Asynchronous Telemetry Offloading:** Security audit logs, analytics, and learning events are dispatched asynchronously via background worker threads, freeing the main HTTP event loop immediately.
`
  },
  {
    id: 'attack-learning-engine',
    title: 'How Our Attack Learning Engine Turns Hostile Payloads into Proactive Defense',
    excerpt: 'Static threat feeds become outdated within hours. Discover how MDefender Pro’s Attack Learning module continuously analyzes blocked attacks to dynamically harden your application perimeter.',
    category: 'Threat Intelligence',
    date: 'Aug 19, 2026',
    readTime: '6 min read',
    author: 'ML Operations Team',
    role: 'Lead Data Scientist',
    icon: 'fa-chart-line-up',
    image: '/blog/attack_learning_ai.jpg',
    featured: false,
    tags: ['Machine Learning', 'Threat Hunting', 'Automation', 'Adaptive Security'],
    content: `
### The Feedback Loop of Modern Defense
In traditional security architectures, when an attack is blocked, the log is stored in a database and largely forgotten unless a human analyst manually conducts an audit.

MDefender Pro introduces an **Autonomous Feedback Loop**:
1. **Payload Capture & Sanitization:** Hostile payloads are tokenized, stripped of PII, and categorized by threat class.
2. **Heuristic Vector Clustering:** Our learning engine clusters incoming attack campaigns to identify coordinated scans across multiple tenants.
3. **Automated Signature Refinement:** Heuristic thresholds adjust in real-time, proactively safeguarding peer tenants against identical campaign vectors.
`
  }
]

const categories = ['All', 'Threat Intelligence', 'DDoS Mitigation', 'WordPress Security', 'Cloud Security', 'Engineering']

const categoryColors = {
  'Threat Intelligence': { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.3)' },
  'DDoS Mitigation': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  'WordPress Security': { bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.3)' },
  'Cloud Security': { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
  'Engineering': { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
}

// Inline Markdown Formatter Helper
function renderFormattedText(text, dark) {
  if (!text) return null
  // Regex to split by bold (**text**) and code (`code`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      return (
        <strong key={index} style={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>
          {inner}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1)
      return (
        <code
          key={index}
          style={{
            background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
            color: dark ? '#38bdf8' : '#0284c7',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.9em',
            fontFamily: "'SF Mono', Monaco, monospace"
          }}
        >
          {inner}
        </code>
      )
    }
    return part
  })
}

function CodeSnippetBox({ code, dark }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{
      borderRadius: '12px',
      overflow: 'hidden',
      margin: '20px 0',
      background: dark ? '#070b14' : '#0f172a',
      border: `1px solid ${dark ? '#1e293b' : '#334155'}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '9px 18px',
        background: dark ? '#04070e' : '#020617',
        borderBottom: '1px solid #1e293b',
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }}></span>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }}></span>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ marginLeft: '8px', color: '#64748b' }}>SECURITY PAYLOAD INSPECTION</span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: copied ? '#10b981' : '#e2e8f0',
            cursor: 'pointer',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '18px 22px',
        color: '#38bdf8',
        fontSize: '13px',
        lineHeight: '1.65',
        fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
        overflowX: 'auto'
      }}>
        <code>{code.trim()}</code>
      </pre>
    </div>
  )
}

function ArticleRenderer({ content, dark }) {
  const blocks = content.trim().split('\n\n')

  return (
    <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
      {blocks.map((block, idx) => {
        const text = block.trim()

        // Headers
        if (text.startsWith('### ')) {
          return (
            <div key={idx} style={{ margin: '32px 0 14px' }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 800,
                color: dark ? '#ffffff' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                letterSpacing: '-0.3px',
                margin: 0
              }}>
                <span style={{
                  width: '4px',
                  height: '20px',
                  borderRadius: '2px',
                  background: 'linear-gradient(180deg, #6366f1, #3b82f6)'
                }}></span>
                {text.replace('### ', '')}
              </h3>
            </div>
          )
        }

        // Code Blocks
        if (text.startsWith('```')) {
          const rawCode = text.replace(/```[a-z]*\n?/g, '')
          return <CodeSnippetBox key={idx} code={rawCode} dark={dark} />
        }

        // Dividers
        if (text === '---') {
          return (
            <div key={idx} style={{
              margin: '32px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}></div>
              <i className="fas fa-shield-halved" style={{ color: '#6366f1', fontSize: '12px' }}></i>
              <div style={{ flex: 1, height: '1px', background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}></div>
            </div>
          )
        }

        // Numbered List
        if (/^\d+\.\s/.test(text)) {
          const items = text.split('\n').filter(Boolean)
          return (
            <div key={idx} style={{
              margin: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {items.map((item, itemIdx) => {
                const match = item.match(/^(\d+)\.\s*(.*)/)
                const num = match ? match[1] : itemIdx + 1
                const bodyText = match ? match[2] : item
                return (
                  <div key={itemIdx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
                    padding: '12px 16px',
                    borderRadius: '10px'
                  }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(99,102,241,0.15)',
                      color: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {num}
                    </span>
                    <div style={{ color: dark ? '#cbd5e1' : '#334155', fontSize: '14px', lineHeight: '1.7' }}>
                      {renderFormattedText(bodyText, dark)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        // Bullet List
        if (text.startsWith('- ') || text.startsWith('* ')) {
          const items = text.split('\n').filter(Boolean)
          return (
            <div key={idx} style={{
              margin: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {items.map((item, itemIdx) => {
                const cleanItem = item.replace(/^[-*]\s*/, '')
                return (
                  <div key={itemIdx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <i className="fas fa-check-circle" style={{
                      color: '#10b981',
                      fontSize: '13px',
                      marginTop: '5px',
                      flexShrink: 0
                    }}></i>
                    <div style={{ color: dark ? '#cbd5e1' : '#334155', fontSize: '14px', lineHeight: '1.7' }}>
                      {renderFormattedText(cleanItem, dark)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        // Standard Paragraph
        return (
          <p key={idx} style={{
            color: dark ? '#cbd5e1' : '#334155',
            margin: '0 0 18px',
            fontSize: '15px',
            lineHeight: '1.8'
          }}>
            {renderFormattedText(text, dark)}
          </p>
        )
      })}
    </div>
  )
}

export default function Blog() {
  const { dark } = useTheme()
  const s = theme(dark)

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeArticle, setActiveArticle] = useState(null)
  const [emailSubscribed, setEmailSubscribed] = useState(false)
  const [subEmail, setSubEmail] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  const featuredPost = useMemo(() => {
    return blogPosts.find(p => p.featured) || blogPosts[0]
  }, [])

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchCategory = selectedCategory === 'All' || post.category === selectedCategory
      const matchQuery = searchQuery.trim() === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCategory && matchQuery
    })
  }, [selectedCategory, searchQuery])

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!subEmail || !subEmail.includes('@')) return
    setEmailSubscribed(true)
    setSubEmail('')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Related articles recommendation
  const relatedArticles = useMemo(() => {
    if (!activeArticle) return []
    return blogPosts.filter(p => p.id !== activeArticle.id).slice(0, 2)
  }, [activeArticle])

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#070b14' : '#f8fafc',
      color: dark ? '#f1f5f9' : '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowX: 'hidden'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.97) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .blog-card {
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .blog-card:hover {
          transform: translateY(-6px);
          box-shadow: ${dark ? '0 20px 40px rgba(0,0,0,0.65)' : '0 14px 34px rgba(0,0,0,0.08)'} !important;
          border-color: rgba(99,102,241,0.5) !important;
        }
        .blog-card:hover .blog-card-img {
          transform: scale(1.05);
        }
        .blog-card:hover h3, .blog-card:hover h2 {
          color: #6366f1 !important;
        }

        .category-pill {
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          background: transparent;
          color: ${dark ? '#94a3b8' : '#64748b'};
        }
        .category-pill:hover {
          color: ${dark ? '#f8fafc' : '#0f172a'};
          background: ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
        }
        .category-pill-active {
          background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }

        .blog-tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 6px;
          background: ${dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
          color: ${dark ? '#94a3b8' : '#64748b'};
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
          transition: all 0.2s;
        }
        .blog-tag-badge:hover {
          color: #6366f1;
          border-color: rgba(99,102,241,0.3);
        }
      `}</style>

      <PublicNavbar />

      {/* Live Threat Intelligence Ticker */}
      <div style={{
        marginTop: 64,
        background: dark ? 'rgba(15,23,42,0.9)' : '#eef2ff',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#c7d2fe'}`,
        padding: '9px 20px',
        fontSize: 12,
        fontWeight: 600,
        color: dark ? '#94a3b8' : '#4338ca',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 800 }}>LIVE THREAT RADAR:</span>
        </div>
        <span>5,489,242+ Dataset ML Core active &bull; Sub-millisecond AST Vectorizer online &bull; Zero false positives recorded across edge fleet</span>
      </div>

      {/* Header Section */}
      <section style={{
        padding: '50px 24px 36px',
        maxWidth: 1240,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          borderRadius: 30,
          background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
          border: `1px solid ${dark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
          color: '#6366f1',
          fontSize: 12.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: 16
        }}>
          <i className="fas fa-radar"></i> MDefender Threat Intel &amp; Security Lab
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 4.8vw, 52px)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-1px',
          maxWidth: 920,
          margin: '0 auto 16px',
          color: dark ? '#ffffff' : '#0f172a'
        }}>
          Cybersecurity Threat Intelligence, Zero-Day Research &amp; AI WAF Architecture
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 1.8vw, 17.5px)',
          lineHeight: 1.65,
          color: dark ? '#94a3b8' : '#475569',
          maxWidth: 720,
          margin: '0 auto 34px'
        }}>
          Technical briefings, exploit vector analyses, and defensive architecture deep-dives authored by our security engineers and threat researchers.
        </p>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 16, top: 16, color: '#64748b', fontSize: 13 }}></i>
            <input
              type="text"
              placeholder="Search threat reports, zero-days, CVEs, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 18px 12px 42px',
                borderRadius: 12,
                fontSize: 14,
                border: `1.5px solid ${dark ? '#1e293b' : '#cbd5e1'}`,
                background: dark ? '#0a0e1a' : '#ffffff',
                color: dark ? '#e2e8f0' : '#0f172a',
                outline: 'none',
                boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill ${selectedCategory === cat ? 'category-pill-active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED HERO SPOTLIGHT ARTICLE ================= */}
      {selectedCategory === 'All' && searchQuery.trim() === '' && (
        <section style={{ maxWidth: 1240, margin: '0 auto 40px', padding: '0 24px' }}>
          <div
            className="blog-card"
            onClick={() => setActiveArticle(featuredPost)}
            style={{
              background: dark ? '#0c1222' : '#ffffff',
              borderRadius: 20,
              border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              boxShadow: dark ? '0 15px 40px rgba(0,0,0,0.45)' : '0 10px 30px rgba(0,0,0,0.06)',
              position: 'relative'
            }}
          >
            {/* Visual Image Banner */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 300 }}>
              <img
                src={featuredPost.image}
                alt={featuredPost.title}
                className="blog-card-img"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.5s ease'
                }}
              />
              <div style={{
                position: 'absolute',
                top: 18,
                left: 18,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(99,102,241,0.95)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                <i className="fas fa-bolt"></i> Spotlight Threat Report
              </div>
            </div>

            {/* Content Details */}
            <div style={{ padding: '34px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: categoryColors[featuredPost.category]?.bg || 'rgba(99,102,241,0.12)',
                    color: categoryColors[featuredPost.category]?.text || '#6366f1',
                    border: `1px solid ${categoryColors[featuredPost.category]?.border || 'rgba(99,102,241,0.3)'}`,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {featuredPost.category}
                  </span>
                  <span style={{ fontSize: 12.5, color: dark ? '#94a3b8' : '#64748b' }}>
                    <i className="fas fa-clock" style={{ marginRight: 5 }}></i> {featuredPost.readTime}
                  </span>
                </div>

                <h2 style={{
                  fontSize: 'clamp(21px, 2.2vw, 26px)',
                  fontWeight: 900,
                  color: dark ? '#ffffff' : '#0f172a',
                  lineHeight: 1.3,
                  letterSpacing: '-0.5px',
                  marginBottom: 12,
                  transition: 'color 0.2s'
                }}>
                  {featuredPost.title}
                </h2>

                <p style={{ fontSize: 14.5, color: dark ? '#94a3b8' : '#475569', lineHeight: 1.65, marginBottom: 18 }}>
                  {featuredPost.excerpt}
                </p>

                {/* Clean tag pills without raw hash symbol */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                  {featuredPost.tags.map((tag, i) => (
                    <span key={i} className="blog-tag-badge">
                      <i className="fas fa-tag" style={{ fontSize: 9, opacity: 0.7 }}></i>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14
                  }}>
                    <i className="fas fa-brain"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' }}>{featuredPost.author}</div>
                    <div style={{ fontSize: 11.5, color: dark ? '#94a3b8' : '#64748b' }}>{featuredPost.date}</div>
                  </div>
                </div>

                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Read Technical Report <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= STANDARD GRID ARTICLES ================= */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 26
        }}>
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="blog-card"
              onClick={() => setActiveArticle(post)}
              style={{
                background: dark ? '#0c1222' : '#ffffff',
                borderRadius: 18,
                border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: dark ? '0 8px 30px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
            >
              <div>
                {/* Visual Thumbnail */}
                <div style={{ width: '100%', height: 210, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={post.image}
                    alt={post.title}
                    className="blog-card-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: categoryColors[post.category]?.bg || 'rgba(15,23,42,0.85)',
                    color: categoryColors[post.category]?.text || '#6366f1',
                    border: `1px solid ${categoryColors[post.category]?.border || 'rgba(99,102,241,0.3)'}`,
                    backdropFilter: 'blur(8px)',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {post.category}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 14,
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    color: '#e2e8f0',
                    fontSize: 11.5,
                    fontWeight: 600
                  }}>
                    <i className="fas fa-clock" style={{ marginRight: 5, fontSize: 10 }}></i>
                    {post.readTime}
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '22px 22px 14px' }}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: dark ? '#ffffff' : '#0f172a',
                    lineHeight: 1.35,
                    marginBottom: 10,
                    letterSpacing: '-0.3px',
                    transition: 'color 0.2s'
                  }}>
                    {post.title}
                  </h3>

                  <p style={{
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: dark ? '#94a3b8' : '#475569',
                    marginBottom: 16
                  }}>
                    {post.excerpt}
                  </p>

                  {/* Clean tag pills without raw hash symbol */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="blog-tag-badge">
                        <i className="fas fa-tag" style={{ fontSize: 9, opacity: 0.7 }}></i>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Author Strip */}
              <div style={{
                padding: '14px 22px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: 12
                  }}>
                    <i className={`fas ${post.icon}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#64748b' }}>{post.date}</div>
                  </div>
                </div>

                <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Read <i className="fas fa-arrow-right" style={{ fontSize: 11 }}></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Threat Intel Newsletter CTA */}
      <section style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          background: dark
            ? 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.85) 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          borderRadius: 24,
          padding: '52px 36px',
          border: `1px solid ${dark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.3)'}`,
          boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.45)' : '0 8px 30px rgba(99,102,241,0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(99,102,241,0.15)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22
          }}>
            <i className="fas fa-paper-plane"></i>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: dark ? '#ffffff' : '#0f172a', letterSpacing: '-0.6px', marginBottom: 8 }}>
            Subscribe to MDefender Threat Intelligence
          </h2>
          <p style={{ fontSize: 15, color: dark ? '#94a3b8' : '#475569', maxWidth: 580, margin: '0 auto 26px', lineHeight: 1.6 }}>
            Receive zero-day exploit advisories, AI payload detection rules, and cybersecurity architecture briefings directly in your inbox.
          </p>

          {emailSubscribed ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 10,
              background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
              border: `1px solid ${dark ? 'rgba(16,185,129,0.3)' : '#a7f3d0'}`,
              color: '#10b981',
              fontWeight: 700,
              fontSize: 14
            }}>
              <i className="fas fa-check-circle"></i> You are subscribed to MDefender Threat Intel!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', maxWidth: 520, margin: '0 auto' }}>
              <input
                type="email"
                required
                placeholder="Enter your work security email..."
                value={subEmail}
                onChange={e => setSubEmail(e.target.value)}
                style={{
                  flex: '1 1 280px',
                  padding: '13px 18px',
                  borderRadius: 10,
                  fontSize: 14,
                  border: `1.5px solid ${dark ? '#1e293b' : '#cbd5e1'}`,
                  background: dark ? '#0a0e1a' : '#ffffff',
                  color: dark ? '#f1f5f9' : '#0f172a',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '13px 26px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
                }}
              >
                Join 14,000+ Engineers
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ================= ARTICLE DETAIL MODAL ================= */}
      {activeArticle && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: dark ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px'
        }} onClick={() => setActiveArticle(null)}>
          <div
            style={{
              background: dark ? '#0c1222' : '#ffffff',
              borderRadius: 22,
              width: '100%',
              maxWidth: 860,
              maxHeight: '92vh',
              overflowY: 'auto',
              border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              position: 'relative',
              animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Visual Banner inside Modal */}
            <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden' }}>
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: dark
                  ? 'linear-gradient(to top, #0c1222 0%, rgba(12,18,34,0.4) 60%, transparent 100%)'
                  : 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.2) 60%, transparent 100%)'
              }}></div>

              {/* Close Button */}
              <button
                onClick={() => setActiveArticle(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: categoryColors[activeArticle.category]?.bg || 'rgba(99,102,241,0.15)',
                    color: categoryColors[activeArticle.category]?.text || '#6366f1',
                    border: `1px solid ${categoryColors[activeArticle.category]?.border || 'rgba(99,102,241,0.3)'}`,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {activeArticle.category}
                  </span>
                  <span style={{ fontSize: 13, color: dark ? '#94a3b8' : '#64748b' }}>{activeArticle.date} • {activeArticle.readTime}</span>
                </div>

                <button
                  onClick={handleCopyLink}
                  style={{
                    background: 'none',
                    border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    color: copiedLink ? '#10b981' : (dark ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className={`fas ${copiedLink ? 'fa-check' : 'fa-link'}`}></i>
                  {copiedLink ? 'Link Copied!' : 'Share Article'}
                </button>
              </div>

              <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: dark ? '#ffffff' : '#0f172a', lineHeight: 1.25, letterSpacing: '-0.7px', marginBottom: 18 }}>
                {activeArticle.title}
              </h1>

              {/* Author Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 22, borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}` }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 16
                }}>
                  <i className={`fas ${activeArticle.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' }}>{activeArticle.author}</div>
                  <div style={{ fontSize: 12, color: dark ? '#94a3b8' : '#64748b' }}>{activeArticle.role} &middot; MDefender Pro Threat Intelligence Lab</div>
                </div>
              </div>

              {/* Rich Parsed Article Content Without Raw Markdown Artifacts */}
              <div style={{ marginTop: 24 }}>
                <ArticleRenderer content={activeArticle.content} dark={dark} />
              </div>

              {/* Tags inside Modal */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, paddingTop: 18, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}` }}>
                {activeArticle.tags.map((tag, i) => (
                  <span key={i} className="blog-tag-badge">
                    <i className="fas fa-tag" style={{ fontSize: 9, opacity: 0.7 }}></i>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Related Technical Reports */}
              {relatedArticles.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#f1f5f9' : '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Recommended Threat Reports
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {relatedArticles.map(rel => (
                      <div
                        key={rel.id}
                        onClick={() => setActiveArticle(rel)}
                        style={{
                          background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                          border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                          borderRadius: 12,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 }}>
                          {rel.category}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a', lineHeight: 1.4, marginBottom: 6 }}>
                          {rel.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: dark ? '#94a3b8' : '#64748b' }}>
                          {rel.readTime} &bull; {rel.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom CTA Inside Modal */}
              <div style={{
                marginTop: 36,
                padding: '24px 22px',
                borderRadius: 16,
                background: dark ? 'rgba(99,102,241,0.08)' : '#eef2ff',
                border: `1px solid ${dark ? 'rgba(99,102,241,0.2)' : '#c7d2fe'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: dark ? '#ffffff' : '#0f172a' }}>Deploy AI Web Defense in Under 2 Minutes</div>
                  <div style={{ fontSize: 13, color: dark ? '#94a3b8' : '#475569' }}>Protect your web applications with 2,000 WAF rules and 5,489,242+ attack dataset ML inference.</div>
                </div>
                <Link to="/register" style={{
                  padding: '11px 24px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}>
                  Start Free Protection
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer style={{
        padding: '36px 40px',
        borderTop: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
        background: dark ? '#04070e' : '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        fontSize: 13,
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-shield-halved" style={{ color: '#6366f1', fontSize: 16 }}></i>
          <span style={{ fontWeight: 800, color: dark ? '#ffffff' : '#0f172a' }}>MDefender Pro Threat Intelligence</span>
          <span>&middot; Autonomous Edge Security Publications</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} MDefender Pro Security Inc.
        </div>
      </footer>
    </div>
  )
}
