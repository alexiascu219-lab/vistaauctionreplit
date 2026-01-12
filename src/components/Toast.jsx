import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgClass = type === 'success' ? 'bg-green-100/90 border-green-200 text-green-800' :
        type === 'error' ? 'bg-red-100/90 border-red-200 text-red-800' :
            type === 'warning' ? 'bg-yellow-100/90 border-yellow-200 text-yellow-800' :
                'bg-blue-100/90 border-blue-200 text-blue-800';

    const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

    return (
        <div className={`fixed top-24 right-4 md:right-8 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl animate-fade-in-up backdrop-blur-md min-w-[300px] ${bgClass}`}>
            <Icon size={24} className="flex-shrink-0" />
            <div className="flex-1">
                <p className="font-bold text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>
    );
};

export default Toast;
