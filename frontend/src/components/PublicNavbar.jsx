import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
];

export default function PublicNavbar() {
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  const c = {
    bg: dark ? 'rgba(8,8,14,0.88)' : 'rgba(255,255,255,0.92)',
    border: dark
      ? (scrolled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)')
      : (scrolled ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)'),
    shadow: scrolled
      ? (dark ? '0 1px 20px rgba(0,0,0,0.4)' : '0 1px 20px rgba(0,0,0,0.06)')
      : 'none',
    text: dark ? '#f1f5f9' : '#0f172a',
    muted: dark ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.8)',
    hover: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    active: '#6366f1',
    toggleBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    toggleHover: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    mobileBg: dark ? 'rgba(8,8,14,0.98)' : 'rgba(255,255,255,0.98)',
    mobileBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };

  return (
    <>
      <style>{`
        .pn-link { position: relative; padding: 6px 0; }
        .pn-link::after {
          content: ''; position: absolute; bottom: 0; left: 50%; width: 0; height: 2px;
          background: ${c.active}; border-radius: 1px; transition: all 0.25s ease; transform: translateX(-50%);
        }
        .pn-link:hover::after, .pn-link-active::after { width: 100%; }
        .pn-btn { transition: all 0.2s ease; }
        .pn-btn:hover { transform: translateY(-1px); }
        .pn-cta { transition: all 0.25s ease; position: relative; overflow: hidden; }
        .pn-cta::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .pn-cta:hover::after { transform: translateX(100%); }
        .pn-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
        .pn-toggle { transition: all 0.25s ease; }
        .pn-toggle:hover { background: ${c.toggleHover} !important; transform: scale(1.05); }
        .pn-hamburger span { display: block; width: 18px; height: 2px; background: ${c.text}; border-radius: 1px; transition: all 0.3s ease; }
        .pn-hamburger span:nth-child(1) { transform: ${mobileOpen ? 'translateY(5px) rotate(45deg)' : 'none'}; }
        .pn-hamburger span:nth-child(2) { opacity: ${mobileOpen ? 0 : 1}; }
        .pn-hamburger span:nth-child(3) { transform: ${mobileOpen ? 'translateY(-5px) rotate(-45deg)' : 'none'}; }
        .pn-mobile-link {
          display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px;
          font-size: 15px; font-weight: 500; color: ${c.text}; text-decoration: none;
          transition: background 0.2s; background: transparent;
        }
        .pn-mobile-link:hover { background: ${c.hover}; }
        .pn-mobile-link-active { background: ${c.hover}; color: ${c.active}; font-weight: 600; }
        @keyframes pn-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 769px) { .pn-mobile-menu { display: none !important; } .pn-hamburger { display: none !important; } }
        @media (max-width: 768px) { .pn-desktop { display: none !important; } }
      `}</style>

      {/* Main Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: c.bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${c.border}`,
        boxShadow: c.shadow,
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: c.text, letterSpacing: '-0.4px' }}>
            MDefender <span style={{ fontWeight: 500, color: c.muted, fontSize: 14 }}>Pro</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="pn-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className={`pn-link ${loc.pathname === l.to ? 'pn-link-active' : ''}`} style={{
              fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
              color: loc.pathname === l.to ? c.active : c.muted,
              padding: '8px 14px', borderRadius: 8, transition: 'color 0.2s, background 0.2s',
            }}>{l.label}</Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="pn-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggle} className="pn-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
            background: c.toggleBg, border: `1px solid ${c.border}`, borderRadius: 8,
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: c.muted, fontSize: 15,
          }}>
            {dark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <Link to="/user/login" style={{
            fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
            color: c.muted, padding: '8px 14px', borderRadius: 8,
            transition: 'color 0.2s, background 0.2s',
          }} onMouseEnter={e => e.target.style.background = c.hover} onMouseLeave={e => e.target.style.background = 'transparent'}>
            Login
          </Link>

          <Link to="/register" className="pn-cta" style={{
            padding: '8px 20px', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(99,102,241,0.25)',
          }}>Get Started</Link>
        </div>

        {/* Hamburger */}
        <button className="pn-hamburger" onClick={() => setMobileOpen(m => !m)} style={{
          display: 'none', flexDirection: 'column', gap: 4, padding: 8,
          background: 'none', border: 'none', cursor: 'pointer', zIndex: 200,
        }}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 98,
          background: dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(4px)',
        }} />
      )}

      {/* Mobile menu */}
      <div className="pn-mobile-menu" style={{
        position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
        background: c.mobileBg, backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${c.mobileBorder}`,
        padding: mobileOpen ? '16px 20px' : '0 20px',
        maxHeight: mobileOpen ? 400 : 0, overflow: 'hidden',
        transition: 'all 0.3s ease',
        boxShadow: mobileOpen ? (dark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.08)') : 'none',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className={`pn-mobile-link ${loc.pathname === l.to ? 'pn-mobile-link-active' : ''}`}>
              {l.label}
            </Link>
          ))}
          <div style={{ height: 1, background: c.mobileBorder, margin: '8px 0' }} />
          <Link to="/user/login" className="pn-mobile-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Login
          </Link>
          <Link to="/register" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', textDecoration: 'none', marginTop: 4,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Get Started
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', marginTop: 4 }}>
            <span style={{ fontSize: 12, color: c.muted }}>Theme</span>
            <button onClick={toggle} style={{
              background: c.toggleBg, border: `1px solid ${c.border}`, borderRadius: 8,
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: c.muted, fontSize: 15,
            }}>
              {dark ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <span style={{ fontSize: 12, color: c.muted }}>{dark ? 'Light' : 'Dark'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
