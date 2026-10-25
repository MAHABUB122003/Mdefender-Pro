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

  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const solutionsDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductsOpen(false);
      }
      if (solutionsDropdownRef.current && !solutionsDropdownRef.current.contains(e.target)) {
        setSolutionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const productCategories = {
    edge: [
      {
        title: 'Cloud Anycast WAF',
        desc: 'Sub-millisecond L7 DFA edge inspection & proxy',
        to: '/products/waf',
        badge: '<0.12ms',
      },
      {
        title: 'Volumetric DDoS Shield',
        desc: 'Automated Layer 3/4/7 flood scrubbing & BGP mesh',
        to: '/products/ddos',
        badge: 'Unmetered',
      },
      {
        title: 'Zero-Trust Turnstile & Bots',
        desc: 'Invisible PoW scalper, scraper & carding defense',
        to: '/products/turnstile',
      },
      {
        title: 'AI Prompt & LLM Gateway',
        desc: 'OWASP Top 10 for LLMs & prompt injection guard',
        to: '/products/ai-gateway',
      },
    ],
    fleet: [
      {
        title: 'WordPress Fleet Command',
        desc: 'Centralized multi-site SaaS management for 10 to 100+ sites',
        to: '/products/wordpress',
        badge: 'Fleet SaaS',
        highlight: true,
      },
      {
        title: 'Deep Malware & Integrity Scanner',
        desc: '5.2M+ WordPress core checksums, YARA & webshell hunter',
        to: '/products/neural-engine',
      },
      {
        title: 'RASP Runtime Host Shield',
        desc: 'PHP memory-level monitoring & instant zero-day quarantine',
        to: '/products/wordpress',
      },
      {
        title: 'Smart Custom Rules Engine',
        desc: 'Author regex & DFA policies with instant fleet sync',
        to: '/products/rules',
      },
    ],
  };

  const solutionCategories = {
    industry: [
      {
        title: 'Digital Agencies & MSPs',
        desc: 'Manage 10 to 100+ client WordPress sites from one cloud console',
        to: '/solutions/agencies',
        badge: 'Multi-Site Fleet',
      },
      {
        title: 'High-Velocity E-Commerce',
        desc: 'Shield WooCommerce flash sales from scalper bots with 0.08ms latency',
        to: '/solutions/ecommerce',
      },
      {
        title: 'SaaS Platforms & Cloud APIs',
        desc: 'AST syntactic normalization & BOLA defense for REST/GraphQL',
        to: '/solutions/saas',
      },
      {
        title: 'WordPress Sovereign Defense',
        desc: 'Priority 1 in-memory RASP & 5.2M+ official checksum integrity',
        to: '/solutions/wordpress',
      },
    ],
    objective: [
      {
        title: 'Generative AI & LLM Shield',
        desc: 'Semantic prompt injection barrier & model denial-of-wallet guard',
        to: '/solutions/ai',
        badge: 'OWASP LLM',
      },
      {
        title: 'FinTech & Regulated Workloads',
        desc: 'PCI-DSS 4.0 Sec 6.4, SOC2, HIPAA & sovereign geo-fenced scrubbing',
        to: '/solutions/fintech',
      },
      {
        title: 'Fleet-Wide Safe Updates',
        desc: '1-click bulk updates with automated snapshot & safe rollback',
        to: '/solutions/agencies',
      },
      {
        title: 'Directory & Ingress Matrix',
        desc: 'Explore all 6 enterprise architecture portals & ingress patterns',
        to: '/solutions',
      },
    ],
  };

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
          background: scrolled ? 'rgba(247, 246, 241, 0.98)' : 'rgba(247, 246, 241, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #D9E1DC',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            height: '100%',
            padding: '0 28px',
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
              gap: '24px',
            }}
            className="hidden md:flex"
          >
            {/* Products Mega-Dropdown */}
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => {
                if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                setProductsOpen(true);
                setSolutionsOpen(false);
              }}
              onMouseLeave={() => {
                window.navDropdownTimeout = setTimeout(() => {
                  setProductsOpen(false);
                }, 220);
              }}
            >
              <button
                type="button"
                id="products-menu-btn"
                onClick={() => {
                  setProductsOpen((prev) => !prev);
                  setSolutionsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
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

              {/* Cloudflare-Style Mega Dropdown Popover */}
              {productsOpen && (
                <div
                  id="products-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: '-120px',
                    width: '640px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #D9E1DC',
                    boxShadow: '0 24px 56px -12px rgba(11, 37, 34, 0.16), 0 0 0 1px rgba(11, 37, 34, 0.05)',
                    padding: '20px 24px',
                    zIndex: 200,
                    animation: 'dropdownFadeIn 0.18s ease-out',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                  }}
                  onMouseEnter={() => {
                    if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                    setProductsOpen(true);
                  }}
                >
                  {/* Column 1: Edge Cloud Security */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6A7D78', marginBottom: '12px' }}>
                      Edge Cloud Security
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productCategories.edge.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.to}
                          onClick={() => setProductsOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F2F6F3';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#10201E', fontSize: '13px', fontWeight: 650 }}>{item.title}</span>
                            {item.badge && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#E8EEE8', color: '#15803D' }}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#6A7D78', fontSize: '11.5px', lineHeight: 1.4 }}>{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: WordPress Fleet SaaS */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6A7D78', marginBottom: '12px' }}>
                      WordPress Fleet Command
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productCategories.fleet.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.to}
                          onClick={() => setProductsOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            background: item.highlight ? 'rgba(232, 121, 47, 0.05)' : 'transparent',
                            border: item.highlight ? '1px solid rgba(232, 121, 47, 0.2)' : '1px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = item.highlight ? 'rgba(232, 121, 47, 0.1)' : '#F2F6F3';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = item.highlight ? 'rgba(232, 121, 47, 0.05)' : 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#10201E', fontSize: '13px', fontWeight: 650 }}>{item.title}</span>
                            {item.badge && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#E8792F', color: '#ffffff' }}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#6A7D78', fontSize: '11.5px', lineHeight: 1.4 }}>{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Mega-Dropdown */}
            <div
              ref={solutionsDropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => {
                if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                setSolutionsOpen(true);
                setProductsOpen(false);
              }}
              onMouseLeave={() => {
                window.navDropdownTimeout = setTimeout(() => {
                  setSolutionsOpen(false);
                }, 220);
              }}
            >
              <button
                type="button"
                id="solutions-menu-btn"
                onClick={() => {
                  setSolutionsOpen((prev) => !prev);
                  setProductsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: solutionsOpen ? '#E8792F' : ((loc.pathname === '/solutions' || loc.pathname === '/about') ? '#E8792F' : '#10201E'),
                  cursor: 'pointer',
                  padding: '6px 2px',
                  transition: 'color 0.18s ease',
                }}
              >
                <span>Solutions</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.4}
                  style={{
                    color: solutionsOpen ? '#E8792F' : '#4A5D5A',
                    transform: solutionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease, color 0.18s ease',
                  }}
                />
              </button>

              {/* Solutions Mega-Dropdown Popover */}
              {solutionsOpen && (
                <div
                  id="solutions-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: '-160px',
                    width: '640px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #D9E1DC',
                    boxShadow: '0 24px 56px -12px rgba(11, 37, 34, 0.16), 0 0 0 1px rgba(11, 37, 34, 0.05)',
                    padding: '20px 24px',
                    zIndex: 200,
                    animation: 'dropdownFadeIn 0.18s ease-out',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                  }}
                  onMouseEnter={() => {
                    if (window.navDropdownTimeout) clearTimeout(window.navDropdownTimeout);
                    setSolutionsOpen(true);
                  }}
                >
                  {/* Column 1: By Industry & Scale */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6A7D78', marginBottom: '12px' }}>
                      By Industry &amp; Scale
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {solutionCategories.industry.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.to}
                          onClick={() => setSolutionsOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F2F6F3';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#10201E', fontSize: '13px', fontWeight: 650 }}>{item.title}</span>
                            {item.badge && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#E8EEE8', color: '#15803D' }}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#6A7D78', fontSize: '11.5px', lineHeight: 1.4 }}>{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: By Security Objective */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6A7D78', marginBottom: '12px' }}>
                      By Security Objective
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {solutionCategories.objective.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.to}
                          onClick={() => setSolutionsOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F2F6F3';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#10201E', fontSize: '13px', fontWeight: 650 }}>{item.title}</span>
                          </div>
                          <div style={{ color: '#6A7D78', fontSize: '11.5px', lineHeight: 1.4 }}>{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/docs"
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
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
                fontSize: '13.5px',
                fontWeight: 600,
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
                fontSize: '13.5px',
                fontWeight: 600,
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
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#E8792F', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Products
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6A7D78', textTransform: 'uppercase' }}>Edge Cloud Defense</div>
            {productCategories.edge.map((item, idx) => (
              <Link
                key={idx}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#10201E',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{item.title}</span>
                {item.badge && <span style={{ fontSize: '10px', color: '#15803D', fontWeight: 700 }}>{item.badge}</span>}
              </Link>
            ))}

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6A7D78', textTransform: 'uppercase', marginTop: '6px' }}>WordPress Fleet SaaS</div>
            {productCategories.fleet.map((item, idx) => (
              <Link
                key={idx}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: item.highlight ? '#E8792F' : '#10201E',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{item.title}</span>
                {item.badge && <span style={{ fontSize: '10px', background: '#E8792F', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>{item.badge}</span>}
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
            Solutions &amp; Use Cases
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
