import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import CalendarView from '../components/CalendarView';
import DateTimePicker from '../components/DateTimePicker';
import { Check, X as XIcon, Brain, Mail, ChevronDown, ChevronUp, Search, Filter, Users, Clock, AlertCircle, LayoutGrid, List, FileText, Download, Briefcase, Calendar, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from 'emailjs-com';
import { supabase } from '../supabaseClient';

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
    const [isAuthenticated, setIsAuthenticated] = useState(true);
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
    const [selectedIds, setSelectedIds] = useState([]);
    const [showScorecard, setShowScorecard] = useState(false);
    const [scorecard, setScorecard] = useState({
        punctuality: 5,
        attitude: 5,
        skillset: 5,
        culturalFit: 5
    });
    const [trainingRecords, setTrainingRecords] = useState([]);
    const [courses, setCourses] = useState([
        { id: '1', name: 'General Onboarding', type: 'PDF', required: true, description: 'Required reading for all new Vista employees.' },
        { id: '2', name: 'Wholesale Logic', type: 'Video', required: true, description: 'Advanced scanning & quality control workflows.' },
        { id: '3', name: 'Forklift Safety', type: 'Video', required: false, description: 'Safety certification for forklift operators.' },
        { id: '4', name: 'Customer Service Excellence', type: 'PDF', required: false, description: 'Best practices for customer interactions.' }
    ]);
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({
        name: '',
        type: 'PDF',
        required: false,
        description: '',
        content_url: '',
        video_url: '',
        minimum_time_seconds: 180,
        estimated_duration_minutes: 5
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);

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

    // Load Training Records
    useEffect(() => {
        if (isAuthenticated) {
            fetchTrainingRecords();
        }
    }, [isAuthenticated]);

    const fetchTrainingRecords = async () => {
        try {
            const { data, error } = await supabase
                .from('vista_training')
                .select('*')
                .order('assigned_date', { ascending: false });

            if (error) throw error;
            setTrainingRecords(data || []);
        } catch (error) {
            console.error('Error fetching training records:', error);
        }
    };

    const assignCourseToEmployee = async (employeeName, employeeEmail, courseId) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        const newRecord = {
            id: Date.now().toString(),
            employee_name: employeeName,
            employee_email: employeeEmail,
            course_name: course.name,
            course_type: course.type,
            status: 'Not Started',
            assigned_date: new Date().toISOString(),
            completed_date: null,
            notes: ''
        };

        try {
            const { error } = await supabase
                .from('vista_training')
                .insert([newRecord]);

            if (error) throw error;

            setTrainingRecords(prev => [newRecord, ...prev]);
            setNotification({ message: `${course.name} assigned to ${employeeName}`, type: 'success' });

            // Send email notification
            if (PUBLIC_KEY && PUBLIC_KEY !== 'public_key_placeholder') {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                    to_email: employeeEmail,
                    to_name: employeeName,
                    subject: `New Training Assignment: ${course.name}`,
                    message: `You have been assigned a new training course: ${course.name}. Please complete it at your earliest convenience.`
                });
            }
        } catch (error) {
            console.error('Error assigning course:', error);
            setNotification({ message: 'Failed to assign course', type: 'error' });
        }
    };

    const updateTrainingStatus = async (recordId, newStatus) => {
        try {
            const updateData = {
                status: newStatus,
                ...(newStatus === 'Completed' && { completed_date: new Date().toISOString() })
            };

            const { error } = await supabase
                .from('vista_training')
                .update(updateData)
                .eq('id', recordId);

            if (error) throw error;

            setTrainingRecords(prev => prev.map(r =>
                r.id === recordId ? { ...r, ...updateData } : r
            ));
            setNotification({ message: 'Training status updated', type: 'success' });
        } catch (error) {
            console.error('Error updating training status:', error);
        }
    };

    const addNewCourse = () => {
        if (!newCourse.name.trim()) {
            setNotification({ message: 'Course name is required', type: 'error' });
            return;
        }

        const course = {
            id: Date.now().toString(),
            ...newCourse
        };

        setCourses(prev => [...prev, course]);
        setNewCourse({
            name: '',
            type: 'PDF',
            required: false,
            description: '',
            content_url: '',
            video_url: '',
            minimum_time_seconds: 180,
            estimated_duration_minutes: 5
        });
        setShowAddCourse(false);
        setNotification({ message: 'Course added successfully', type: 'success' });
    };

    // Load Data & Subscribe to Changes
    useEffect(() => {
        if (isAuthenticated) {
            fetchApplications();

            // Real-time subscription
            const subscription = supabase
                .channel('public:vista_applications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'vista_applications' }, () => {
                    fetchApplications();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [isAuthenticated]);

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('vista_applications')
                .select('*')
                .order('submittedDate', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
            setFilteredApps(data || []);
        } catch (e) {
            console.error("Failed to load applications from Supabase", e);
            const errorMessage = e && typeof e === 'object' ? e.message || JSON.stringify(e) : String(e);
            setNotification({ message: `Cloud Sync Error: ${errorMessage}`, type: 'error' });
        }
    };

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

    const purgeApplications = async () => {
        if (window.confirm("Are you sure you want to delete ALL application data? This cannot be undone.")) {
            try {
                const { error } = await supabase.from('vista_applications').delete().neq('id', '0'); // Delete all
                if (error) throw error;
                setApplications([]);
                setFilteredApps([]);
                setNotification({ message: 'Cloud data purged successfully.', type: 'success' });
            } catch (e) {
                setNotification({ message: 'Purge failed.', type: 'error' });
            }
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

    const updateStatus = async (id, newStatus, additionalUpdates = {}) => {
        try {
            const { error } = await supabase
                .from('vista_applications')
                .update({ status: newStatus, ...additionalUpdates })
                .eq('id', id);

            if (error) throw error;

            // Update local state immediately for snappy UI
            const updatedApps = applications.map(a => a.id === id ? { ...a, status: newStatus, ...additionalUpdates } : a);
            setApplications(updatedApps);

            const updatedApp = updatedApps.find(a => a.id === id);

            if (updatedApp && (newStatus === 'Accepted' || newStatus === 'Rejected' || newStatus === 'Hired')) {
                if (!updatedApp.email) {
                    console.error('CRITICAL: Cannot send email. Applicant has no email address associated with their record.');
                    setNotification({ message: 'Error: This applicant has no email address on file.', type: 'error' });
                    return;
                }
                await sendEmail(updatedApp, newStatus);
            }
        } catch (e) {
            console.error("Update failed", e);
            setNotification({ message: 'Sync Update Failed', type: 'error' });
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
                    message: status === 'Accepted'
                        ? 'Congratulations! You have been selected for an INTERVIEW. Please visit our website and check your "Application Status" to view your scheduled time or request a different date.'
                        : status === 'Hired'
                            ? 'Congratulations! You have been officially HIRED at Vista Auction. We are excited to have you on the team!'
                            : 'Thank you for your interest. We have decided to move forward with other candidates at this time.',
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

    const handleBatchAction = async (newStatus) => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Perform batch ${newStatus} on ${selectedIds.length} candidates?`)) return;

        try {
            const { error } = await supabase
                .from('vista_applications')
                .update({ status: newStatus })
                .in('id', selectedIds);

            if (error) throw error;

            setApplications(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: newStatus } : a));
            setNotification({ message: `Successfully updated ${selectedIds.length} candidates.`, type: 'success' });
            setSelectedIds([]);
        } catch (e) {
            setNotification({ message: 'Batch update failed.', type: 'error' });
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredApps.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredApps.map(app => app.id));
        }
    };

    const exportCSV = () => {
        const appsToExport = selectedIds.length > 0
            ? applications.filter(a => selectedIds.includes(a.id))
            : applications;

        const headers = ["ID", "Full Name", "Email", "Phone", "Work Auth", "Auth Expiry", "Age 16+", "Age 18+", "Job Type", "Shift", "Location", "Status", "Date"];
        const rows = appsToExport.map(app => [
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
        link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
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
                        <div className="flex bg-white shadow-sm p-1 rounded-2xl border border-gray-100 items-center">
                            {[
                                { id: 'applications', label: 'Applications', icon: <Users size={16} /> },
                                { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
                                { id: 'training', label: 'Training', icon: <Briefcase size={16} /> }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-500 ${activeTab === tab.id ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab.icon} {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-orange-50 rounded-xl -z-10 border border-orange-100/50"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'applications' ? (
                        <motion.div
                            key="applications"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
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

                            {/* Quick Tags / Batch Actions */}
                            <div className="flex items-center justify-between gap-4 px-2 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Quick Tags:</span>
                                    <div className="flex gap-2">
                                        {[
                                            { label: 'Warehouse Exp', icon: <Briefcase size={12} />, match: 'warehouse' },
                                            { label: 'Certified', icon: <Check size={12} />, match: 'certified' },
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

                                {selectedIds.length > 0 && (
                                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-orange-200 shadow-sm animate-fade-in whitespace-nowrap">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{selectedIds.length} Selected</span>
                                        <div className="h-4 w-px bg-gray-100 mx-2" />
                                        <button onClick={() => handleBatchAction('Interviewing')} className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline">Mass Accept</button>
                                        <button onClick={() => handleBatchAction('Rejected')} className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:underline">Mass Reject</button>
                                        <button onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:underline">Cancel</button>
                                    </div>
                                )}
                            </div>

                            {/* App List / Board */}
                            <AnimatePresence mode="wait">
                                {viewMode === 'list' ? (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="grid grid-cols-1 gap-4"
                                    >
                                        {filteredApps.map(app => (
                                            <div key={app.id} className={`glass-card p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group transition-all cursor-pointer ${selectedIds.includes(app.id) ? 'border-orange-500 bg-orange-50/20' : 'hover:border-orange-200'}`} onClick={() => setSelectedApp(app)}>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(app.id)}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            if (e.target.checked) setSelectedIds([...selectedIds, app.id]);
                                                            else setSelectedIds(selectedIds.filter(id => id !== app.id));
                                                        }}
                                                        className="w-5 h-5 rounded-lg border-gray-300 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
                                                    />
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
                                            <div className="flex flex-col items-center justify-center py-20 text-center w-full">
                                                <div className="w-24 h-24 bg-gray-100/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100">
                                                    <Briefcase className="text-gray-300" size={40} />
                                                </div>
                                                <h3 className="text-xl font-black text-gray-800 mb-2">No Candidates Found</h3>
                                                <p className="text-gray-500 max-w-xs font-black uppercase tracking-widest text-[10px] leading-loose mx-auto">Try adjusting your filters or search terms to find more talent.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="board"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] overflow-hidden"
                                    >
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
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : activeTab === 'calendar' ? (
                        <motion.div
                            key="calendar"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <CalendarView applications={applications} onSelectApp={setSelectedApp} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="training"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8 pb-20"
                        >
                            {/* Header with Add Course Button */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-1">Training Management</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manage courses and track employee progress</p>
                                </div>
                                <button
                                    onClick={() => setShowAddCourse(true)}
                                    className="px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    + Add Course
                                </button>
                            </div>

                            {/* Course Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map(course => (
                                    <div key={course.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                                                {course.type === 'Video' ? <Trophy size={20} /> : <FileText size={20} />}
                                            </div>
                                            {course.required && (
                                                <span className="bg-red-50 text-red-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Required</span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-sm text-gray-900 mb-2">{course.name}</h3>
                                        <p className="text-[10px] font-medium text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedEmployee({ course })}
                                                className="flex-1 py-2 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                                            >
                                                Assign
                                            </button>
                                            <button className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all">
                                                <FileText size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Employee Training Progress */}
                            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/80 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Employee Training Progress</h3>
                                <div className="space-y-3">
                                    {applications.filter(app => app.status === 'Hired').length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-400 text-sm font-medium">No hired employees yet</p>
                                        </div>
                                    ) : (
                                        applications.filter(app => app.status === 'Hired').map(employee => {
                                            const employeeRecords = trainingRecords.filter(r => r.employee_email === employee.email);
                                            const completedCount = employeeRecords.filter(r => r.status === 'Completed').length;
                                            const requiredCourses = courses.filter(c => c.required).length;
                                            const completedRequired = employeeRecords.filter(r =>
                                                r.status === 'Completed' && courses.find(c => c.name === r.course_name && c.required)
                                            ).length;

                                            return (
                                                <div key={employee.id} className="p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-sm">
                                                                {employee.fullName[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900">{employee.fullName}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    {completedRequired}/{requiredCourses} Required • {completedCount} Total
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <div className="text-xs font-black text-orange-600">
                                                                    {requiredCourses > 0 ? Math.round((completedRequired / requiredCourses) * 100) : 0}%
                                                                </div>
                                                                <div className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Complete</div>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedEmployee({ employee })}
                                                                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all"
                                                            >
                                                                Manage
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/80 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Recent Training Activity</h3>
                                <div className="space-y-3">
                                    {trainingRecords.slice(0, 10).map(record => (
                                        <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-gray-400">
                                                    {record.employee_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-800">{record.employee_name}</p>
                                                    <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">{record.course_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={record.status}
                                                    onChange={(e) => updateTrainingStatus(record.id, e.target.value)}
                                                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                >
                                                    <option value="Not Started">Not Started</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                                                    {new Date(record.assigned_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {trainingRecords.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm font-medium">No training records yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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

                                        <div className="w-full max-w-sm">
                                            <DateTimePicker
                                                label="Select Interview Date & Time"
                                                value={interviewDate}
                                                onChange={setInterviewDate}
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
                                                    <div className="mt-4 p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <AlertCircle size={18} className="text-amber-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Reschedule Requested</span>
                                                        </div>
                                                        {selectedApp.suggestedInterviewDate && (
                                                            <div className="space-y-3">
                                                                <p className="text-[11px] font-bold text-amber-800">
                                                                    Candidate suggested: <br />
                                                                    <span className="text-sm font-black text-gray-900">{new Date(selectedApp.suggestedInterviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                                </p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateStatus(selectedApp.id, 'Interviewing', {
                                                                            interviewDate: selectedApp.suggestedInterviewDate,
                                                                            rescheduleRequested: false
                                                                        });
                                                                        setSelectedApp(prev => ({ ...prev, interviewDate: selectedApp.suggestedInterviewDate, rescheduleRequested: false }));
                                                                        setNotification({ message: 'Reschedule confirmed!', type: 'success' });
                                                                    }}
                                                                    className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all active:scale-95"
                                                                >
                                                                    Accept Suggested Date
                                                                </button>
                                                            </div>
                                                        )}
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
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                const updated = applications.map(a => a.id === selectedApp.id ? { ...a, notes: val } : a);
                                                setApplications(updated);
                                                setSelectedApp(prev => ({ ...prev, notes: val }));

                                                // Debounced or direct cloud update
                                                await supabase.from('vista_applications').update({ notes: val }).eq('id', selectedApp.id);
                                            }}
                                        />
                                    </div>

                                    {/* Modal Actions */}
                                    <div className="flex flex-col gap-8 pt-8 border-t border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <button
                                                onClick={() => setShowScorecard(!showScorecard)}
                                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white transition-all"
                                            >
                                                <Brain size={14} /> {showScorecard ? 'Hide Scorecard' : 'Open Scorecard'}
                                            </button>
                                            <div className="flex gap-4">
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
                                            </div>
                                        </div>

                                        {showScorecard && (
                                            <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100 animate-fade-in">
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Candidate Scorecard</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {[
                                                        { id: 'punctuality', label: 'Punctuality' },
                                                        { id: 'attitude', label: 'Attitude / Energy' },
                                                        { id: 'skillset', label: 'Relevant Skills' },
                                                        { id: 'culturalFit', label: 'Vista Cultural Fit' }
                                                    ].map(metric => (
                                                        <div key={metric.id} className="space-y-3">
                                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                                <span>{metric.label}</span>
                                                                <span className="text-orange-600">{scorecard[metric.id]}/10</span>
                                                            </div>
                                                            <input
                                                                type="range" min="1" max="10"
                                                                value={scorecard[metric.id]}
                                                                onChange={(e) => setScorecard({ ...scorecard, [metric.id]: parseInt(e.target.value) })}
                                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-8 pt-6 border-t border-orange-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-gray-400">Average Grade</span>
                                                    <span className="text-lg text-orange-600">
                                                        {((scorecard.punctuality + scorecard.attitude + scorecard.skillset + scorecard.culturalFit) / 4).toFixed(1)} / 10
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {selectedApp.status === 'Hired' && (
                                            <div className="flex items-center gap-3 bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white"><Check size={14} /></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-700">Employee Hired & Onboarded</span>
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

                {/* Course Assignment Modal */}
                {selectedEmployee?.course && (
                    <Modal isOpen={true} onClose={() => setSelectedEmployee(null)} title={`Assign ${selectedEmployee.course.name}`}>
                        <div className="space-y-6">
                            <p className="text-sm text-gray-600 font-medium">Select employees to assign this course to:</p>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {applications.filter(app => app.status === 'Hired').map(employee => (
                                    <div
                                        key={employee.id}
                                        onClick={() => {
                                            assignCourseToEmployee(employee.fullName, employee.email, selectedEmployee.course.id);
                                            setSelectedEmployee(null);
                                        }}
                                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-sm">
                                                {employee.fullName[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{employee.fullName}</p>
                                                <p className="text-[10px] font-bold text-gray-400">{employee.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {applications.filter(app => app.status === 'Hired').length === 0 && (
                                    <p className="text-center text-gray-400 py-8 text-sm">No hired employees to assign</p>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Employee Training Management Modal */}
                {selectedEmployee?.employee && (
                    <Modal isOpen={true} onClose={() => setSelectedEmployee(null)} title={`${selectedEmployee.employee.fullName} - Training`}>
                        <div className="space-y-6">
                            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Assign New Course</p>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            assignCourseToEmployee(
                                                selectedEmployee.employee.fullName,
                                                selectedEmployee.employee.email,
                                                e.target.value
                                            );
                                            e.target.value = '';
                                        }
                                    }}
                                    className="w-full p-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                                >
                                    <option value="">Select a course...</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Assigned Courses</p>
                                <div className="space-y-2">
                                    {trainingRecords
                                        .filter(r => r.employee_email === selectedEmployee.employee.email)
                                        .map(record => (
                                            <div key={record.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{record.course_name}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{record.course_type}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${record.status === 'Completed' ? 'bg-green-50 text-green-600' :
                                                        record.status === 'In Progress' ? 'bg-orange-50 text-orange-600' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {trainingRecords.filter(r => r.employee_email === selectedEmployee.employee.email).length === 0 && (
                                        <p className="text-center text-gray-400 py-4 text-sm">No courses assigned yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Add Course Modal */}
                {showAddCourse && (
                    <Modal isOpen={true} onClose={() => setShowAddCourse(false)} title="Add New Training Course">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Course Name *</label>
                                <input
                                    type="text"
                                    value={newCourse.name}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                    placeholder="e.g., Safety Training"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium min-h-[100px]"
                                    placeholder="Brief description of the course..."
                                />
                            </div>

                            {/* Content URLs */}
                            {newCourse.type === 'PDF' && (
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">PDF URL</label>
                                    <input
                                        type="url"
                                        value={newCourse.content_url}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, content_url: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                        placeholder="https://example.com/document.pdf"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Upload PDF to Google Drive or Dropbox and paste the shareable link</p>
                                </div>
                            )}

                            {newCourse.type === 'Video' && (
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Video URL</label>
                                    <input
                                        type="url"
                                        value={newCourse.video_url}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, video_url: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                        placeholder="https://example.com/video.mp4"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Direct video file URL or YouTube embed link</p>
                                </div>
                            )}

                            {/* Duration Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Est. Duration (min)</label>
                                    <input
                                        type="number"
                                        value={newCourse.estimated_duration_minutes}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Min. Time (sec)</label>
                                    <input
                                        type="number"
                                        value={newCourse.minimum_time_seconds}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, minimum_time_seconds: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                        min="30"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                                    <select
                                        value={newCourse.type}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                    >
                                        <option value="PDF">PDF</option>
                                        <option value="Video">Video</option>
                                        <option value="Quiz">Quiz</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Required?</label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newCourse.required}
                                            onChange={(e) => setNewCourse(prev => ({ ...prev, required: e.target.checked }))}
                                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-bold text-gray-700">Required Course</span>
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={addNewCourse}
                                className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                            >
                                Add Course
                            </button>
                        </div>
                    </Modal>
                )}

                {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </main>
        </div>
    );
};

const HRPortal = () => <ErrorBoundary><HRPortalContent /></ErrorBoundary>;
export default HRPortal;
