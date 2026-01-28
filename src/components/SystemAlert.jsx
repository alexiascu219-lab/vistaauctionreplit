import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CloudLightning } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';

const SystemAlert = () => {
    const [alert, setAlert] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const handleDismiss = (forever = false) => {
        setIsVisible(false);
        if (forever && alert) {
            localStorage.setItem('vista_alert_dismissed', JSON.stringify({
                id: alert.message,
                timestamp: Date.now()
            }));
        }
    };

    useEffect(() => {
        fetchAlert();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('public:vista_settings')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'vista_settings',
                filter: 'key=eq.system_alert'
            }, (payload) => {
                const newAlert = payload.new.value;
                if (newAlert?.active) {
                    setAlert(newAlert);
                    setIsVisible(true);
                    setIsMinimized(false); // Force open on new update
                } else {
                    setIsVisible(false);
                }
            })
            .subscribe();

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Check for dismissal on mount
        const dismissed = localStorage.getItem('vista_alert_dismissed');
        if (dismissed && alert) {
            const { id } = JSON.parse(dismissed);
            if (id === alert.message) {
                setIsVisible(false);
                return;
            }
        }
    }, [alert]);

    const fetchAlert = async () => {
        const { data } = await supabase
            .from('vista_settings')
            .select('value')
            .eq('key', 'system_alert')
            .single();

        if (data?.value?.active) {
            setAlert(data.value);
            setIsVisible(true);
        }
    };

    if (!isVisible || !alert) return null;

    // MINIMIZED STATE (Red Icon)
    if (isMinimized) {
        return (
            <div
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-red-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform animate-pulse"
                title="View System Alert"
            >
                <AlertTriangle className="text-white" size={24} />
            </div>
        );
    }

    // EXPANDED STATE (Popup)
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
            >
                <div className="bg-white/95 backdrop-blur-md border-l-4 border-red-500 rounded-r-xl shadow-2xl p-6 max-w-2xl w-full pointer-events-auto flex items-start gap-5">

                    {/* Icon */}
                    <div className="bg-red-50 p-3 rounded-full shrink-0">
                        {alert.level === 'warning' ? <CloudLightning className="text-red-500" size={28} /> : <AlertTriangle className="text-orange-500" size={28} />}
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                        <h3 className="text-gray-900 font-black text-lg uppercase tracking-tight mb-1">
                            System Update
                        </h3>
                        <p className="text-gray-600 font-medium leading-relaxed mb-4">
                            {alert.message}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDismiss(true)}
                                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Don't show again
                            </button>
                        </div>
                    </div>

                    {/* Close Action */}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
                    >
                        <X size={20} className="text-gray-500 group-hover:text-gray-900" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SystemAlert;
