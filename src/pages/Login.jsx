import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AlertCircle, Lock, Mail, ChevronRight, Fingerprint, ScanFace, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import Toast from '../components/Toast';
import { safeStorage } from '../utils/storage';

const Login = () => {
    const { showToast } = useNotification();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false); // Forced false for centralized login
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('password'); // 'password' or 'passkey'
    const { login, signup, loginWithPasskey, seedAdmin } = useAuth();
    const navigate = useNavigate();

    const [mfaStep, setMfaStep] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [tempSession, setTempSession] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        console.log("Login: Authentication request initiated.");

        try {
            // SURGICAL PRE-LOGIN CLEANUP: 
            try {
                const whitelist = ['sb-', 'auth-token', 'training_email', 'RESCUE_LOG'];
                Object.keys(localStorage).forEach(k => {
                    if (!whitelist.some(w => k.includes(w))) {
                        safeStorage.removeItem(k);
                    }
                });
            } catch (e) { }

            // 1. Check for Rate Limit / Lockout BEFORE Supabase Auth
            const { data: checkData, error: checkError } = await supabase.rpc('attempt_login_check', {
                p_email: email
            });

            if (checkError) console.error("Lockout Check Error:", checkError);

            // If locked out, STOP.
            if (checkData && checkData.allowed === false) {
                throw new Error(checkData.error || "Too many attempts. Account temporary locked.");
            }

            const data = await login(email, password);

            // Check if user has MFA enabled (except for hr@vistaauction.com)
            if (email !== 'hr@vistaauction.com') {
                // We'll simulate checking the profile's mfa_enabled field
                // In a real app, you'd check this from the profiles table
                const { data: profile } = await supabase.from('vista_employees').select('mfa_enabled').eq('email', email).single();

                if (profile?.mfa_enabled) {
                    setTempSession(data);
                    setMfaStep(true);
                    setLoading(false);
                    showToast("2-Step Verification Required", "info");
                    return;
                }
            }

            console.log("Login: Success, redirecting...");
            navigate('/hr');
        } catch (err) {
            setError(err.message || "Authentication failed.");
        } finally {
            if (!mfaStep) setLoading(false);
        }
    };

    const handleMfaVerify = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // SERVER-SIDE VERIFICATION for Session
            const { data: isVerified, error } = await supabase.rpc('verify_admin_mfa', {
                p_code: mfaCode
            });

            if (error) throw error;

            if (isVerified) {
                showToast("Identity Verified Securely!", "success");
                navigate('/hr');
            } else {
                setError("Invalid code. Please try again.");
                setLoading(false);
            }
        } catch (err) {
            setError("MFA Verification Failed: " + err.message);
            setLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const success = await loginWithPasskey(email);
            if (success) {
                showToast("Biometric Verified! Redirecting...", "success");
                navigate('/hr');
            }
        } catch (err) {
            setError(err.message || "Passkey authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans text-gray-800">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-950/95"></div>

            <Navbar />

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-20">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in-up">

                    {/* Header */}
                    <div className="p-8 text-center border-b border-white/10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 font-display">Secure Access</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Vista Auction HR Portal</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 gap-2 bg-black/20 mx-6 mt-6 rounded-xl">
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'password' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Mail size={14} /> Password
                        </button>
                        <button
                            onClick={() => setActiveTab('passkey')}
                            className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'passkey' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ScanFace size={14} /> Passkey
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-8 pt-6">
                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 text-red-200">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {mfaStep ? (
                            <form onSubmit={handleMfaVerify} className="space-y-6 animate-fade-in">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                        <Shield className="text-orange-500" size={32} />
                                    </div>
                                    <h3 className="text-white font-black text-xl mb-1">Verify Identity</h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">A code was sent to your registered device</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            required
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value)}
                                            maxLength={6}
                                            pattern="[0-9]*"
                                            autoComplete="one-time-code"
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-12 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all text-center text-2xl tracking-[0.5em] font-black"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                >
                                    {loading ? 'Verifying...' : 'Complete Login'} <ChevronRight size={16} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMfaStep(false)}
                                    className="w-full text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <>
                                {/* Shared Email Input */}
                                <div className="space-y-1 mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-12 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
                                            placeholder="hr@vistaauction.com"
                                            autoComplete="email"
                                            maxLength={64}
                                            pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                                        />
                                    </div>
                                </div>

                                {activeTab === 'password' ? (
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                                <input
                                                    type="password"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-12 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
                                                    placeholder="••••••••••••"
                                                    autoComplete="current-password"
                                                    maxLength={64}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs"
                                        >
                                            {loading ? 'Processing...' : 'Sign In'} <ChevronRight size={16} />
                                        </button>

                                        <div className="text-center mt-4">
                                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                                Vista Auction Internal System
                                            </p>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="text-center py-4 space-y-6">
                                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 animate-pulse">
                                            <Fingerprint size={48} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-xl mb-2">Biometric Login</h3>
                                            <p className="text-slate-400 text-sm leading-relaxed">Use your device's Face ID, Touch ID, or security key for instant access.</p>
                                        </div>

                                        <button
                                            onClick={handlePasskeyLogin}
                                            disabled={loading}
                                            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                        >
                                            <ScanFace size={16} /> Sign in with Passkey
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="mt-8 text-center space-y-4">
                            <a href="#" className="text-slate-500 hover:text-orange-400 text-xs font-bold transition-colors">Forgot your credentials?</a>

                            {/* Temp Seed Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const { data, error } = await seedAdmin();
                                        if (error) {
                                            showToast("Initialization Failed: " + error.message, 'error');
                                        } else {
                                            showToast("System Initialized! Bypass verification in SQL.", 'success');
                                        }
                                    } catch (e) {
                                        showToast("Error: " + e.message, 'error');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="block mx-auto text-[9px] text-slate-700 hover:text-orange-600 uppercase tracking-widest font-mono"
                            >
                                [DEV: Initialize System]
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
        </div>
    );
};

export default Login;
