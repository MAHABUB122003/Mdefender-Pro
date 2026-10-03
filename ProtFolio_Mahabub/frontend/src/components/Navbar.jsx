import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { FaGithub, FaLinkedinIn, FaFacebookF, FaInstagram } from 'react-icons/fa';

function Navbar({ darkMode, toggleDarkMode }) {
    const [activeSection, setActiveSection] = useState('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const menuRef = useRef(null);

    const navItems = [
        { name: 'Home', link: '#home' },
        { name: 'About', link: '#about' },
        { name: 'Education', link: '#education' },
        { name: 'Skills', link: '#skills' },
        { name: 'Projects', link: '#projects' },
        { name: 'Contact', link: '#contact' },
    ];

    useEffect(() => {
        const handleScroll = () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const progress = height > 0 ? (winScroll / height) * 100 : 0;
            setScrollProgress(progress);
            setScrolled(winScroll > 20);

            if (winScroll > lastScrollY.current && winScroll > 200) {
                setIsVisible(false);
                setIsMenuOpen(false);
            } else {
                setIsVisible(true);
            }
            lastScrollY.current = winScroll;

            const sections = ['home', 'about', 'education', 'skills', 'projects', 'contact'];
            const scrollPosition = winScroll + 120;
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isMenuOpen]);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 80;
            window.scrollTo({ top: element.offsetTop - offset, behavior: 'smooth' });
        }
    };

    const handleNavClick = (itemName) => {
        const sectionId = itemName.toLowerCase();
        setActiveSection(sectionId);
        setIsMenuOpen(false);
        setTimeout(() => scrollToSection(sectionId), 80);
    };

    const theme = {
        navBg: darkMode
            ? scrolled
                ? 'bg-[#000000]/90 backdrop-blur-2xl border-white/[0.08] shadow-2xl shadow-black/90'
                : 'bg-[#000000]/40 backdrop-blur-md border-white/5'
            : scrolled
                ? 'bg-white/90 backdrop-blur-2xl border-gray-200/60 shadow-xl'
                : 'bg-white/40 backdrop-blur-md border-gray-200/40',
        textPrimary: darkMode ? 'text-white' : 'text-gray-900',
    };

    return (
        <>
            {/* Scroll Progress Bar — Rose glow */}
            <div className="fixed top-0 left-0 z-[9999] h-[2px]" style={{ width: `${scrollProgress}%` }}>
                <div
                    className="w-full h-full bg-gradient-to-r from-rose-500 via-rose-400 to-white"
                    style={{
                        boxShadow: '0 0 12px rgba(244,63,94,0.8)',
                    }}
                />
            </div>

            <motion.header
                initial={{ y: 0 }}
                animate={{ y: isVisible ? 0 : -100 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-8 lg:px-16 pt-3 sm:pt-4"
            >
                <div className="container mx-auto max-w-7xl">
                    <nav
                        ref={menuRef}
                        className={`rounded-2xl px-3.5 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 border ${theme.navBg}`}
                    >
                        <div className="flex items-center justify-between">

                            {/* Mobile Brand Logo */}
                            <div
                                onClick={() => handleNavClick('home')}
                                className="flex md:hidden items-center gap-2 cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                                    MR
                                </div>
                                <span className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>MAHABUB</span>
                            </div>

                            {/* Desktop Left Navigation Links */}
                            <div className="hidden md:flex items-center gap-5 sm:gap-6 lg:gap-8">
                                {navItems.map((item) => {
                                    const isActive = activeSection === item.name.toLowerCase();
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNavClick(item.name)}
                                            className={`text-sm font-medium transition-colors cursor-pointer ${
                                                isActive
                                                    ? darkMode
                                                        ? 'text-white font-semibold'
                                                        : 'text-rose-600 font-bold'
                                                    : darkMode
                                                        ? 'text-slate-400 hover:text-white'
                                                        : 'text-slate-600 hover:text-slate-950 font-medium'
                                            }`}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right Controls & Socials */}
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                {/* Social Icons on Desktop */}
                                <div className="hidden lg:flex items-center gap-2">
                                    <a
                                        href="https://github.com/MAHABUB122003"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                            darkMode 
                                                ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                                        }`}
                                        aria-label="GitHub"
                                    >
                                        <FaGithub />
                                    </a>
                                    <a
                                        href="https://linkedin.com/in/md-mahabubur-rahman-41674b33a"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                            darkMode 
                                                ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                                        }`}
                                        aria-label="LinkedIn"
                                    >
                                        <FaLinkedinIn />
                                    </a>
                                    <a
                                        href="https://www.facebook.com/md.abrar.ayman.mahabub/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                            darkMode 
                                                ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                                        }`}
                                        aria-label="Facebook"
                                    >
                                        <FaFacebookF />
                                    </a>
                                </div>

                                <div className={`hidden lg:block w-px h-4 ${darkMode ? 'bg-white/15' : 'bg-gray-300'}`} />

                                {/* Theme Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={toggleDarkMode}
                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                        darkMode
                                            ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:border-white/25'
                                            : 'border-gray-200 bg-white text-slate-700 hover:text-slate-900 hover:border-gray-300 shadow-sm'
                                    }`}
                                    aria-label="Toggle theme"
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={darkMode ? 'sun' : 'moon'}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {darkMode ? <Sun className="w-4 h-4 text-rose-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.button>

                                {/* Mobile Hamburger */}
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`md:hidden p-2 rounded-xl border transition-all ${
                                        darkMode
                                            ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white'
                                            : 'border-gray-200 bg-white text-slate-700 hover:text-slate-900 shadow-sm'
                                    }`}
                                    aria-label="Toggle menu"
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={isMenuOpen ? 'close' : 'menu'}
                                            initial={{ rotate: -90, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: 90, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.button>
                            </div>
                        </div>
                    </nav>

                    {/* Mobile Dropdown Menu */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={`md:hidden mt-2 p-3 rounded-2xl border backdrop-blur-2xl shadow-2xl space-y-1 ${
                                    darkMode 
                                        ? 'border-white/10 bg-[#06060a]/98 text-white' 
                                        : 'border-gray-200 bg-white/98 text-slate-900'
                                }`}
                            >
                                {navItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => handleNavClick(item.name)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                                            activeSection === item.name.toLowerCase()
                                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                                : darkMode
                                                    ? 'text-slate-300 hover:bg-white/5'
                                                    : 'text-slate-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>{item.name}</span>
                                        {activeSection === item.name.toLowerCase() && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.header>
        </>
    );
}

export default Navbar;