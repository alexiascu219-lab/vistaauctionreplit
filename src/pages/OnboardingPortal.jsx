import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, AlertCircle, PenTool, Upload, Shirt, ChevronRight, FileText, User, CreditCard, Home, Phone, FileCheck, Eye, EyeOff, Shield, Lock, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import SignatureCanvas from 'react-signature-canvas';
import logoTag from '../assets/logo-tag.png';
import { encryptData } from '../utils/encryption';

const OnboardingPortal = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const sigCanvas = useRef({});
    const debounceTimer = useRef(null);

    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [error, setError] = useState(null);

    // Steps: 1. Info & Docs, 2. Policies, 3. Offer & Uniform
    const [step, setStep] = useState(1);

    // UI State
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showBankDetails, setShowBankDetails] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        mailingAddress: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        bankName: '',
        routingNumber: '',
        accountNumber: '',
        agreedProbation: false,
        agreedHandbook: false,
        agreedNDA: false
    });

    const [files, setFiles] = useState({
        w4: null,
        i9: null,
        nc4: null,
        id: null
    });

    const [uniformSize, setUniformSize] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchCandidate = async () => {
            try {
                if (!token) throw new Error("Invalid access token.");
                let id;
                try { id = atob(decodeURIComponent(token)); } catch (e) { throw new Error("Malformed link."); }

                const { data, error } = await supabase
                    .from('vista_applications')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("Application not found.");

                // Safely parse notes
                let notes = {};
                try {
                    notes = data.notes ? (typeof data.notes === 'string' ? JSON.parse(data.notes) : data.notes) : {};
                } catch (e) {
                    console.error("Error parsing application notes:", e);
                    notes = {};
                }

                if (notes.onboarding_completed) setStep(4);

                setApplication(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidate();
    }, [token]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e, key) => {
        if (e.target.files[0]) {
            setFiles(prev => ({ ...prev, [key]: e.target.files[0] }));
        }
    };

    const uploadFile = async (file, prefix) => {
        if (!file) return null;
        const fileName = `${application.id}-${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, file);
        if (error) { console.error("Upload failed", error); return null; }
        return fileName;
    };

    const handleFinalSubmit = async () => {
        if (sigCanvas.current.isEmpty()) { alert("Please sign the offer letter."); return; }
        if (!uniformSize) { alert("Please select a uniform size."); return; }

        setUploading(true);
        try {
            // Upload all files
            const w4Url = await uploadFile(files.w4, 'w4');
            const i9Url = await uploadFile(files.i9, 'i9');
            const nc4Url = await uploadFile(files.nc4, 'nc4');
            const idUrl = await uploadFile(files.id, 'id');
            const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

            // Update Application
            const { error: updateError } = await supabase
                .from('vista_applications')
                .update({
                    status: 'Hired',
                    notes: JSON.stringify({
                        ...(() => {
                            try {
                                return typeof application.notes === 'string' ? JSON.parse(application.notes) : (application.notes || {});
                            } catch (e) { return {}; }
                        })(),
                        onboarding_completed: new Date().toISOString(),
                        uniform_size: uniformSize,
                        onboarding_data: {
                            ...formData,
                            // Encrypt Sensitive Data
                            bankName: encryptData(formData.bankName),
                            routingNumber: encryptData(formData.routingNumber),
                            accountNumber: encryptData(formData.accountNumber),
                            encrypted_banking: true,

                            w4_url: w4Url,
                            i9_url: i9Url,
                            nc4_url: nc4Url,
                            id_url: idUrl,

                            signature_present: true
                        }
                    })
                })
                .eq('id', application.id);

            if (updateError) throw updateError;

            setStep(4);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#f97316', '#ffffff'] });

        } catch (err) {
            alert("Submission failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const getDepartment = () => {
        const job = (application?.jobType || '').toLowerCase();
        if (job.includes('pickup')) return 'Pickups Department';
        if (job.includes('warehouse')) return 'Warehouse Operations';
        if (job.includes('list')) return 'Inventory Listing';
        return 'Vista Auction Team';
    };

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div></div>;
    if (error) return <div className="text-center p-10 text-red-500 font-bold">{error}</div>;

    if (step === 4) return (
        <div className="min-h-screen bg-orange-600 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="max-w-lg w-full bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-fade-in-up text-center">
                <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-black text-gray-900 mb-4 font-display">Onboarding Complete</h1>
                <p className="text-gray-500 font-medium leading-relaxed">
                    Thank you for completing your onboarding documents. Your profile has been successfully updated.
                    <br /><br />
                    Our HR team will review your submission and reach out shortly with your orientation schedule.
                </p>
                <button
                    onClick={() => setStep(1)}
                    className="mt-8 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-orange-600 transition-colors border-b border-transparent hover:border-orange-200"
                >
                    Review Submitted Information
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoTag} alt="Vista Auction" className="h-8" />
                        <span className="font-black text-lg tracking-tight text-gray-900">Onboarding</span>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-2 w-8 rounded-full transition-all ${step >= i ? 'bg-orange-600' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-3xl font-black text-gray-900 mb-2 font-display">Congratulations, {(application.full_name || 'Applicant').split(' ')[0]}!</h1>
                    <p className="text-gray-500 font-medium">We are thrilled to offer you a position in our <span className="text-orange-600 font-bold">{getDepartment()}</span>.</p>
                </div>

                {/* STEP 1: PERSONAL INFO */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest"><User size={18} /> Employee Information</h3>

                            {/* Address with Autocomplete */}
                            <div className="mb-6 relative">
                                <label className="text-xs font-bold text-gray-400 uppercase">Mailing Address <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        name="mailingAddress"
                                        value={formData.mailingAddress}
                                        onChange={(e) => {
                                            handleInputChange(e);
                                            // Debounced Fetch
                                            if (debounceTimer.current) clearTimeout(debounceTimer.current);

                                            if (e.target.value.length > 4) {
                                                debounceTimer.current = setTimeout(() => {
                                                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(e.target.value)}&addressdetails=1&limit=5`)
                                                        .then(res => res.json())
                                                        .then(data => setAddressSuggestions(data))
                                                        .catch(() => { });
                                                }, 500);
                                            } else {
                                                setAddressSuggestions([]);
                                            }
                                        }}
                                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm focus:ring-2 focus:ring-orange-100 outline-none pl-10"
                                        placeholder="Start typing your address..."
                                        autoComplete="street-address"
                                    />
                                    <MapPin size={16} className="absolute left-3 top-4 text-gray-400" />
                                </div>
                                {addressSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full left-0 bg-white rounded-2xl shadow-2xl mt-2 border border-gray-100 overflow-hidden animate-fade-in-up">
                                        <div className="bg-gray-50 px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Suggestions</div>
                                        {addressSuggestions.map((addr, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, mailingAddress: addr.display_name }));
                                                    setAddressSuggestions([]);
                                                }}
                                                className="w-full text-left p-4 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-900 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3 group"
                                            >
                                                <MapPin size={14} className="mt-0.5 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
                                                <span className="leading-relaxed">{addr.display_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Emergency Contact Split */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Emergency Contact Name <span className="text-red-500">*</span></label>
                                    <input
                                        name="emergencyContactName"
                                        value={formData.emergencyContactName}
                                        onChange={handleInputChange}
                                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm"
                                        placeholder="Full Name"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Emergency Phone <span className="text-red-500">*</span></label>
                                    <input
                                        name="emergencyContactPhone"
                                        value={formData.emergencyContactPhone}
                                        onChange={(e) => {
                                            const cleaned = e.target.value.replace(/\D/g, '');
                                            let formatted = cleaned;
                                            if (cleaned.length > 0) {
                                                if (cleaned.length <= 3) formatted = `(${cleaned}`;
                                                else if (cleaned.length <= 6) formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
                                                else formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
                                            }
                                            setFormData(prev => ({ ...prev, emergencyContactPhone: formatted }));
                                        }}
                                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm"
                                        placeholder="(555) 000-0000"
                                        maxLength={14}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Secure Bank Info */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-8 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Lock size={120} className="text-gray-900" />
                                </div>
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                                        <Shield size={18} className="text-emerald-500" /> Direct Deposit
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                            <Lock size={8} /> 256-Bit Encrypted
                                        </span>
                                        <button
                                            onClick={() => setShowBankDetails(!showBankDetails)}
                                            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                                        >
                                            {showBankDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-3 gap-6 relative z-10">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Bank Name <span className="text-red-500">*</span></label>
                                        <input
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleInputChange}
                                            type={showBankDetails ? "text" : "password"}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-gray-300"
                                            placeholder="Bank Name"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Routing # <span className="text-red-500">*</span></label>
                                        <input
                                            name="routingNumber"
                                            value={formData.routingNumber}
                                            onChange={handleInputChange}
                                            type={showBankDetails ? "text" : "password"}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-gray-300"
                                            placeholder="•••••••••"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Account # <span className="text-red-500">*</span></label>
                                        <input
                                            name="accountNumber"
                                            value={formData.accountNumber}
                                            onChange={handleInputChange}
                                            type={showBankDetails ? "text" : "password"}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-gray-300"
                                            placeholder="••••••••••••"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest mt-8"><FileCheck size={18} /> Tax Documents</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['w4', 'i9', 'nc4', 'id'].map(type => (
                                    <div key={type} className="relative group">
                                        <input type="file" onChange={(e) => handleFileChange(e, type)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all h-full flex flex-col items-center justify-center ${files[type] ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                                            <Upload size={20} className={files[type] ? 'text-orange-600' : 'text-gray-300'} />
                                            <span className="text-[10px] font-black uppercase mt-2 text-gray-400">{type.toUpperCase()} Upload</span>
                                            {files[type] && <span className="text-[9px] text-orange-600 truncate max-w-full px-2 mt-1">{files[type].name}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                // Validation
                                if (!formData.mailingAddress || !formData.emergencyContactName || !formData.emergencyContactPhone || !formData.bankName || !formData.routingNumber || !formData.accountNumber) {
                                    alert("Please complete all required fields (Address, Emergency Contact, and Banking Info).");
                                    return;
                                }
                                setStep(2);
                            }}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            Next: Policy Review <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* STEP 2: POLICIES */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">Company Policies</h3>

                            {[
                                { id: 'agreedProbation', label: '30-Day Probationary Period Policy', desc: 'I understand that my first 30 days are a probationary period.' },
                                { id: 'agreedHandbook', label: 'Employee Handbook Acknowledgment', desc: 'I have received and agree to read the Vista Auction Employee Handbook.' },
                                { id: 'agreedNDA', label: 'Mutual Non-Disclosure Agreement', desc: 'I agree to maintain confidentiality regarding company operations.' }
                            ].map(policy => (
                                <div key={policy.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors mb-4">
                                    <input type="checkbox" name={policy.id} checked={formData[policy.id]} onChange={handleInputChange} className="mt-1 w-5 h-5 accent-orange-600 cursor-pointer" />
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{policy.label}</div>
                                        <div className="text-xs text-gray-500 mt-1">{policy.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-200">Back</button>
                            <button
                                onClick={() => {
                                    if (formData.agreedProbation && formData.agreedHandbook && formData.agreedNDA) setStep(3);
                                    else alert("Please acknowledge all policies.");
                                }}
                                className="flex-1 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                Next: Offer & Signature <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: OFFER & SIGN */}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest"><PenTool size={18} /> Sign Your Offer</h3>
                            <div className="prose prose-sm text-gray-500 mb-8 max-h-48 overflow-y-auto custom-scrollbar border rounded-xl p-6 bg-gray-50 font-serif leading-relaxed text-xs">
                                <p><strong>Dear {application.full_name},</strong></p>
                                <p>Vista Auction is pleased to offer you the position of {application.jobType || application.position || 'Team Member'}.</p>
                                <p>By signing below, you accept this offer of employment.</p>
                            </div>

                            <div className="mb-8">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Signature</label>
                                <div className="border border-gray-200 rounded-xl bg-white hover:border-orange-400 transition-colors shadow-inner overflow-hidden">
                                    <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ width: 600, height: 160, className: 'sigCanvas w-full h-40' }} />
                                </div>
                                <button onClick={() => sigCanvas.current.clear()} className="text-[10px] font-bold text-red-500 uppercase mt-2">Clear</button>
                            </div>

                            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest"><Shirt size={18} /> Select Uniform Size</h3>
                            <div className="grid grid-cols-6 gap-2 mb-8">
                                {['S', 'M', 'L', 'XL', '2XL', '3XL'].map(size => (
                                    <button key={size} onClick={() => setUniformSize(size)} className={`py-2 rounded-lg font-bold text-xs transition-all ${uniformSize === size ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-500 hover:border-orange-200'}`}>{size}</button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleFinalSubmit}
                            disabled={uploading}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                        >
                            {uploading ? 'Finalizing...' : 'Complete Onboarding'} <CheckCircle size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingPortal;
