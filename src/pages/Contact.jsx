import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';

const Contact = () => {
    const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setSubmitting(false);
            setSent(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
            <Navbar />

            {/* Header */}
            <section className="pt-40 pb-20 bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full -ml-32 -mt-32 blur-3xl"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-black text-slate-950 mb-6 tracking-tight font-display"
                    >
                        Get in <span className="text-orange-600">Touch</span>.
                    </motion.h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Have questions about our open roles or the application process? Our team is here to help you navigate your next career move.
                    </p>
                </div>
            </section>

            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        {/* Contact Info */}
                        <div className="space-y-12">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-600 mb-8">Contact Information</h3>
                                <div className="space-y-8">
                                    <div className="flex items-start gap-6 group">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-orange-600/20">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-950 mb-1">Corporate HQ</h4>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                2500 Sardis Rd N,<br />Charlotte, NC 28227
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-6 group">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-orange-600/20">
                                            <Phone size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-950 mb-1">Phone</h4>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                (980) 220–2564
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-6 group">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-orange-600/20">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-950 mb-1">Email</h4>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                hr@vistaauction.com
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100">
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Support Hours</h3>
                                <div className="flex items-center gap-6 text-slate-500 font-medium">
                                    <Clock size={20} className="text-orange-600" />
                                    <span>Monday — Friday: 9am - 5pm EST</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-white p-10 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                            {sent ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center py-20"
                                >
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 mx-auto">
                                        <Send size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">Message Sent!</h3>
                                    <p className="text-slate-500 font-medium mb-10">We've received your inquiry and will get back to you within 24 hours.</p>
                                    <button
                                        onClick={() => setSent(false)}
                                        className="text-orange-600 font-black uppercase text-xs tracking-widest hover:text-orange-700 transition-colors"
                                    >
                                        Send Another Message
                                    </button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all font-bold text-sm"
                                                placeholder="John Doe"
                                                value={formState.name}
                                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all font-bold text-sm"
                                                placeholder="john@example.com"
                                                value={formState.email}
                                                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all font-bold text-sm"
                                            placeholder="Question about Logistics role"
                                            value={formState.subject}
                                            onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
                                        <textarea
                                            required
                                            rows="4"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all font-bold text-sm resize-none"
                                            placeholder="Tell us how we can help..."
                                            value={formState.message}
                                            onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-slate-950 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:shadow-slate-900/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? 'Sending...' : 'Send Message'} <Send size={16} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Contact;
