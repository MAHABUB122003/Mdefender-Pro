import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    FaUserTie,
    FaGraduationCap,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaDownload,
    FaShieldAlt,
    FaBrain,
    FaCode,
    FaArrowRight,
    FaCheckCircle,
    FaBug,
    FaCheck,
    FaCopy,
    FaFolderOpen,
    FaClock
} from 'react-icons/fa';
import { getSection } from '../utils/portfolioData';
import myCV from '../assets/mahabub.pdf';
import aboutImage from '../assets/mahabub_about.png';
import aboutImageLight from '../assets/mahabub_about_light.png';

// Animated counter for stats
function AnimatedStat({ value, visible }) {
    const [display, setDisplay] = useState('0');
    const started = useRef(false);

    useEffect(() => {
        if (!visible || started.current) return;
        started.current = true;
        const raw = parseInt(value.replace(/\D/g, '')) || 0;
        const suffix = value.replace(/[\d]/g, '');
        if (raw === 0) { setDisplay(value); return; }
        let current = 0;
        const steps = 40;
        const inc = raw / steps;
        const timer = setInterval(() => {
            current += inc;
            if (current >= raw) {
                setDisplay(value);
                clearInterval(timer);
            } else {
                setDisplay(Math.floor(current) + suffix);
            }
        }, 35);
        return () => clearInterval(timer);
    }, [visible, value]);

    return <span>{display}</span>;
}

function About({ darkMode }) {
    const aboutData = getSection('about');
    const [statsVisible, setStatsVisible] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const statsRef = useRef(null);

    // 3D Parallax tilt for the portrait frame
    const imgRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 150 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), springConfig);

    const handleMouseMove = (e) => {
        if (!imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
            { threshold: 0.2 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    const handleCopyEmail = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(aboutData.personalDetails?.email || 'rahmanmdmahabubur666@gmail.com');
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const stats = [
        { 
            number: '9+', 
            label: 'Completed Projects', 
            description: 'Full-Stack & Security',
            icon: FaFolderOpen,
            color: 'text-rose-500',
            bg: darkMode ? 'bg-rose-500/10' : 'bg-rose-50',
            border: darkMode ? 'border-rose-500/20' : 'border-rose-200'
        },
        { 
            number: '20+', 
            label: 'Security Reports', 
            description: 'Vulnerabilities Discovered',
            icon: FaShieldAlt,
            color: 'text-emerald-500',
            bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
            border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200'
        },
        { 
            number: '3+', 
            label: 'Years Experience', 
            description: 'Continuous Crafting',
            icon: FaClock,
            color: 'text-blue-500',
            bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
            border: darkMode ? 'border-blue-500/20' : 'border-blue-200'
        },
        { 
            number: '100%', 
            label: 'Commitment', 
            description: 'Quality & Reliability',
            icon: FaCheckCircle,
            color: 'text-amber-500',
            bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50',
            border: darkMode ? 'border-amber-500/20' : 'border-amber-200'
        }
    ];

    const coreValues = [
        { 
            title: 'Clean Architecture', 
            description: 'Writing modular, scalable, and self-documenting code with battle-tested design patterns.',
            icon: FaCode,
            tag: 'Maintainability'
        },
        { 
            title: 'Security-First Mindset', 
            description: 'Embedding defensive rigor, threat modeling, and OWASP compliance into every stage of SDLC.',
            icon: FaShieldAlt,
            tag: 'Cyber Defense'
        },
        { 
            title: 'Predictive Intelligence', 
            description: 'Leveraging applied ML and data pipelines for automated threat detection and smart insights.',
            icon: FaBrain,
            tag: 'Machine Learning'
        },
        { 
            title: 'Continuous Growth', 
            description: 'Relentless exploration of bug bounty research, CTFs, and modern full-stack performance.',
            icon: FaBug,
            tag: 'Research & CTF'
        }
    ];

    const handleDownloadCV = async () => {
        try {
            const response = await fetch(myCV);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'MD_Mahabubur_Rahman_CV.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            const link = document.createElement('a');
            link.href = myCV;
            link.download = 'MD_Mahabubur_Rahman_CV.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <section
            id="about"
            className={`relative py-20 sm:py-28 px-4 sm:px-6 md:px-10 lg:px-12 overflow-hidden transition-colors duration-500 ${
                darkMode ? 'bg-[#000000] border-t border-white/[0.08]' : 'bg-[#f8fafc] border-t border-slate-200'
            }`}
        >
            {/* Ambient Lighting Layers */}
            <div className={`absolute top-[10%] left-[-5%] w-[520px] h-[520px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-rose-500/[0.03]' : 'bg-rose-500/[0.04]'
            }`} />
            <div className={`absolute bottom-[10%] right-[-5%] w-[520px] h-[520px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-slate-800/[0.05]' : 'bg-blue-200/[0.2]'
            }`} />

            <div className="w-full max-w-[1350px] mx-auto relative z-10">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                    className="space-y-3 mb-14 text-center lg:text-left"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs font-mono tracking-widest uppercase">
                        <FaUserTie className="text-xs" />
                        <span>About Me & Background</span>
                    </div>

                    <h2 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        Engineering <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500">Identity & Vision</span>
                    </h2>

                    <p className={`text-base sm:text-lg max-w-2xl font-normal leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                        {aboutData.tagline || 'Bridging the gap between intelligent systems, secure infrastructure, and modern web applications.'}
                    </p>
                </motion.div>

                {/* Main 2-Column Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">

                    {/* Left Column (5 Cols): Portrait Frame */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.7 }}
                        className="lg:col-span-5 flex flex-col items-center relative"
                    >
                        <motion.div
                            ref={imgRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                rotateX,
                                rotateY,
                                transformStyle: 'preserve-3d',
                            }}
                            className={`relative w-full max-w-[420px] rounded-3xl overflow-hidden p-3.5 shadow-2xl group cursor-pointer transition-all duration-300 ${
                                darkMode 
                                    ? 'border border-white/10 bg-[#06060a] shadow-black' 
                                    : 'border border-slate-200 bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/60 shadow-xl shadow-slate-200/70'
                            }`}
                        >
                            {/* Ambient Rim Highlight */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl ${
                                darkMode ? 'bg-gradient-to-t from-rose-500/10 via-transparent to-transparent' : 'bg-gradient-to-t from-rose-500/5 via-transparent to-transparent'
                            }`} />

                            <div className={`relative w-full rounded-2xl overflow-hidden ${
                                darkMode ? 'bg-[#0a0a14]' : 'bg-gradient-to-b from-white via-slate-50 to-slate-100/80'
                            }`}>
                                <img
                                    key={darkMode ? 'dark-about-img' : 'light-about-img'}
                                    src={darkMode ? aboutImage : aboutImageLight}
                                    alt="MD Mahabubur Rahman - Portrait"
                                    className="w-full h-auto object-cover select-none transition-transform duration-500 group-hover:scale-[1.01]"
                                />
                            </div>

                            {/* Floating Glass Pill: Security & ML Specialist */}
                            <div className={`absolute bottom-6 left-6 right-6 p-3.5 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-3 shadow-xl ${
                                darkMode 
                                    ? 'border-white/15 bg-black/85 text-white' 
                                    : 'border-slate-200 bg-white/95 text-slate-900 shadow-slate-200/80'
                            }`}>
                                <div className="min-w-0">
                                    <h4 className={`text-sm font-bold tracking-wide truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        MD Mahabubur Rahman
                                    </h4>
                                    <p className="text-xs text-rose-500 font-mono truncate font-semibold">
                                        Full-Stack & Security Specialist
                                    </p>
                                </div>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Column (7 Cols): Story & Balanced Personal Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.7 }}
                        className="lg:col-span-7 space-y-5"
                    >
                        {/* Who Am I Narrative Card */}
                        <div className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl shadow-xl space-y-4 ${
                            darkMode 
                                ? 'border-white/10 bg-[#06060a]/90 shadow-black/80' 
                                : 'border-slate-200/90 bg-white shadow-slate-200/50'
                        }`}>
                            <div className={`flex items-center justify-between pb-3.5 border-b ${
                                darkMode ? 'border-white/[0.08]' : 'border-slate-100'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-lg">
                                        <FaBrain />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${
                                            darkMode ? 'text-white' : 'text-slate-900'
                                        }`}>Who Am I?</h3>
                                        <p className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Architecting Secure & Intelligent Systems
                                        </p>
                                    </div>
                                </div>
                                <span className="hidden sm:inline-block text-xs font-mono text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Verified Profile
                                </span>
                            </div>

                            {/* Refined High-Legibility Narrative */}
                            <div className={`space-y-3 text-sm sm:text-[14.5px] leading-relaxed font-normal ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                                <p>
                                    Innovative <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Full-Stack Developer</span>, <span className="text-rose-500 font-semibold">Cybersecurity Specialist</span>, and <span className="text-emerald-600 font-semibold">Machine Learning Engineer</span> dedicated to engineering bulletproof, intelligent digital solutions.
                                </p>
                                <p>
                                    Proficient in building scalable, secure web architectures using <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>MongoDB, Express, React, Node.js, and FastAPI</span> anchored with strict Secure SDLC principles. Advanced specialization in predictive modeling, supervised learning, and AI-driven automated threat detection.
                                </p>
                                <p>
                                    Hands-on expertise across <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>vulnerability assessment, penetration testing, SIEM operations,</span> and digital forensics to defend modern enterprise infrastructure.
                                </p>
                            </div>

                            {/* Expertise Badges */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                                    darkMode ? 'bg-white/[0.04] border border-white/10 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
                                }`}>
                                    <FaCode className="text-rose-500 text-[11px]" />
                                    <span>MERN & FastAPI</span>
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                                    darkMode ? 'bg-white/[0.04] border border-white/10 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
                                }`}>
                                    <FaShieldAlt className="text-emerald-500 text-[11px]" />
                                    <span>Offensive & Defensive Security</span>
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                                    darkMode ? 'bg-white/[0.04] border border-white/10 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
                                }`}>
                                    <FaBrain className="text-blue-500 text-[11px]" />
                                    <span>ML & Threat Detection</span>
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                                    darkMode ? 'bg-white/[0.04] border border-white/10 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
                                }`}>
                                    <FaBug className="text-amber-500 text-[11px]" />
                                    <span>Bug Bounty & Pentesting</span>
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-wrap gap-3.5 items-center">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleDownloadCV}
                                    className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <FaDownload className="text-xs" />
                                    <span>Download Resume (PDF)</span>
                                </motion.button>

                                <a
                                    href="#contact"
                                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                                        darkMode
                                            ? 'border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/30 backdrop-blur-xl'
                                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
                                    }`}
                                >
                                    <span>Get In Touch</span>
                                    <FaArrowRight className="text-xs text-rose-500" />
                                </a>
                            </div>
                        </div>

                        {/* ── Balanced Personal Info 2x2 Grid ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1. Location */}
                            <div className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 transition-all ${
                                darkMode 
                                    ? 'border-white/10 bg-[#06060a]/80 hover:border-white/20' 
                                    : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-sm'
                            }`}>
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 ${
                                    darkMode ? 'bg-white/[0.04] border-white/10 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-500'
                                }`}>
                                    <FaMapMarkerAlt />
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                                        darkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>Location</span>
                                    <span className={`text-xs sm:text-sm font-semibold truncate block ${
                                        darkMode ? 'text-white' : 'text-slate-900'
                                    }`}>
                                        {aboutData.personalDetails?.location || "Dhaka, Bangladesh"}
                                    </span>
                                </div>
                            </div>

                            {/* 2. Education */}
                            <div className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 transition-all ${
                                darkMode 
                                    ? 'border-white/10 bg-[#06060a]/80 hover:border-white/20' 
                                    : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-sm'
                            }`}>
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 ${
                                    darkMode ? 'bg-white/[0.04] border-white/10 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                }`}>
                                    <FaGraduationCap />
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                                        darkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>Education</span>
                                    <span className={`text-xs sm:text-sm font-semibold truncate block ${
                                        darkMode ? 'text-white' : 'text-slate-900'
                                    }`}>
                                        {aboutData.personalDetails?.student || "B.Sc. CSE (Expected 2026)"}
                                    </span>
                                </div>
                            </div>

                            {/* 3. Direct Email */}
                            <div className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-2.5 transition-all group ${
                                darkMode 
                                    ? 'border-white/10 bg-[#06060a]/80 hover:border-rose-500/30' 
                                    : 'border-slate-200/90 bg-white hover:border-rose-300 shadow-sm'
                            }`}>
                                <a
                                    href={`mailto:${aboutData.personalDetails?.email || 'rahmanmdmahabubur666@gmail.com'}`}
                                    className="flex items-center gap-3 min-w-0 flex-1"
                                >
                                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform ${
                                        darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-500'
                                    }`}>
                                        <FaEnvelope />
                                    </div>
                                    <div className="min-w-0">
                                        <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                                            darkMode ? 'text-slate-400' : 'text-slate-500'
                                        }`}>Email</span>
                                        <span className={`text-xs sm:text-sm font-semibold truncate block transition-colors ${
                                            darkMode ? 'text-white group-hover:text-rose-300' : 'text-slate-900 group-hover:text-rose-600'
                                        }`}>
                                            {aboutData.personalDetails?.email || 'rahmanmdmahabubur666@gmail.com'}
                                        </span>
                                    </div>
                                </a>
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                        darkMode 
                                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white' 
                                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Copy Email Address"
                                >
                                    {copiedEmail ? <FaCheck className="text-emerald-500 text-xs" /> : <FaCopy className="text-xs" />}
                                </button>
                            </div>

                            {/* 4. Direct Phone */}
                            <a
                                href={`tel:${(aboutData.personalDetails?.phone || '+880 1715044575').replace(/\s+/g, '')}`}
                                className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 transition-all group ${
                                    darkMode 
                                        ? 'border-white/10 bg-[#06060a]/80 hover:border-emerald-500/30' 
                                        : 'border-slate-200/90 bg-white hover:border-emerald-300 shadow-sm'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform ${
                                    darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                }`}>
                                    <FaPhone />
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-[10px] font-mono uppercase tracking-wider block ${
                                        darkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>Phone / WhatsApp</span>
                                    <span className={`text-xs sm:text-sm font-semibold truncate block transition-colors ${
                                        darkMode ? 'text-white group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-600'
                                    }`}>
                                        {aboutData.personalDetails?.phone || "+880 1715044575"}
                                    </span>
                                </div>
                            </a>
                        </div>
                    </motion.div>

                </div>

                {/* ── High-Impact Animated Stats Grid ── */}
                <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16">
                    {stats.map((stat, idx) => {
                        const StatIcon = stat.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-xl transition-all group relative overflow-hidden ${
                                    darkMode 
                                        ? 'border-white/10 bg-gradient-to-b from-[#0e1017] to-[#06060a] shadow-xl shadow-black/60 hover:border-white/20' 
                                        : 'border-slate-200/90 bg-white shadow-md hover:shadow-lg hover:border-slate-300'
                                }`}
                            >
                                {/* Top Accent Line */}
                                <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-50 group-hover:opacity-100 transition-opacity ${
                                    darkMode 
                                        ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' 
                                        : 'bg-gradient-to-r from-transparent via-rose-300 to-transparent'
                                }`} />

                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.border} border ${stat.color} flex items-center justify-center text-sm group-hover:scale-110 transition-transform`}>
                                        <StatIcon />
                                    </div>
                                    <span className={`text-[10px] font-mono uppercase tracking-widest ${
                                        darkMode ? 'text-slate-500' : 'text-slate-400'
                                    }`}>
                                        Metric #{idx + 1}
                                    </span>
                                </div>

                                <div className={`text-3xl sm:text-4xl font-black mb-1 tracking-tight ${
                                    darkMode ? 'text-white' : 'text-slate-900'
                                }`}>
                                    <AnimatedStat value={stat.number} visible={statsVisible} />
                                </div>
                                <div className={`text-xs sm:text-sm font-bold mb-0.5 ${
                                    darkMode ? 'text-slate-200' : 'text-slate-800'
                                }`}>{stat.label}</div>
                                <div className={`text-[11px] font-mono ${
                                    darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}>{stat.description}</div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Engineering Philosophy: What Drives Me ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="space-y-8"
                >
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono uppercase tracking-wider ${
                            darkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}>
                            <FaShieldAlt className="text-rose-500 text-[11px]" />
                            <span>Core Philosophy</span>
                        </div>
                        <h3 className={`text-2xl sm:text-3xl font-extrabold ${
                            darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                            What <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500">Drives Me</span>
                        </h3>
                        <p className={`text-xs sm:text-sm font-normal leading-relaxed ${
                            darkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            Guiding engineering principles for software craft, defensive cybersecurity, and intelligent workflows.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {coreValues.map((val, idx) => {
                            const IconComp = val.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -4 }}
                                    className={`p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 group cursor-default relative overflow-hidden ${
                                        darkMode 
                                            ? 'border-white/10 bg-gradient-to-b from-[#0c0d14] to-[#06060a] shadow-xl shadow-black/50 hover:border-white/20' 
                                            : 'border-slate-200/90 bg-white shadow-md hover:shadow-lg hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-lg group-hover:scale-105 transition-all ${
                                            darkMode 
                                                ? 'bg-white/[0.04] border-white/10 text-rose-400 group-hover:border-rose-500/30 group-hover:bg-rose-500/10' 
                                                : 'bg-rose-50 border-rose-100 text-rose-500 group-hover:border-rose-200'
                                        }`}>
                                            <IconComp />
                                        </div>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                            darkMode ? 'bg-white/[0.04] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                                        }`}>
                                            {val.tag}
                                        </span>
                                    </div>
                                    <h4 className={`text-sm sm:text-base font-bold mb-2 group-hover:text-rose-500 transition-colors ${
                                        darkMode ? 'text-white' : 'text-slate-900'
                                    }`}>
                                        {val.title}
                                    </h4>
                                    <p className={`text-xs leading-relaxed font-normal ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                        {val.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

            </div>
        </section>
    );
}

export default About;
