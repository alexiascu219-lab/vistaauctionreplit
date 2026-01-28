import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info, HelpCircle } from 'lucide-react';

const NotificationContext = createContext({});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const showToast = useCallback((message, type = 'success', duration = 4000) => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(prev => (prev?.message === message ? null : prev));
        }, duration);
    }, []);

    const showConfirm = useCallback((message, title = 'Confirmation Required', onConfirm) => {
        setConfirm({ message, title, onConfirm });
    }, []);

    const closeToast = () => setToast(null);
    const closeConfirm = () => setConfirm(null);

    return (
        <NotificationContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Branded Toasts */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bottom-12 left-1/2 z-[999]"
                    >
                        <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] border shadow-2xl backdrop-blur-xl min-w-[320px] ${toast.type === 'success' ? 'bg-white/90 border-green-100 text-green-800' :
                                toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' :
                                    'bg-orange-50/90 border-orange-100 text-orange-800'
                            }`}>
                            {toast.type === 'success' ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-orange-500" />}
                            <p className="font-black text-[12px] uppercase tracking-widest">{toast.message}</p>
                            <button onClick={closeToast} className="ml-2 p-1 hover:bg-black/5 rounded-full">
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Branded Confirmation Dialog */}
            <AnimatePresence>
                {confirm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-gray-100"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                    <HelpCircle size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{confirm.title}</h3>
                            </div>
                            <p className="text-gray-500 font-bold leading-relaxed mb-10">{confirm.message}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={closeConfirm}
                                    className="flex-1 py-4 bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-100 transition-all border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        confirm.onConfirm();
                                        closeConfirm();
                                    }}
                                    className="flex-1 py-4 bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
};
