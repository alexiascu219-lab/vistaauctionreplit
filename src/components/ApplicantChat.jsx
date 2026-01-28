import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Paperclip, Loader, Check, CheckCheck, Clock, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ApplicantChat = ({ applicationId, applicantEmail, showToast, onUnreadChange, active }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        if (!applicationId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase.rpc('get_applicant_messages', {
                p_application_id: applicationId,
                p_email: applicantEmail
            });

            if (error) console.error("Chat: Error fetching messages:", error);
            else setMessages(data || []);
        };

        fetchMessages();

        const channel = supabase
            .channel(`applicant-chat-${applicationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vista_applicant_messages',
                filter: `application_id=eq.${applicationId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMessages(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                } else if (payload.eventType === 'DELETE') {
                    setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [applicationId]);

    // Calculate Unread Count & Mark Read
    useEffect(() => {
        if (!messages.length) return;

        // Count unread messages from HR (is_external = false, read_at = null)
        const unread = messages.filter(m => !m.is_external && !m.read_at).length;
        if (onUnreadChange) onUnreadChange(unread);

        // If tab is active and we have unread messages, mark them as read
        if (active && unread > 0) {
            const markRead = async () => {
                const { error } = await supabase.rpc('mark_messages_read', {
                    p_application_id: applicationId,
                    p_reader_is_applicant: true
                });
                if (error) console.error("Chat: Failed to mark messages as read:", error);

                // Optimistically update local state to clear badge immediately
                setMessages(prev => prev.map(m => (!m.is_external && !m.read_at) ? { ...m, read_at: new Date().toISOString() } : m));
            };
            markRead();
        }
    }, [messages, active, onUnreadChange, applicationId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !uploading) || sending) return;

        setSending(true);
        try {
            const { error } = await supabase.rpc('send_applicant_message', {
                p_application_id: applicationId,
                p_email: applicantEmail,
                p_message: newMessage.trim(),
                p_attachment_url: null, // Basic text for now
                p_attachment_type: null
            });

            if (error) throw error;
            setNewMessage("");
            // Optimistic update handled by real-time subscription usually, 
            // but we can add locally if latency is an issue.
        } catch (err) {
            console.error("Chat: Failed to send message:", err);
            showToast("Failed to send message. Please try again.", "error");
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${applicationId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            // Send Message with Attachment
            const { error: sendError } = await supabase.rpc('send_applicant_message', {
                p_application_id: applicationId,
                p_email: applicantEmail,
                p_message: `Sent an attachment: ${file.name}`,
                p_attachment_url: publicUrl,
                p_attachment_type: file.type
            });

            if (sendError) throw sendError;
            showToast("File uploaded successfully", "success");
        } catch (err) {
            console.error("Chat: Upload failed:", err);
            showToast("Upload failed: " + err.message, "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner">
            {/* Header */}
            <div className="bg-white p-4 items-center justify-between border-b border-gray-100 flex shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm">Recruiter Chat</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1"></span>
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                            <MessageSquare className="text-slate-400" size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400 max-w-xs">
                            Have questions? Send a direct message to our HR team here.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // Determine if message is from Applicant (me) or HR (other)
                        // HR messages usually have a UUID sender_id.
                        // Applicant messages (via our RPC) have sender_id = applicationId (which is a UUID/Text).
                        // So if msg.sender_id === applicationId, it's ME.
                        const isMe = msg.sender_id === applicationId || msg.sender_id === applicationId; // ID comparison

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div
                                        className={`p-4 rounded-2xl shadow-sm relative group text-sm font-medium leading-relaxed ${isMe
                                            ? 'bg-orange-500 text-white rounded-br-none'
                                            : 'bg-white text-slate-700 border border-gray-100 rounded-bl-none'
                                            }`}
                                    >
                                        {msg.is_deleted ? (
                                            <span className="italic opacity-50 flex items-center gap-2">
                                                <AlertCircle size={12} /> Message deleted
                                            </span>
                                        ) : (
                                            <>
                                                {msg.attachment_url && (
                                                    <div className="mb-3 rounded-lg overflow-hidden border border-black/10">
                                                        {msg.attachment_type?.startsWith('image/') ? (
                                                            <img src={msg.attachment_url} alt="Attachment" className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/5 hover:bg-black/10 transition-colors">
                                                                <FileText size={16} />
                                                                <span className="text-xs underline">View Attachment</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                {msg.is_edited && <span className="text-[9px] opacity-60 block text-right mt-1 italic">(edited)</span>}
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-1">
                                        <span className="text-[10px] text-slate-300 font-bold">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && (
                                            <span className="text-slate-300">
                                                <CheckCheck size={12} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:bg-slate-50 hover:text-orange-500 rounded-xl transition-all"
                        disabled={uploading}
                    >
                        {uploading ? <Loader className="animate-spin" size={20} /> : <Paperclip size={20} />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,application/pdf"
                    />
                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-orange-200 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-transparent border-none p-3 text-sm text-slate-700 placeholder-slate-400 resize-none h-12 max-h-32 focus:ring-0"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className={`p-3 rounded-xl shadow-lg transition-all ${!newMessage.trim() && !sending
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-500/20 active:scale-95'
                            }`}
                    >
                        {sending ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Quick Icon Fix
const MessageSquare = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

export default ApplicantChat;
