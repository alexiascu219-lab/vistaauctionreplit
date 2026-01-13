import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';
import { ChevronRight, ChevronLeft, Upload, CheckCircle, User, Briefcase, FileText, X, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const ApplicationForm = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [notification, setNotification] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        workAuth: '',
        otherWorkAuth: '',
        authExpiry: '',
        is16OrOlder: '',
        is18OrOlder: '',
        jobType: '',
        preferredShift: '',
        specificRole: '',
        previousExperience: '',
        howHeard: '',
        otherHowHeard: '',
        workedAtVistaBefore: 'No',
        referringEmployee: '',
        interestStatement: '',
        preferredLocation: '',
        backgroundConsent: false,
        resumeName: null,
        resumeData: null
    });
    const [errors, setErrors] = useState({});
    const [isParsing, setIsParsing] = useState(false);

    const handleSmartParse = async () => {
        if (!formData.resumeData) {
            setNotification({ message: "Please upload a resume first", type: "info" });
            return;
        }

        setIsParsing(true);
        // Simulate AI extraction delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setFormData(prev => ({
            ...prev,
            fullName: "Alex Miller", // Mock extracted data
            email: "alex.miller@example.com",
            phone: "(555) 123-4567",
            previousExperience: "Worked at Amazon Logistics for 3 years as a floor supervisor. Handled inventory and quality control.",
            interestStatement: "I've seen the growth of Vista Auction and I'm impressed by the operational scale. I want to bring my logistics background here."
        }));

        setIsParsing(false);
        setNotification({ message: "AI Magic! Form fields pre-filled from resume.", type: "success" });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setNotification({ message: "File is too large. Max size is 10MB.", type: "error" });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                resumeName: file.name,
                resumeData: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const removeFile = () => {
        setFormData(prev => ({
            ...prev,
            resumeName: null,
            resumeData: null
        }));
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.fullName) newErrors.fullName = "Full Name is required";
            if (!formData.email) newErrors.email = "Email is required";
            if (!formData.phone) newErrors.phone = "Phone Number is required";
        }
        if (currentStep === 2) {
            if (!formData.workAuth) newErrors.workAuth = "Work Authorization is required";
            if (!formData.is16OrOlder) newErrors.is16OrOlder = "Required";
            if (!formData.is18OrOlder) newErrors.is18OrOlder = "Required";
        }
        if (currentStep === 3) {
            if (!formData.jobType) newErrors.jobType = "Required";
            if (!formData.preferredShift) newErrors.preferredShift = "Required";
            if (!formData.howHeard) newErrors.howHeard = "Required";
            if (!formData.preferredLocation) newErrors.preferredLocation = "Required";
            if (formData.interestStatement.length < 10) newErrors.interestStatement = "Please tell us a bit more.";
        }
        if (currentStep === 4) {
            if (!formData.backgroundConsent) newErrors.backgroundConsent = "Required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(4)) return;

        try {
            const newApp = {
                ...formData,
                id: Date.now().toString(),
                submittedDate: new Date().toISOString(),
                status: 'Pending'
            };

            const { error } = await supabase.from('vista_applications').upsert([newApp]);
            if (error) throw error;

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#f97316', '#fbbf24', '#ffffff']
            });

            setNotification({ message: 'Application Submitted Successfully!', type: 'success' });
            setTimeout(() => navigate('/status'), 2000);
        } catch (error) {
            console.error('Submission failed:', error);
            const msg = error?.message || 'Check your internet connection';
            setNotification({ message: `Cloud Sync Failed: ${msg}`, type: 'error' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto my-10 relative px-4 sm:px-0">
            {/* Steps Indicator */}
            <div className="mb-12">
                <div className="flex justify-between items-center relative z-10">
                    {[
                        { id: 1, label: "Basics", icon: User },
                        { id: 2, label: "Eligibility", icon: ShieldCheck },
                        { id: 3, label: "Experience", icon: Briefcase },
                        { id: 4, label: "Consent", icon: FileText }
                    ].map((s) => (
                        <div key={s.id} className="flex flex-col items-center">
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= s.id
                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110'
                                : 'bg-white border-gray-200 text-gray-400'
                                }`}>
                                <s.icon size={20} className="sm:size-[24px]" />
                            </div>
                            <span className={`mt-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${step >= s.id ? 'text-orange-600' : 'text-gray-400'} hidden sm:block`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
                {/* Progress Bar Background */}
                <div className="absolute top-5 sm:top-7 left-0 w-full h-1 bg-gray-200 -z-0 rounded-full">
                    <div
                        className="h-full bg-orange-500 ease-out duration-500 rounded-full transition-all"
                        style={{ width: step === 1 ? '12.5%' : step === 2 ? '37.5%' : step === 3 ? '62.5%' : '87.5%', marginLeft: '6.25%' }}
                    ></div>
                </div>
            </div>

            <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] border border-white/80 shadow-2xl bg-white/40 backdrop-blur-xl">
                <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight">Personal Details</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name *</label>
                                        <input
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className={`input-premium w-full p-4 rounded-xl ${errors.fullName ? 'border-red-500 ring-4 ring-red-50' : ''}`}
                                            placeholder="Jane Doe"
                                        />
                                        {errors.fullName && <p className="text-red-500 text-xs mt-1 font-bold">{errors.fullName}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number *</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className={`input-premium w-full p-4 rounded-xl ${errors.phone ? 'border-red-500 ring-4 ring-red-50' : ''}`}
                                                placeholder="(555) 123-4567"
                                            />
                                            {errors.phone && <p className="text-red-500 text-xs mt-1 font-bold">{errors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Your Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`input-premium w-full p-4 rounded-xl ${errors.email ? 'border-red-500 ring-4 ring-red-50' : ''}`}
                                                placeholder="jane@example.com"
                                            />
                                            {errors.email && <p className="text-red-500 text-xs mt-1 font-bold">{errors.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight">Work Authorization</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Work authorization type? *</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {["U.S. Citizen", "Permanent Resident", "EAD", "Other:"].map((opt) => (
                                                <label key={opt} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.workAuth === opt ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                    <input type="radio" name="workAuth" value={opt} checked={formData.workAuth === opt} onChange={handleChange} className="w-4 h-4 text-orange-600 focus:ring-orange-500" />
                                                    <span className="ml-3 text-xs font-bold text-gray-700">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {formData.workAuth === "Other:" && (
                                            <input name="otherWorkAuth" value={formData.otherWorkAuth} onChange={handleChange} className="mt-3 input-premium w-full p-4 rounded-xl" placeholder="Specify..." />
                                        )}
                                        {errors.workAuth && <p className="text-red-500 text-xs mt-2 font-bold">{errors.workAuth}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Are you 16 or older? *</label>
                                            <div className="flex gap-4">
                                                {["Yes", "No"].map(val => (
                                                    <label key={val} className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.is16OrOlder === val ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                        <input type="radio" name="is16OrOlder" value={val} checked={formData.is16OrOlder === val} onChange={handleChange} className="hidden" />
                                                        <span className="text-xs font-black uppercase tracking-widest">{val}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {errors.is16OrOlder && <p className="text-red-500 text-xs font-bold">{errors.is16OrOlder}</p>}
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Are you 18 or older? *</label>
                                            <div className="flex gap-4">
                                                {["Yes", "No"].map(val => (
                                                    <label key={val} className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.is18OrOlder === val ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                        <input type="radio" name="is18OrOlder" value={val} checked={formData.is18OrOlder === val} onChange={handleChange} className="hidden" />
                                                        <span className="text-xs font-black uppercase tracking-widest">{val}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {errors.is18OrOlder && <p className="text-red-500 text-xs font-bold">{errors.is18OrOlder}</p>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight">Experience & Interests</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Job Type *</label>
                                        <select name="jobType" value={formData.jobType} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.jobType ? 'border-red-500' : ''}`}>
                                            <option value="">Select...</option>
                                            <option value="Full time">Full time</option>
                                            <option value="Part time">Part time</option>
                                            <option value="Either">Either</option>
                                        </select>
                                        {errors.jobType && <p className="text-red-500 text-xs font-bold">{errors.jobType}</p>}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Shift *</label>
                                        <select name="preferredShift" value={formData.preferredShift} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.preferredShift ? 'border-red-500' : ''}`}>
                                            <option value="">Select...</option>
                                            <option value="Morning shift">Morning shift</option>
                                            <option value="Evening shift">Evening shift</option>
                                            <option value="Open to either">Open to either</option>
                                        </select>
                                        {errors.preferredShift && <p className="text-red-500 text-xs font-bold">{errors.preferredShift}</p>}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Why Vista Auction? *</label>
                                    <textarea name="interestStatement" value={formData.interestStatement} onChange={handleChange} rows="3" className={`input-premium w-full p-4 rounded-xl text-sm ${errors.interestStatement ? 'border-red-500' : ''}`} placeholder="Tell us why you want to join..."></textarea>
                                    {errors.interestStatement && <p className="text-red-500 text-xs mt-1 font-bold">{errors.interestStatement}</p>}
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Preferred Location *</label>
                                    <select name="preferredLocation" value={formData.preferredLocation} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.preferredLocation ? 'border-red-500' : ''}`}>
                                        <option value="">Select Location...</option>
                                        <option value="Sardis Rd- Charlotte, NC">Sardis Rd- Charlotte, NC</option>
                                        <option value="Monroe, NC">Monroe, NC</option>
                                        <option value="Open to both">Open to both</option>
                                    </select>
                                    {errors.preferredLocation && <p className="text-red-500 text-xs font-bold">{errors.preferredLocation}</p>}
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">How did you hear about us? *</label>
                                    <select name="howHeard" value={formData.howHeard} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.howHeard ? 'border-red-500' : ''}`}>
                                        <option value="">Select...</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Employee Referral">Employee Referral</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.howHeard && <p className="text-red-500 text-xs font-bold">{errors.howHeard}</p>}
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <h2 className="text-3xl font-black text-gray-900 mb-2 font-display tracking-tight">Final Confirmation</h2>
                                <p className="text-gray-500 font-medium mb-8">Almost there! Just one last check.</p>

                                <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100">
                                    <label className="flex items-start cursor-pointer group">
                                        <div className="relative flex items-center mt-1">
                                            <input
                                                type="checkbox"
                                                name="backgroundConsent"
                                                checked={formData.backgroundConsent}
                                                onChange={handleChange}
                                                className="w-6 h-6 rounded-lg border-orange-200 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <p className="ml-4 text-sm text-gray-700 font-bold leading-relaxed group-hover:text-gray-900 transition-colors">
                                            I acknowledge that Vista Auction conducts background checks as part of its hiring process and I consent to a screening if selected.
                                        </p>
                                    </label>
                                    {errors.backgroundConsent && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-4 ml-10">{errors.backgroundConsent}</p>}
                                </div>

                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-400 text-xs text-center">
                                    By submitting, you agree to our terms of service and privacy policy.
                                    Your data is securely stored in our cloud infrastructure.
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between mt-10 pt-6 border-t border-gray-100/50">
                        {step > 1 ? (
                            <button type="button" onClick={handleBack} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-100 flex items-center gap-2">
                                <ChevronLeft size={20} /> Back
                            </button>
                        ) : <div />}

                        {step < 4 ? (
                            <button type="button" onClick={handleNext} className="glass-button px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                Next Step <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button type="submit" className="glass-button px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 flex items-center gap-2">
                                Submit Application <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </form>
            </div>
            <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-8">Your future starts here.</p>
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};

export default ApplicationForm;
