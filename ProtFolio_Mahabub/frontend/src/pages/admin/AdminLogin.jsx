import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, 
    FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaClock,
    FaFingerprint, FaLockOpen, FaBan
} from 'react-icons/fa';
import { loginUser, getLoginAttempts, isAuthenticated } from '../../utils/adminAuth';

function AdminLogin() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockInfo, setLockInfo] = useState({ locked: false, remaining: 0 });
    const [attempts, setAttempts] = useState({ attempts: 0, remaining: 5 });
    const [securityStep, setSecurityStep] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const formRef = useRef(null);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [stepComplete, setStepComplete] = useState({ email: false });
    const [focusedField, setFocusedField] = useState(null);

    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/admin/dashboard');
            return;
        }
        checkLockStatus();
    }, [navigate]);

    useEffect(() => {
        if (lockInfo.locked && lockInfo.remaining > 0) {
            const interval = setInterval(() => {
                setLockInfo(prev => {
                    if (prev.remaining <= 1000) {
                        clearInterval(interval);
                        checkLockStatus();
                        return { locked: false, remaining: 0 };
                    }
                    return { ...prev, remaining: prev.remaining - 1000 };
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [lockInfo.locked]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (formRef.current) {
                const rect = formRef.current.getBoundingClientRect();
                setMousePos({
                    x: ((e.clientX - rect.left) / rect.width - 0.5) * 8,
                    y: ((e.clientY - rect.top) / rect.height - 0.5) * 8
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const checkLockStatus = () => {
        const info = getLoginAttempts();
        setLockInfo({ locked: info.locked, remaining: info.remaining || 0 });
        setAttempts({ attempts: info.attempts || 0, remaining: info.remaining || 5 });
    };

    const formatTime = (ms) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEmailChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, email: val });
        setError('');
        if (val.includes('@') && val.includes('.')) {
            setStepComplete(prev => ({ ...prev, email: true }));
        } else {
            setStepComplete(prev => ({ ...prev, email: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (lockInfo.locked) return;

        setLoading(true);
        setError('');

        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

        const result = await loginUser(formData.email, formData.password);
        
        if (result.success) {
            setSecurityStep(2);
            await new Promise(r => setTimeout(r, 600));
            navigate('/admin/dashboard');
        } else {
            setError(result.error);
            if (result.locked) {
                setLockInfo({ locked: true, remaining: result.remaining });
            } else {
                checkLockStatus();
            }
        }
        setLoading(false);
    };

    const isFormValid = formData.email && formData.password;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated security grid background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }} />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.05, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-1/4 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.03, 0.1] }}
                    transition={{ duration: 10, repeat: Infinity, delay: 2 }}
                    className="absolute bottom-1/4 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
                />
                {/* Floating security icons */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-orange-500/5"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${10 + (i % 3) * 30}%`
                        }}
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 10, -10, 0],
                            opacity: [0.03, 0.08, 0.03]
                        }}
                        transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
                    >
                        <FaShieldAlt className="text-4xl" />
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 80 }}
                className="w-full max-w-md relative z-10"
                ref={formRef}
            >
                {/* Security Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full mb-4">
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <FaFingerprint className="text-orange-500 text-sm" />
                        </motion.div>
                        <span className="text-orange-400 text-xs font-semibold tracking-wider">SECURED ACCESS</span>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    </div>
                </motion.div>

                {/* Main Card */}
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                        transform: `perspective(1000px) rotateX(${mousePos.y * 0.15}deg) rotateY(${mousePos.x * 0.15}deg)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {/* Top security bar */}
                    <div className="h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-purple-500" />

                    <div className="p-8">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-center mb-8"
                        >
                            <motion.div
                                className="w-18 h-18 mx-auto bg-gradient-to-br from-orange-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20"
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                animate={{
                                    boxShadow: [
                                        '0 0 20px rgba(249,115,22,0.2)',
                                        '0 0 40px rgba(249,115,22,0.1)',
                                        '0 0 20px rgba(249,115,22,0.2)'
                                    ]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <FaShieldAlt className="text-white text-2xl" />
                            </motion.div>
                            <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
                            <p className="text-gray-500 text-xs">Enter your credentials to continue</p>
                        </motion.div>

                        {/* Lockout Warning */}
                        <AnimatePresence>
                            {lockInfo.locked && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                                        >
                                            <FaBan className="text-red-500 text-xl" />
                                        </motion.div>
                                        <div>
                                            <p className="text-red-400 text-sm font-semibold">Account Locked</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <FaClock className="text-red-400/60 text-xs" />
                                                <p className="text-red-400/80 text-xs">
                                                    Retry in {formatTime(lockInfo.remaining)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-1.5 bg-red-500/20 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-red-500 rounded-full"
                                            initial={{ width: '100%' }}
                                            animate={{ width: '0%' }}
                                            transition={{ duration: lockInfo.remaining / 1000, ease: 'linear' }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={handleEmailChange}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                        disabled={lockInfo.locked}
                                        autoComplete="email"
                                        className={`w-full pl-11 pr-10 py-3 rounded-xl bg-gray-800/50 border text-white text-sm transition-all duration-300 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                                            focusedField === 'email'
                                                ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/5'
                                                : 'border-gray-700/50 hover:border-gray-600'
                                        }`}
                                        placeholder="you@example.com"
                                    />
                                    <AnimatePresence>
                                        {stepComplete.email && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <FaCheckCircle className="text-green-500 text-sm" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>

                            {/* Password */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setError(''); }}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                        disabled={lockInfo.locked}
                                        autoComplete="current-password"
                                        className={`w-full pl-11 pr-12 py-3 rounded-xl bg-gray-800/50 border text-white text-sm transition-all duration-300 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                                            focusedField === 'password'
                                                ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/5'
                                                : 'border-gray-700/50 hover:border-gray-600'
                                        }`}
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                    </button>
                                </div>
                            </motion.div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, height: 0 }}
                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                        exit={{ opacity: 0, y: -10, height: 0 }}
                                        className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2"
                                    >
                                        <FaExclamationTriangle className="text-red-400 text-sm flex-shrink-0" />
                                        <span className="text-red-400 text-xs">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={loading || lockInfo.locked || !isFormValid}
                                whileHover={!loading && !lockInfo.locked ? { scale: 1.01 } : {}}
                                whileTap={!loading && !lockInfo.locked ? { scale: 0.99 } : {}}
                                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
                                    loading || lockInfo.locked || !isFormValid
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30'
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2"
                                        >
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <FaShieldAlt className="text-sm" />
                                            </motion.div>
                                            <span>Verifying...</span>
                                        </motion.div>
                                    ) : securityStep === 2 ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            <FaCheckCircle className="text-sm" />
                                            <span>Access Granted</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="login"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2"
                                        >
                                            <FaLockOpen className="text-sm" />
                                            <span>Authenticate</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {!loading && !lockInfo.locked && isFormValid && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
                                        style={{ transform: 'skewX(-15deg)' }}
                                    />
                                )}
                            </motion.button>
                        </form>

                        {/* Security Footer */}
                        <div className="mt-6 pt-4 border-t border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${lockInfo.locked ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                    <span className="text-[10px] text-gray-500">
                                        {lockInfo.locked ? 'LOCKED' : 'SECURE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-600">
                                        {attempts.remaining}/5 attempts
                                    </span>
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 h-1 rounded-full ${
                                                    i < attempts.remaining ? 'bg-orange-500' : 'bg-gray-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-600 text-[10px] text-center mt-2">
                                Unauthorized access is prohibited and logged
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default AdminLogin;
