import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';
import { ChevronRight, ChevronLeft, Upload, CheckCircle, User, Briefcase, FileText, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const ApplicationForm = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [notification, setNotification] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        workAuth: '',
        is16: false,
        is18: false,
        position: '',
        location: '',
        experience: '',
        referral: '',
        workedBefore: false,
        consent: false,
        resumeName: null,
        resumeData: null
    });
    const [errors, setErrors] = useState({});

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

        if (file.size > 2 * 1024 * 1024) {
            setNotification({ message: "File is too large. Please upload a file smaller than 2MB.", type: "error" });
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
        let isValid = true;

        if (currentStep === 1) {
            if (!formData.firstName) newErrors.firstName = "First Name is required";
            if (!formData.lastName) newErrors.lastName = "Last Name is required";
            if (!formData.email) newErrors.email = "Email is required";
            if (!formData.phone) newErrors.phone = "Phone is required";
        }

        if (currentStep === 2) {
            if (!formData.workAuth) newErrors.workAuth = "Work Authorization is required";
            if (!formData.is16 && !formData.is18) newErrors.isAge = "You must confirm your age";
            if (!formData.consent) newErrors.consent = "Consent is required";
        }

        if (currentStep === 3) {
            if (!formData.position) newErrors.position = "Please select a position";
            if (!formData.location) newErrors.location = "Please select a location";
            if (!formData.referral) newErrors.referral = "Please tell us how you heard about us";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        const existingApps = JSON.parse(localStorage.getItem('vista_applications') || '[]');
        const newApp = {
            ...formData,
            id: Date.now().toString(),
            submittedDate: new Date().toISOString(),
            status: 'Pending'
        };
        existingApps.push(newApp);
        localStorage.setItem('vista_applications', JSON.stringify(existingApps));

        // Trigger Confetti (Orange Themed)
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#fbbf24', '#ffffff'] // Orange-500, Amber-400, White
        });

        setNotification({ message: 'Application Submitted Successfully!', type: 'success' });
        setTimeout(() => navigate('/status'), 2000); // Redirect to status page instead of home
    };

    return (
        <div className="max-w-4xl mx-auto my-10 relative">

            {/* Steps Indicator */}
            <div className="mb-12">
                <div className="flex justify-between items-center relative z-10 px-10">
                    {[
                        { id: 1, label: "Personal Info", icon: User },
                        { id: 2, label: "Eligibility", icon: CheckCircle },
                        { id: 3, label: "Experience", icon: Briefcase }
                    ].map((s) => (
                        <div key={s.id} className="flex flex-col items-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= s.id
                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110'
                                : 'bg-white border-gray-200 text-gray-400'
                                }`}>
                                <s.icon size={24} />
                            </div>
                            <span className={`mt-3 text-sm font-black uppercase tracking-widest transition-colors ${step >= s.id ? 'text-orange-600' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
                {/* Progress Bar Background */}
                <div className="absolute top-7 left-0 w-full h-1 bg-gray-200 -z-0 rounded-full">
                    <div
                        className="h-full bg-orange-500 ease-out duration-500 rounded-full transition-all"
                        style={{ width: step === 1 ? '16%' : step === 2 ? '50%' : '84%', marginLeft: '8%' }}
                    ></div>
                </div>
            </div>

            <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] animate-fade-in-up border border-white/80 shadow-2xl">
                <form onSubmit={handleSubmit}>

                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight text-shadow-sm">Let's get to know you.</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                    <input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={`input-premium w-full p-4 rounded-xl ${errors.firstName ? 'border-red-500 ring-4 ring-red-50' : ''}`}
                                        placeholder="Jane"
                                    />
                                    {errors.firstName && <p className="text-red-500 text-xs mt-1 font-bold">{errors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                    <input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={`input-premium w-full p-4 rounded-xl ${errors.lastName ? 'border-red-500 ring-4 ring-red-50' : ''}`}
                                        placeholder="Doe"
                                    />
                                    {errors.lastName && <p className="text-red-500 text-xs mt-1 font-bold">{errors.lastName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
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
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
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
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Eligibility */}
                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight text-shadow-sm">Eligibility & Consents</h2>

                            <div className="space-y-4">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Work Authorization</label>
                                <select
                                    name="workAuth"
                                    value={formData.workAuth}
                                    onChange={handleChange}
                                    className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.workAuth ? 'border-red-500' : ''}`}
                                >
                                    <option value="">Select Status...</option>
                                    <option value="US Citizen">U.S. Citizen</option>
                                    <option value="Permanent Resident">Permanent Resident / Green Card</option>
                                    <option value="EAD">Employment Authorization Document (EAD)</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.workAuth && <p className="text-red-500 text-xs mt-1 font-bold">{errors.workAuth}</p>}
                            </div>

                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Age Verification</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-orange-200 transition-colors">
                                        <input type="checkbox" name="is16" checked={formData.is16} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                                        <span className="ml-3 text-gray-700 font-bold uppercase tracking-widest text-[10px]">I am 16 years of age or older</span>
                                    </label>
                                    <label className="flex items-center p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-orange-200 transition-colors">
                                        <input type="checkbox" name="is18" checked={formData.is18} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                                        <span className="ml-3 text-gray-700 font-bold uppercase tracking-widest text-[10px]">I am 18 years of age or older</span>
                                    </label>
                                </div>
                                {errors.isAge && <p className="text-red-500 text-xs font-bold">{errors.isAge}</p>}
                            </div>

                            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                <label className="flex items-start cursor-pointer">
                                    <div className="flex items-center h-6">
                                        <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                                    </div>
                                    <div className="ml-3">
                                        <span className="text-gray-900 font-black uppercase tracking-widest text-[11px]">Background Check Consent</span>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">I understand that Vista Auction may perform a background check as part of the hiring process.</p>
                                    </div>
                                </label>
                                {errors.consent && <p className="text-red-500 text-xs mt-2 font-bold">{errors.consent}</p>}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Role & Resume */}
                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in">
                            <h2 className="text-3xl font-black text-gray-900 mb-6 font-display tracking-tight text-shadow-sm">Professional Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Role Interested In</label>
                                    <select name="position" value={formData.position} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.position ? 'border-red-500' : ''}`}>
                                        <option value="">Select Role...</option>
                                        <option value="Scanning">Scanning</option>
                                        <option value="Warehouse">Warehouse</option>
                                        <option value="Pickups">Pickups</option>
                                        <option value="Customer Service">Customer Service</option>
                                        <option value="Stacking">Stacking</option>
                                        <option value="Conveyor">Conveyor</option>
                                        <option value="Management">Management</option>
                                    </select>
                                    {errors.position && <p className="text-red-500 text-xs mt-1 font-bold">{errors.position}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Preferred Location</label>
                                    <select name="location" value={formData.location} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.location ? 'border-red-500' : ''}`}>
                                        <option value="">Select Location...</option>
                                        <option value="Charlotte, NC">Charlotte, NC</option>
                                        <option value="Remote">Remote</option>
                                    </select>
                                    {errors.location && <p className="text-red-500 text-xs mt-1 font-bold">{errors.location}</p>}
                                </div>
                            </div>

                            {/* Resume Upload */}
                            <div className="bg-gray-50/50 p-8 rounded-[2rem] border-2 border-gray-100 border-dashed hover:border-orange-400 hover:bg-orange-50/30 transition-all relative group">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Resume / CV (Optional)</label>
                                {!formData.resumeName ? (
                                    <div className="flex flex-col items-center justify-center py-6 cursor-pointer">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="text-orange-500" size={32} />
                                        </div>
                                        <span className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline">Click to upload</span>
                                        <span className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest">PDF, DOCX, JPG (Max 2MB)</span>
                                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                                <FileText size={20} />
                                            </div>
                                            <span className="font-bold text-gray-700 text-sm truncate max-w-[200px]">{formData.resumeName}</span>
                                        </div>
                                        <button type="button" onClick={removeFile} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">How did you hear about us?</label>
                                <select name="referral" value={formData.referral} onChange={handleChange} className={`input-premium w-full p-4 rounded-xl appearance-none ${errors.referral ? 'border-red-500' : ''}`}>
                                    <option value="">Select...</option>
                                    <option value="Employee">Employee</option>
                                    <option value="Customer">Customer</option>
                                    <option value="Advertisement">Advertisement</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.referral && <p className="text-red-500 text-xs mt-1 font-bold">{errors.referral}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Experience & Background</label>
                                <textarea name="experience" value={formData.experience} onChange={handleChange} rows="4" className="input-premium w-full p-4 rounded-xl text-sm" placeholder="Tell us about your previous work experience..."></textarea>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                                <ChevronLeft size={20} /> Back
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="glass-button px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
                            >
                                Next Step <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="glass-button px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 flex items-center gap-2"
                            >
                                Submit Application <CheckCircle size={20} />
                            </button>
                        )}
                    </div>

                </form>
            </div>

            <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-8">
                By submitting this application, you agree to our Terms of Service and Privacy Policy.
            </p>
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};

export default ApplicationForm;
