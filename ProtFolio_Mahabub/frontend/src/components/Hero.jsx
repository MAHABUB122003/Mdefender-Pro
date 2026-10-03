import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    FaGithub,
    FaLinkedinIn,
    FaFacebookF,
    FaInstagram,
    FaArrowRight,
    FaDownload,
} from 'react-icons/fa';
import { getSection } from '../utils/portfolioData';
import myImage from '../assets/mahabub.png';
import myImageLight from '../assets/mahabub_light.png';
import myCV from '../assets/mahabub.pdf';

/* Stagger animation variants */
const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function Hero({ darkMode }) {
    const heroData = getSection('hero');

    // Subtle 3D Parallax Tilt for the Portrait
    const containerRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 28, stiffness: 160 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), springConfig);

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const x = (e.clientX - rect.left) / width - 0.5;
        const y = (e.clientY - rect.top) / height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const socialIconMap = {
        github: FaGithub,
        linkedin: FaLinkedinIn,
        facebook: FaFacebookF,
        instagram: FaInstagram,
    };
    const socialIcons = heroData.socials.map((s) => ({
        icon: socialIconMap[s.platform] || FaGithub,
        url: s.url,
        platform: s.platform,
    }));

    const roles = heroData.roles || [
        "Full-Stack Developer",
        "Cybersecurity Specialist",
        "ML Engineer",
        "Bug Bounty Hunter",
    ];
    const [roleIndex, setRoleIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRoleIndex((prev) => (prev + 1) % roles.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [roles.length]);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            window.scrollTo({ top: element.offsetTop - 80, behavior: 'smooth' });
        }
    };

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
            id="home"
            className={`relative min-h-[92vh] lg:min-h-screen flex items-center pt-24 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 md:px-10 lg:px-12 overflow-hidden transition-colors duration-500 ${
                darkMode ? 'bg-[#000000]' : 'bg-[#fcfbf9]'
            }`}
        >
            {/* ── Soft Ambient Backlight ── */}
            <div className={`absolute top-[20%] left-[5%] w-[480px] h-[480px] rounded-full blur-[150px] pointer-events-none ${
                darkMode ? 'bg-rose-500/[0.03]' : 'bg-rose-500/[0.05]'
            }`} />

            {/* ── Widescreen Balanced Layout ── */}
            <div className="w-full max-w-[1400px] mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

                    {/* ════════════════════════════════════════════
                        LEFT COLUMN: Studio Portrait (Light / Dark Matched)
                        ════════════════════════════════════════════ */}
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-start items-center relative"
                    >
                        <motion.div
                            ref={containerRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                rotateX,
                                rotateY,
                                transformStyle: 'preserve-3d',
                            }}
                            className={`relative w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] flex items-center justify-center cursor-pointer transition-all duration-300 ${
                                darkMode 
                                    ? '' 
                                    : 'p-3 sm:p-3.5 rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-100/90 border border-slate-200/90 shadow-2xl shadow-slate-200/80 group'
                            }`}
                        >
                            {/* Light Mode Studio Backdrop Ambience */}
                            {!darkMode && (
                                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                                    <div className="absolute -top-24 -right-24 w-60 h-60 bg-rose-500/[0.06] rounded-full blur-3xl" />
                                    <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-500/[0.04] rounded-full blur-3xl" />
                                </div>
                            )}

                            {/* Inner Portrait Container */}
                            <div className={`relative w-full overflow-hidden flex items-end justify-center ${
                                darkMode 
                                    ? '' 
                                    : 'rounded-2xl bg-gradient-to-b from-slate-100/70 via-slate-50 to-[#ece8e0]/60 border border-slate-200/60'
                            }`}>
                                <motion.img
                                    key={darkMode ? 'dark-hero-img' : 'light-hero-img'}
                                    src={darkMode ? myImage : myImageLight}
                                    alt="MD Mahabubur Rahman"
                                    className={`relative z-10 w-full h-auto object-contain select-none transition-transform duration-500 ${
                                        darkMode 
                                            ? 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]' 
                                            : 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.06)] group-hover:scale-[1.01]'
                                    }`}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ════════════════════════════════════════════
                        RIGHT COLUMN: Editorial Headline & Copy
                        ════════════════════════════════════════════ */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="lg:col-span-6 xl:col-span-6 text-center lg:text-left space-y-6 lg:space-y-7 pl-0 lg:pl-4"
                    >
                        {/* Bismillah & Availability Badge */}
                        <motion.div variants={fadeUp} className="space-y-2">
                            <p
                                dir="rtl"
                                lang="ar"
                                className={`font-arabic text-sm sm:text-base tracking-wider font-medium ${
                                    darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}
                            >
                                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </p>
                            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wide ${
                                darkMode 
                                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' 
                                    : 'border-emerald-600/25 bg-emerald-50 text-emerald-700'
                            }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{heroData.availableText || "Available For Full-Time & Freelance Roles"}</span>
                            </div>
                        </motion.div>

                        {/* Main Headline */}
                        <motion.div variants={fadeUp} className="space-y-2">
                            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-bold tracking-tight leading-[1.08] ${
                                darkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                                I'm <span className={`font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>MD Mahabubur Rahman</span>
                            </h1>
                            <h2 className={`text-xl sm:text-2xl md:text-[1.65rem] font-normal ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                                a <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Creative Full-Stack Developer</span> & <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Security Specialist</span>
                            </h2>
                        </motion.div>

                        {/* Specialization Switcher & Bio */}
                        <motion.div variants={fadeUp} className="space-y-3.5">
                            <div className="flex items-center justify-center lg:justify-start gap-2">
                                <span className={`text-xs font-mono uppercase tracking-widest ${
                                    darkMode ? 'text-slate-400' : 'text-slate-500 font-semibold'
                                }`}>Core Expertise:</span>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={roleIndex}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-sm sm:text-base font-bold text-rose-500"
                                    >
                                        {roles[roleIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                            <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal ${
                                darkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                                {heroData.description}
                            </p>
                        </motion.div>

                        {/* ── Action Buttons ── */}
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start items-stretch sm:items-center pt-2">
                            {/* Primary Button */}
                            <motion.button
                                whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(244, 63, 94, 0.45)" }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => scrollToSection('contact')}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-[#f43f5e] hover:bg-[#e11d48] text-white transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/30 cursor-pointer"
                            >
                                <span>Get in touch</span>
                                <FaArrowRight className="text-xs" />
                            </motion.button>

                            {/* Secondary Button: Download CV */}
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleDownloadCV}
                                className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-medium border flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer ${
                                    darkMode
                                        ? 'border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/30 backdrop-blur-xl'
                                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                                    darkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    <FaDownload />
                                </div>
                                <span>Download CV</span>
                            </motion.button>
                        </motion.div>

                        {/* ── Metrics & Social Links ── */}
                        <motion.div variants={fadeUp} className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                            {/* Project Count Metric */}
                            <div>
                                <h4 className={`text-2xl sm:text-3xl font-black ${
                                    darkMode ? 'text-white' : 'text-slate-900'
                                }`}>
                                    9+
                                </h4>
                                <p className={`text-[11px] font-mono uppercase tracking-wider ${
                                    darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                    Completed Projects
                                </p>
                            </div>

                            <div className={`hidden sm:block w-px h-8 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`} />

                            {/* Social Icons */}
                            <div className="flex items-center gap-2">
                                {socialIcons.map((social, idx) => {
                                    const IconComp = social.icon;
                                    return (
                                        <a
                                            key={idx}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={social.platform}
                                            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs transition-all duration-200 ${
                                                darkMode
                                                    ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:border-rose-500/50 hover:bg-rose-500/10'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-rose-400 hover:bg-rose-50 shadow-sm'
                                            }`}
                                        >
                                            <IconComp />
                                        </a>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}

export default Hero;
