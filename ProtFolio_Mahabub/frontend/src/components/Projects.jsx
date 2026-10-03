import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaGithub,
    FaExternalLinkAlt,
    FaTimes,
    FaCheckCircle,
    FaCalendarAlt,
    FaShieldAlt,
    FaBrain,
    FaLaptopCode,
    FaSearch,
    FaFolderOpen,
    FaArrowRight,
    FaCode,
    FaLayerGroup
} from 'react-icons/fa';
import { getProjects, syncProjectsFromBackend } from '../utils/projectStorage';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
};

function Projects({ darkMode }) {
    const [projects, setProjects] = useState(() => getProjects());
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    useEffect(() => {
        setProjects(getProjects());

        const handleUpdate = () => {
            setProjects(getProjects());
        };

        window.addEventListener('portfolio_projects_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        // Fetch fresh list from backend
        syncProjectsFromBackend().then((res) => {
            if (res) {
                setProjects(getProjects());
            }
        }).catch(() => {});

        return () => {
            window.removeEventListener('portfolio_projects_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const categories = [
        { id: 'all', label: 'All Projects', icon: FaFolderOpen },
        { id: 'security', label: 'Cybersecurity & Pentest', icon: FaShieldAlt },
        { id: 'ml', label: 'Machine Learning & AI', icon: FaBrain },
        { id: 'web', label: 'Full-Stack Web', icon: FaLaptopCode },
    ];

    const normalizeCategory = (cat) => {
        if (!cat) return 'web';
        const lower = cat.toLowerCase();
        if (lower.includes('ml') || lower.includes('machine') || lower.includes('ai')) return 'ml';
        if (lower.includes('security') || lower.includes('cyber') || lower.includes('threat')) return 'security';
        return 'web';
    };

    const filteredProjects = projects.filter(project => {
        const normCat = normalizeCategory(project.category);
        const matchesCategory = activeCategory === 'all' || normCat === activeCategory;
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.fullDescription && project.fullDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (project.tech && project.tech.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
        return matchesCategory && matchesSearch;
    });

    const getCategoryDetails = (category) => {
        const norm = normalizeCategory(category);
        if (norm === 'security') {
            return {
                icon: FaShieldAlt,
                color: darkMode ? 'text-rose-400' : 'text-rose-600',
                border: darkMode ? 'border-rose-500/30' : 'border-rose-300',
                bg: darkMode ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-100 text-rose-800 font-bold',
                label: 'Cybersecurity'
            };
        }
        if (norm === 'ml') {
            return {
                icon: FaBrain,
                color: darkMode ? 'text-blue-400' : 'text-blue-600',
                border: darkMode ? 'border-blue-500/30' : 'border-blue-300',
                bg: darkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-100 text-blue-800 font-bold',
                label: 'Machine Learning'
            };
        }
        return {
            icon: FaLaptopCode,
            color: darkMode ? 'text-emerald-400' : 'text-emerald-600',
            border: darkMode ? 'border-emerald-500/30' : 'border-emerald-300',
            bg: darkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-800 font-bold',
            label: 'Full-Stack Web'
        };
    };

    return (
        <section
            id="projects"
            className={`relative py-24 sm:py-32 px-4 sm:px-6 md:px-10 lg:px-12 overflow-hidden transition-colors duration-500 ${
                darkMode ? 'bg-[#000000] border-t border-white/[0.06]' : 'bg-[#fcfbf9] border-t border-slate-200'
            }`}
        >
            {/* Ambient Background Flares */}
            <div className={`absolute top-[15%] right-[-5%] w-[550px] h-[550px] rounded-full blur-[170px] pointer-events-none ${
                darkMode ? 'bg-rose-500/[0.02]' : 'bg-rose-500/[0.04]'
            }`} />
            <div className={`absolute bottom-[15%] left-[-5%] w-[550px] h-[550px] rounded-full blur-[170px] pointer-events-none ${
                darkMode ? 'bg-blue-500/[0.02]' : 'bg-blue-500/[0.04]'
            }`} />

            <div className="w-full max-w-[1350px] mx-auto relative z-10">

                {/* Section Header */}
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="space-y-3 mb-14 text-center lg:text-left"
                >
                    <motion.div
                        variants={fadeUp}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-widest uppercase ${
                            darkMode
                                ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                                : 'border-rose-300/80 bg-rose-50 text-rose-700 font-semibold'
                        }`}
                    >
                        <FaFolderOpen className="text-xs" />
                        <span>Featured Engineering Portfolio</span>
                    </motion.div>

                    <motion.h2
                        variants={fadeUp}
                        className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${
                            darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                        Featured{' '}
                        <span className={darkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-rose-300' : 'text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-rose-950 to-rose-600'}>
                            Projects & Solutions
                        </span>
                    </motion.h2>

                    <motion.p
                        variants={fadeUp}
                        className={`text-base sm:text-lg max-w-2xl font-light leading-relaxed ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}
                    >
                        Production-grade applications combining AI threat classification, offensive security research labs, and hardened full-stack web platforms.
                    </motion.p>
                </motion.div>

                {/* Filter Controls & Instant Search */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
                    {/* Category Filter Tabs */}
                    <div
                        className={`w-full md:w-auto flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 p-1.5 rounded-2xl border backdrop-blur-xl ${
                            darkMode
                                ? 'border-white/10 bg-[#06060a]/90'
                                : 'border-slate-300/80 bg-white/95 shadow-sm'
                        }`}
                    >
                        {categories.map((cat) => {
                            const IconComp = cat.icon;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                                        isActive
                                            ? 'text-white bg-[#f43f5e] shadow-lg shadow-rose-900/40 font-semibold'
                                            : darkMode
                                            ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                            : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-semibold'
                                    }`}
                                >
                                    <IconComp className="text-xs" />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Search Input */}
                    <div className="relative w-full md:w-72">
                        <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            placeholder="Search by title, tech or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border backdrop-blur-xl text-xs sm:text-sm transition-colors focus:outline-none ${
                                darkMode
                                    ? 'border-white/10 bg-[#06060a]/90 text-white placeholder:text-slate-500 focus:border-rose-500/50'
                                    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-rose-500 shadow-sm'
                            }`}
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7"
                >
                    <AnimatePresence>
                        {filteredProjects.map((project, idx) => {
                            const catDetails = getCategoryDetails(project.category);
                            const CatIcon = catDetails.icon;

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.35, delay: idx * 0.04 }}
                                    key={project.id || idx}
                                    whileHover={{ y: -4 }}
                                    className={`group rounded-3xl border backdrop-blur-xl flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                                        darkMode
                                            ? 'border-white/10 bg-[#06060a]/90 hover:border-rose-500/40 shadow-2xl shadow-black/80'
                                            : 'border-slate-200 bg-white hover:border-rose-400/80 shadow-md shadow-slate-200/60 hover:shadow-xl hover:shadow-slate-300/50'
                                    }`}
                                >
                                    {/* Top Cover Image Area */}
                                    <div
                                        className={`relative w-full h-48 sm:h-52 overflow-hidden cursor-pointer ${
                                            darkMode ? 'bg-[#0a0a14]' : 'bg-slate-50'
                                        }`}
                                        onClick={() => setSelectedProject(project)}
                                    >
                                        {project.image ? (
                                            <img
                                                src={project.image}
                                                alt={project.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${
                                                darkMode
                                                    ? 'bg-gradient-to-br from-rose-500/10 via-slate-900 to-black'
                                                    : 'bg-gradient-to-br from-rose-50/70 via-slate-100 to-slate-200/70'
                                            }`}>
                                                <div className="text-center p-4">
                                                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-2 text-2xl ${
                                                        darkMode ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                                                    }`}>
                                                        <CatIcon className={catDetails.color} />
                                                    </div>
                                                    <span className={`text-xs font-mono font-bold uppercase tracking-widest ${
                                                        darkMode ? 'text-slate-400' : 'text-slate-700'
                                                    }`}>{catDetails.label}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Ambient gradient vignette (Only in dark mode to blend with dark card body, clean in light mode) */}
                                        {darkMode && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-[#06060a]/40 to-transparent pointer-events-none" />
                                        )}

                                        {/* Category & Status Overlay Pills */}
                                        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold backdrop-blur-xl border flex items-center gap-1.5 shadow-md ${
                                                darkMode
                                                    ? `${catDetails.bg} ${catDetails.border}`
                                                    : 'bg-white/95 text-slate-900 border-slate-300 shadow-sm'
                                            }`}>
                                                <CatIcon className={`text-xs ${darkMode ? '' : catDetails.color}`} />
                                                <span>{catDetails.label}</span>
                                            </span>

                                            {project.status && (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-xl border flex items-center gap-1.5 shadow-md ${
                                                    darkMode
                                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                                                        : 'border-emerald-500/50 bg-emerald-50 text-emerald-800 shadow-sm font-semibold'
                                                }`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span>{project.status}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick Expand Hint */}
                                        <div className="absolute bottom-3 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className={`text-[11px] font-mono backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                                                darkMode
                                                    ? 'text-white/90 bg-black/80 border-white/15'
                                                    : 'text-slate-900 bg-white/95 border-slate-300 shadow-md font-medium'
                                            }`}>
                                                <span>View Details</span>
                                                <FaArrowRight className="text-[9px] text-rose-500" />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                        <div className="space-y-2.5">
                                            <div className={`flex items-center justify-between text-[11px] font-mono ${
                                                darkMode ? 'text-slate-500' : 'text-slate-500'
                                            }`}>
                                                <span className="flex items-center gap-1.5">
                                                    <FaCalendarAlt className="text-rose-500" />
                                                    <span>{project.date || '2024'}</span>
                                                </span>
                                                <span className={`capitalize ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{project.category || 'Project'}</span>
                                            </div>

                                            <h3
                                                onClick={() => setSelectedProject(project)}
                                                className={`text-lg font-bold transition-colors cursor-pointer leading-snug line-clamp-2 ${
                                                    darkMode ? 'text-white group-hover:text-rose-200' : 'text-slate-900 group-hover:text-rose-600'
                                                }`}
                                            >
                                                {project.title}
                                            </h3>

                                            <p className={`text-xs sm:text-sm leading-relaxed line-clamp-2 font-normal ${
                                                darkMode ? 'text-slate-300' : 'text-slate-700'
                                            }`}>
                                                {project.description}
                                            </p>

                                            {/* Tech Stack Pills */}
                                            <div className="flex flex-wrap gap-1.5 pt-2">
                                                {project.tech && project.tech.slice(0, 4).map((t, tIdx) => (
                                                    <span
                                                        key={tIdx}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                                                            darkMode
                                                                ? 'bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:border-white/20'
                                                                : 'bg-slate-100/90 border border-slate-200/90 text-slate-800 font-medium hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {project.tech && project.tech.length > 4 && (
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-mono ${
                                                        darkMode
                                                            ? 'bg-white/[0.02] border border-white/[0.06] text-slate-500'
                                                            : 'bg-slate-100 border border-slate-200 text-slate-600 font-medium'
                                                    }`}>
                                                        +{project.tech.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Footer Actions */}
                                        <div className={`pt-4 border-t flex items-center justify-between ${
                                            darkMode ? 'border-white/[0.06]' : 'border-slate-100'
                                        }`}>
                                            <button
                                                onClick={() => setSelectedProject(project)}
                                                className={`text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                    darkMode ? 'text-white hover:text-rose-300' : 'text-slate-900 hover:text-rose-600'
                                                }`}
                                            >
                                                <span>View Details</span>
                                                <FaArrowRight className="text-[10px] text-rose-500" />
                                            </button>

                                            <div className="flex items-center gap-2">
                                                {project.github && (
                                                    <a
                                                        href={project.github}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition-all ${
                                                            darkMode
                                                                ? 'border-white/10 bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/30'
                                                                : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                                                        }`}
                                                        title="GitHub Repository"
                                                    >
                                                        <FaGithub />
                                                    </a>
                                                )}
                                                {project.demo && project.demo !== '#' && (
                                                    <a
                                                        href={project.demo}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shadow-md transition-all ${
                                                            darkMode
                                                                ? 'bg-white text-gray-950 hover:bg-slate-200'
                                                                : 'bg-slate-900 text-white hover:bg-rose-600'
                                                        }`}
                                                        title="Live Demo"
                                                    >
                                                        <FaExternalLinkAlt />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                    <div className="text-center py-20">
                        <FaSearch className="text-4xl text-slate-500 mx-auto mb-3" />
                        <p className={`text-sm font-mono ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No matching projects found for your query.</p>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    100% AUTHENTIC & RICH PROJECT DETAILS MODAL
                    ════════════════════════════════════════════ */}
                <AnimatePresence>
                    {selectedProject && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-2xl overflow-y-auto ${
                                darkMode ? 'bg-black/90' : 'bg-slate-950/70'
                            }`}
                            onClick={() => setSelectedProject(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.94, y: 30, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.94, y: 30, opacity: 0 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className={`relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border p-4 sm:p-7 md:p-9 shadow-2xl space-y-6 sm:space-y-7 custom-scrollbar my-auto ${
                                    darkMode
                                        ? 'border-white/15 bg-[#06060a] text-white shadow-black'
                                        : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header Area */}
                                <div className={`flex items-start justify-between gap-4 pb-6 border-b ${
                                    darkMode ? 'border-white/10' : 'border-slate-200'
                                }`}>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-500 uppercase tracking-wider">
                                                {selectedProject.category || 'Project'}
                                            </span>
                                            {selectedProject.status && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-1.5 ${
                                                    darkMode
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-emerald-50 border-emerald-500/30 text-emerald-700'
                                                }`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span>{selectedProject.status}</span>
                                                </span>
                                            )}
                                            {selectedProject.date && (
                                                <span className={`text-xs font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    • {selectedProject.date}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug ${
                                            darkMode ? 'text-white' : 'text-slate-900'
                                        }`}>
                                            {selectedProject.title}
                                        </h3>
                                    </div>

                                    <button
                                        onClick={() => setSelectedProject(null)}
                                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                                            darkMode
                                                ? 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/25'
                                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        }`}
                                        aria-label="Close modal"
                                    >
                                        <FaTimes className="text-base" />
                                    </button>
                                </div>

                                {/* Modal Cover Image */}
                                {selectedProject.image && (
                                    <div className={`w-full h-64 sm:h-72 rounded-2xl overflow-hidden border relative group ${
                                        darkMode ? 'border-white/10 bg-[#0a0a14]' : 'border-slate-200 bg-slate-100'
                                    }`}>
                                        <img
                                            src={selectedProject.image}
                                            alt={selectedProject.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className={`absolute inset-0 pointer-events-none ${
                                            darkMode
                                                ? 'bg-gradient-to-t from-[#06060a]/80 via-transparent to-transparent'
                                                : 'bg-gradient-to-t from-black/40 via-transparent to-transparent'
                                        }`} />
                                    </div>
                                )}

                                {/* Authentic Description / Full Description */}
                                <div className={`space-y-3 p-5 rounded-2xl border ${
                                    darkMode ? 'border-white/[0.08] bg-[#0c0c14]/80' : 'border-slate-200 bg-slate-50'
                                }`}>
                                    <h4 className="text-xs font-mono uppercase tracking-widest text-rose-500 flex items-center gap-2 font-bold">
                                        <FaFolderOpen />
                                        <span>Project Overview & Details</span>
                                    </h4>
                                    <div className={`text-sm sm:text-base leading-relaxed font-normal space-y-3 ${
                                        darkMode ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                        {(selectedProject.fullDescription || selectedProject.description)
                                            .split('\n\n')
                                            .map((para, pIdx) => (
                                                <p key={pIdx}>{para}</p>
                                            ))}
                                    </div>
                                </div>

                                {/* Authentic Project Key Features (Real list from project) */}
                                {selectedProject.features && selectedProject.features.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 font-bold ${
                                            darkMode ? 'text-slate-300' : 'text-slate-700'
                                        }`}>
                                            <FaCheckCircle className="text-emerald-500" />
                                            <span>Key Features & Functional Highlights</span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {selectedProject.features.map((feature, fIdx) => (
                                                <div
                                                    key={fIdx}
                                                    className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                                                        darkMode
                                                            ? 'border-white/[0.07] bg-[#0c0c14]/50'
                                                            : 'border-slate-200 bg-slate-50/80'
                                                    }`}
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                                    <span className={`text-xs sm:text-sm leading-relaxed font-normal ${
                                                        darkMode ? 'text-slate-200' : 'text-slate-800'
                                                    }`}>
                                                        {feature}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Complete Technology Stack (Real tags) */}
                                {selectedProject.tech && selectedProject.tech.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 font-bold ${
                                            darkMode ? 'text-slate-400' : 'text-slate-600'
                                        }`}>
                                            <FaCode className="text-rose-500" />
                                            <span>Technology Stack & Integrated Libraries</span>
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProject.tech.map((t, tIdx) => (
                                                <span
                                                    key={tIdx}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono border ${
                                                        darkMode
                                                            ? 'bg-white/[0.04] border-white/10 text-slate-200'
                                                            : 'bg-slate-100 border-slate-200 text-slate-800 font-medium'
                                                    }`}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Modal Footer Actions */}
                                <div className={`pt-6 border-t flex flex-wrap items-center justify-between gap-4 ${
                                    darkMode ? 'border-white/10' : 'border-slate-200'
                                }`}>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {selectedProject.demo && selectedProject.demo !== '#' && (
                                            <a
                                                href={selectedProject.demo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-lg shadow-rose-900/40 flex items-center gap-2.5 transition-all cursor-pointer"
                                            >
                                                <FaExternalLinkAlt className="text-xs" />
                                                <span>Live Deployment</span>
                                            </a>
                                        )}
                                        {selectedProject.github && (
                                            <a
                                                href={selectedProject.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`px-6 py-3.5 rounded-xl text-xs sm:text-sm font-medium border backdrop-blur-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                                                    darkMode
                                                        ? 'border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/30'
                                                        : 'border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200'
                                                }`}
                                            >
                                                <FaGithub className="text-sm" />
                                                <span>GitHub Source Code</span>
                                            </a>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setSelectedProject(null)}
                                        className={`text-xs font-mono transition-colors cursor-pointer ${
                                            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        Close Window [Esc]
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </section>
    );
}

export default Projects;
