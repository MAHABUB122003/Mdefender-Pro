import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect, useRef } from 'react';

const downloadUrl = `${(import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')}/api/v1/wordpress/plugin`;

export default function PublicNavbar() {
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownOffset, setDropdownOffset] = useState(0);
  const navRef = useRef(null);
  const productsBtnRef = useRef(null);

  // Dynamically position dropdown to guarantee it never overflows right or left screen bounds
  useEffect(() => {
    if (activeDropdown === 'solutions' && productsBtnRef.current) {
      const updateDropdownPos = () => {
        if (!productsBtnRef.current) return;
        const rect = productsBtnRef.current.getBoundingClientRect();
        const panelWidth = Math.min(740, window.innerWidth - 32);
        const margin = 16;
        const rightEdge = rect.left + panelWidth;
        const maxRight = window.innerWidth - margin;
        if (rightEdge > maxRight) {
          const overflow = rightEdge - maxRight;
          const maxAllowedShift = rect.left - margin;
          setDropdownOffset(-Math.min(overflow, Math.max(0, maxAllowedShift)));
        } else {
          setDropdownOffset(0);
        }
      };
      updateDropdownPos();
      window.addEventListener('resize', updateDropdownPos);
      return () => window.removeEventListener('resize', updateDropdownPos);
    }
  }, [activeDropdown]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [loc.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smooth scroll to top when clicking logo on homepage
  const handleLogoClick = (e) => {
    if (loc.pathname === '/') {
      e.preventDefault();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileOpen(false);
  };

  const c = {
    bg: dark
      ? (scrolled ? 'rgba(6, 10, 20, 0.94)' : 'rgba(7, 11, 20, 0.78)')
      : (scrolled ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.88)'),
    border: dark
      ? (scrolled ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255, 255, 255, 0.08)')
      : (scrolled ? 'rgba(0, 0, 0, 0.09)' : 'rgba(0, 0, 0, 0.05)'),
    shadow: scrolled
      ? (dark ? '0 12px 35px rgba(0, 0, 0, 0.85), 0 1px 0 rgba(59, 130, 246, 0.25)' : '0 4px 25px rgba(0,0,0,0.06)')
      : 'none',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#94a3b8' : '#64748b',
    hover: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    active: '#3b82f6',
    dropdownBg: dark ? '#0a0f1e' : '#ffffff',
    dropdownBorder: dark ? 'rgba(59, 130, 246, 0.28)' : 'rgba(0, 0, 0, 0.1)',
    toggleBg: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
  };

  const productCategories = [
    {
      title: 'Edge Infrastructure & Application WAF',
      items: [
        {
          title: 'Cloud Anycast WAF Proxy',
          desc: '0.12ms sub-millisecond edge inspection for web applications & APIs.',
          icon: 'fa-shield-halved',
          badge: '0.12ms',
          to: '/products/waf',
          color: '#3b82f6'
        },
        {
          title: 'Layer 7 Volumetric Scrubber',
          desc: 'Absorb multi-gigabit floods & Slowloris socket starvation attacks.',
          icon: 'fa-network-wired',
          badge: '100+ Tbps',
          to: '/products/ddos',
          color: '#ef4444'
        },
        {
          title: 'Custom Regex Policy Builder',
          desc: 'Compile PCRE policies into deterministic finite automata with ReDoS safety.',
          icon: 'fa-sliders',
          badge: 'ENTERPRISE',
          to: '/products/rules',
          color: '#6366f1'
        }
      ]
    },
    {
      title: 'Autonomous Intelligence & Client Edge',
      items: [
        {
          title: '6.5M+ Threat Neural Engine',
          desc: 'Decomposes character n-grams to catch obfuscated zero-day mutations.',
          icon: 'fa-brain',
          badge: '99.23%',
          to: '/products/neural-engine',
          color: '#8b5cf6'
        },
        {
          title: 'AI Gateway & Prompt Shield',
          desc: 'Neutralize DAN jailbreaks and redact sensitive PII before LLM calls.',
          icon: 'fa-robot',
          badge: 'OWASP LLM01',
          to: '/products/ai-gateway',
          color: '#a855f7'
        },
        {
          title: 'Turnstile Bot PoW Defense',
          desc: 'Invisible WebCrypto SHA-256 challenge halting scrapers in <35ms.',
          icon: 'fa-fingerprint',
          badge: 'ZERO CAPTCHA',
          to: '/products/turnstile',
          color: '#10b981'
        }
      ]
    }
  ];

  return (
    <>
      <style>{`
        @keyframes navGlowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes beaconBlink {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
        }
        .pn-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 500;
          color: ${c.muted};
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
          position: relative;
        }
        .pn-nav-btn:hover, .pn-nav-btn.active {
          color: ${c.text};
          background: ${c.hover};
        }
        .pn-nav-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0px;
          left: 14px;
          right: 14px;
          height: 2px;
          background: #3b82f6;
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
        }
        .pn-dropdown-panel {
          position: absolute;
          top: calc(100% + 10px);
          width: 740px;
          max-width: calc(100vw - 32px);
          background-color: ${dark ? '#0a0f1d' : '#ffffff'} !important;
          background: ${dark ? '#0a0f1d' : '#ffffff'} !important;
          opacity: 1 !important;
          border: 1px solid ${dark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(0, 0, 0, 0.12)'};
          border-radius: 16px;
          box-shadow: ${dark ? '0 25px 70px -10px rgba(0,0,0,0.98), 0 0 0 1px rgba(59,130,246,0.3), 0 10px 40px rgba(0,0,0,0.8)' : '0 25px 60px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08), 0 10px 30px rgba(0,0,0,0.06)'};
          padding: 20px 22px;
          animation: pnDropAnim 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000 !important;
          isolation: isolate;
          overflow: hidden;
          box-sizing: border-box;
        }
        @keyframes pnDropAnim {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pn-menu-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 14px;
          padding-right: 28px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          position: relative;
        }
        .pn-menu-item:hover {
          background: ${dark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)'};
          border-color: ${dark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'};
          transform: translateX(2px);
        }
        .pn-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .pn-menu-item:hover .pn-item-icon {
          transform: scale(1.08);
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.4);
        }
        .pn-arrow-slide {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%) translateX(-4px);
          opacity: 0;
          transition: all 0.2s;
          pointer-events: none;
        }
        .pn-menu-item:hover .pn-arrow-slide {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        @media (max-width: 960px) {
          .pn-desktop { display: none !important; }
          .pn-hamburger { display: flex !important; }
        }
        @media (min-width: 961px) {
          .pn-mobile-menu { display: none !important; }
          .pn-hamburger { display: none !important; }
        }
      `}</style>

      {/* Main Navbar Bar */}
      <nav ref={navRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120,
        borderBottom: `1px solid ${c.border}`,
        boxShadow: c.shadow,
        padding: '0 28px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease',
      }}>
        {/* Background layer: handles blur & semi-translucent bar WITHOUT capturing or flattening dropdown */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: c.bg,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          zIndex: 0,
          pointerEvents: 'none',
        }} />

        {/* Brand Logo */}
        <Link
          to="/"
          onClick={handleLogoClick}
          title="MDefender Pro — Cloud Edge Cyber Defense"
          style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0, cursor: 'pointer', position: 'relative', zIndex: 1 }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            overflow: 'hidden',
            border: '1.5px solid rgba(59, 130, 246, 0.45)',
            boxShadow: '0 0 16px rgba(37, 99, 235, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #070b14, #0f172a)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="navShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path d="M12 1.5L3.5 5.2v6.5c0 5.6 3.6 10.8 8.5 12.3 4.9-1.5 8.5-6.7 8.5-12.3V5.2L12 1.5z" fill="url(#navShieldGrad)" />
              <path d="M9.5 12.2l1.8 1.8 3.5-3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
            MDefender <span style={{
              fontSize: 10.5,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 6,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#ffffff',
              letterSpacing: '0.8px',
              boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>PRO</span>
          </span>
        </Link>

        {/* Desktop Links & Mega-Menus */}
        <div className="pn-desktop" style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
          {/* Products Mega-Menu Button */}
          <div ref={productsBtnRef} style={{ position: 'relative' }}>
            <button
              className={`pn-nav-btn ${activeDropdown === 'solutions' ? 'active' : ''}`}
              onClick={() => setActiveDropdown(activeDropdown === 'solutions' ? null : 'solutions')}
            >
              <span>Products</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: activeDropdown === 'solutions' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Structured Mega-Menu Dropdown */}
            {activeDropdown === 'solutions' && (
              <div
                className="pn-dropdown-panel"
                style={{
                  left: `${dropdownOffset}px`,
                  width: '740px',
                  maxWidth: 'calc(100vw - 32px)',
                  background: dark ? '#0a0f1d' : '#ffffff',
                  backgroundColor: dark ? '#0a0f1d' : '#ffffff',
                  opacity: 1,
                  zIndex: 1000,
                  isolation: 'isolate',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                {/* Header Strip */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 16, paddingBottom: 10,
                  borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-shield-halved" style={{ color: '#3b82f6', fontSize: 13 }}></i>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: '#60a5fa', textTransform: 'uppercase' }}>
                      Autonomous Cyber Defense Fabric
                    </span>
                  </div>
                  <Link
                    to="/products"
                    onClick={() => setActiveDropdown(null)}
                    style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>View Architecture Map</span>
                    <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i>
                  </Link>
                </div>

                {/* 2-Column Product Matrix - Balanced 50/50 with minmax(0, 1fr) to prevent overflow */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
                  {productCategories.map((cat, cIdx) => (
                    <div key={cIdx} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, paddingLeft: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.title}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {cat.items.map((it, idx) => (
                          <Link key={idx} to={it.to} className="pn-menu-item" onClick={() => setActiveDropdown(null)}>
                            <div className="pn-item-icon" style={{
                              background: dark ? `${it.color}18` : `${it.color}12`,
                              border: `1px solid ${it.color}35`,
                              color: it.color
                            }}>
                              <i className={`fas ${it.icon}`}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                                  background: dark ? `${it.color}25` : `${it.color}15`,
                                  color: it.color,
                                  flexShrink: 0,
                                  letterSpacing: '0.3px',
                                  whiteSpace: 'nowrap'
                                }}>{it.badge}</span>
                              </div>
                              <p style={{
                                fontSize: 11.5,
                                color: c.muted,
                                margin: 0,
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {it.desc}
                              </p>
                            </div>
                            <i className="fas fa-arrow-right pn-arrow-slide" style={{ fontSize: 10, color: it.color }}></i>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* WordPress CMS Banner Inside Dropdown */}
                <div style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: dark ? 'rgba(2, 132, 199, 0.08)' : 'rgba(2, 132, 199, 0.05)',
                  border: `1px solid ${dark ? 'rgba(2, 132, 199, 0.25)' : 'rgba(2, 132, 199, 0.15)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      <i className="fa-brands fa-wordpress"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Official WordPress Security Plugin</span>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#0284c7', color: '#ffffff' }}>v4.1.0</span>
                      </div>
                      <div style={{ fontSize: 11, color: c.muted }}>Pre-boot mu-plugins WAF &amp; real-time webshell quarantine.</div>
                    </div>
                  </div>
                  <Link
                    to="/products/wordpress"
                    onClick={() => setActiveDropdown(null)}
                    style={{ fontSize: 11.5, fontWeight: 700, color: '#0284c7', textDecoration: 'none', padding: '6px 12px', borderRadius: 6, background: dark ? 'rgba(2,132,199,0.18)' : '#e0f2fe' }}
                  >
                    Details &rarr;
                  </Link>
                </div>

                {/* Footer Status Bar */}
                <div style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11.5
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#10b981', fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'beaconBlink 2s infinite' }}></span>
                    <span>Global Network: 240+ Anycast PoPs · 0.12ms Edge Latency · 99.999% SLA</span>
                  </div>
                  <Link to="/docs" onClick={() => setActiveDropdown(null)} style={{ color: c.muted, textDecoration: 'none', fontWeight: 600 }}>
                    REST API Reference &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Documentation Link */}
          <Link
            to="/docs"
            className={`pn-nav-btn ${loc.pathname === '/docs' ? 'active' : ''}`}
            style={{ color: loc.pathname === '/docs' ? c.active : c.muted }}
          >
            Docs
          </Link>

          {/* Threat Intelligence Blog Link */}
          <Link
            to="/blog"
            className={`pn-nav-btn ${loc.pathname === '/blog' ? 'active' : ''}`}
            style={{ color: loc.pathname === '/blog' ? c.active : c.muted, gap: 7 }}
          >
            <span>Threat Intelligence</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
              background: dark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
              color: '#3b82f6',
              border: dark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe'
            }}>LIVE</span>
          </Link>

          {/* Pricing Link */}
          <Link
            to="/pricing"
            className={`pn-nav-btn ${loc.pathname === '/pricing' ? 'active' : ''}`}
            style={{ color: loc.pathname === '/pricing' ? c.active : c.muted }}
          >
            Pricing
          </Link>

          {/* About Link */}
          <Link
            to="/about"
            className={`pn-nav-btn ${loc.pathname === '/about' ? 'active' : ''}`}
            style={{ color: loc.pathname === '/about' ? c.active : c.muted }}
          >
            About
          </Link>
        </div>

        {/* Desktop Right Action Area */}
        <div className="pn-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: c.toggleBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: c.muted,
              fontSize: 15,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.color = c.text; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = c.muted; }}
          >
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* User Sign In Link */}
          <Link
            to="/user/login"
            style={{
              fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
              color: c.text, padding: '7px 13px', borderRadius: 8,
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => e.target.style.background = c.hover}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            Sign In
          </Link>

          {/* WordPress Plugin Download */}
          <a
            href={downloadUrl}
            download
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              background: dark ? 'rgba(2, 132, 199, 0.14)' : 'rgba(2, 132, 199, 0.08)',
              color: '#0284c7',
              border: `1px solid ${dark ? 'rgba(2, 132, 199, 0.35)' : 'rgba(2, 132, 199, 0.2)'}`,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(2, 132, 199, 0.22)'; e.currentTarget.style.borderColor = '#0284c7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(2, 132, 199, 0.14)' : 'rgba(2, 132, 199, 0.08)'; e.currentTarget.style.borderColor = dark ? 'rgba(2, 132, 199, 0.35)' : 'rgba(2, 132, 199, 0.2)'; }}
          >
            <i className="fa-brands fa-wordpress" style={{ fontSize: 13 }}></i>
            <span>WP Plugin</span>
          </a>

          {/* Deploy Free WAF CTA */}
          <Link
            to="/register"
            style={{
              padding: '8px 18px',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              color: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(37, 99, 235, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(37, 99, 235, 0.65)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(37, 99, 235, 0.45)'; }}
          >
            <span>Deploy Free</span>
            <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="pn-hamburger"
          onClick={() => setMobileOpen(m => !m)}
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 4,
            padding: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 200,
          }}
        >
          <span style={{ width: 20, height: 2, background: c.text, borderRadius: 2 }}></span>
          <span style={{ width: 20, height: 2, background: c.text, borderRadius: 2 }}></span>
          <span style={{ width: 20, height: 2, background: c.text, borderRadius: 2 }}></span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          top: 68,
          left: 0,
          right: 0,
          bottom: 0,
          background: dark ? 'rgba(7, 11, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(24px)',
          padding: '24px',
          overflowY: 'auto',
          zIndex: 115,
          borderTop: `1px solid ${c.border}`,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link to="/" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={handleLogoClick}>Home</Link>
            <Link to="/products" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={() => setMobileOpen(false)}>Products &amp; Defense Suite</Link>
            <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `2px solid ${c.border}` }}>
              <Link to="/products/waf" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>Cloud WAF Proxy (0.12ms)</Link>
              <Link to="/products/neural-engine" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>6.5M+ Threat Neural Engine</Link>
              <Link to="/products/ai-gateway" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>AI Gateway &amp; Prompt Shield</Link>
              <Link to="/products/turnstile" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>Turnstile PoW Bot Defense</Link>
              <Link to="/products/ddos" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>Layer 7 Volumetric Scrubber</Link>
              <Link to="/products/wordpress" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>Official WordPress Security Plugin</Link>
              <Link to="/products/rules" style={{ color: c.muted, textDecoration: 'none', fontSize: 13.5 }} onClick={() => setMobileOpen(false)}>Custom Regex Policy Builder</Link>
            </div>
            <Link to="/pricing" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={() => setMobileOpen(false)}>Pricing &amp; Plans ($0 - $35)</Link>
            <Link to="/docs" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={() => setMobileOpen(false)}>Developer Documentation</Link>
            <Link to="/blog" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={() => setMobileOpen(false)}>Threat Intelligence Blog</Link>
            <Link to="/about" style={{ color: c.text, textDecoration: 'none', fontSize: 16, fontWeight: 700 }} onClick={() => setMobileOpen(false)}>About &amp; Architecture</Link>
            <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '8px 0' }} />
            <a href={downloadUrl} download style={{ color: '#0284c7', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-brands fa-wordpress"></i>
              <span>Download WordPress Plugin (.zip)</span>
            </a>
            <Link to="/user/login" style={{ color: c.text, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign In to Dashboard</Link>
            <Link to="/register" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px', borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#ffffff', fontWeight: 700, textDecoration: 'none', marginTop: 10,
              boxShadow: '0 4px 18px rgba(37, 99, 235, 0.45)'
            }}>
              Deploy Free WAF Now
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
