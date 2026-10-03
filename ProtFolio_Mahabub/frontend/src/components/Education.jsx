import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaGraduationCap,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaBookOpen,
    FaCertificate,
    FaAward,
    FaCheckCircle,
    FaShieldAlt,
    FaBrain,
    FaCode,
    FaExternalLinkAlt,
    FaUniversity,
    FaLaptopCode,
    FaAtom
} from 'react-icons/fa';
import { SiPortswigger, SiTryhackme, SiPython, SiLinux } from 'react-icons/si';
import { getSection } from '../utils/portfolioData';

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
};

function Education({ darkMode }) {
    const aboutData = getSection('about');
    const educationList = aboutData.education || [
        {
            degree: 'B.Sc. in Computer Science & Engineering',
            institution: 'Shanto Mariam University of Creative Technology, Dhaka',
            year: 'Expected 2026',
            description: 'Rigorous engineering curriculum centered on software architecture, offensive security, and statistical data modeling.'
        }
    ];

    const certifications = [
        {
            name: 'PortSwigger Web Security Academy',
            issuer: 'PortSwigger / Burp Suite',
            year: '2024',
            level: 'Practitioner',
            icon: SiPortswigger,
            color: 'text-rose-400',
            borderColor: 'hover:border-rose-500/40',
            badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
            topics: ['XSS', 'SQLi', 'SSRF', 'JWT Exploitation', 'CSRF']
        },
        {
            name: 'TryHackMe - AD & Network Pentesting',
            issuer: 'TryHackMe Cybersecurity',
            year: '2024',
            level: 'Specialized',
            icon: SiTryhackme,
            color: 'text-red-400',
            borderColor: 'hover:border-red-500/40',
            badgeBg: 'bg-red-500/10 text-red-300 border-red-500/20',
            topics: ['Active Directory', 'Privilege Escalation', 'Pivoting', 'Network Defense']
        },
        {
            name: 'Machine Learning & Predictive Modeling',
            issuer: 'Supervised Learning & Ensemble Models',
            year: '2024',
            level: 'Proficient',
            icon: FaBrain,
            color: 'text-blue-400',
            borderColor: 'hover:border-blue-500/40',
            badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            topics: ['Scikit-learn', 'XGBoost', 'CatBoost', 'LightGBM', 'Threat Detection']
        },
        {
            name: 'Active Bug Bounty Security Researcher',
            issuer: 'Vulnerability Disclosure & Research',
            year: '2024',
            level: 'Professional',
            icon: FaShieldAlt,
            color: 'text-emerald-400',
            borderColor: 'hover:border-emerald-500/40',
            badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            topics: ['20+ Reports Disclosed', 'OWASP Top 10', 'Logic Flaws', 'IDOR']
        },
        {
            name: 'CTF Security Competitor',
            issuer: 'Capture The Flag Community',
            year: '2024',
            level: 'Active',
            icon: FaLaptopCode,
            color: 'text-amber-400',
            borderColor: 'hover:border-amber-500/40',
            badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
            topics: ['Web Exploitation', 'Digital Forensics', 'Crypto', 'Binary Analysis']
        }
    ];

    const academicModules = [
        {
            category: "Cybersecurity & Defenses",
            icon: FaShieldAlt,
            color: "text-rose-400",
            courses: ["Network Security", "Applied Cryptography", "Secure SDLC", "Digital Forensics & SIEM"]
        },
        {
            category: "Machine Learning & Analytics",
            icon: FaBrain,
            color: "text-blue-400",
            courses: ["Machine Learning", "Data Science & Feature Eng.", "Applied Statistics", "Predictive Systems"]
        },
        {
            category: "Core Computing Foundations",
            icon: FaCode,
            color: "text-emerald-400",
            courses: ["Data Structures & Algorithms", "Database Management (SQL/NoSQL)", "Operating Systems & Linux Architecture"]
        }
    ];

    return (
        <section
            id="education"
            className={`relative py-24 sm:py-32 px-4 sm:px-6 md:px-10 lg:px-12 overflow-hidden transition-colors duration-500 ${
                darkMode ? 'bg-[#000000] border-t border-white/[0.06]' : 'bg-[#fcfbf9] border-t border-slate-200'
            }`}
        >
            {/* Ambient Background Flare */}
            <div className={`absolute top-[20%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-rose-500/[0.025]' : 'bg-rose-500/[0.04]'
            }`} />
            <div className={`absolute bottom-[10%] left-[-5%] w-[450px] h-[450px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-slate-800/[0.04]' : 'bg-slate-200/[0.5]'
            }`} />

            <div className="w-full max-w-[1350px] mx-auto relative z-10">

                {/* Section Header */}
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="space-y-3 mb-16 text-center lg:text-left"
                >
                    <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs font-mono tracking-widest uppercase">
                        <FaGraduationCap className="text-sm" />
                        <span>Academic & Professional Credentials</span>
                    </motion.div>

                    <motion.h2 variants={fadeUp} className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        Education & <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500">Certifications</span>
                    </motion.h2>

                    <motion.p variants={fadeUp} className={`text-base sm:text-lg max-w-2xl font-normal leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                        Synthesizing formal computer science engineering with industry-recognized offensive security credentials and machine learning specializations.
                    </motion.p>
                </motion.div>

                {/* Main 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-16">

                    {/* ════════════════════════════════════════════
                        LEFT COLUMN (7 COLS): Formal Degree Showcase
                        ════════════════════════════════════════════ */}
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-60px" }}
                        variants={staggerContainer}
                        className="lg:col-span-7 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 ${
                                darkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>Degree & University Journey</span>
                            </h3>
                            <span className="text-xs font-mono text-rose-500 font-bold">B.Sc. In CSE</span>
                        </div>

                        {educationList.map((edu, idx) => (
                            <motion.div
                                key={idx}
                                variants={fadeUp}
                                whileHover={{ y: -3 }}
                                className={`relative rounded-3xl border p-7 sm:p-9 transition-all duration-300 shadow-xl space-y-7 group ${
                                    darkMode 
                                        ? 'border-white/10 bg-[#06060a]/90 backdrop-blur-xl shadow-black/80 hover:border-rose-500/30' 
                                        : 'border-slate-200/90 bg-white shadow-slate-200/60 hover:border-slate-300'
                                }`}
                            >
                                {/* Degree Header */}
                                <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b ${
                                    darkMode ? 'border-white/[0.08]' : 'border-slate-100'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform ${
                                            darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-500'
                                        }`}>
                                            <FaUniversity />
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono mb-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Undergraduate Program</span>
                                            </div>
                                            <h4 className={`text-xl sm:text-2xl font-bold transition-colors ${
                                                darkMode ? 'text-white group-hover:text-rose-200' : 'text-slate-900 group-hover:text-rose-600'
                                            }`}>
                                                {edu.degree}
                                            </h4>
                                            <p className={`text-sm font-medium flex items-center gap-2 mt-1 ${
                                                darkMode ? 'text-slate-300' : 'text-slate-600'
                                            }`}>
                                                <FaMapMarkerAlt className="text-xs text-rose-500 shrink-0" />
                                                <span>{edu.institution}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono shrink-0 self-start ${
                                        darkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
                                    }`}>
                                        <FaCalendarAlt className="text-xs text-rose-500" />
                                        <span>{edu.year}</span>
                                    </span>
                                </div>

                                {/* Overview Description */}
                                <p className={`text-sm sm:text-[15px] leading-relaxed font-normal ${
                                    darkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>
                                    {edu.description}
                                </p>

                                {/* Structured Academic Modules */}
                                <div className="space-y-4 pt-2">
                                    <h5 className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 ${
                                        darkMode ? 'text-slate-400' : 'text-slate-500 font-semibold'
                                    }`}>
                                        <FaBookOpen className="text-rose-500" />
                                        <span>Core Academic Disciplines</span>
                                    </h5>

                                    <div className="space-y-3">
                                        {academicModules.map((mod, mIdx) => {
                                            const Icon = mod.icon;
                                            return (
                                                <div
                                                    key={mIdx}
                                                    className={`p-4 rounded-2xl border space-y-2.5 ${
                                                        darkMode ? 'border-white/[0.07] bg-[#0c0c14]/60' : 'border-slate-200 bg-slate-50/80'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Icon className={`${mod.color} text-sm`} />
                                                        <span className={`text-xs font-bold uppercase tracking-wide ${
                                                            darkMode ? 'text-slate-200' : 'text-slate-800'
                                                        }`}>{mod.category}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {mod.courses.map((course, cIdx) => (
                                                            <span
                                                                key={cIdx}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                                                                    darkMode 
                                                                        ? 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-white/20 hover:text-white' 
                                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {course}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* ════════════════════════════════════════════
                        RIGHT COLUMN (5 COLS): Verified Certifications
                        ════════════════════════════════════════════ */}
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-60px" }}
                        variants={staggerContainer}
                        className="lg:col-span-5 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 ${
                                darkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Verified Industry Credentials</span>
                            </h3>
                            <span className="text-xs font-mono text-emerald-500 font-bold">5+ Badges</span>
                        </div>

                        <div className="space-y-4">
                            {certifications.map((cert, idx) => {
                                const IconComp = cert.icon;
                                return (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUp}
                                        whileHover={{ x: 4, scale: 1.01 }}
                                        className={`p-5 rounded-2xl border transition-all duration-300 shadow-lg space-y-3 group cursor-default ${
                                            darkMode 
                                                ? `border-white/10 bg-[#06060a]/90 backdrop-blur-xl ${cert.borderColor} shadow-black/60` 
                                                : 'border-slate-200/90 bg-white shadow-slate-200/50 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 transition-colors ${
                                                    darkMode ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                                }`}>
                                                    <IconComp className={cert.color} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`text-sm font-bold transition-colors truncate ${
                                                        darkMode ? 'text-white group-hover:text-rose-200' : 'text-slate-900 group-hover:text-rose-600'
                                                    }`}>
                                                        {cert.name}
                                                    </h4>
                                                    <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {cert.issuer}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shrink-0 ${cert.badgeBg}`}>
                                                {cert.level}
                                            </span>
                                        </div>

                                        {/* Skill Tags */}
                                        <div className={`flex flex-wrap gap-1.5 pt-1 border-t ${
                                            darkMode ? 'border-white/[0.05]' : 'border-slate-100'
                                        }`}>
                                            {cert.topics.map((topic, tIdx) => (
                                                <span
                                                    key={tIdx}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                                                        darkMode 
                                                            ? 'bg-white/[0.02] text-slate-400 border-white/[0.06]' 
                                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                </div>

                {/* Bottom Quick Credentials Metric Bar */}
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border ${
                        darkMode 
                            ? 'border-white/10 bg-[#06060a]/80 backdrop-blur-xl' 
                            : 'border-slate-200 bg-white shadow-md'
                    }`}
                >
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>B.Sc. CSE</div>
                        <div className={`text-[11px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Engineering Degree</div>
                    </div>
                    <div className={`text-center border-l ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="text-2xl font-bold text-rose-500">5+</div>
                        <div className={`text-[11px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Specialized Certs</div>
                    </div>
                    <div className={`text-center border-l ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="text-2xl font-bold text-emerald-500">20+</div>
                        <div className={`text-[11px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Security Reports</div>
                    </div>
                    <div className={`text-center border-l ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="text-2xl font-bold text-blue-500">2026</div>
                        <div className={`text-[11px] font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Graduation</div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}

export default Education;
