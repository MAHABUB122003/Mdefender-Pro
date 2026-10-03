import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaTachometerAlt, FaFolderOpen, FaPlusCircle, FaSignOutAlt, 
    FaUser, FaHome, FaRocket, FaUserTie, FaGraduationCap, FaCogs, 
    FaEnvelope, FaInbox, FaCog, FaBars, FaTimes 
} from 'react-icons/fa';
import { getCurrentUser, logoutUser } from '../../utils/adminAuth';
import { api } from '../../utils/api';

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/admin/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        // Fetch unread messages count
        const checkUnread = async () => {
            try {
                const res = await api('/messages', { auth: true });
                if (res && Array.isArray(res.messages)) {
                    const count = res.messages.filter(m => !m.read).length;
                    setUnreadMessages(count);
                }
            } catch {
                // Ignore silent background poll failure
            }
        };
        checkUnread();
        const interval = setInterval(checkUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        logoutUser();
        navigate('/admin/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <FaTachometerAlt /> },
        { name: 'Hero', path: '/admin/hero', icon: <FaRocket /> },
        { name: 'About', path: '/admin/about', icon: <FaUserTie /> },
        { name: 'Education', path: '/admin/education', icon: <FaGraduationCap /> },
        { name: 'Skills', path: '/admin/skills', icon: <FaCogs /> },
        { name: 'Projects', path: '/admin/projects', icon: <FaFolderOpen /> },
        { name: 'Add Project', path: '/admin/projects/new', icon: <FaPlusCircle /> },
        { name: 'Contact', path: '/admin/contact', icon: <FaEnvelope /> },
        { 
            name: 'Messages', 
            path: '/admin/messages', 
            icon: <FaInbox />,
            badge: unreadMessages > 0 ? unreadMessages : null 
        },
        { name: 'General', path: '/admin/general', icon: <FaCog /> },
    ];

    if (!user) return null;

    const isPathActive = (itemPath) => {
        if (location.pathname === itemPath) return true;
        if (itemPath === '/admin/projects' && location.pathname.startsWith('/admin/projects/edit')) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans">
            {/* Ambient Background Flare */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/[0.03] rounded-full blur-[140px]" />
                <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[160px]" />
            </div>

            {/* Top Navbar */}
            <nav className="bg-[#0b1220]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                        </button>

                        <Link to="/admin/dashboard" className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-900/30">
                                <span className="text-white font-black text-base">M</span>
                            </div>
                            <div>
                                <span className="text-white font-bold text-sm leading-tight block">MD Mahabubur</span>
                                <span className="text-[10px] font-mono text-slate-400 leading-none block">Admin Command Center</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <Link
                            to="/"
                            target="_blank"
                            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <FaHome /> <span className="hidden sm:inline">Live Site</span>
                        </Link>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-white text-xs font-medium hidden sm:inline">{user.name || 'Admin'}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <FaSignOutAlt /> <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Desktop & Mobile Sidebar */}
                    <aside className={`md:w-60 flex-shrink-0 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
                        <div className="bg-[#0b1220]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 sticky top-20 shadow-xl">
                            <div className="space-y-1">
                                {navItems.map((item) => {
                                    const active = isPathActive(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                                                active
                                                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow-lg shadow-rose-900/40'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-base">{item.icon}</span>
                                                <span>{item.name}</span>
                                            </div>
                                            {item.badge && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    active ? 'bg-white text-rose-600' : 'bg-rose-500 text-white animate-pulse'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 min-w-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;
