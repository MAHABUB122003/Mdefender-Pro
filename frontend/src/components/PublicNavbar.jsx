import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Menu,
  X,
  ExternalLink,
  LayoutDashboard,
  Zap,
  Lock,
  Cpu,
  Layers,
  Terminal,
  Database,
  Globe,
  Server,
  AlertOctagon,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react';
import api from '../api/api';
import userStore from '../utils/userStore';

// Bulletproof JWT token format & expiration validator
function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Token expired
    }
    return true;
  } catch {
    return false;
  }
}

export default function PublicNavbar() {
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubMenu, setMobileSubMenu] = useState(null); // 'products' | 'solutions' | null
  const [productsOpen, setProductsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navRef = useRef(null);
  const dropdownRef = useRef(null);
  const solutionsDropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const productsTimeoutRef = useRef(null);
  const solutionsTimeoutRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Instant prefetch helper for 0ms sub-resource switching
  const prefetch = (target) => {
    try {
      if (target === 'docs') import('../pages/Docs');
      else if (target === 'pricing') import('../pages/Pricing');
      else if (target === 'solutions') {
        import('../pages/Solutions');
        import('../pages/SolutionDetail');
      }
      else if (target === 'products') import('../pages/ProductDetail');
      else if (target === 'login') import('../pages/UserLogin');
      else if (target === 'register') import('../pages/Register');
      else if (target === 'threat') import('../pages/Blog');
      else if (target === 'dashboard') import('../pages/UserDashboard');
    } catch {}
  };

  // Idle prefetch of primary navbar routes on load so all clicks are instantaneous
  useEffect(() => {
    const idlePrefetch = () => {
      prefetch('docs');
      prefetch('pricing');
      prefetch('solutions');
      prefetch('products');
      prefetch('login');
      prefetch('register');
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(idlePrefetch, { timeout: 1500 });
      } else {
        setTimeout(idlePrefetch, 250);
      }
    }
  }, []);

  // Real-time reactive authentication state synchronization with JWT & session check
  useEffect(() => {
    let isMounted = true;
    const syncAuth = async () => {
      try {
        const token = localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');
        const valid = isTokenValid(token);
        if (!valid) {
          if (token && typeof localStorage !== 'undefined') {
            api.clearTokens();
          }
          if (isMounted) {
            setIsLoggedIn(false);
            setUserName('');
            setUserEmail('');
          }
          return;
        }

        const name = localStorage.getItem('mdefender_user_name') || '';
        const email = localStorage.getItem('mdefender_user_email') || '';
        if (isMounted) {
          setIsLoggedIn(true);
          setUserName(name);
          setUserEmail(email);
        }

        // Verify active session with backend in background
        try {
          const cachedProfile = userStore.get('profile');
          if (!cachedProfile) {
            const data = await api.getMe();
            if (data?.user) {
              if (isMounted) {
                setUserName(data.user.name || data.user.full_name || '');
                setUserEmail(data.user.email || '');
              }
              userStore.set('profile', data.user);
            }
          }
        } catch {
          // If session expired or rejected on server, clear auth state
          if (isMounted) {
            api.clearTokens();
            setIsLoggedIn(false);
            setUserName('');
            setUserEmail('');
          }
        }
      } catch {
        if (isMounted) {
          setIsLoggedIn(false);
          setUserName('');
          setUserEmail('');
        }
      }
    };

    syncAuth();
    window.addEventListener('storage', syncAuth);
    window.addEventListener('mdefender_auth_state_changed', syncAuth);
    window.addEventListener('focus', syncAuth);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('mdefender_auth_state_changed', syncAuth);
      window.removeEventListener('focus', syncAuth);
    };
  }, [loc.pathname]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      api.clearTokens();
    }
    userStore.clear();
    setIsLoggedIn(false);
    setUserName('');
    setUserEmail('');
    setUserDropdownOpen(false);
    window.location.href = '/user/login';
  };

  useEffect(() => {
    const onScroll = () => {
      const isPast = window.scrollY > 10;
      setScrolled((prev) => (prev !== isPast ? isPast : prev));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSubMenu(null);
    setProductsOpen(false);
    setSolutionsOpen(false);
    if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
  }, [loc.pathname]);

  // Auto-close mobile drawer when viewport expands to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
        setMobileSubMenu(null);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Unified click outside handler
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
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
      if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    };
  }, []);

  const handleHomeClick = (e) => {
    setMobileOpen(false);
    setMobileSubMenu(null);
    setProductsOpen(false);
    setSolutionsOpen(false);
    if (loc.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handleLogoClick = handleHomeClick;

  const handleProductsEnter = () => {
    if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    prefetch('products');
    setProductsOpen(true);
    setSolutionsOpen(false);
  };

  const handleProductsLeave = () => {
    if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
    productsTimeoutRef.current = setTimeout(() => {
      setProductsOpen(false);
    }, 180);
  };

  const handleSolutionsEnter = () => {
    if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    prefetch('solutions');
    setSolutionsOpen(true);
    setProductsOpen(false);
  };

  const handleSolutionsLeave = () => {
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    solutionsTimeoutRef.current = setTimeout(() => {
      setSolutionsOpen(false);
    }, 180);
  };

  const productCategories = {
    edge: [
      {
        title: 'Cloud Anycast WAF',
        desc: 'Sub-millisecond L7 DFA edge inspection & proxy',
        to: '/products/waf',
        badge: '<0.12ms',
        icon: Zap,
      },
      {
        title: 'Volumetric DDoS Shield',
        desc: 'Automated Layer 3/4/7 flood scrubbing & BGP mesh',
        to: '/products/ddos',
        badge: 'Unmetered',
        icon: Shield,
      },
      {
        title: 'Zero-Trust Turnstile & Bots',
        desc: 'Invisible PoW scalper, scraper & carding defense',
        to: '/products/turnstile',
        icon: Lock,
      },
      {
        title: 'AI Prompt & LLM Gateway',
        desc: 'OWASP Top 10 for LLMs & prompt injection guard',
        to: '/products/ai-gateway',
        icon: Cpu,
      },
    ],
    fleet: [
      {
        title: 'WordPress Fleet Command',
        desc: 'Centralized multi-site SaaS management for 10 to 100+ sites',
        to: '/products/wordpress',
        badge: 'Fleet SaaS',
        highlight: true,
        icon: Layers,
      },
      {
        title: 'Deep Malware & Integrity Scanner',
        desc: '5.32M+ WordPress core & plugin checksums, AST webshell hunter',
        to: '/products/neural-engine',
        icon: ShieldCheck,
      },
      {
        title: 'RASP Runtime Host Shield',
        desc: 'PHP memory-level monitoring & instant zero-day quarantine',
        to: '/products/wordpress',
        icon: Terminal,
      },
      {
        title: 'Smart Custom Rules Engine',
        desc: 'Author regex & DFA policies with instant fleet sync',
        to: '/products/rules',
        icon: Database,
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
        icon: Globe,
      },
      {
        title: 'High-Velocity E-Commerce',
        desc: 'Shield WooCommerce flash sales from scalper bots with 0.08ms latency',
        to: '/solutions/ecommerce',
        icon: Zap,
      },
      {
        title: 'SaaS Platforms & Cloud APIs',
        desc: 'AST syntactic normalization & BOLA defense for REST/GraphQL',
        to: '/solutions/saas',
        icon: Server,
      },
      {
        title: 'WordPress Sovereign Defense',
        desc: 'Priority 1 in-memory RASP & 5.2M+ official checksum integrity',
        to: '/solutions/wordpress',
        icon: Shield,
      },
    ],
    objective: [
      {
        title: 'Generative AI & LLM Shield',
        desc: 'Semantic prompt injection barrier & model denial-of-wallet guard',
        to: '/solutions/ai',
        badge: 'OWASP LLM',
        icon: Cpu,
      },
      {
        title: 'FinTech & Regulated Workloads',
        desc: 'PCI-DSS 4.0 Sec 6.4, SOC2, HIPAA & sovereign geo-fenced scrubbing',
        to: '/solutions/fintech',
        icon: Lock,
      },
      {
        title: 'Fleet-Wide Safe Updates',
        desc: '1-click bulk updates with automated snapshot & safe rollback',
        to: '/solutions/agencies',
        icon: ShieldCheck,
      },
      {
        title: 'Directory & Ingress Matrix',
        desc: 'Explore all 6 enterprise architecture portals & ingress patterns',
        to: '/solutions',
        icon: Layers,
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
          background: scrolled ? 'rgba(247, 246, 241, 0.98)' : 'rgba(247, 246, 241, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
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
            className="public-navbar-brand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <div
              className="public-navbar-brand-mark"
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
              className="public-navbar-brand-text"
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#10201E',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              MDefender <span style={{ color: '#E8792F', fontWeight: 800 }}>Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="mdf-public-nav-desktop">
            {/* Products Mega-Dropdown */}
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={handleProductsEnter}
              onMouseLeave={handleProductsLeave}
            >
              <button
                type="button"
                id="products-menu-btn"
                onClick={() => {
                  setProductsOpen((prev) => !prev);
                  setSolutionsOpen(false);
                }}
                onFocus={handleProductsEnter}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: (productsOpen || loc.pathname.startsWith('/products')) ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: (productsOpen || loc.pathname.startsWith('/products')) ? '#0F172A' : '#334155',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.16s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!productsOpen && !loc.pathname.startsWith('/products')) {
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>Products</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.4}
                  style={{
                    color: (productsOpen || loc.pathname.startsWith('/products')) ? '#0F172A' : '#64748B',
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
                    if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
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

            {/* 3. Solutions Mega-Dropdown */}
            <div
              ref={solutionsDropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={handleSolutionsEnter}
              onMouseLeave={handleSolutionsLeave}
            >
              <button
                type="button"
                id="solutions-menu-btn"
                onClick={() => {
                  setSolutionsOpen((prev) => !prev);
                  setProductsOpen(false);
                }}
                onFocus={handleSolutionsEnter}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: (solutionsOpen || loc.pathname === '/solutions' || loc.pathname === '/about' || loc.pathname.startsWith('/solutions/')) ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: (solutionsOpen || loc.pathname === '/solutions' || loc.pathname === '/about' || loc.pathname.startsWith('/solutions/')) ? '#0F172A' : '#334155',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.16s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!solutionsOpen && loc.pathname !== '/solutions' && loc.pathname !== '/about' && !loc.pathname.startsWith('/solutions/')) {
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>Solutions</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.4}
                  style={{
                    color: (solutionsOpen || loc.pathname === '/solutions' || loc.pathname === '/about' || loc.pathname.startsWith('/solutions/')) ? '#0F172A' : '#64748B',
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
                    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
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

            {/* 4. Threat Intel Link */}
            <Link
              to="/threat-intelligence"
              onMouseEnter={() => prefetch('threat')}
              onFocus={() => prefetch('threat')}
              style={{
                fontSize: '13.5px',
                fontWeight: 500,
                color: (loc.pathname.startsWith('/threat-intelligence') || loc.pathname.startsWith('/blog')) ? '#0F172A' : '#334155',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: (loc.pathname.startsWith('/threat-intelligence') || loc.pathname.startsWith('/blog')) ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                prefetch('threat');
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
              }}
              onMouseLeave={(e) => {
                if (!loc.pathname.startsWith('/threat-intelligence') && !loc.pathname.startsWith('/blog')) {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Threat Intel
            </Link>

            {/* 5. Pricing Link */}
            <Link
              to="/pricing"
              onMouseEnter={() => prefetch('pricing')}
              onFocus={() => prefetch('pricing')}
              style={{
                fontSize: '13.5px',
                fontWeight: 500,
                color: loc.pathname === '/pricing' ? '#0F172A' : '#334155',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: loc.pathname === '/pricing' ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                prefetch('pricing');
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
              }}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/pricing') {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Pricing
            </Link>

            {/* 6. Documentation Link */}
            <Link
              to="/docs"
              onMouseEnter={() => prefetch('docs')}
              onFocus={() => prefetch('docs')}
              style={{
                fontSize: '13.5px',
                fontWeight: 500,
                color: loc.pathname === '/docs' ? '#0F172A' : '#334155',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: loc.pathname === '/docs' ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                prefetch('docs');
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
              }}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/docs') {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Docs
            </Link>

            {/* 7. About Us Link */}
            <Link
              to="/about"
              style={{
                fontSize: '13.5px',
                fontWeight: 500,
                color: loc.pathname === '/about' ? '#0F172A' : '#334155',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: loc.pathname === '/about' ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
              }}
              onMouseLeave={(e) => {
                if (loc.pathname !== '/about') {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              About
            </Link>
          </nav>

          {/* Desktop Right Action CTA */}
          <div className="mdf-public-cta-desktop">
            {isLoggedIn ? (
              <div
                ref={userMenuRef}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                }}
              >
                <Link
                  to="/user/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 16px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(11, 37, 34, 0.12)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#15413C';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B2522';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                  <ArrowRight size={13} strokeWidth={2.4} />
                </Link>

                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  title={userName ? `Logged in as ${userName}` : 'Account options'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 10px',
                    height: '38px',
                    borderRadius: '8px',
                    background: userDropdownOpen ? 'rgba(11, 37, 34, 0.08)' : 'transparent',
                    border: '1px solid #D9E1DC',
                    color: '#0B2522',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#0B2522',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: userDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>

                {userDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '230px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      padding: '8px',
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 650,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {userName || 'Logged in user'}
                      </div>
                      {userEmail && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {userEmail}
                        </div>
                      )}
                    </div>

                    <Link
                      to="/user/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        color: '#1E293B',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LayoutDashboard size={14} color="#64748B" />
                      <span>Go to Dashboard</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        color: '#DC2626',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/user/login"
                  onMouseEnter={() => prefetch('login')}
                  onFocus={() => prefetch('login')}
                  onTouchStart={() => prefetch('login')}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#334155',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    transition: 'all 0.16s ease',
                  }}
                  onMouseEnter={(e) => {
                    prefetch('login');
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  onMouseEnter={() => prefetch('register')}
                  onFocus={() => prefetch('register')}
                  onTouchStart={() => prefetch('register')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 15px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#0B2522',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(11, 37, 34, 0.12)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    prefetch('register');
                    e.currentTarget.style.background = '#15413C';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B2522';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Start Free Trial</span>
                  <ArrowRight size={13} strokeWidth={2.4} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="mdf-public-mobile-btn">
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

      {/* Mobile Drawer (Cloudflare-style Drilldown in MDefender Pro Theme) */}
      {mobileOpen && (
        <div
          className="public-navbar-drawer"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(247, 246, 241, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 99,
            flexDirection: 'column',
            borderTop: '1px solid #D9E1DC',
            overflow: 'hidden',
          }}
        >
          {/* ================= LEVEL 1: MAIN NAVIGATION ================= */}
          {mobileSubMenu === null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
                padding: '16px 20px 24px',
                overflowY: 'auto',
              }}
            >
              {/* Primary Nav List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* 1. Products (Sub-menu trigger) */}
                <button
                  type="button"
                  onClick={() => setMobileSubMenu('products')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    border: 'none',
                    borderBottom: '1px solid #E2E8E4',
                    background: 'transparent',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span>Products</span>
                  <ChevronRight size={18} color="#8EA29C" strokeWidth={2.4} />
                </button>

                {/* 2. Solutions (Sub-menu trigger) */}
                <button
                  type="button"
                  onClick={() => setMobileSubMenu('solutions')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    border: 'none',
                    borderBottom: '1px solid #E2E8E4',
                    background: 'transparent',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span>Solutions</span>
                  <ChevronRight size={18} color="#8EA29C" strokeWidth={2.4} />
                </button>

                {/* 3. Docs (Direct Link) */}
                <Link
                  to="/docs"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    borderBottom: '1px solid #E2E8E4',
                    textDecoration: 'none',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                  }}
                >
                  <span>Docs</span>
                </Link>

                {/* 4. Pricing (Direct Link) */}
                <Link
                  to="/pricing"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    borderBottom: '1px solid #E2E8E4',
                    textDecoration: 'none',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                  }}
                >
                  <span>Pricing</span>
                </Link>

                {/* 5. Threat Intel (Direct Link) */}
                <Link
                  to="/threat-intelligence"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    borderBottom: '1px solid #E2E8E4',
                    textDecoration: 'none',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                  }}
                >
                  <span>Threat Intel</span>
                </Link>

                {/* 6. About Us (Direct Link) */}
                <Link
                  to="/about"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 4px',
                    textDecoration: 'none',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#10201E',
                  }}
                >
                  <span>About Us</span>
                </Link>
              </div>

              {/* Bottom Sticky Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingTop: '24px',
                  marginTop: 'auto',
                }}
              >
                {isLoggedIn ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #D9E1DC',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#0B2522',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 650,
                            color: '#0F172A',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {userName || 'User'}
                        </div>
                        {userEmail && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {userEmail}
                          </div>
                        )}
                      </div>
                    </div>

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

                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '11px',
                        borderRadius: '10px',
                        border: '1px solid #FCA5A5',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
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
                        fontWeight: 650,
                        color: '#10201E',
                        background: '#ffffff',
                        textDecoration: 'none',
                        boxShadow: '0 1px 3px rgba(11, 37, 34, 0.04)',
                      }}
                    >
                      Login
                    </Link>

                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        padding: '13px',
                        borderRadius: '10px',
                        background: '#E8792F',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 750,
                        color: '#ffffff',
                        textDecoration: 'none',
                        boxShadow: '0 3px 10px rgba(232, 121, 47, 0.28)',
                      }}
                    >
                      Start 14-Day Free Trial
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================= LEVEL 2: PRODUCTS SUB-MENU ================= */}
          {mobileSubMenu === 'products' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                padding: '14px 18px 24px',
              }}
            >
              {/* Sub-Header: Back & Direct Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '14px',
                  marginBottom: '10px',
                  borderBottom: '1px solid #D9E1DC',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMobileSubMenu(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#E8792F',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.4} />
                  <span>Back</span>
                </button>

                <Link
                  to="/products"
                  onClick={() => {
                    setMobileOpen(false);
                    setMobileSubMenu(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#E8792F',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>All products</span>
                  <ExternalLink size={12} strokeWidth={2.4} />
                </Link>
              </div>

              {/* Minimalist Professional Product List */}
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#6A7D78', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', paddingLeft: '4px' }}>
                Products &amp; Security Engines
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  ...productCategories.edge,
                  {
                    title: 'Deep Malware & Integrity Scanner',
                    to: '/products/neural-engine',
                    icon: ShieldCheck,
                  },
                  {
                    title: 'RASP Runtime Host Shield',
                    to: '/products/wordpress',
                    icon: Terminal,
                  },
                  {
                    title: 'Smart Custom Rules Engine',
                    to: '/products/rules',
                    icon: Database,
                  },
                ].map((item, idx) => {
                  const Icon = item.icon || Shield;
                  return (
                    <Link
                      key={idx}
                      to={item.to}
                      onClick={() => {
                        setMobileOpen(false);
                        setMobileSubMenu(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '13px 4px',
                        textDecoration: 'none',
                        borderBottom: '1px solid #EEF2F0',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#F2F6F3',
                            border: '1px solid #D9E1DC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#28745D',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 650, color: '#10201E' }}>
                          {item.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.badge && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#E8EEE8', color: '#15803D' }}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={15} color="#8EA29C" strokeWidth={2.2} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= LEVEL 3: SOLUTIONS SUB-MENU ================= */}
          {mobileSubMenu === 'solutions' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                padding: '14px 18px 24px',
              }}
            >
              {/* Sub-Header: Back & Direct Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '14px',
                  marginBottom: '10px',
                  borderBottom: '1px solid #D9E1DC',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMobileSubMenu(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#E8792F',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.4} />
                  <span>Back</span>
                </button>

                <Link
                  to="/solutions"
                  onClick={() => {
                    setMobileOpen(false);
                    setMobileSubMenu(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#E8792F',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>All solutions</span>
                  <ExternalLink size={12} strokeWidth={2.4} />
                </Link>
              </div>

              {/* Minimalist Professional Solution List */}
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#6A7D78', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', paddingLeft: '4px' }}>
                Solutions &amp; Use Cases
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  {
                    title: 'WordPress Fleet SaaS',
                    to: '/products/wordpress',
                    badge: 'Fleet SaaS',
                    icon: Layers,
                  },
                  ...solutionCategories.industry,
                  ...solutionCategories.objective,
                ].map((item, idx) => {
                  const Icon = item.icon || Globe;
                  return (
                    <Link
                      key={idx}
                      to={item.to}
                      onClick={() => {
                        setMobileOpen(false);
                        setMobileSubMenu(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '13px 4px',
                        textDecoration: 'none',
                        borderBottom: '1px solid #EEF2F0',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#F2F6F3',
                            border: '1px solid #D9E1DC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#28745D',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 650, color: '#10201E' }}>
                          {item.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.badge && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#E8EEE8', color: '#15803D' }}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={15} color="#8EA29C" strokeWidth={2.2} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .public-navbar-header {
          height: 72px;
        }
        .public-navbar-drawer {
          top: 72px;
          display: none !important;
        }
        .mdf-public-nav-desktop {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mdf-public-cta-desktop {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mdf-public-mobile-btn {
          display: none;
        }
        .public-navbar-brand {
          min-width: 0;
          flex-shrink: 1;
        }
        .public-navbar-brand-mark {
          flex-shrink: 0;
        }
        .public-navbar-brand-text {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (min-width: 769px) {
          .public-navbar-drawer {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .public-navbar-header {
            height: 68px;
          }
          .public-navbar-drawer {
            top: 68px;
            display: flex !important;
          }
          .mdf-public-nav-desktop {
            display: none !important;
          }
          .mdf-public-cta-desktop {
            display: none !important;
          }
          .mdf-public-mobile-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .public-navbar-brand {
            max-width: calc(100% - 52px);
          }
          .public-navbar-brand-text {
            font-size: 15px !important;
          }
        }
        @media (max-width: 360px) {
          .public-navbar-brand-text {
            font-size: 13.5px !important;
            letter-spacing: -0.01em !important;
          }
          .public-navbar-brand-mark {
            width: 28px !important;
            height: 28px !important;
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
