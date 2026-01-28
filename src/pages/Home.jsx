import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';
import JobMatchQuiz from '../components/JobMatchQuiz';

const Home = () => {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scroll = `${totalScroll / windowHeight}`;
            setScrollProgress(Number(scroll));
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            image: "/assets/role-scanning.png",
            title: "Scanning",
            description: "Precision in every scan. Ensure inventory accuracy using state-of-the-art handheld devices."
        },
        {
            image: "/assets/warehouse.png",
            title: "Warehouse",
            description: "The backbone of our operations. Maintain safety and organization in our fast-paced facility."
        },
        {
            image: "/assets/role-pickups.png",
            title: "Pickups",
            description: "Connect with customers. Ensure orders are ready and handed off with a smile."
        },
        {
            image: "/assets/role-customer-service.png",
            title: "Customer Service",
            description: "Be the voice of Vista. Resolve inquiries and provide exceptional support to our bidders."
        },
        {
            image: "/assets/role-stacking.png",
            title: "Stacking",
            description: "Master the art of organization. Safely stack and stage products for efficient processing."
        },
        {
            image: "/assets/role-conveyor.png",
            title: "Conveyor",
            description: "Keep things moving. Monitor and manage the flow of goods on our automated lines."
        }
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-text-main">
            {/* Scroll Progress Bar */}
            <div className="fixed top-0 left-0 h-1.5 bg-orange-500 z-50 transition-all duration-100 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${scrollProgress * 100}%` }}></div>

            <Navbar />

            {/* Hero Section */}
            <div className="relative min-h-screen flex flex-col items-center justify-center text-center text-white overflow-hidden pt-32 pb-20">
                <div className="absolute inset-0">
                    <img src="/assets/hero-shelves.jpg" alt="Vista Auction Logistics" className="w-full h-full object-cover transform scale-105 animate-subtle-zoom" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/70 to-background"></div>
                </div>

                <div className="relative z-10 max-w-5xl px-4 mb-20 animate-fade-in-up">
                    <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black tracking-[0.3em] uppercase mb-8 text-orange-400">
                        Logistics • Retail • Excellence
                    </span>
                    <h1 className="text-5xl md:text-8xl font-black mb-8 drop-shadow-2xl leading-none font-display tracking-tight text-shadow">
                        Join the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 drop-shadow-none">Vista Crew</span>
                    </h1>
                    <p className="text-xl md:text-2xl mb-12 font-medium text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        We are redefining the auction experience one package at a time. Are you ready for your next adventure?
                    </p>

                    {/* Hero Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <a href="#quiz" className="glass-button px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/20">
                            Find Your Role
                        </a>
                        <Link to="/apply" className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/40">
                            Apply Now
                        </Link>
                    </div>
                </div>

                {/* Job Match Quiz Integration */}
                <div id="quiz" className="relative z-10 w-full px-4 animate-fade-in-up delay-200 mt-12 pb-20">
                    <JobMatchQuiz />
                </div>
            </div>

            <main>
                {/* Features Section */}
                <section id="roles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-20">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 font-display tracking-tight">Our Roles</h2>
                        <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full shadow-sm shadow-orange-500/20"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                image={feature.image}
                                title={feature.title}
                                description={feature.description}
                                theme="orange"
                            />
                        ))}
                    </div>
                </section>



                {/* Culture Section */}
                <section className="py-32 bg-white relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-slate-200/40 rounded-full blur-3xl"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-20">
                        <div className="md:w-1/2">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-slate-500/10 rounded-[3rem] blur-2xl"></div>
                                <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white group">
                                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                                    <img src="/assets/vista-storefront.jpg" alt="Vista Auction Teamwork" className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700" />
                                </div>
                            </div>
                        </div>
                        <div className="md:w-1/2 space-y-10">
                            <div>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-4 block">Our Culture</span>
                                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 font-display leading-[1.1] tracking-tight text-shadow-sm">Built on <span className="text-orange-600">Excellence</span></h2>
                            </div>
                            <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                At Vista Auction, our facilities are more than just warehouses—they are the heartbeat of a sophisticated logistics network. A modernized, organized, and energetic space where teamwork thrives and technology empowers you.
                            </p>
                            <ul className="space-y-6">
                                {[
                                    "Fast-paced and engaging work environment",
                                    "Opportunities for rapid career growth",
                                    "Safety-first culture with premium training"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center text-gray-800 font-bold uppercase tracking-widest text-xs p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                                        <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="bg-gray-50 py-32" id="positions">
                    <div className="max-w-5xl mx-auto px-4 text-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 block">Ready to start?</span>
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 font-display tracking-tight text-shadow-sm">Become a Part of the Crew</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto mb-16 text-xl font-medium leading-relaxed">
                            We are constantly growing and looking for dedicated individuals to join our mission.
                        </p>

                        <div className="glass-panel p-16 rounded-[3rem] text-center relative overflow-hidden group border border-white shadow-2xl">
                            <div className="absolute top-0 left-0 w-3 h-full bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                            <p className="mb-10 text-2xl font-bold text-gray-700">Your future at Vista starts right here.</p>
                            <Link to="/apply" className="inline-block glass-button px-16 py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/20 hover:-translate-y-2">
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div >
    );
};

export default Home;
