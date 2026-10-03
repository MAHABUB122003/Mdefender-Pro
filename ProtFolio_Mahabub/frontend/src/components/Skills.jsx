import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FaCode,
    FaShieldAlt,
    FaBrain,
    FaTools,
    FaServer,
    FaTerminal,
    FaBug,
    FaDatabase,
    FaLock,
    FaLayerGroup,
    FaCheckCircle,
    FaFire,
    FaCogs,
    FaExternalLinkAlt
} from 'react-icons/fa';
import {
    SiReact,
    SiNodedotjs,
    SiExpress,
    SiMongodb,
    SiFastapi,
    SiTailwindcss,
    SiJavascript,
    SiPython,
    SiGnubash,
    SiDocker,
    SiGit,
    SiSplunk,
    SiWireshark,
    SiKalilinux,
    SiPostgresql,
    SiRedis,
    SiNextdotjs,
    SiLinux
} from 'react-icons/si';

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
};

const skillPillars = [
    {
        id: 'fullstack',
        title: 'Full-Stack Web Engineering',
        subtitle: 'Production-grade MERN & FastAPI Architectures',
        icon: FaCode,
        color: 'text-rose-400',
        borderColor: 'hover:border-rose-500/40',
        badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        skills: [
            { name: 'React.js', icon: SiReact, color: 'text-cyan-400' },
            { name: 'Next.js', icon: SiNextdotjs, color: 'text-white' },
            { name: 'Node.js', icon: SiNodedotjs, color: 'text-emerald-400' },
            { name: 'Express.js', icon: SiExpress, color: 'text-slate-300' },
            { name: 'FastAPI', icon: SiFastapi, color: 'text-teal-400' },
            { name: 'MongoDB', icon: SiMongodb, color: 'text-green-500' },
            { name: 'PostgreSQL', icon: SiPostgresql, color: 'text-blue-400' },
            { name: 'Tailwind CSS', icon: SiTailwindcss, color: 'text-sky-400' },
            { name: 'JavaScript ES6+', icon: SiJavascript, color: 'text-yellow-400' },
            { name: 'REST & GraphQL', icon: FaDatabase, color: 'text-purple-400' },
        ],
        highlight: 'Architecting scalable APIs, responsive SPAs, and secure backend systems with strict clean-code principles.'
    },
    {
        id: 'security',
        title: 'Cybersecurity & Pentesting',
        subtitle: 'Offensive Assessment & Defensive Hardening',
        icon: FaShieldAlt,
        color: 'text-red-400',
        borderColor: 'hover:border-red-500/40',
        badgeColor: 'bg-red-500/10 text-red-300 border-red-500/20',
        skills: [
            { name: 'Burp Suite Pro', icon: FaBug, color: 'text-orange-400' },
            { name: 'OWASP Top 10', icon: FaLock, color: 'text-rose-400' },
            { name: 'Metasploit & Nmap', icon: FaTools, color: 'text-red-400' },
            { name: 'Wireshark & PCAP', icon: SiWireshark, color: 'text-cyan-400' },
            { name: 'Splunk & Wazuh SIEM', icon: SiSplunk, color: 'text-amber-400' },
            { name: 'Active Directory Pentest', icon: FaShieldAlt, color: 'text-emerald-400' },
            { name: 'Digital Forensics (Autopsy)', icon: FaTerminal, color: 'text-indigo-400' },
            { name: 'Bug Bounty Hunting', icon: FaCheckCircle, color: 'text-emerald-300' },
        ],
        highlight: '20+ disclosed vulnerability reports. Hands-on penetration testing, exploit validation, and SOC alert analysis.'
    },
    {
        id: 'ml',
        title: 'Machine Learning & Threat AI',
        subtitle: 'Predictive Modeling & Anomaly Detection',
        icon: FaBrain,
        color: 'text-blue-400',
        borderColor: 'hover:border-blue-500/40',
        badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
        skills: [
            { name: 'Python Data Science', icon: SiPython, color: 'text-blue-400' },
            { name: 'Scikit-learn', icon: FaBrain, color: 'text-cyan-400' },
            { name: 'XGBoost & CatBoost', icon: FaFire, color: 'text-rose-400' },
            { name: 'LightGBM & Random Forest', icon: FaBrain, color: 'text-emerald-400' },
            { name: 'NumPy & Pandas', icon: SiPython, color: 'text-indigo-400' },
            { name: 'Feature Engineering', icon: FaCogs, color: 'text-amber-400' },
            { name: 'Threat Anomaly ML', icon: FaShieldAlt, color: 'text-purple-400' },
            { name: 'Model Optimization', icon: FaLayerGroup, color: 'text-teal-400' },
        ],
        highlight: 'Supervised learning & ensemble architectures trained for automated security telemetry and anomaly classification.'
    },
    {
        id: 'devops',
        title: 'DevOps, Linux & Automation',
        subtitle: 'Infrastructure, Toolchains & CI/CD',
        icon: FaTools,
        color: 'text-emerald-400',
        borderColor: 'hover:border-emerald-500/40',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        skills: [
            { name: 'Docker & Containers', icon: SiDocker, color: 'text-blue-400' },
            { name: 'Kali Linux & Ubuntu', icon: SiKalilinux, color: 'text-cyan-400' },
            { name: 'Git & GitHub Workflows', icon: SiGit, color: 'text-orange-400' },
            { name: 'Bash & PowerShell Scripting', icon: SiGnubash, color: 'text-emerald-400' },
            { name: 'JWT & Security Auth', icon: FaLock, color: 'text-rose-400' },
            { name: 'Linux System Hardening', icon: SiLinux, color: 'text-yellow-400' },
            { name: 'CI/CD Pipelines', icon: FaServer, color: 'text-indigo-400' },
            { name: 'Redis Caching', icon: SiRedis, color: 'text-red-400' },
        ],
        highlight: 'Containerized environments, automated administrative shell scripts, and hardened Linux infrastructure.'
    }
];

const marqueeTechs = [
    { name: 'React 19', icon: SiReact, color: 'text-cyan-400' },
    { name: 'Next.js', icon: SiNextdotjs, color: 'text-white' },
    { name: 'Node.js', icon: SiNodedotjs, color: 'text-emerald-400' },
    { name: 'FastAPI', icon: SiFastapi, color: 'text-teal-400' },
    { name: 'Burp Suite', icon: FaBug, color: 'text-orange-400' },
    { name: 'Python ML', icon: SiPython, color: 'text-blue-400' },
    { name: 'XGBoost', icon: FaFire, color: 'text-rose-400' },
    { name: 'MongoDB', icon: SiMongodb, color: 'text-green-500' },
    { name: 'Docker', icon: SiDocker, color: 'text-blue-400' },
    { name: 'Kali Linux', icon: SiKalilinux, color: 'text-cyan-300' },
    { name: 'Splunk SIEM', icon: SiSplunk, color: 'text-amber-400' },
    { name: 'Tailwind CSS', icon: SiTailwindcss, color: 'text-sky-400' },
];

function Skills({ darkMode }) {
    const [activePillar, setActivePillar] = useState(null);

    return (
        <section
            id="skills"
            className={`relative py-20 sm:py-28 px-4 sm:px-6 md:px-10 lg:px-12 overflow-hidden transition-colors duration-500 ${
                darkMode ? 'bg-[#000000] border-t border-white/[0.06]' : 'bg-[#f8fafc] border-t border-slate-200'
            }`}
        >
            {/* Subtle Ambient Glow */}
            <div className={`absolute top-[20%] left-[-5%] w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-rose-500/[0.02]' : 'bg-rose-500/[0.04]'
            }`} />
            <div className={`absolute bottom-[20%] right-[-5%] w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none ${
                darkMode ? 'bg-blue-500/[0.02]' : 'bg-blue-500/[0.04]'
            }`} />

            <div className="w-full max-w-[1350px] mx-auto relative z-10">

                {/* Section Header */}
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="space-y-3 mb-12 text-center lg:text-left"
                >
                    <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs font-mono tracking-widest uppercase">
                        <FaCode className="text-xs" />
                        <span>Core Arsenal & Specializations</span>
                    </motion.div>

                    <motion.h2 variants={fadeUp} className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        Skills & <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500">Technology Stack</span>
                    </motion.h2>

                    <motion.p variants={fadeUp} className={`text-base sm:text-lg max-w-2xl font-normal leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                        A structured domain matrix spanning full-stack web engineering, offensive cybersecurity, and predictive machine learning.
                    </motion.p>
                </motion.div>

                {/* Compact Infinite Marquee Bar */}
                <div className={`mb-10 p-3 rounded-2xl border backdrop-blur-xl overflow-hidden relative ${
                    darkMode ? 'border-white/[0.08] bg-[#06060a]/80' : 'border-slate-200 bg-white shadow-sm'
                }`}>
                    <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
                        {[...marqueeTechs, ...marqueeTechs, ...marqueeTechs].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                                <div
                                    key={idx}
                                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono shrink-0 transition-colors ${
                                        darkMode 
                                            ? 'border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-white/20' 
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 shadow-sm'
                                    }`}
                                >
                                    <IconComp className={`${item.color} text-sm`} />
                                    <span>{item.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    4-BENTO DOMAIN MATRIX (Compact & Elite)
                    ════════════════════════════════════════════ */}
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {skillPillars.map((pillar) => {
                        const IconComponent = pillar.icon;
                        return (
                            <motion.div
                                key={pillar.id}
                                variants={fadeUp}
                                whileHover={{ y: -3 }}
                                className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 shadow-xl flex flex-col justify-between group cursor-default ${
                                    darkMode 
                                        ? `border-white/10 bg-[#06060a]/90 backdrop-blur-xl ${pillar.borderColor} shadow-black/80` 
                                        : 'border-slate-200/90 bg-white shadow-slate-200/50 hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-5">
                                    {/* Card Header */}
                                    <div className={`flex items-start justify-between gap-3 pb-4 border-b ${
                                        darkMode ? 'border-white/[0.08]' : 'border-slate-100'
                                    }`}>
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-all ${
                                                darkMode ? 'bg-white/[0.04] border-white/10 group-hover:border-white/25' : 'bg-slate-50 border-slate-200'
                                            }`}>
                                                <IconComponent className={pillar.color} />
                                            </div>
                                            <div>
                                                <h3 className={`text-lg sm:text-xl font-bold transition-colors ${
                                                    darkMode ? 'text-white group-hover:text-rose-200' : 'text-slate-900 group-hover:text-rose-600'
                                                }`}>
                                                    {pillar.title}
                                                </h3>
                                                <p className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {pillar.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border shrink-0 hidden sm:inline-block ${pillar.badgeColor}`}>
                                            Verified Domain
                                        </span>
                                    </div>

                                    {/* Tech Skills Badges Matrix */}
                                    <div className="flex flex-wrap gap-2">
                                        {pillar.skills.map((skill, sIdx) => {
                                            const SkillIcon = skill.icon;
                                            return (
                                                <div
                                                    key={sIdx}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-default group/pill ${
                                                        darkMode 
                                                            ? 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-slate-200' 
                                                            : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                                                    }`}
                                                >
                                                    <SkillIcon className={`${skill.color} text-sm group-hover/pill:scale-110 transition-transform`} />
                                                    <span>{skill.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Bottom Capability Summary */}
                                <div className={`pt-4 mt-4 border-t flex items-center justify-between gap-2 text-xs ${
                                    darkMode ? 'border-white/[0.06] text-slate-400' : 'border-slate-100 text-slate-500'
                                }`}>
                                    <span className="leading-relaxed line-clamp-1">{pillar.highlight}</span>
                                    <span className="text-[11px] font-mono text-emerald-500 shrink-0 flex items-center gap-1 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Mastery</span>
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

            </div>
        </section>
    );
}

export default Skills;
