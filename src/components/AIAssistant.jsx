import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    X,
    Send,
    Sparkles,
    Brain,
    Maximize2,
    Minimize2,
    Loader2,
    Zap,
    Shield,
    Bot
} from 'lucide-react';
import { generateAssistantResponse } from '../utils/aiService';

const AIAssistant = ({ role = 'applicant', context = {}, showToast }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // Dynamic configuration based on role
    const config = useMemo(() => {
        if (role === 'hr') {
            return {
                name: 'Intelligence Core',
                subtitle: 'Neural Decision Engine',
                icon: <Brain size={22} className="text-white" />,
                theme: 'from-slate-950 via-indigo-950 to-slate-900',
                accent: 'bg-indigo-500',
                initialMsg: "Neural Core active. I've indexed the candidate data. How can I assist with your workflow, Captain?",
                placeholder: "Query candidates or policies..."
            };
        }
        return {
            name: 'Hiring Scout',
            subtitle: 'Careers Guide',
            icon: <Sparkles size={22} className="text-white" />,
            theme: 'from-orange-600 via-rose-500 to-amber-600',
            accent: 'bg-orange-500',
            initialMsg: "Hey! I'm the Vista Hiring Scout. Ready to jumpstart your career? Ask me anything about our team!",
            placeholder: "Aspiring to join? Ask away!"
        };
    }, [role]);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: config.initialMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, time: timestamp }]);
        setLoading(true);

        try {
            const enrichedContext = { ...context, systemTime: new Date().toISOString(), userRole: role };
            const chatHistory = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            const response = await generateAssistantResponse(userMsg, chatHistory, role, enrichedContext);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response || "I've processed that request. Do you need anything else?",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (error) {
            console.error("AI Assistant Link Error:", error);
            if (showToast) showToast("Neural Link Failure", "error");
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to my neural network. Please check your connection.",
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(10px)' }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            filter: 'blur(0px)',
                            height: isMinimized ? '70px' : '580px',
                            width: '360px'
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="pointer-events-auto bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_120px_-10px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden flex flex-col"
                    >
                        {/* Compact Premium Header */}
                        <div className={`p-6 bg-gradient-to-br ${config.theme} relative overflow-hidden shrink-0`}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                                className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"
                            />

                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-white/15 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/20">
                                        {config.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black text-sm tracking-wide leading-none mb-1 uppercase italic">{config.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
                                            <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">{config.subtitle}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                                    </button>
                                    <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Refined Timeline */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/30">
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            key={idx}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-3 rounded-2xl text-[13px] leading-[1.5] shadow-sm font-medium ${msg.role === 'user'
                                                    ? `${config.accent} text-white rounded-tr-none shadow-lg`
                                                    : 'bg-white/80 border border-white text-slate-800 rounded-tl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-1.5 px-1 opacity-40">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">
                                                        {msg.role === 'user' ? 'SENT' : 'NEURAL CORE'} • {msg.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/40 border border-white/50 px-4 py-3 rounded-2xl text-[11px] font-bold text-slate-500 italic flex items-center gap-2.5">
                                                <div className="relative flex items-center justify-center">
                                                    <Loader2 size={12} className="animate-spin text-slate-400" />
                                                </div>
                                                Synthesizing neural link...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Compact Input */}
                                <div className="p-6 bg-white/40 border-t border-white/20 backdrop-blur-md">
                                    <form onSubmit={handleSend} className="relative group">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={config.placeholder}
                                            disabled={loading}
                                            className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-3.5 pr-14 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:shadow-xl focus:border-white transition-all duration-300"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || !input.trim()}
                                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() ? `${config.accent} text-white shadow-lg` : 'bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                    <div className="mt-4 flex items-center justify-between px-1">
                                        <div className="flex items-center gap-3 text-[8px] font-black text-slate-400/80 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Zap size={9} className="text-amber-400" /> FAST</span>
                                            <span className="flex items-center gap-1"><Shield size={9} className="text-indigo-400" /> SECURE</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 lowercase italic">
                                            <Bot size={10} /> groq_engine
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launch Trigger: The Pulsing Orb (Spin to X) */}
            <AnimatePresence mode="wait">
                {!isOpen && (
                    <motion.button
                        key="open-btn"
                        initial={{ scale: 0.8, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0, rotate: 90 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl relative group overflow-hidden ${role === 'hr' ? 'bg-slate-950 border border-slate-800' : 'bg-orange-600 border border-orange-500'}`}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"
                        />
                        <div className="relative z-10 text-white drop-shadow-md">
                            {role === 'hr' ? <Brain size={28} /> : <MessageCircle size={28} />}
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIAssistant;
