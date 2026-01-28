import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
            <Navbar />

            <section className="pt-40 pb-20 bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-5xl font-black text-slate-950 mb-6 tracking-tight font-display">
                            Privacy <span className="text-orange-600">Policy</span>.
                        </h1>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed">
                            Last Updated: January 2026. Your privacy is paramount to us. This policy outlines how we handle your personal data when you interact with Vista Auction Careers.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        <div className="lg:col-span-2 space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">1. Information We Collect</h3>
                                <p className="text-slate-600 leading-loose">
                                    When you apply for a position at Vista Auction, we collect information that you voluntarily provide to us. This includes your name, email address, phone number, work history, education, and any other information contained in your resume or cover letter.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">2. How We Use Your Information</h3>
                                <p className="text-slate-600 leading-loose">
                                    We use your information primarily to evaluate your candidacy for open positions, communicate with you regarding your application, and improve our recruitment process. We do not sell or lease your personal data to third parties.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">3. Data Security</h3>
                                <p className="text-slate-600 leading-loose">
                                    We implement a variety of security measures to maintain the safety of your personal information. Your data is stored in secured networks and is only accessible by a limited number of persons who have special access rights to such systems.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">4. Cookies</h3>
                                <p className="text-slate-600 leading-loose">
                                    Our website may use "cookies" to enhance the user experience. You can choose to set your web browser to refuse cookies, or to alert you when cookies are being sent. Note that some parts of the site may not function properly without them.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-orange-50 p-8 rounded-[2rem] border border-orange-100">
                                <Shield className="text-orange-600 mb-4" size={32} />
                                <h4 className="text-lg font-black text-slate-950 mb-2 tracking-tight">Data Protection</h4>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    We adhere to strict data protection standards to ensure your information is handled with care and in compliance with legal requirements.
                                </p>
                            </div>

                            <div className="bg-slate-900 p-8 rounded-[2rem] text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                <Lock className="text-orange-500 mb-4" size={32} />
                                <h4 className="text-lg font-black mb-2 tracking-tight">Encrypted Vaults</h4>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    Sensitive documents like govt IDs provided during onboarding are stored in encrypted storage vaults with audited access control.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
