import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import RecruiterDashboard from '../components/RecruiterDashboard';
import { supabase } from '../supabaseClient';
import emailjs from 'emailjs-com';
import { AlertCircle } from 'lucide-react';

// Error Boundary
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
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-900/30 text-center">
                        <div className="text-red-500 mb-4 flex justify-center"><AlertCircle size={48} /></div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Something went wrong</h2>
                        <p className="text-slate-400 text-sm mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors">Reset Data & Reload</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const HRPortalContent = () => {
    const [applications, setApplications] = useState([]);
    const [notification, setNotification] = useState(null);
    const [trainingRecords, setTrainingRecords] = useState([]);
    const [courses, setCourses] = useState([
        { id: '1', name: 'General Onboarding', type: 'PDF', required: true, description: 'Required reading for all new Vista employees.' },
        { id: '2', name: 'Wholesale Logic', type: 'Video', required: true, description: 'Advanced scanning & quality control workflows.' },
        { id: '3', name: 'Forklift Safety', type: 'Video', required: false, description: 'Safety certification for forklift operators.' },
        { id: '4', name: 'Customer Service Excellence', type: 'PDF', required: false, description: 'Best practices for customer interactions.' }
    ]);

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

    // Load Training Records & Applications
    useEffect(() => {
        fetchApplications();
        fetchTrainingRecords();

        // Real-time subscription to vista_applications
        const subscription = supabase
            .channel('public:vista_applications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vista_applications' }, () => {
                fetchApplications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('vista_applications')
                .select('*')
                .order('submittedDate', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (e) {
            console.error("Failed to load applications from Supabase", e);
            setNotification({ message: `Sync Error: ${e.message}`, type: 'error' });
        }
    };

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

    const purgeApplications = async () => {
        if (window.confirm("Are you sure you want to delete ALL application data? This cannot be undone.")) {
            try {
                const { error } = await supabase.from('vista_applications').delete().neq('id', '0');
                if (error) throw error;
                setApplications([]);
                setNotification({ message: 'Cloud data purged successfully.', type: 'success' });
            } catch (e) {
                setNotification({ message: 'Purge failed.', type: 'error' });
            }
        }
    };

    const updateStatus = async (id, newStatus, additionalUpdates = {}) => {
        try {
            const { error } = await supabase
                .from('vista_applications')
                .update({ status: newStatus, ...additionalUpdates })
                .eq('id', id);

            if (error) throw error;

            // Update local state immediately for snappy UI
            setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, ...additionalUpdates } : a));

            const updatedApp = applications.find(a => a.id === id);

            if (updatedApp && (newStatus === 'Accepted' || newStatus === 'Rejected' || newStatus === 'Hired')) {
                if (updatedApp.email) {
                    await sendEmail(updatedApp, newStatus);
                } else {
                    console.error('CRITICAL: Cannot send email. Applicant has no email address.');
                    setNotification({ message: 'Error: Applicant has no email address on file.', type: 'error' });
                }
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
                }, PUBLIC_KEY);
                setNotification({ message: `Email successfully sent to ${app.fullName}`, type: 'success' });
            }
        } catch (error) {
            console.error('Email failed with details:', error);
            setNotification({ message: `Email Failed: ${error?.text || 'Verify your configuration keys'}`, type: 'error' });
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

    const handleAddCandidate = async (newCandidate) => {
        try {
            const newId = Date.now().toString();
            const { error } = await supabase
                .from('vista_applications')
                .insert([{
                    id: newId,
                    fullName: newCandidate.name,
                    email: newCandidate.email,
                    phone: newCandidate.phone,
                    jobType: newCandidate.appliedRole,
                    position: newCandidate.appliedRole,
                    status: newCandidate.status,
                    submittedDate: new Date().toISOString(),
                    experience: newCandidate.resumeText,
                    previousExperience: newCandidate.resumeText,
                    notes: newCandidate.notes,
                    skillsScore: newCandidate.skillsScore || 92,
                    workAuth: 'US Citizen',
                    is16OrOlder: 'Yes',
                    is18OrOlder: 'Yes',
                    preferredLocation: 'Charlotte, NC',
                    preferredShift: '1st Shift (Daytime)',
                    howHeard: 'AI Resume Screen Parser'
                }]);

            if (error) throw error;
            await fetchApplications();
            setNotification({ message: `Successfully added ${newCandidate.name} to database!`, type: 'success' });
        } catch (e) {
            console.error("Failed to add candidate", e);
            setNotification({ message: 'Failed to add parsed candidate', type: 'error' });
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
        link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-brandBlueDark">
            <Navbar />
            <div className="pt-16">
                <RecruiterDashboard
                    candidates={applications}
                    onUpdateCandidate={updateStatus}
                    onAddCandidate={handleAddCandidate}
                    courses={courses}
                    trainingRecords={trainingRecords}
                    onAssignCourse={assignCourseToEmployee}
                    onUpdateTrainingStatus={updateTrainingStatus}
                    onAddCourse={(course) => {
                        setCourses(prev => [...prev, course]);
                        setNotification({ message: 'Course added successfully', type: 'success' });
                    }}
                    onPurgeData={purgeApplications}
                    onExportCSV={exportCSV}
                />
            </div>
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};

const HRPortal = () => <ErrorBoundary><HRPortalContent /></ErrorBoundary>;
export default HRPortal;
