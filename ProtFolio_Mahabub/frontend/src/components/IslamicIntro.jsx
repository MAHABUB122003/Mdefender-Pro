import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function IslamicIntro({ onComplete, duration = 2.4 }) {
    const [counter, setCounter] = useState(0);
    const [stage, setStage] = useState('bismillah'); // 'bismillah' -> 'name' -> 'exit'

    useEffect(() => {
        const start = Date.now();
        const totalDurationMs = duration * 1000;

        const timer = setInterval(() => {
            const elapsed = Date.now() - start;
            const progress = Math.min(100, Math.floor((elapsed / totalDurationMs) * 100));
            setCounter(progress);

            if (progress >= 45 && stage === 'bismillah') {
                setStage('name');
            }

            if (progress >= 100) {
                clearInterval(timer);
                setTimeout(onComplete, 500);
            }
        }, 20);

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                clearInterval(timer);
                onComplete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearInterval(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [duration, onComplete, stage]);

    return (
        <motion.div
            className="fixed inset-0 z-[10000] flex flex-col justify-between p-6 sm:p-12 overflow-hidden bg-[#000000] text-white select-none cursor-pointer"
            onClick={onComplete}
            initial={{ y: 0 }}
            exit={{
                y: '-100%',
                transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
            }}
        >
            {/* Ambient Neutral Luxury Lighting */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/[0.03] rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>

            {/* ── Top Header: Brand & Status ── */}
            <div className="w-full flex items-center justify-between text-xs font-mono tracking-widest text-slate-400 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="text-white font-bold">MR.</span>
                    <span className="text-slate-400 hidden sm:inline">• PORTFOLIO 2026</span>
                </div>

                <div className="text-[10px] text-slate-300 uppercase px-3 py-1 rounded-full border border-white/10 bg-white/5">
                    SKIP [SPACE]
                </div>
            </div>

            {/* ── Centerpiece: Elegant Staggered Invocation & Identity ── */}
            <div className="relative my-auto flex flex-col items-center justify-center text-center z-10 w-full max-w-3xl mx-auto py-8">
                <AnimatePresence mode="wait">
                    {stage === 'bismillah' ? (
                        <motion.div
                            key="bismillah-block"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-4"
                        >
                            <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-slate-400 block">
                                ✦ IN THE NAME OF ALLAH ✦
                            </span>
                            <h1
                                dir="rtl"
                                lang="ar"
                                className="font-arabic text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-normal leading-[1.7] drop-shadow-[0_4px_35px_rgba(255,255,255,0.45)]"
                                style={{
                                    fontFamily: "'Amiri', 'Noto Naskh Arabic', 'Scheherazade New', serif",
                                    textRendering: 'optimizeLegibility',
                                }}
                            >
                                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </h1>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="name-block"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-3"
                        >
                            <span className="text-xs font-mono tracking-[0.3em] uppercase text-slate-400 block font-semibold">
                                WELCOME TO THE PORTFOLIO OF
                            </span>
                            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase">
                                MD MAHABUBUR RAHMAN
                            </h2>
                            <p className="text-xs sm:text-sm font-mono tracking-[0.2em] text-slate-300 uppercase">
                                Full-Stack Developer • Cybersecurity Specialist • ML
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Bottom Section: Modern Kinetic Counter & Razor-Thin Line ── */}
            <div className="w-full relative z-10 space-y-4">
                {/* Thin Center Razor Laser Line */}
                <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                        style={{ width: `${counter}%` }}
                    />
                </div>

                <div className="flex items-end justify-between">
                    <div className="text-left">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">STATUS</p>
                        <p className="text-xs font-mono font-semibold text-slate-200">
                            {counter < 40 ? 'INITIALIZING EXPERIENCE' : counter < 85 ? 'DECRYPTING ASSETS' : 'SYSTEM READY'}
                        </p>
                    </div>

                    {/* Massive Kinetic Percentage Counter */}
                    <div className="text-right">
                        <span className="text-4xl sm:text-6xl md:text-7xl font-black font-mono tracking-tighter text-white">
                            {counter < 10 ? `0${counter}` : counter}
                        </span>
                        <span className="text-xl sm:text-2xl font-mono text-slate-400 font-bold ml-1">%</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default IslamicIntro;
