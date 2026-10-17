import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Shield, ChevronDown, ArrowRight, Menu, X, ExternalLink, LayoutDashboard } from 'lucide-react';

export default function PublicNavbar() {
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');
      const name = localStorage.getItem('mdefender_user_name') || '';
      setIsLoggedIn(!!token);
      setUserName(name);
    } catch {
      setIsLoggedIn(false);
    }
  }, [loc.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProductsOpen(false);
  }, [loc.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoClick = (e) => {
    if (loc.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  const productItems = [
    {
      title: 'Cloud WAF',
      desc: 'Sub-millisecond L7 edge inspection & proxy',
      to: '/products/waf',
    },
    {
      title: 'WordPress Security',
      desc: 'Live plugin telemetry, scanner & auto-quarantine',
      to: '/products/wordpress',
    },
    {
      title: 'Threat Intelligence',
      desc: 'Global attack telemetry & proactive IOC feeds',
      to: '/threat-intelligence',
    },
  ];

  return (
    <>
      <header
        ref={navRef}
        className="public-navbar-header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(247, 246, 241, 0.96)' : 'rgba(247, 246, 241, 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #D9E1DC',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            height: '100%',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={handleLogoClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(11, 37, 34, 0.08)',
                flexShrink: 0,
              }}
            >
              <img
                src="/assets/mdefender_logo.png"
                alt="MDefender Pro Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#10201E',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
            }}
            className="hidden md:flex"
          >
            {/* Products Dropdown */}
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => {
                if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                setProductsOpen(true);
              }}
              onMouseLeave={() => {
                window.navDropdownTimeout = setTimeout(() => {
                  setProductsOpen(false);
                }, 200);
              }}
            >
              <button
                type="button"
                id="products-menu-btn"
                onClick={() => setProductsOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: productsOpen ? '#E8792F' : '#10201E',
                  cursor: 'pointer',
                  padding: '6px 2px',
                  transition: 'color 0.18s ease',
                }}
              >
                <span>Products</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.4}
                  style={{
                    color: productsOpen ? '#E8792F' : '#4A5D5A',
                    transform: productsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease, color 0.18s ease',
                  }}
                />
              </button>

              {/* Clean White Dropdown Popover matching Image 2 */}
              {productsOpen && (
                <div
                  id="products-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    minWidth: '220px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #D9E1DC',
                    boxShadow: '0 20px 45px -10px rgba(11, 37, 34, 0.12), 0 0 0 1px rgba(11, 37, 34, 0.04)',
                    padding: '8px',
                    zIndex: 200,
                    animation: 'dropdownFadeIn 0.15s ease-out',
                  }}
                  onMouseEnter={() => {
                    if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                    setProductsOpen(true);
                  }}
                >
                  {productItems.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.to}
                      onClick={() => setProductsOpen(false)}
                      style={{
                        display: 'block',
                        padding: '9px 14px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: '#10201E',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E8EEE8';
                        e.currentTarget.style.color = '#E8792F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#10201E';
                      }}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/solutions"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: (loc.pathname === '/solutions' || loc.pathname === '/about') ? '#E8792F' : '#10201E',
                textDecoration: 'none',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/solutions' && loc.pathname !== '/about') e.currentTarget.style.color = '#10201E';
              }}
            >
              Solutions
            </Link>

            <Link
              to="/docs"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: loc.pathname === '/docs' ? '#E8792F' : '#10201E',
                textDecoration: 'none',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/docs') e.currentTarget.style.color = '#10201E';
              }}
            >
              Documentation
            </Link>

            <Link
              to="/pricing"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: loc.pathname === '/pricing' ? '#E8792F' : '#10201E',
                textDecoration: 'none',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/pricing') e.currentTarget.style.color = '#10201E';
              }}
            >
              Pricing
            </Link>

            <Link
              to="/threat-intelligence"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: (loc.pathname.startsWith('/threat-intelligence') || loc.pathname.startsWith('/blog')) ? '#E8792F' : '#10201E',
                textDecoration: 'none',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
              onMouseLeave={(e) => {
                if (!loc.pathname.startsWith('/threat-intelligence') && !loc.pathname.startsWith('/blog')) {
                  e.currentTarget.style.color = '#10201E';
                }
              }}
            >
              Threat Intelligence
            </Link>

            {isLoggedIn && (
              <Link
                to="/user/dashboard"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: loc.pathname.startsWith('/user') ? '#E8792F' : '#10201E',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(232, 121, 47, 0.08)',
                  border: '1px solid rgba(232, 121, 47, 0.25)',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E8792F';
                  e.currentTarget.style.borderColor = '#E8792F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = loc.pathname.startsWith('/user') ? '#E8792F' : '#10201E';
                  e.currentTarget.style.borderColor = 'rgba(232, 121, 47, 0.25)';
                }}
              >
                <LayoutDashboard size={14} color="#E8792F" />
                <span>Dashboard</span>
              </Link>
            )}
          </nav>

          {/* Desktop Right Action CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
            className="hidden md:flex"
          >
            {isLoggedIn ? (
              <Link
                to="/user/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 18px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#0B2522',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E8792F';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0B2522';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <LayoutDashboard size={14} />
                <span>{userName ? `Dashboard (${userName.split(' ')[0]})` : 'Dashboard'}</span>
                <ArrowRight size={13} strokeWidth={2.4} />
              </Link>
            ) : (
              <>
                <Link
                  to="/user/login"
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#10201E',
                    textDecoration: 'none',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    transition: 'color 0.18s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E8792F')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#10201E')}
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 16px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#133935';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B2522';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Get started free</span>
                  <ArrowRight size={13} strokeWidth={2.4} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                color: '#0f172a',
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="public-navbar-drawer md:hidden"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(247, 246, 241, 0.98)',
            backdropFilter: 'blur(16px)',
            padding: '24px',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            overflowY: 'auto',
            borderTop: '1px solid #D9E1DC',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8792F', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Products
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
            {productItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#10201E',
                  textDecoration: 'none',
                }}
              >
                {item.title}
              </Link>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #D9E1DC', margin: '6px 0' }} />

          <Link
            to="/solutions"
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: (loc.pathname === '/solutions' || loc.pathname === '/about') ? '#E8792F' : '#10201E',
              textDecoration: 'none',
            }}
          >
            Solutions
          </Link>
          <Link
            to="/docs"
            onClick={() => setMobileOpen(false)}
            style={{ fontSize: '15px', fontWeight: 600, color: '#10201E', textDecoration: 'none' }}
          >
            Documentation
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileOpen(false)}
            style={{ fontSize: '15px', fontWeight: 600, color: '#10201E', textDecoration: 'none' }}
          >
            Pricing
          </Link>
          <Link
            to="/threat-intelligence"
            onClick={() => setMobileOpen(false)}
            style={{ fontSize: '15px', fontWeight: 600, color: (loc.pathname.startsWith('/threat-intelligence') || loc.pathname.startsWith('/blog')) ? '#E8792F' : '#10201E', textDecoration: 'none' }}
          >
            Threat Intelligence
          </Link>

          <hr style={{ border: 'none', borderTop: '1px solid #D9E1DC', margin: '8px 0' }} />

          {isLoggedIn ? (
            <Link
              to="/user/dashboard"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px',
                borderRadius: '10px',
                background: '#0B2522',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',
              }}
            >
              <LayoutDashboard size={16} />
              <span>Go to Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                to="/user/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #D9E1DC',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#10201E',
                  background: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0B2522',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(11, 37, 34, 0.15)',
                }}
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .public-navbar-header {
          height: 76px;
        }
        .public-navbar-drawer {
          top: 76px;
        }
        @media (max-width: 768px) {
          .public-navbar-header {
            height: 68px;
          }
          .public-navbar-drawer {
            top: 68px;
          }
        }
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
