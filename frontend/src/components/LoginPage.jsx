import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, User, Lock, UserPlus, LogIn, Shield, Stethoscope, Heart } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('doctor');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = isSignup ? '/auth/signup' : '/auth/login';
            const body = isSignup
                ? { username, password, role, full_name: fullName }
                : { username, password };

            const API_BASE = 'http://localhost:8000';
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Authentication failed');

            localStorage.setItem('ews_token', data.token);
            localStorage.setItem('ews_user', JSON.stringify(data.user));
            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = async (user, pass) => {
        setUsername(user);
        setPassword(pass);
        setLoading(true);
        setError('');
        try {
            const API_BASE = 'http://localhost:8000';
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Login failed');
            localStorage.setItem('ews_token', data.token);
            localStorage.setItem('ews_user', JSON.stringify(data.user));
            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1526 30%, #111b33 60%, #0a0e1a 100%)' }}>
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl"></div>
                
                {/* Floating medical icons */}
                {[Heart, Shield, Activity, Stethoscope].map((Icon, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-white/5"
                        initial={{ y: 0, opacity: 0.3 }}
                        animate={{ y: [-20, 20, -20], opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ left: `${15 + i * 22}%`, top: `${20 + i * 15}%` }}
                    >
                        <Icon size={40 + i * 10} />
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-3 mb-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
                            <Activity size={28} className="text-white" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-black text-white tracking-tight">EWS Pro</h1>
                            <p className="text-xs text-blue-400/80 font-medium tracking-wider uppercase">Hospital Intelligence Platform</p>
                        </div>
                    </div>
                </motion.div>

                {/* Card */}
                <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/40">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-white mb-1">
                            {isSignup ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {isSignup ? 'Join the monitoring platform' : 'Sign in to continue'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.form
                            key={isSignup ? 'signup' : 'login'}
                            initial={{ opacity: 0, x: isSignup ? 30 : -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isSignup ? -30 : 30 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            {isSignup && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
                                            placeholder="Dr. John Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Username</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            </div>

                            {isSignup && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Role</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRole('doctor')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${role === 'doctor'
                                                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                                                : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/[0.12]'}`}
                                        >
                                            <Stethoscope size={16} /> Doctor
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('patient')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${role === 'patient'
                                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                                : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/[0.12]'}`}
                                        >
                                            <User size={16} /> Patient
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
                                        {isSignup ? 'Create Account' : 'Sign In'}
                                    </>
                                )}
                            </button>
                        </motion.form>
                    </AnimatePresence>

                    <div className="mt-5 text-center">
                        <button
                            onClick={() => { setIsSignup(!isSignup); setError(''); }}
                            className="text-sm text-blue-400/70 hover:text-blue-400 transition-colors font-medium"
                        >
                            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    {/* Quick Login Buttons */}
                    {!isSignup && (
                        <div className="mt-6 pt-5 border-t border-white/[0.06]">
                            <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wider font-semibold">Quick Access</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => quickLogin('doctor', 'doctor123')}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-400 transition-all"
                                >
                                    <Stethoscope size={14} /> Doctor Demo
                                </button>
                                <button
                                    onClick={() => quickLogin('patient', 'patient123')}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-all"
                                >
                                    <User size={14} /> Patient Demo
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    AI-Powered Hospital Monitoring System v2.0
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
