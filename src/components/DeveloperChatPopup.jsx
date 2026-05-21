import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function DeveloperChatPopup({ isOpenFromAccount, onCloseFromAccount }) {
    const { user } = useAuth();
    const { showToast } = useNotification();
    const [messages, setMessages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [imageStr, setImageStr] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial fetch and subscription
    useEffect(() => {
        if (!user) return;

        fetchMessages();

        const channel = supabase.channel('dev_chat_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vista_developer_chat'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMessages(prev => [...prev, payload.new]);

                    // Show toast if it is a new message from someone else and chat is closed
                    if (payload.new.user_id !== user.id && !isOpen && !isOpenFromAccount) {
                        showToast(`New message from ${payload.new.user_name}`, 'dev', 5000, () => setIsOpen(true));
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(msg => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg));
                } else if (payload.eventType === 'DELETE') {
                    setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, isOpen, isOpenFromAccount]);

    // Mark as seen manually when opened
    useEffect(() => {
        if (messages.length > 0 && (isOpen || isOpenFromAccount)) {
            const lastMsg = messages[messages.length - 1];
            localStorage.setItem('vista_dev_chat_last_seen', lastMsg.id);
            scrollToBottom();
        }
    }, [messages, isOpen, isOpenFromAccount]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('vista_developer_chat')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!input.trim() && !imageStr) || sending) return;

        setSending(true);
        try {
            const { error } = await supabase.from('vista_developer_chat').insert([{
                user_id: user.id,
                user_name: user?.fullName || user?.email || 'Unknown User',
                user_role: user?.role || 'User',
                message: input.trim(),
                image_data: imageStr
            }]);

            if (error) throw error;
            setInput('');
            setImageStr(null);
        } catch (err) {
            console.error("Failed to send dev chat message:", err);
            alert("Failed to send message: " + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageStr(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const isVisible = isOpen || isOpenFromAccount;

    if (!user) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    className="fixed bottom-6 right-6 w-full max-w-[380px] h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-200 z-[9999] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={16} className="text-purple-400" />
                                Dev Support Channel
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Chat w/ Technical Team</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                if (onCloseFromAccount) onCloseFromAccount();
                                if (messages.length > 0) {
                                    localStorage.setItem('vista_dev_chat_last_seen', messages[messages.length - 1].id);
                                }
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <MessageSquare size={32} className="mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-widest text-center">No messages yet.<br />Start a conversation with the Devs.</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.user_id === user.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 px-1">
                                            {msg.user_name} • {msg.user_role}
                                        </div>
                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-slate-800 rounded-tl-none'}`}>
                                            {msg.image_data && (
                                                <img src={msg.image_data} alt="Attachment" className="max-w-full rounded-lg mb-2 cursor-pointer border border-gray-200" onClick={() => window.open(msg.image_data, '_blank')} />
                                            )}
                                            {msg.message && <p className="text-sm font-medium whitespace-pre-wrap">{msg.message}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                        {imageStr && (
                            <div className="mb-2 relative inline-block">
                                <img src={imageStr} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                                <button type="button" onClick={() => setImageStr(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform">
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSend} className="flex gap-2 items-end">
                            <label className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer shrink-0">
                                <ImageIcon size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 max-h-32 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:border-orange-500/50"
                                rows={1}
                            />
                            <button
                                type="submit"
                                disabled={sending || (!input.trim() && !imageStr)}
                                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors shadow-md shadow-slate-900/10 flex items-center justify-center"
                            >
                                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
