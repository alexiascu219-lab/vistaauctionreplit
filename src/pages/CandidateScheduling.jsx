import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AlertCircle, CheckCircle, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import logoTag from '../assets/logo-tag.png';

const CandidateScheduling = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [error, setError] = useState(null);
    const [scheduledEvent, setScheduledEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalized, setFinalized] = useState(false);
    const [verifiedDate, setVerifiedDate] = useState(null);

    // Listen for successful booking event from Calendly
    useCalendlyEventListener({
        onEventScheduled: async (e) => {
            console.log("Event Scheduled:", e);
            const eventUri = e.data.payload.event.uri;
            setScheduledEvent(e.data.payload);

            // IMMEDIATELY fetch the real time using our secure backend relay
            try {
                const response = await fetch('/api/get_event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventUri })
                });

                if (response.ok) {
                    const { startTime } = await response.json();
                    console.log("Scheduling: Verified date from API:", startTime);
                    setVerifiedDate(startTime);
                } else {
                    console.warn("⚠️ Could not fetch details (Check VITE_CALENDLY_TOKEN)");
                }
            } catch (err) {
                console.error("API Relay Error:", err);
            }
        },
    });

    useEffect(() => {
        const fetchCandidate = async () => {
            try {
                if (!token) throw new Error("Invalid access token.");

                let id;
                try {
                    id = atob(decodeURIComponent(token));
                } catch (e) {
                    throw new Error("Malformed link.");
                }

                const { data, error } = await supabase
                    .from('vista_applications')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("Application not found.");

                setApplication(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCandidate();
    }, [token]);

    const handleFinalizeBooking = async () => {
        setIsSubmitting(true);
        try {
            // Use the verified date if we got it, otherwise fall back to "Now"
            const finalDate = verifiedDate || new Date().toISOString();

            // 1. Database Update (RPC)
            if (application?.id) {
                const { error: rpcError } = await supabase.rpc('confirm_candidate_interview', {
                    p_application_id: application.id,
                    p_interview_date: finalDate // Send the REAL time directly
                });
                if (rpcError) throw rpcError;

                // 2. Google Sheets Sync
                try {
                    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwb4Lt7n9oeOGUeS7j8Dv7hcmoICK06D3EIIgXvKsFsuJISr-XqVCChouponN7ljd5p/exec";

                    if (GOOGLE_SCRIPT_URL) {
                        await fetch(GOOGLE_SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'SYNC_INTERVIEW',
                                record: {
                                    id: application.id,
                                    full_name: application.full_name,
                                    email: application.email,
                                    interview_date: finalDate, // Send the REAL time
                                    status: 'INTERVIEWING'
                                },
                                type: 'UPDATE',
                                table: 'vista_applications'
                            })
                        });
                        console.log("Sync: Google integration triggered for date:", finalDate);
                    }
                } catch (syncErr) {
                    console.error("Sync: Google integration failed (non-fatal):", syncErr);
                }
            }

            setFinalized(true);
        } catch (err) {
            console.error("Submission Error:", err);
            alert("Error confirming interview. Please contact HR.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 font-display">Link Expired</h2>
                <p className="text-gray-500 mb-6 font-medium">{error}</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-colors">
                    Return Home
                </button>
            </div>
        </div>
    );

    const CALENDLY_URL = "https://calendly.com/vistaauctioncareers/interview";

    // PREMIUM SUCCESS UI
    if (finalized) {
        return (
            <div className="min-h-screen bg-white font-sans flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="relative z-10 max-w-2xl w-full text-center animate-fade-in-up">
                    <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-200 transform hover:scale-105 transition-transform duration-500">
                        <CheckCircle size={56} className="text-white drop-shadow-md" />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 font-display tracking-tight leading-tight">
                        Interview Confirmed
                    </h1>
                    <p className="text-xl text-slate-500 font-medium mb-12 max-w-lg mx-auto leading-relaxed">
                        We have successfully reserved your slot. A confirmation email has been sent to <span className="text-slate-900 font-bold">{application?.email}</span>.
                    </p>

                    <div className="bg-slate-50 rounded-3xl p-8 mb-12 border border-slate-100 flex items-center justify-center gap-6 shadow-sm">
                        <div className="text-center">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</span>
                            <span className="text-lg font-bold text-slate-900">Scheduled</span>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expectation</span>
                            <span className="text-lg font-bold text-slate-900">Be on time</span>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.href = 'https://vistaauction.com'}
                        className="group relative inline-flex items-center justify-center px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Back to Main Site <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <p className="mt-10 text-xs text-slate-400 font-semibold tracking-wide">
                        VISTA AUCTION • HUMAN RESOURCES
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoTag} alt="Vista Auction" className="h-8" />
                        <span className="font-black text-lg tracking-tight text-gray-900">Interview Scheduler</span>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8">
                {scheduledEvent ? (
                    // CONFIRMATION STEP (Manual Submission)
                    <div className="max-w-xl w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-orange-100 animate-fade-in-up">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar size={40} className="text-orange-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-4 font-display">Time Slot Selected</h1>
                        <p className="text-gray-500 font-medium mb-4">Please confirm to finalize your interview booking.</p>

                        <button
                            onClick={handleFinalizeBooking}
                            disabled={isSubmitting}
                            className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Finalizing...
                                </>
                            ) : (
                                "Submit Scheduling"
                            )}
                        </button>
                    </div>
                ) : (
                    // SCHEDULER WIDGET
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
                        <div className="h-[800px]">
                            <InlineWidget
                                url={CALENDLY_URL}
                                prefill={{
                                    email: application?.email,
                                    name: application?.full_name,
                                    customAnswers: {
                                        a1: application?.phone
                                    }
                                }}
                                styles={{
                                    height: '100%',
                                    minWidth: '320px'
                                }}
                                pageSettings={{
                                    primaryColor: 'ea580c',
                                    textColor: '0f172a'
                                }}
                            />
                        </div>
                        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">
                                Having trouble loading the calendar?
                            </p>
                            <a
                                href={CALENDLY_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 underline underline-offset-4"
                            >
                                Open Scheduler in New Window
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateScheduling;
