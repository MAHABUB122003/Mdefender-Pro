import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import PublicNavbar from '../components/PublicNavbar'
import theme from '../utils/theme'

const blogPosts = [
  {
    id: 1,
    title: 'The Rise of AI-Driven Zero-Day Exploits',
    excerpt: 'As artificial intelligence models become more accessible, threat actors are leveraging them to find and exploit zero-day vulnerabilities faster than ever. Here is how MDefender Pro stays ahead.',
    category: 'Threat Intelligence',
    date: 'Aug 14, 2026',
    readTime: '6 min read',
    author: 'Security Research Team',
    icon: 'fa-shield-halved',
    featured: true
  },
  {
    id: 2,
    title: 'Securing Your WordPress Multisite Network',
    excerpt: 'WordPress multisite environments introduce unique security challenges. Learn how to implement tenant-level isolation and strict WAF rules to prevent cross-site contamination.',
    category: 'Best Practices',
    date: 'Aug 10, 2026',
    readTime: '8 min read',
    author: 'DevOps Team',
    icon: 'fa-wordpress',
    featured: false
  },
  {
    id: 3,
    title: 'Understanding the New MDefender Pro Multi-Tenant Architecture',
    excerpt: 'We have completely overhauled our infrastructure to support enterprise-grade tenant isolation. Dive deep into the technical decisions behind our new scalable architecture.',
    category: 'Product Update',
    date: 'Aug 05, 2026',
    readTime: '5 min read',
    author: 'Engineering',
    icon: 'fa-sitemap',
    featured: false
  },
  {
    id: 4,
    title: 'Mitigating Layer 7 DDoS Attacks with Machine Learning',
    excerpt: 'Traditional rate-limiting is no longer enough to stop sophisticated Layer 7 DDoS attacks. Discover how machine learning models can differentiate between legitimate traffic spikes and volumetric attacks.',
    category: 'Engineering',
    date: 'Jul 28, 2026',
    readTime: '10 min read',
    author: 'Data Science Team',
    icon: 'fa-network-wired',
    featured: false
  },
]

export default function Blog() {
  const { dark } = useTheme()
  const s = theme(dark)

  return (
    <div style={{ minHeight: '100vh', background: s.bg, color: s.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflowX: 'hidden', transition: 'background 0.3s, color 0.3s' }}>
      <style>{`
        .blog-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); border-color: rgba(99,102,241,0.4) !important; }
        .blog-card:hover h3 { color: #6366f1; }
        .blog-btn { transition: all 0.25s; }
        .blog-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99,102,241,0.25); }
        .blog-category { display: inline-block; padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        @media (max-width: 1024px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .blog-grid { grid-template-columns: 1fr !important; }
          .blog-header h1 { font-size: 32px !important; }
        }
      `}</style>

      <PublicNavbar />

      {/* Header */}
      <section style={{ padding: '140px 60px 60px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: `radial-gradient(ellipse, ${dark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <h1 className="blog-header" style={{ position: 'relative', fontSize: 48, fontWeight: 800, marginBottom: 16, letterSpacing: '-1px', lineHeight: 1.1 }}>Our Blog</h1>
        <p style={{ position: 'relative', fontSize: 18, color: s.textSecondary, maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Insights, research, and updates from the MDefender Pro security and engineering teams.
        </p>
      </section>

      {/* Blog Grid */}
      <section style={{ padding: '0 60px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30 }}>
          {blogPosts.map((post, index) => {
            const isFeatured = post.featured;
            const cardStyle = {
              padding: 30,
              background: s.bgCard,
              border: `1px solid ${s.borderLight}`,
              borderRadius: 16,
              gridColumn: isFeatured ? '1 / -1' : 'auto',
              display: isFeatured ? 'flex' : 'block',
              alignItems: 'center',
              gap: isFeatured ? 40 : 0
            };

            return (
              <div key={post.id} className="blog-card" style={cardStyle}>
                <div style={{ flex: isFeatured ? '0 0 45%' : 'none', marginBottom: isFeatured ? 0 : 20 }}>
                  <div style={{ 
                    width: '100%', 
                    paddingTop: isFeatured ? '60%' : '50%', 
                    background: `linear-gradient(135deg, ${dark ? '#1e1e2d' : '#f1f5f9'}, ${dark ? '#151521' : '#e2e8f0'})`, 
                    borderRadius: 12, 
                    position: 'relative', 
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={`fas ${post.icon}`} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: isFeatured ? 80 : 48, color: 'rgba(99,102,241,0.2)' }}></i>
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 16 }}>
                    <span className="blog-category" style={{ 
                      background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', 
                      color: '#6366f1' 
                    }}>
                      {post.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: isFeatured ? 32 : 20, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px', transition: 'color 0.2s', lineHeight: 1.3 }}>
                    {post.title}
                  </h3>
                  <p style={{ color: s.textSecondary, fontSize: isFeatured ? 16 : 14, lineHeight: 1.6, marginBottom: 24 }}>
                    {post.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${s.borderLight}`, paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                        {post.author.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{post.author}</div>
                        <div style={{ fontSize: 11, color: s.textMuted }}>{post.date} • {post.readTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <button className="blog-btn" style={{ 
            background: 'transparent', 
            border: `1px solid ${s.border}`, 
            color: s.text, 
            padding: '12px 30px', 
            borderRadius: 8, 
            fontSize: 14, 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}>
            Load More Posts
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 60px', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: s.textMuted, fontSize: 13 }}>
        <span>&copy; 2026 MDefender Pro. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/docs" style={{ color: s.textMuted, textDecoration: 'none' }}>Docs</Link>
          <Link to="/pricing" style={{ color: s.textMuted, textDecoration: 'none' }}>Pricing</Link>
          <Link to="/user/login" style={{ color: s.textMuted, textDecoration: 'none' }}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
