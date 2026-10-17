import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Sliders,
  Bell,
  Globe,
  Wrench,
  Link as LinkIcon,
  Ban,
  Tag,
  Settings,
  Menu,
  Clock,
  ShieldCheck,
  Crown,
  ChevronDown,
  User,
  LogOut,
  BellOff
} from 'lucide-react';

const pageConfig = {
  '/user/dashboard': { name: 'Dashboard', icon: LayoutDashboard },
  '/user/logs': { name: 'Attack Logs', icon: FileText },
  '/user/rules': { name: 'Rules Management', icon: Sliders },
  '/user/notices': { name: 'Notice Board', icon: Bell },
  '/user/websites': { name: 'My Websites', icon: Globe },
  '/user/domains': { name: 'Custom Domains', icon: Globe },
  '/user/tools': { name: 'Security Tools', icon: Wrench },
  '/user/connect': { name: 'Connect Website', icon: LinkIcon },
  '/user/blacklist': { name: 'IP Blacklist', icon: Ban },
  '/user/pricing': { name: 'Pricing & Plans', icon: Tag },
  '/user/settings': { name: 'Settings', icon: Settings },
};

export default function UserHeader({ onToggleSidebar, onLogout }) {
  const [time, setTime] = useState({ date: '', time: '' });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const storedName = localStorage.getItem('mdefender_user_name') || 'User';
  const userName = storedName;
  const location = useLocation();

  const currentConfig = pageConfig[location.pathname] || { name: 'Dashboard', icon: LayoutDashboard };
  const PageIcon = currentConfig.icon;
  const pageName = currentConfig.name;

  const userPlan = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free').toLowerCase();
  const isPaid = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);
  const planLabel = {
    free: 'Free Plan',
    go: 'Developer Go',
    pro: 'Enterprise Pro',
    enterprise: 'Dedicated Enterprise',
    ultra: 'Ultra Enterprise',
    premium: 'Enterprise Pro'
  }[userPlan] || (isPaid ? 'Enterprise Pro' : 'Free Plan');

  useEffect(() => {
    window.__doLogout = onLogout;
  }, [onLogout]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      setTime({
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => { clearInterval(id); delete window.__doLogout; };
  }, []);

  useEffect(() => {
    const close = () => { setShowDropdown(false); setShowNotifications(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" id="menuToggle" onClick={onToggleSidebar} aria-label="Toggle Navigation">
          <Menu size={18} />
        </button>
        <div className="header-title-group">
          <div className="header-page-icon" style={{ background: '#FEF3EB', color: '#E8792F', border: '1px solid #FCD8BF' }}>
            <PageIcon size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1>{pageName}</h1>
            <div className="breadcrumb">
              <Link to="/" style={{ color: '#87948D', textDecoration: 'none' }} title="Visit Public Homepage">MDefender</Link> / <span>{pageName}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="header-right">
        <span
          className="header-threat-badge"
          style={isPaid ? {
            background: '#F0FDF4',
            borderColor: '#BBF7D0',
            color: '#15803D'
          } : {
            background: '#FEF3EB',
            borderColor: '#FCD8BF',
            color: '#D97735'
          }}
        >
          {isPaid ? <ShieldCheck size={14} /> : <Crown size={14} />}
          <span>{planLabel}</span>
        </span>

        <div className="header-clock">
          <Clock size={14} color="#87948D" />
          <span className="clock-time">{time.time}</span>
          <span className="clock-date">{time.date}</span>
        </div>

        <div className="header-actions">
          <div style={{ position: 'relative' }}>
            <button
              className="header-action-btn"
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowDropdown(false); }}
              aria-label="View notifications"
            >
              <Bell size={16} />
              <span className="notif-dot"></span>
            </button>
            <div className={`notification-panel ${showNotifications ? 'show' : ''}`}>
              <div className="panel-header">
                <span>Security Notifications</span>
                <span className="panel-count">0 new</span>
              </div>
              <div style={{ padding: '24px', textAlign: 'center', color: '#87948D', fontSize: '13px' }}>
                <BellOff size={22} style={{ display: 'block', margin: '0 auto 8px', color: '#CBD8CF' }} />
                <span>All fleet events operational</span>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div className="user-pill" onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); setShowNotifications(false); }}>
              <div className="avatar" style={{ background: '#10201E', color: '#FFFFFF', fontWeight: '800' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{userName}</span>
              <ChevronDown size={14} color="#87948D" />
            </div>

            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} />
                <span>Website Homepage</span>
              </Link>
              <Link to="/user/settings" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} />
                <span>Account Profile</span>
              </Link>
              <Link to="/user/settings" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={14} />
                <span>Security Settings</span>
              </Link>
              <div className="divider"></div>
              <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
