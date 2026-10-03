import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaGithub,
    FaLinkedinIn,
    FaWhatsapp,
    FaFacebookF,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaArrowUp,
    FaCode,
    FaShieldAlt,
    FaServer,
    FaBrain,
    FaHeart,
    FaCheck,
    FaCopy
} from 'react-icons/fa';

function Footer({ darkMode = true }) {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const scrollToSection = (href) => {
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleCopyEmail = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText("rahmanmdmahabubur666@gmail.com");
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const quickLinks = [
        { name: 'Home', href: '#home' },
        { name: 'About', href: '#about' },
        { name: 'Education', href: '#education' },
        { name: 'Skills', href: '#skills' },
        { name: 'Projects', href: '#projects' },
        { name: 'Contact', href: '#contact' },
    ];

    const coreServices = [
        { name: 'Full-Stack Architecture', icon: FaCode, desc: 'MERN & FastAPI scalable web platforms' },
        { name: 'Security & Pentesting', icon: FaShieldAlt, desc: 'Vulnerability audits & threat mitigation' },
        { name: 'Applied Machine Learning', icon: FaBrain, desc: 'Predictive models & intelligent systems' },
        { name: 'Cloud & API Infrastructure', icon: FaServer, desc: 'Robust RESTful microservices & pipelines' },
    ];

    const socialLinks = [
        { icon: FaGithub, url: "https://github.com/MAHABUB122003", label: "GitHub" },
        { icon: FaLinkedinIn, url: "https://linkedin.com/in/md-mahabubur-rahman-41674b33a", label: "LinkedIn" },
        { icon: FaWhatsapp, url: "https://wa.me/8801715044575", label: "WhatsApp" },
        { icon: FaFacebookF, url: "https://www.facebook.com/md.abrar.ayman.mahabub/", label: "Facebook" },
    ];

    return (
        <footer className={`relative overflow-hidden border-t transition-colors duration-500 selection:bg-rose-500/20 selection:text-white ${
            darkMode ? 'bg-[#020204] text-white border-white/[0.08]' : 'bg-[#f1f5f9] text-slate-900 border-slate-200'
        }`}>
            {/* Top Subtle Gradient Border */}
            <div className={`absolute top-0 left-0 right-0 h-[1px] ${
                darkMode
                    ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-slate-300 to-transparent'
            }`} />

            {/* Ambient Subtle Background Lighting */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -bottom-24 left-1/3 w-[600px] h-[300px] rounded-full blur-[150px] ${
                    darkMode ? 'bg-slate-800/[0.08]' : 'bg-rose-500/[0.04]'
                }`} />
                <div className={`absolute top-0 right-1/4 w-[400px] h-[300px] rounded-full blur-[140px] ${
                    darkMode ? 'bg-white/[0.02]' : 'bg-blue-500/[0.03]'
                }`} />
            </div>

            {/* Main Content */}
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-10 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">

                    {/* ── 1. Brand / Identity Column ── */}
                    <div className="lg:col-span-4 space-y-5">
                        {/* Logo Monogram */}
                        <div className="cursor-pointer inline-flex items-center gap-3.5 group" onClick={scrollToTop}>
                            <div className={`w-10 h-10 rounded-2xl border font-mono font-bold text-sm flex items-center justify-center shadow-lg transition-all ${
                                darkMode
                                    ? 'bg-white/[0.06] border-white/15 text-white group-hover:border-white/30 group-hover:bg-white/[0.1]'
                                    : 'bg-white border-slate-300 text-slate-900 group-hover:border-slate-400 shadow-sm'
                            }`}>
                                MR
                            </div>
                            <div>
                                <h3 className={`text-base font-extrabold tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    MD MAHABUBUR RAHMAN
                                </h3>
                                <p className={`text-[10px] font-mono tracking-widest uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Full-Stack & Security Specialist
                                </p>
                            </div>
                        </div>

                        {/* Bio / Summary */}
                        <p className={`text-xs leading-relaxed max-w-sm font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Building resilient, high-performance web systems engineered with Secure SDLC principles and integrated with machine learning models.
                        </p>

                        {/* Availability Pill */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
                            darkMode
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span>Available for Worldwide Contracts</span>
                        </div>

                        {/* Social Media Row */}
                        <div className="flex items-center gap-2.5 pt-1">
                            {socialLinks.map((social, idx) => {
                                const IconC = social.icon;
                                return (
                                    <a
                                        key={idx}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition-all duration-200 shadow-sm ${
                                            darkMode
                                                ? 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.08] text-slate-400 hover:text-white'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <IconC />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── 2. Navigation Column ── */}
                    <div className="lg:col-span-2">
                        <h4 className={`text-xs font-mono font-bold uppercase tracking-widest mb-5 flex items-center gap-2 ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                            NAVIGATION
                        </h4>
                        <ul className="space-y-2.5">
                            {quickLinks.map((link, idx) => (
                                <li key={idx}>
                                    <button
                                        type="button"
                                        onClick={() => scrollToSection(link.href)}
                                        className={`text-xs hover:translate-x-1 transition-all flex items-center gap-2 group cursor-pointer ${
                                            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <span className="text-[7px] text-slate-400 group-hover:text-rose-500 transition-colors">◆</span>
                                        <span>{link.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── 3. Core Domains Column ── */}
                    <div className="lg:col-span-3">
                        <h4 className={`text-xs font-mono font-bold uppercase tracking-widest mb-5 flex items-center gap-2 ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                            SPECIALIZATIONS
                        </h4>
                        <div className="space-y-2.5">
                            {coreServices.map((item, idx) => {
                                const IconComp = item.icon;
                                return (
                                    <div
                                        key={idx}
                                        className={`p-2.5 rounded-2xl border transition-all duration-200 group ${
                                            darkMode
                                                ? 'bg-[#090a10]/80 border-white/[0.06] hover:border-white/15'
                                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs transition-colors flex-shrink-0 ${
                                                darkMode
                                                    ? 'bg-white/[0.04] border-white/10 text-slate-300 group-hover:text-rose-400'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 group-hover:text-rose-600'
                                            }`}>
                                                <IconComp />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold transition-colors truncate ${
                                                    darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-rose-600'
                                                }`}>{item.name}</p>
                                                <p className={`text-[10px] truncate font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── 4. Direct Contact Matrix Column ── */}
                    <div className="lg:col-span-3">
                        <h4 className={`text-xs font-mono font-bold uppercase tracking-widest mb-5 flex items-center gap-2 ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
                            DIRECT CONTACT
                        </h4>
                        <div className="space-y-2.5">
                            <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                                darkMode
                                    ? 'bg-[#090a10]/80 border-white/[0.06] hover:border-white/15'
                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                            }`}>
                                <a
                                    href="mailto:rahmanmdmahabubur666@gmail.com"
                                    className="flex items-center gap-3 min-w-0 flex-1"
                                >
                                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs flex-shrink-0 group-hover:scale-105 transition-all ${
                                        darkMode ? 'bg-white/[0.04] border-white/10 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                                    }`}>
                                        <FaEnvelope />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[10px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email</p>
                                        <p className={`text-xs font-medium truncate transition-colors ${
                                            darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-rose-600'
                                        }`}>
                                            rahmanmdmahabubur666@gmail.com
                                        </p>
                                    </div>
                                </a>
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                                        darkMode
                                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Copy Email"
                                >
                                    {copiedEmail ? <FaCheck className="text-emerald-500 text-xs" /> : <FaCopy className="text-xs" />}
                                </button>
                            </div>

                            <a
                                href="https://wa.me/8801715044575"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-3 rounded-2xl border transition-all flex items-center gap-3 group ${
                                    darkMode
                                        ? 'bg-[#090a10]/80 border-white/[0.06] hover:border-emerald-500/30'
                                        : 'bg-white border-slate-200 hover:border-emerald-400 shadow-sm'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs flex-shrink-0 group-hover:scale-105 transition-all ${
                                    darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                }`}>
                                    <FaPhone />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>WhatsApp / Call</p>
                                    <p className={`text-xs font-medium truncate transition-colors ${
                                        darkMode ? 'text-slate-200 group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-600'
                                    }`}>
                                        +880 1715044575
                                    </p>
                                </div>
                            </a>

                            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
                                darkMode ? 'bg-[#090a10]/80 border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'
                            }`}>
                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs flex-shrink-0 ${
                                    darkMode ? 'bg-white/[0.04] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}>
                                    <FaMapMarkerAlt />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Location</p>
                                    <p className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>Dhaka, Bangladesh</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bottom Section Bar ── */}
                <div className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    darkMode ? 'border-white/[0.06]' : 'border-slate-200'
                }`}>
                    <div className={`flex items-center gap-2 text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>© {currentYear}</span>
                        <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>MD MAHABUBUR RAHMAN</span>
                        <span>•</span>
                        <span>All Rights Reserved</span>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>Crafted with precision & security</span>
                    </div>

                    {/* Bismillah Inscription */}
                    <div className="text-right">
                        <p dir="rtl" lang="ar" className={`text-xs font-arabic transition-colors ${
                            darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                        }`}>
                            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Floating Scroll to Top ── */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.6, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6, y: 20 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={scrollToTop}
                        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl transition-all cursor-pointer ${
                            darkMode
                                ? 'bg-[#0e1017]/90 text-white border border-white/15 hover:bg-white/[0.1] hover:border-white/30'
                                : 'bg-white/95 text-slate-900 border border-slate-300 hover:bg-slate-100 shadow-slate-300'
                        }`}
                        title="Scroll to Top"
                    >
                        <FaArrowUp className={`text-xs ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
                    </motion.button>
                )}
            </AnimatePresence>
        </footer>
    );
}

export default Footer;
