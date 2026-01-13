import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DateTimePicker from '../components/DateTimePicker';
import { Search, CheckCircle, XCircle, Clock, Calendar, AlertCircle, Loader, Mail, User, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const StatusPage = () => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const checkStatus = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('vista_applications')
                .select('*')
                .eq('email', email.trim())
                .ilike('fullName', fullName.trim())
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setError('No application found with these details.');
                } else {
                    throw fetchError;
                }
            } else {
                setResult(data);
            }
        } catch (err) {
            console.error('Status check error:', err);
            setError('System error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [suggestedFullDate, setSuggestedFullDate] = useState('');

    const handleReschedule = async (e) => {
        e.preventDefault();
        if (!result || !suggestedFullDate) return;

        try {
            const { error: updateError } = await supabase
                .from('vista_applications')
                .update({
                    rescheduleRequested: true,
                    suggestedInterviewDate: suggestedFullDate
                })
                .eq('id', result.id);

            if (updateError) throw updateError;

            setResult({
                ...result,
                rescheduleRequested: true,
                suggestedInterviewDate: suggestedFullDate
            });
            setShowRescheduleModal(false);
        } catch (err) {
            console.error('Reschedule error:', err);
            alert('Failed to request reschedule. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <Navbar />

            {/* Reschedule Modal */}
            {showRescheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-gray-100 animate-scale-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Suggest New Date</h3>
                            <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleReschedule} className="space-y-8">
                            <DateTimePicker
                                label="Choose New Interview Slot"
                                value={suggestedFullDate}
                                onChange={setSuggestedFullDate}
                            />

                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-[10px] font-bold text-orange-700 leading-relaxed shadow-inner">
                                <AlertCircle size={14} className="inline mr-2 mb-0.5" />
                                Our HR team will review your suggested slot and reach out via email to confirm the change.
                            </div>

                            <button
                                type="submit"
                                disabled={!suggestedFullDate}
                                className={`glass-button w-full py-4 rounded-2xl font-black text-lg shadow-xl ${!suggestedFullDate ? 'opacity-50 cursor-not-allowed' : 'shadow-orange-500/20'}`}
                            >
                                Submit Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <main className="flex-grow pt-24 pb-20 relative overflow-hidden">
                {/* Hero Background Section */}
                <div className="absolute top-0 left-0 right-0 h-[500px] overflow-hidden">
                    <img
                        src="/assets/hero-warehouse.png"
                        alt="Hero background"
                        className="w-full h-full object-cover opacity-20 filter blur-sm transform scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-gray-50/80 to-gray-50"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 mt-20 flex flex-col items-center">
                    <div className="text-center mb-10 animate-fade-in-up">
                        <div className="inline-block px-4 py-1.5 bg-orange-50 rounded-full border border-orange-100 text-orange-600 text-xs font-bold uppercase tracking-widest mb-4">
                            Applicant Services
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 font-display leading-tight text-shadow">
                            Track Your <span className="text-orange-600">Journey</span>
                        </h1>
                        <p className="text-gray-500 text-lg max-w-md mx-auto font-medium">
                            Check the status of your application and see upcoming steps in your onboarding process.
                        </p>
                    </div>

                    <div className="w-full max-w-md animate-fade-in-up delay-100 mb-12">
                        <form onSubmit={checkStatus} className="glass-panel p-8 rounded-[2rem] shadow-2xl border border-white/80">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Registered Email</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="text-gray-300 group-focus-within:text-orange-500 transition-colors" size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                className="input-premium pl-12 w-full py-4 text-sm font-bold text-gray-700 bg-white/70 focus:bg-white rounded-2xl border-gray-100/50"
                                                placeholder="john.doe@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Verification (Full Name)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="text-gray-300 group-focus-within:text-orange-500 transition-colors" size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                className="input-premium pl-12 w-full py-4 text-sm font-bold text-gray-700 bg-white/70 focus:bg-white rounded-2xl border-gray-100/50"
                                                placeholder="Jane Doe"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-2 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 py-2 rounded-lg border border-gray-100">
                                    <AlertCircle size={12} className="text-orange-400" />
                                    <span>Private & Secure Search • Vista Identity Verification</span>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="glass-button w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 group shadow-xl shadow-orange-500/20"
                                >
                                    {loading ? <Loader className="animate-spin" /> : (
                                        <>
                                            Find Application
                                            <Search size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-6 p-5 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 flex items-center gap-3 animate-fade-in shadow-lg shadow-red-500/5">
                                <div className="p-2 bg-red-100 rounded-lg"><AlertCircle size={20} /></div>
                                <p className="font-bold text-sm tracking-tight">{error}</p>
                            </div>
                        )}
                    </div>

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-3xl"
                        >
                            <div className="glass-panel p-8 md:p-12 rounded-[3rem] border border-white/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden bg-white/60 backdrop-blur-2xl">
                                {/* Ambient Background Glow */}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
                                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative">
                                    <div className="flex items-center gap-6">
                                        <motion.div
                                            whileHover={{ rotate: 10, scale: 1.1 }}
                                            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-orange-500/30"
                                        >
                                            {result.fullName[0]}
                                        </motion.div>
                                        <div>
                                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{result.fullName}</h2>
                                            <div className="flex flex-wrap gap-3">
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 border border-gray-200/50">
                                                    {result.jobType}
                                                </span>
                                                <span className="px-3 py-1 bg-orange-50 rounded-full text-[9px] font-black uppercase tracking-widest text-orange-600 border border-orange-100">
                                                    {result.preferredLocation.split(',')[0]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-sm border ${result.status === 'Accepted' || result.status === 'Hired' ? 'bg-green-500 text-white border-green-400 shadow-green-500/20' :
                                                result.status === 'Rejected' ? 'bg-red-500 text-white border-red-400 shadow-red-500/20' :
                                                    'bg-white text-orange-600 border-orange-100 shadow-orange-500/5'
                                            }`}
                                    >
                                        Current: {result.status}
                                    </motion.div>
                                </div>

                                {/* Premium Interactive Timeline */}
                                <div className="space-y-4">
                                    {[
                                        {
                                            id: 'Pending',
                                            label: 'Application Received',
                                            desc: `Successfully logged on ${new Date(result.submittedDate).toLocaleDateString()}`,
                                            icon: FileText,
                                            active: true
                                        },
                                        {
                                            id: 'Review',
                                            label: 'HR Assessment',
                                            desc: 'Our team is currently reviewing your profile.',
                                            icon: ShieldCheck,
                                            active: result.status !== 'Pending'
                                        },
                                        {
                                            id: 'Interviewing',
                                            label: 'Interview Stage',
                                            desc: result.interviewDate ? 'Your slot is confirmed.' : 'Coordinates are being finalized.',
                                            icon: Calendar,
                                            active: ['Interviewing', 'Accepted', 'Rejected', 'Hired'].includes(result.status)
                                        },
                                        {
                                            id: 'Final',
                                            label: 'Decision',
                                            desc: result.status === 'Accepted' || result.status === 'Hired' ? 'Welcome to the team!' : result.status === 'Rejected' ? 'Not at this time.' : 'Selection in progress.',
                                            icon: Trophy,
                                            active: ['Accepted', 'Rejected', 'Hired'].includes(result.status)
                                        }
                                    ].map((step, idx, arr) => {
                                        const isCurrent = (step.id === 'Pending' && result.status === 'Pending') ||
                                            (step.id === 'Review' && result.status === 'Pending') || // Small logic tweak for UX
                                            (step.id === 'Interviewing' && result.status === 'Interviewing') ||
                                            (step.id === 'Final' && ['Accepted', 'Rejected', 'Hired'].includes(result.status));

                                        const isCompleted = step.active && !isCurrent;

                                        return (
                                            <motion.div
                                                key={step.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="relative pl-16 py-4"
                                            >
                                                {/* Connector Line */}
                                                {idx !== arr.length - 1 && (
                                                    <div className={`absolute left-[23px] top-14 bottom-0 w-0.5 ${step.active ? 'bg-orange-500' : 'bg-gray-100'}`} />
                                                )}

                                                {/* Node */}
                                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${isCompleted ? 'bg-orange-500 text-white shadow-lg' :
                                                        isCurrent ? 'bg-white border-4 border-orange-500 text-orange-600 shadow-xl' :
                                                            'bg-white border-2 border-gray-100 text-gray-300'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle size={20} /> : <step.icon size={20} />}

                                                    {isCurrent && (
                                                        <motion.div
                                                            layoutId="glow"
                                                            className="absolute inset-0 rounded-2xl bg-orange-500/20"
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        />
                                                    )}
                                                </div>

                                                <div className={`transition-all duration-500 ${isCurrent ? 'translate-x-2' : ''}`}>
                                                    <h4 className={`font-black text-sm uppercase tracking-widest ${isCurrent ? 'text-orange-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {step.label}
                                                    </h4>
                                                    <p className={`text-xs font-bold leading-relaxed ${isCurrent ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        {step.desc}
                                                    </p>

                                                    {/* Contextual Action: Reschedule */}
                                                    {isCurrent && step.id === 'Interviewing' && result.interviewDate && !result.rescheduleRequested && (
                                                        <motion.button
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            onClick={() => setShowRescheduleModal(true)}
                                                            className="mt-4 flex items-center gap-2 px-6 py-2 rounded-xl bg-white border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm"
                                                        >
                                                            <Calendar size={12} /> Need to reschedule?
                                                        </motion.button>
                                                    )}

                                                    {isCurrent && step.id === 'Interviewing' && result.rescheduleRequested && (
                                                        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-[8px] font-black uppercase tracking-widest text-amber-600">
                                                            <AlertCircle size={12} /> Reschedule request pending review
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Career Path Elevation (Cool Feature) */}
                    <div className="w-full max-w-4xl mt-32 animate-fade-in-up delay-300 pb-20">
                        <div className="text-center mb-16">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-4 block">Future Possibilities</span>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 font-display tracking-tight leading-none">Your Growth at <span className="text-orange-600">Vista</span></h2>
                            <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full shadow-sm shadow-orange-500/20 mb-10"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                            {/* Desktop Connector Line */}
                            <div className="absolute top-10 left-12 right-12 h-0.5 bg-orange-100/50 -z-10 hidden md:block border-b border-dashed border-orange-200"></div>

                            {[
                                { step: "Team Member", icon: <User />, desc: "Master the fundamentals of logistics and quality.", color: "orange" },
                                { step: "Specialist", icon: <CheckCircle />, desc: "Become an expert in scanning or technical roles.", color: "amber" },
                                { step: "Workflow Lead", icon: <Clock />, desc: "Lead team members and optimize facility flow.", color: "orange" },
                                { step: "Site Manager", icon: <Calendar />, desc: "Drive excellence across the entire operation.", color: "amber" }
                            ].map((path, idx) => (
                                <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all group flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner transform group-hover:rotate-[10deg]">
                                        {path.icon}
                                    </div>
                                    <h4 className="font-black text-gray-900 mb-3 uppercase tracking-widest text-xs leading-none">{path.step}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{path.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default StatusPage;
