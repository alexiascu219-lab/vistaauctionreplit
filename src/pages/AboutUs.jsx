import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Target, Users, Zap, Shield, Award, Briefcase } from 'lucide-react';

const AboutUs = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50 rounded-full -mr-96 -mt-96 blur-3xl opacity-50 animate-pulse-slow"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-6xl md:text-7xl font-black tracking-tight leading-[0.9] mb-8 font-display text-slate-950"
                        >
                            Building the <span className="text-orange-600">Future</span> of Auction Logistics.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-slate-500 font-medium leading-relaxed"
                        >
                            Vista Auction is more than just an auction house. We are a technology-driven logistics engine that empowers thousands of buyers and sellers every single day.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="mb-20">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-orange-600 mb-4">Our DNA</h2>
                        <h3 className="text-4xl font-black text-slate-950 tracking-tight">The values that drive us forward.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: Target, title: "Precision", desc: "We believe in the power of data and exact execution. Every lot, every bid, every delivery matters." },
                            { icon: Users, title: "People First", desc: "Our strength lies in our team. We foster an environment of growth, respect, and shared success." },
                            { icon: Zap, title: "Innovation", desc: "We don't settle for 'how it's always been done'. We build the tools that lead the industry." },
                            { icon: Shield, title: "Integrity", desc: "Trust is our currency. We maintain the highest standards of transparency in everything we do." },
                            { icon: Award, title: "Excellence", desc: "We strive for world-class service, ensuring every customer experience is seamless." },
                            { icon: Briefcase, title: "Opportunity", desc: "We provide paths for career development, turning jobs into long-term professional journeys." },
                        ].map((val, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all group"
                            >
                                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-8 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                                    <val.icon size={32} />
                                </div>
                                <h4 className="text-xl font-black text-slate-950 mb-4 tracking-tight">{val.title}</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">{val.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-32 relative overflow-hidden bg-slate-950 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-5xl md:text-6xl font-black mb-10 tracking-tight leading-tight max-w-4xl mx-auto font-display">
                        We're on a mission to simplify commerce.
                    </h2>
                    <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-16 leading-loose">
                        By integrating sophisticated logistics with a frictionless auction platform, we're making it easier than ever for people to find value and for businesses to thrive.
                    </p>
                    <div className="flex flex-wrap justify-center gap-12 text-center">
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">10k+</div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Weekly Lots</div>
                        </div>
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">50k+</div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Active Users</div>
                        </div>
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">25+</div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Years Industry Experience</div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default AboutUs;
