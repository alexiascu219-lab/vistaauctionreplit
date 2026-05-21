import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, PackageX, Search, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

const NotFound = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Subtle confetti burst on load (oops effect)
        confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#cbd5e1', '#94a3b8', '#64748b'], // Dusty gray colors
            disableForReducedMotion: true
        });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-2xl w-full text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-12 border border-white shadow-2xl"
                >
                    <motion.div
                        className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"
                        initial={{ scale: 0.8, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                    >
                        <PackageX size={64} className="text-gray-400" />
                    </motion.div>

                    <h1 className="text-6xl font-black text-gray-900 mb-2 font-display tracking-tight">404</h1>
                    <h2 className="text-2xl font-black text-orange-600 uppercase tracking-widest mb-6">Lost in the Warehouse?</h2>

                    <p className="text-gray-500 font-medium text-lg mb-10 max-w-md mx-auto leading-relaxed">
                        The page you're looking for seems to have been misplaced, shipped to the wrong address, or never existed at all.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center gap-2"
                        >
                            <Home size={18} /> Return Home
                        </button>

                        <button
                            onClick={() => navigate(-1)}
                            className="px-8 py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center gap-2"
                        >
                            <ArrowLeft size={18} /> Go Back
                        </button>
                    </div>
                </motion.div>

                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                    Vista Auction Careers
                </p>
            </div>
        </div>
    );
};

export default NotFound;
