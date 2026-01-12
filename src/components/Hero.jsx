import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
    return (
        <div className="relative bg-secondary-dark min-h-[600px] flex items-center overflow-hidden">
            {/* Background Overlay / Image Placeholder */}
            <div className="absolute inset-0 bg-hero-gradient z-0"></div>

            {/* Decorative Blur/Pattern (optional) */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
                <div className="max-w-2xl">
                    <div className="flex items-center space-x-3 mb-6">
                        <span className="h-px w-8 bg-primary"></span>
                        <span className="text-primary font-bold tracking-wider text-sm">JOIN OUR TEAM</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-8">
                        We're looking for dedicated individuals
                    </h1>

                    <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
                        Join a dynamic team where your contribution matters. We are expanding our operations and looking for motivated staff to help us grow.
                    </p>

                    <button className="group flex items-center space-x-3 text-white border-b border-primary pb-1 hover:text-primary transition-colors">
                        <span className="font-medium">View all positions</span>
                        <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Hero;
