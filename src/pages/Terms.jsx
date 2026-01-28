import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { FileText, Gavel, Scale, AlertTriangle } from 'lucide-react';

const Terms = () => {
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
                            Terms of <span className="text-orange-600">Service</span>.
                        </h1>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed">
                            Last Updated: January 2026. By using Vista Auction Careers, you agree to comply with and be bound by the following terms and conditions.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        <div className="lg:col-span-2 space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">1. Acceptance of Terms</h3>
                                <p className="text-slate-600 leading-loose">
                                    Your access to and use of this website is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users and others who access or use the Service.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">2. Use of the Site</h3>
                                <p className="text-slate-600 leading-loose">
                                    You agree to use the site only for lawful purposes related to seeking employment at Vista Auction. You are prohibited from violating or attempting to violate the security of the site, including, without limitation, accessing data not intended for you or logging into a server or account which you are not authorized to access.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">3. User Submissions</h3>
                                <p className="text-slate-600 leading-loose">
                                    By submitting an application or resume, you represent that all information provided is true, accurate, and complete. You understand that any false statements or omissions may be grounds for rejection of your application or termination of employment.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">4. Intellectual Property</h3>
                                <p className="text-slate-600 leading-loose">
                                    The Service and its original content, features and functionality are and will remain the exclusive property of Vista Auction and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-slate-950 tracking-tight">5. Limitation of Liability</h3>
                                <p className="text-slate-600 leading-loose">
                                    In no event shall Vista Auction, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <Gavel className="text-orange-600 mb-4" size={32} />
                                <h4 className="text-lg font-black text-slate-950 mb-2 tracking-tight">Legal Compliance</h4>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    These terms are governed by the laws of North Carolina, United States, without regard to its conflict of law provisions.
                                </p>
                            </div>

                            <div className="bg-orange-600 p-8 rounded-[2rem] text-white shadow-xl shadow-orange-600/20">
                                <Scale className="text-white mb-4" size={32} />
                                <h4 className="text-lg font-black mb-2 tracking-tight">Dispute Resolution</h4>
                                <p className="text-sm text-orange-50 font-medium leading-relaxed">
                                    Any dispute arising from these terms shall be resolved through binding arbitration in accordance with industry standards.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 p-6 bg-red-50 rounded-2xl border border-red-100 text-red-600">
                                <AlertTriangle size={24} className="shrink-0" />
                                <span className="text-xs font-black uppercase tracking-widest">Read Carefully</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Terms;
