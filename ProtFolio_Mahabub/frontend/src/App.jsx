import Navbar from './components/Navbar';
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Hero from './components/Hero';
import About from './components/About';
import Education from './components/Education';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import IslamicIntro from './components/IslamicIntro';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHero from './pages/admin/AdminHero';
import AdminAbout from './pages/admin/AdminAbout';
import AdminEducation from './pages/admin/AdminEducation';
import AdminSkills from './pages/admin/AdminSkills';
import AdminContact from './pages/admin/AdminContact';
import AdminMessages from './pages/admin/AdminMessages';
import AdminGeneral from './pages/admin/AdminGeneral';
import ProjectForm from './components/admin/ProjectForm';
import ParticleField from './components/three/ParticleField';
import { syncSectionsFromBackend } from './utils/portfolioData';
import { syncProjectsFromBackend } from './utils/projectStorage';

function PortfolioSite({ darkMode, toggleDarkMode }) {
    return (
        <div className={`${darkMode ? 'bg-[#000000] text-slate-100' : 'bg-[#fcfbf9] text-gray-900'} min-h-screen transition-colors duration-500 relative overflow-hidden`}>
            {/* Ambient Lighting Layers for Pure Obsidian Editorial Theme */}
            {darkMode && (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    {/* Ambient top-left soft crimson flare */}
                    <div className="absolute -top-32 left-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-rose-500/[0.03] via-transparent to-transparent rounded-full blur-[150px]" />
                    {/* Ambient lower right slate flare */}
                    <div className="absolute top-[60%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-tl from-slate-800/[0.04] to-transparent rounded-full blur-[160px]" />
                </div>
            )}

            <ParticleField darkMode={darkMode} />
            <div className="relative z-10">
                <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                <Hero darkMode={darkMode} />
                <About darkMode={darkMode} />
                <Education darkMode={darkMode} />
                <Skills darkMode={darkMode} />
                <Projects darkMode={darkMode} />
                <Contact darkMode={darkMode} />
                <Footer darkMode={darkMode} />
            </div>
        </div>
    );
}

function AdminRoutes() {
    return (
        <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="hero" element={<AdminHero />} />
                <Route path="about" element={<AdminAbout />} />
                <Route path="education" element={<AdminEducation />} />
                <Route path="skills" element={<AdminSkills />} />
                <Route path="projects" element={<AdminDashboard />} />
                <Route path="projects/new" element={<ProjectForm />} />
                <Route path="projects/edit/:id" element={<ProjectForm />} />
                <Route path="contact" element={<AdminContact />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="general" element={<AdminGeneral />} />
            </Route>
        </Routes>
    );
}

function AppRoutes() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');
    const [darkMode, setDarkMode] = useState(true);
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: false,
            offset: 100
        });
        emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

        syncSectionsFromBackend();
        syncProjectsFromBackend();
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Lock page scroll while the intro splash is visible
    useEffect(() => {
        if (showIntro && !isAdmin) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showIntro, isAdmin]);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (isAdmin) {
        return <AdminRoutes />;
    }

    return (
        <>
            <AnimatePresence>
                {showIntro && <IslamicIntro onComplete={() => setShowIntro(false)} />}
            </AnimatePresence>
            {!showIntro && <PortfolioSite darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
        </>
    );
}

function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}

export default App;
