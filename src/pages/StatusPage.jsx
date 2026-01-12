import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, CheckCircle, XCircle, Clock, Calendar, AlertCircle, Loader, Mail, User } from 'lucide-react';

const StatusPage = () => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const checkStatus = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        // Simulate network delay
        setTimeout(() => {
            try {
                const storedApps = localStorage.getItem('vista_applications');
                if (storedApps) {
                    const apps = JSON.parse(storedApps);
                    const found = apps.find(app =>
                        app.email.toLowerCase() === email.toLowerCase() &&
                        app.fullName.toLowerCase() === fullName.toLowerCase()
                    );

                    if (found) {
                        setResult(found);
                    } else {
                        setError('No application found with these details.');
                    }
                } else {
                    setError('No application records found.');
                }
            } catch (err) {
                setError('System error. Please try again.');
            } finally {
                setLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <Navbar />

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
                        <div className="w-full max-w-2xl animate-fade-in-up">
                            <div className="glass-panel p-10 rounded-[2.5rem] border border-white/80 shadow-2xl relative overflow-hidden">
                                {/* Accent decoration */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-orange-500/20">
                                            {result.fullName[0]}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">{result.fullName}</h2>
                                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{result.jobType} • {result.preferredShift}</p>
                                        </div>
                                    </div>
                                    <div className={`px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm border ${result.status === 'Accepted' ? 'bg-green-50 text-green-600 border-green-100' :
                                        result.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                            'bg-orange-50 text-orange-600 border-orange-100'
                                        }`}>
                                        Status: {result.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-12">
                                    {/* Detailed Progress Timeline */}
                                    <div className="relative">
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100"></div>

                                        <div className="space-y-10">
                                            {/* Step 1: Submission */}
                                            <div className="relative pl-16">
                                                <div className="absolute left-3.5 -translate-x-1/2 top-1.5 w-5 h-5 rounded-full bg-green-500 border-4 border-white shadow-[0_0_0_1px_rgba(34,197,94,0.2)] z-10"></div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 mb-0.5 text-shadow-sm">Application Submitted</h4>
                                                    <p className="text-sm text-gray-500 font-medium">Verified on {new Date(result.submittedDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            {/* Step 2: Review */}
                                            <div className="relative pl-16">
                                                <div className={`absolute left-3.5 -translate-x-1/2 top-1.5 w-5 h-5 rounded-full border-4 border-white z-10 ${result.status !== 'Pending' ? 'bg-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.2)]' : 'bg-orange-500 animate-pulse shadow-[0_0_0_10px_rgba(249,115,22,0.1)]'
                                                    }`}></div>
                                                <div>
                                                    <h4 className={`font-black mb-0.5 ${result.status !== 'Pending' ? 'text-gray-900' : 'text-orange-600'}`}>Under HR Review</h4>
                                                    <p className="text-sm text-gray-500 font-medium">Your qualifications are being assessed by our hiring leads.</p>
                                                </div>
                                            </div>

                                            {/* Step 3: Interviewing */}
                                            {(result.status === 'Interviewing' || result.status === 'Accepted' || result.status === 'Rejected') && (
                                                <div className="relative pl-16">
                                                    <div className={`absolute left-3.5 -translate-x-1/2 top-1.5 w-5 h-5 rounded-full border-4 border-white z-10 ${(result.status === 'Accepted' || result.status === 'Rejected') ? 'bg-green-500' : 'bg-orange-500 animate-pulse shadow-[0_0_0_10px_rgba(249,115,22,0.1)]'
                                                        }`}></div>
                                                    <div>
                                                        <h4 className={`font-black mb-0.5 ${result.status === 'Interviewing' ? 'text-orange-600' : 'text-gray-900'}`}>Interview Stage</h4>
                                                        {result.interviewDate ? (
                                                            <div className="mt-3 bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50 inline-flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Scheduled For</span>
                                                                <div className="flex items-center gap-2 text-orange-700 font-black text-sm">
                                                                    <Calendar size={16} />
                                                                    {new Date(result.interviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 font-medium font-bold uppercase tracking-widest text-[10px]">Interviews are being coordinated.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 4: Final Result */}
                                            {(result.status === 'Accepted' || result.status === 'Rejected') && (
                                                <div className="relative pl-16">
                                                    <div className={`absolute left-3.5 -translate-x-1/2 top-1.5 w-6 h-6 rounded-full border-4 border-white z-10 flex items-center justify-center ${result.status === 'Accepted' ? 'bg-green-500 shadow-[0_0_0_10px_rgba(34,197,94,0.1)]' : 'bg-red-500'
                                                        }`}>
                                                        {result.status === 'Accepted' ? <CheckCircle size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-black mb-0.5 ${result.status === 'Accepted' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {result.status === 'Accepted' ? 'Application Approved' : 'Application Closed'}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 font-medium">
                                                            {result.status === 'Accepted'
                                                                ? 'Welcome to Vista! Check your email for next steps.'
                                                                : 'We appreciate your interest in Vista Auction.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
