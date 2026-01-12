import React from 'react';

const FeatureCard = ({ icon: Icon, image, title, description }) => {
    return (
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col h-full text-center group border border-white/80 shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-500">
            <div className="w-full aspect-square mb-8 rounded-3xl overflow-hidden bg-white shadow-inner relative group-hover:scale-[1.02] transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon className="text-orange-600" size={64} />
                    </div>
                )}
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-orange-600 transition-colors font-display tracking-tight leading-none">
                {title}
            </h3>

            <p className="text-gray-500 text-sm font-medium leading-relaxed flex-grow">
                {description}
            </p>

            <div className="mt-8 pt-6 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Discover Opportunities &rarr;</span>
            </div>
        </div>
    );
};

export default FeatureCard;
