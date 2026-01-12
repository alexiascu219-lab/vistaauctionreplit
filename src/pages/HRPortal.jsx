import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import CalendarView from '../components/CalendarView';
import { Check, X as XIcon, Brain, Mail, ChevronDown, ChevronUp, Search, Filter, Users, Clock, AlertCircle, LayoutGrid, List, FileText, Download, Briefcase, Calendar } from 'lucide-react';
import emailjs from 'emailjs-com';

// -----------------------------------------------------------------------------
// Error Boundary
// -----------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("HR Portal Crash:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-100">
                        <div className="text-red-500 mb-4 flex justify-center"><AlertCircle size={48} /></div>
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Something went wrong</h2>
                        <button onClick={() => { localStorage.removeItem('vista_applications'); window.location.reload(); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors mt-6">Reset Data & Reload</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// -----------------------------------------------------------------------------
// Modal Component
// -----------------------------------------------------------------------------
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/50 animate-fade-in-up">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-gray-100 flex justify-between items-center z-10 px-10">
                    <h3 className="text-2xl font-black tracking-tight text-gray-900 font-display">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XIcon size={24} className="text-gray-500" /></button>
                </div>
                <div className="p-10">{children}</div>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// Main Content
// -----------------------------------------------------------------------------
const HRPortalContent = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [applications, setApplications] = useState([]);
    const [filteredApps, setFilteredApps] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [activeTab, setActiveTab] = useState('applications');
    const [notification, setNotification] = useState(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [interviewDate, setInterviewDate] = useState('');

    // EmailJS Configuration
    const SERVICE_ID = 'service_2l8vhyj';
    const TEMPLATE_ID = 'template_9hirkpm';
    const PUBLIC_KEY = 'dLGF3GCwXh_sPPMei';

    // Initialize EmailJS
    useEffect(() => {
        if (PUBLIC_KEY && PUBLIC_KEY !== 'public_key_placeholder') {
            emailjs.init(PUBLIC_KEY);
        }
    }, []);

    // Load Data
    useEffect(() => {
        if (isAuthenticated) {
            try {
                const storedApps = localStorage.getItem('vista_applications');
                const storedResumes = localStorage.getItem('vista_resumes');

                let initialApps = [];
                if (storedApps) {
                    const parsedApps = JSON.parse(storedApps);
                    const parsedResumes = storedResumes ? JSON.parse(storedResumes) : {};
                    initialApps = parsedApps.map(app => ({
                        ...app,
                        resumeData: parsedResumes[app.id]?.data || null,
                        resumeName: parsedResumes[app.id]?.name || null
                    }));
                }
                setApplications(initialApps);
                setFilteredApps(initialApps);
            } catch (e) {
                console.error("Failed to load applications", e);
                setApplications([]);
                setFilteredApps([]);
            }
        }
    }, [isAuthenticated]);

    // Filter Logic
    useEffect(() => {
        let result = applications;
        if (filterStatus !== 'All') result = result.filter(app => app.status === filterStatus);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(app =>
                (app.fullName || '').toLowerCase().includes(term) ||
                (app.email || '').toLowerCase().includes(term) ||
                (app.position || '').toLowerCase().includes(term) ||
                (app.jobType || '').toLowerCase().includes(term) ||
                (app.experience || '').toLowerCase().includes(term) ||
                (app.specificRole || '').toLowerCase().includes(term)
            );
        }
        setFilteredApps(result);
    }, [filterStatus, searchTerm, applications]);

    const purgeApplications = () => {
        if (window.confirm("Are you sure you want to delete ALL application data? This cannot be undone.")) {
            localStorage.removeItem('vista_applications');
            localStorage.removeItem('vista_resumes');
            setApplications([]);
            setFilteredApps([]);
            setNotification({ message: 'All data has been purged successfully.', type: 'success' });
        }
    };

    const calculateMatchScore = (app) => {
        const experience = (app.experience || '').toLowerCase();
        const position = (app.position || '').toLowerCase();
        let score = 70; // Base score

        if (experience.includes('warehouse') || experience.includes('logistics')) score += 15;
        if (experience.includes('customer') || experience.includes('retail')) score += 10;
        if (experience.includes(position.split(' ')[0])) score += 10;

        return Math.min(score, 98); // Max 98% for realism
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'vistahr') setIsAuthenticated(true);
        else setNotification({ message: 'Incorrect Password', type: 'error' });
    };

    const updateStatus = async (id, newStatus, additionalUpdates = {}) => {
        const updatedApps = applications.map(a => a.id === id ? { ...a, status: newStatus, ...additionalUpdates } : a);
        setApplications(updatedApps);
        localStorage.setItem('vista_applications', JSON.stringify(updatedApps));

        const app = applications.find(a => a.id === id);
        if (app && (newStatus === 'Accepted' || newStatus === 'Rejected' || newStatus === 'Hired')) {
            await sendEmail(app, newStatus);
        }
    };

    const sendEmail = async (app, status) => {
        try {
            if (SERVICE_ID === 'service_placeholder') {
                await new Promise(resolve => setTimeout(resolve, 1500));
                setNotification({ message: `(Simulation) Email sent to ${app.fullName}!`, type: 'success' });
            } else {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                    to_name: app.fullName,
                    to_email: app.email,
                    message: (status === 'Accepted' || status === 'Hired') ? 'Congratulations! You have been accepted for the position.' : 'Thank you for your interest. We have decided to move forward with other candidates at this time.',
                    status: status
                }, PUBLIC_KEY); // Passing PUBLIC_KEY directly as 4th arg for older emailjs-com support
                setNotification({ message: `Email successfully sent to ${app.fullName}`, type: 'success' });
            }
        } catch (error) {
            console.error('Email failed with details:', error);
            // EmailJS errors often look like {status: 400, text: "..."}
            const details = typeof error === 'object' ? JSON.stringify(error) : error;
            setNotification({ message: `Email Failed: ${error?.text || 'Check console (F12) for details'}`, type: 'error' });
            alert(`EmailJS Error: ${error?.text || 'Unknown Error'}. \n\nPlease verify your Public Key and Service ID are correct in the EmailJS dashboard.`);
        }
    };

    const exportCSV = () => {
        const headers = ["ID", "Full Name", "Email", "Phone", "Work Auth", "Auth Expiry", "Age 16+", "Age 18+", "Job Type", "Shift", "Location", "Status", "Date"];
        const rows = applications.map(app => [
            app.id,
            app.fullName,
            app.email,
            app.phone,
            app.workAuth,
            app.authExpiry || 'N/A',
            app.is16OrOlder,
            app.is18OrOlder,
            app.jobType,
            app.preferredShift,
            app.preferredLocation,
            app.status,
            new Date(app.submittedDate).toLocaleDateString()
        ]);
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "candidates_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate column data for board view
    const boardColumns = {
        Pending: filteredApps.filter(a => a.status === 'Pending'),
        Interviewing: filteredApps.filter(a => a.status === 'Interviewing'),
        Hired: filteredApps.filter(a => a.status === 'Hired'),
        Rejected: filteredApps.filter(a => a.status === 'Rejected')
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/hero-shelves.jpg')] bg-cover bg-center opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 to-slate-950/90"></div>
                <Navbar />
                <div className="pt-40 flex items-center justify-center px-4 relative z-10">
                    <form onSubmit={handleLogin} className="p-10 glass-panel rounded-[2rem] max-w-sm w-full transform transition-all hover:-translate-y-1 shadow-2xl border border-white/80">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-sm"><Users size={32} /></div>
                            <h2 className="text-3xl font-black tracking-tight text-gray-900 font-display">Auth Portal</h2>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mt-2">Internal Vista Access Only</p>
                        </div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-premium p-4 w-full mb-6 rounded-xl outline-none" placeholder="Enter Access Key" />
                        <button type="submit" className="glass-button py-4 rounded-xl w-full font-black uppercase tracking-widest text-xs">Access Dashboard</button>
                    </form>
                </div>
                {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 font-sans text-gray-800">
            <Navbar />

            <main className="pt-24 px-6 max-w-7xl mx-auto">
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 animate-fade-in-up">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 font-display">
                            HR Portal
                        </h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Manage talent & schedule interviews.</p>
                    </div>

                    <div className="flex bg-white/60 p-1.5 rounded-xl border border-gray-200/50 backdrop-blur-md shadow-sm">
                        <button onClick={purgeApplications} className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all mr-2">
                            <AlertCircle size={14} /> Purge Data
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest text-orange-600 hover:bg-white/50 transition-all mr-2">
                            <Download size={14} /> Export CSV
                        </button>
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'applications' ? 'bg-white shadow-md text-orange-600 scale-105' : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'}`}
                        >
                            <Users size={16} /> Applications
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'calendar' ? 'bg-white shadow-md text-orange-600 scale-105' : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'}`}
                        >
                            <Calendar size={16} /> Calendar
                        </button>
                    </div>
                </div>

                {activeTab === 'applications' ? (
                    <div className="animate-fade-in space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/70 p-4 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
                            <div className="flex gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 items-center shadow-inner flex-1 max-w-md">
                                <Search size={20} className="text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Search candidates..."
                                    className="bg-transparent border-none outline-none text-gray-700 font-bold placeholder-gray-400 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                                {['All', 'Pending', 'Interviewing', 'Hired', 'Rejected'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border ${filterStatus === status ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-700'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><List size={20} /></button>
                                <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={20} /></button>
                            </div>
                        </div>

                        {/* Quick Tags */}
                        <div className="flex items-center gap-4 px-2 overflow-x-auto pb-2 scrollbar-hide">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Quick Tags:</span>
                            <div className="flex gap-2">
                                {[
                                    { label: 'Warehouse Exp', icon: <Briefcase size={12} />, match: 'warehouse' },
                                    { label: 'Certified', icon: <Check size={12} />, match: 'certified' },
                                    { label: 'Forklift', icon: <ChevronDown size={12} className="rotate-90" />, match: 'forklift' },
                                    { label: 'Quality', icon: <Brain size={12} />, match: 'quality' }
                                ].map(tag => (
                                    <button
                                        key={tag.label}
                                        onClick={() => {
                                            setSearchTerm(tag.match);
                                            setNotification({ message: `Filtering for ${tag.label}...`, type: 'info' });
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-orange-200 hover:text-orange-600 hover:bg-white transition-all shadow-sm"
                                    >
                                        {tag.icon}
                                        {tag.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => { setSearchTerm(''); setFilterStatus('All'); }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {/* App List / Board */}
                        {viewMode === 'list' ? (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredApps.map(app => (
                                    <div key={app.id} className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-orange-200 transition-all cursor-pointer" onClick={() => setSelectedApp(app)}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg ${app.status === 'Hired' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : app.status === 'Rejected' ? 'bg-gradient-to-br from-red-500 to-rose-600' : app.status === 'Interviewing' ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-gray-400 to-slate-500'}`}>
                                                {app.fullName[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-orange-600 transition-colors">{app.fullName}</h3>
                                                    {app.notes && <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]" title="Has internal notes"></div>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{app.jobType} • {app.preferredShift}</p>
                                                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100/50">
                                                        {calculateMatchScore(app)}% Match
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            <div className="flex flex-col items-end">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${app.status === 'Hired' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    app.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        app.status === 'Interviewing' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                            'bg-gray-50 text-gray-500 border-gray-100'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-300 mt-1 uppercase tracking-widest">{new Date(app.submittedDate).toLocaleDateString()}</span>
                                            </div>
                                            <ChevronDown size={20} className="text-gray-300 md:-rotate-90" />
                                        </div>
                                    </div>
                                ))}
                                {filteredApps.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in group w-full">
                                        <div className="w-24 h-24 bg-gray-100/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-500">
                                            <Briefcase className="text-gray-300" size={40} />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 mb-2">No Candidates Found</h3>
                                        <p className="text-gray-500 max-w-xs font-black uppercase tracking-widest text-[10px] leading-loose mx-auto">Try adjusting your filters or search terms to find more talent.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Board View
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] overflow-hidden">
                                {Object.entries(boardColumns).map(([status, apps]) => (
                                    <div key={status} className="flex flex-col h-full bg-gray-100/30 rounded-3xl p-4 border border-gray-200/50 backdrop-blur-sm">
                                        <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-4 flex items-center justify-between px-2">
                                            {status}
                                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg text-gray-500">{apps.length}</span>
                                        </h3>
                                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                            {apps.map(app => (
                                                <div key={app.id} onClick={() => setSelectedApp(app)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">{app.fullName}</h4>
                                                        {app.resumeData && <FileText size={14} className="text-orange-400" />}
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 truncate">{app.jobType} • {app.preferredShift}</p>
                                                    <div className="text-[10px] font-bold text-gray-300 text-right uppercase tracking-widest">{new Date(app.submittedDate).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <CalendarView applications={applications} onSelectApp={setSelectedApp} />
                )}

                {/* MODAL */}
                <Modal isOpen={!!selectedApp} onClose={() => { setSelectedApp(null); setIsScheduling(false); setInterviewDate(''); }} title={selectedApp?.fullName}>
                    {selectedApp && (
                        <div className="space-y-8">
                            {isScheduling ? (
                                <div className="animate-fade-in space-y-8">
                                    <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100 items-center justify-center flex flex-col text-center shadow-inner">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 text-orange-600 shadow-sm">
                                            <Clock size={32} />
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight text-gray-900 mb-2 font-display">Schedule Interview</h3>
                                        <p className="text-gray-500 font-medium text-sm mb-8 max-w-xs">Select a date and time to interview {selectedApp.firstName}. An email invitation will be sent automatically.</p>

                                        <div className="w-full max-w-xs space-y-2 text-left">
                                            <label className="text-[10px] font-black text-orange-800 uppercase tracking-[0.2em] ml-2">Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={interviewDate}
                                                onChange={(e) => setInterviewDate(e.target.value)}
                                                className="w-full p-4 bg-white border border-orange-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 text-gray-700 font-bold shadow-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 justify-end pt-6 border-t border-gray-100">
                                        <button
                                            onClick={() => setIsScheduling(false)}
                                            className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (interviewDate) {
                                                    updateStatus(selectedApp.id, 'Interviewing', { interviewDate: interviewDate });
                                                    setNotification({ message: `Interview scheduled!`, type: 'success' });
                                                    setIsScheduling(false);
                                                    setSelectedApp(null);
                                                } else {
                                                    setNotification({ message: "Please select a date", type: "error" });
                                                }
                                            }}
                                            className="glass-button px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20"
                                        >
                                            Confirm Schedule
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Contact Info</h4>
                                            <div className="space-y-3">
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Email</span> <span className="font-bold text-gray-700">{selectedApp.email}</span></p>
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Phone</span> <span className="font-bold text-gray-700">{selectedApp.phone || 'N/A'}</span></p>
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Location Pref</span> <span className="font-bold text-gray-700">{selectedApp.preferredLocation}</span></p>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Job Details</h4>
                                            <div className="space-y-3">
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Interest</span> <span className="font-black text-orange-600 uppercase tracking-widest">{selectedApp.jobType} • {selectedApp.preferredShift}</span></p>
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Specific Role</span> <span className="font-bold text-gray-700">{selectedApp.specificRole || 'None specified'}</span></p>
                                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Current Status</span> <span className="font-bold text-gray-700">{selectedApp.status}</span></p>
                                                {selectedApp.rescheduleRequested && (
                                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                                                        <AlertCircle size={18} className="text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Reschedule Requested</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Eligibility</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Work Auth</span> <span className="font-bold text-gray-700">{selectedApp.workAuth}</span></p>
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Expiry</span> <span className="font-bold text-gray-700">{selectedApp.authExpiry || 'N/A'}</span></p>
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Age 16+</span> <span className="font-bold text-gray-700">{selectedApp.is16OrOlder}</span></p>
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Age 18+</span> <span className="font-bold text-gray-700">{selectedApp.is18OrOlder}</span></p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Referral / Application Source</h4>
                                        <div className="space-y-3">
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Source</span> <span className="font-bold text-gray-700">{selectedApp.howHeard}</span></p>
                                            {selectedApp.referringEmployee && <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Referring Employee</span> <span className="font-bold text-gray-700">{selectedApp.referringEmployee}</span></p>}
                                            <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-0.5">Worked here before?</span> <span className="font-bold text-gray-700">{selectedApp.workedAtVistaBefore}</span></p>
                                        </div>
                                    </div>

                                    {selectedApp.resumeData && (
                                        <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-600">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black uppercase tracking-widest text-[11px] text-orange-900">Resume Attached</p>
                                                    <p className="text-xs text-orange-500 font-bold truncate max-w-[200px]">{selectedApp.resumeName}</p>
                                                </div>
                                            </div>
                                            <a href={selectedApp.resumeData} download={selectedApp.resumeName || "resume"} className="bg-white text-orange-600 border border-orange-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-all shadow-sm flex items-center gap-2">
                                                <Download size={14} /> Download
                                            </a>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Interest Statement</h4>
                                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-inner min-h-[80px] mb-6">
                                            <p className="whitespace-pre-wrap text-sm text-gray-600 font-medium leading-relaxed">{selectedApp.interestStatement || 'Not provided.'}</p>
                                        </div>

                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Previous Experience</h4>
                                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-inner min-h-[80px] mb-8">
                                            <p className="whitespace-pre-wrap text-sm text-gray-600 font-medium leading-relaxed">{selectedApp.previousExperience || 'No experience details provided.'}</p>
                                        </div>

                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            Internal HR Notes <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md tracking-widest uppercase">Private</span>
                                        </h4>
                                        <textarea
                                            className="w-full p-6 bg-orange-50/20 border border-orange-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-orange-500/10 text-sm text-gray-700 font-bold transition-all min-h-[140px] placeholder-orange-200"
                                            placeholder="Add private candidate notes, interview scores, or internal feedback here..."
                                            onClick={(e) => e.stopPropagation()}
                                            value={selectedApp.notes || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const updated = applications.map(a => a.id === selectedApp.id ? { ...a, notes: val } : a);
                                                setApplications(updated);
                                                localStorage.setItem('vista_applications', JSON.stringify(updated));
                                                setSelectedApp(prev => ({ ...prev, notes: val }));
                                            }}
                                        />
                                    </div>

                                    {/* Modal Actions */}
                                    <div className="flex gap-4 pt-8 border-t border-gray-100 justify-end flex-wrap">
                                        {selectedApp.status === 'Pending' && (
                                            <>
                                                <button onClick={() => { updateStatus(selectedApp.id, 'Rejected'); setSelectedApp(null); }} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors">Reject</button>
                                                <button onClick={() => { updateStatus(selectedApp.id, 'Accepted'); setSelectedApp(null); }} className="glass-button px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Accept Candidate</button>
                                            </>
                                        )}
                                        {selectedApp.status === 'Accepted' && (
                                            <>
                                                <button onClick={() => { updateStatus(selectedApp.id, 'Rejected'); setSelectedApp(null); }} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors">Reject</button>
                                                <button onClick={() => setIsScheduling(true)} className="px-10 py-3 rounded-xl bg-orange-50 text-orange-600 font-black text-[10px] uppercase tracking-widest border border-orange-100 hover:bg-orange-100 transition-colors">Schedule Interview</button>
                                            </>
                                        )}
                                        {selectedApp.status === 'Interviewing' && (
                                            <>
                                                <button onClick={() => { updateStatus(selectedApp.id, 'Rejected'); setSelectedApp(null); }} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors">Reject</button>
                                                <button onClick={() => { updateStatus(selectedApp.id, 'Hired'); setSelectedApp(null); setNotification({ message: `Candidate ${selectedApp.fullName} successfully HIRED!`, type: 'success' }); }} className="bg-green-600 text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all hover:-translate-y-0.5 active:scale-95">Hire Candidate</button>
                                            </>
                                        )}
                                        {selectedApp.status === 'Hired' && (
                                            <div className="flex items-center gap-3 bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white"><Check size={14} /></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-700 text-shadow-none">Employee Hired & Onboarded</span>
                                            </div>
                                        )}
                                        {selectedApp.status === 'Rejected' && (
                                            <button onClick={() => { updateStatus(selectedApp.id, 'Pending'); setSelectedApp(null); }} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100">Reconsider</button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Modal>
                {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </main>
        </div>
    );
};

const HRPortal = () => <ErrorBoundary><HRPortalContent /></ErrorBoundary>;
export default HRPortal;
