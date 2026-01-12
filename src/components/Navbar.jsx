import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isHR = location.pathname === '/hr';
    const brandText = isHR ? "Human Resources" : "Careers";

    const handleApplyClick = () => {
        navigate('/apply');
        setIsOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm"></div>

            <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
                <div className="flex justify-between items-center h-24">
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center gap-4 group">
                            <img src="/assets/logo-tag.png" alt="Vista Auction" className="h-14 w-auto transform transition-transform group-hover:scale-105" />
                            <div className="flex flex-col">
                                <span className="font-black text-2xl text-gray-900 leading-none tracking-tight font-display">{brandText}</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black mt-0.5">Vista Auction</span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-12">
                        <Link to="/#positions" className="text-[10px] font-black text-gray-500 hover:text-orange-600 transition-all tracking-[0.2em] uppercase">
                            Open Positions
                        </Link>
                        <Link to="/status" className="text-[10px] font-black text-gray-500 hover:text-orange-600 transition-all tracking-[0.2em] uppercase">
                            Check Status
                        </Link>
                        <button
                            onClick={() => navigate('/apply')}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/10 hover:shadow-orange-600/20 hover:-translate-y-0.5 active:scale-95"
                        >
                            Apply Now
                        </button>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-900 hover:text-orange-600 transition-colors focus:outline-none bg-gray-100 p-2.5 rounded-xl border border-gray-200 shadow-sm"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-gray-100 absolute w-full shadow-2xl animate-fade-in-down">
                    <div className="px-8 pt-6 pb-12 space-y-6">
                        <Link
                            to="/#positions"
                            onClick={() => setIsOpen(false)}
                            className="block text-xl font-black text-gray-900 py-4 border-b border-gray-50 tracking-tight"
                        >
                            Open Positions
                        </Link>
                        <Link
                            to="/status"
                            onClick={() => setIsOpen(false)}
                            className="block text-xl font-black text-gray-900 py-4 border-b border-gray-50 tracking-tight"
                        >
                            Check Status
                        </Link>
                        <button
                            onClick={handleApplyClick}
                            className="w-full bg-orange-600 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-600/10 mt-6 active:scale-95 transition-all"
                        >
                            Apply Now
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
