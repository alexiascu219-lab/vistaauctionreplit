import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Hero = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -30 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { type: 'spring', damping: 25, stiffness: 120 }
        }
    };

    return (
        <div className="relative bg-secondary-dark min-h-[700px] flex items-center overflow-hidden">
            {/* Background Overlay / Image Placeholder */}
            <div className="absolute inset-0 bg-hero-gradient z-0"></div>

            {/* Decorative Dynamic Element */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.4, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl"
                >
                    <motion.div variants={itemVariants} className="flex items-center space-x-3 mb-6">
                        <span className="h-px w-8 bg-primary"></span>
                        <span className="text-primary font-black tracking-[0.3em] text-[10px] uppercase">JOIN OUR TEAM</span>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-8 font-display tracking-tight">
                        We're looking for <span className="text-orange-500">dedicated</span> individuals
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-xl text-gray-300 mb-10 leading-relaxed max-w-xl font-medium opacity-90">
                        Join a dynamic team where your contribution matters. We are expanding our operations and looking for motivated staff to help us grow.
                    </motion.p>

                    <motion.div variants={itemVariants}>
                        <motion.button
                            whileHover={{ x: 10 }}
                            className="group flex items-center space-x-4 text-white border-b-2 border-orange-500/30 pb-2 hover:border-orange-500 transition-all"
                        >
                            <span className="font-black uppercase tracking-widest text-xs">Explore Open Positions</span>
                            <div className="bg-orange-500 p-2 rounded-full transform group-hover:rotate-45 transition-transform duration-300">
                                <ArrowRight size={18} className="text-white" />
                            </div>
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default Hero;
