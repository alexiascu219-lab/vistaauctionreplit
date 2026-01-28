import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare, Clock, User, Trash2, Globe, Shield, Edit2, Paperclip, XCircle, FileText, CheckCheck, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatSidebar = ({ applicationId, showToast, mode = 'internal' }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const tableName = mode === 'internal' ? 'vista_chat_comments' : 'vista_applicant_messages';
    const attachmentBucket = 'chat-attachments';

    useEffect(() => {
        if (applicationId) {
            fetchMessages();
            const subscription = supabase
                .channel(`${mode}-${applicationId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    filter: `application_id=eq.${applicationId}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Only add if not already present (handled by optimistic update)
                        setMessages(prev => {
                            if (prev.some(m => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [applicationId, mode]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('application_id', applicationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error(`Error fetching ${mode} messages:`, err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !uploading) || loading) return;

        setLoading(true);
        try {
            if (editingId) {
                // Update Message
                const { error } = await supabase
                    .from(tableName)
                    .update({
                        content: newMessage.trim(),
                        is_edited: true,
                        updated_at: new Date()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                showToast('Message updated', 'success');
                setEditingId(null);
            } else {
                // Create Message
                const payload = {
                    application_id: applicationId,
                    content: newMessage.trim(),
                };

                if (mode === 'internal') {
                    payload.author_id = user.id;
                    payload.author_name = user.fullName || user.email;
                } else {
                    payload.sender_id = user.id;
                    payload.is_external = false; // HR is internal // Flag for internal distinction
                }

                const { data: sentMsg, error } = await supabase.from(tableName).insert([payload]).select().single();
                if (error) throw error;

                // OPTIMISTIC UPDATE: Add to list immediately (Don't wait for subscription)
                if (sentMsg) {
                    setMessages(prev => {
                        // Avoid duplicates if subscription is fast
                        if (prev.some(m => m.id === sentMsg.id)) return prev;
                        return [...prev, sentMsg];
                    });
                }
            }
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            showToast('Action failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ is_deleted: true }) // Soft Delete
                .eq('id', msgId);

            if (error) throw error;
            showToast('Message deleted', 'success');
        } catch (err) {
            console.error('Error deleting message:', err);
            showToast('Failed to delete message', 'error');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${applicationId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(attachmentBucket)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(attachmentBucket)
                .getPublicUrl(fileName);

            // Send attachment message
            const payload = {
                application_id: applicationId,
                content: `Sent an attachment: ${file.name}`,
                attachment_url: publicUrl,
                attachment_type: file.type
            };

            if (mode === 'internal') {
                payload.author_id = user.id;
                payload.author_name = user.fullName || user.email;
            } else {
                payload.sender_id = user.id;
                payload.is_external = true;
            }

            const { error: sendError } = await supabase.from(tableName).insert([payload]);
            if (sendError) throw sendError;

            showToast("File uploaded", "success");
        } catch (err) {
            console.error("Upload failed:", err);
            showToast("Upload failed", "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    };

    const startEditing = (msg) => {
        setEditingId(msg.id);
        setNewMessage(msg.content);
        fileInputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 rounded-[2rem] border border-gray-100 overflow-hidden">
            {/* Dynamic Header */}
            <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'internal' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                        {mode === 'internal' ? <Shield size={20} /> : <Globe size={20} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                            {mode === 'internal' ? 'Internal Team Chat' : 'Chat with Applicant'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {mode === 'internal' ? 'Managers & Staff Only' : 'Direct to Applicant'}
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${mode === 'internal' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                    {messages.length} Messages
                </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                        <MessageSquare size={32} className="text-gray-400 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">No activity yet</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // Improved Sender Logic
                        // In HR Portal (Applicant Mode):
                        // - Messages from HR have 'author_id' (from internal table logic) or 'sender_id' with is_external=false
                        // - Messages from Applicant have 'is_external=true'

                        let isMe = false;
                        let displayName = 'Unknown';
                        let roleBadge = '';

                        if (mode === 'internal') {
                            // Internal Chat: Everyone is staff. 
                            isMe = msg.author_id === user.id;
                            displayName = msg.author_name || 'Team Member';
                        } else {
                            // Applicant Chat:
                            // If is_external is true, it's the Applicant.
                            // If is_external is false/null, it's HR.
                            const isApplicant = !!msg.is_external;

                            // I am HR. So if it's NOT applicant, it's "Me" (or my team).
                            // We treat all HR team messages as "Right Aligned" to distinguish from Applicant.
                            isMe = !isApplicant;

                            if (isApplicant) {
                                displayName = "Applicant";
                                roleBadge = "Candidate";
                            } else {
                                displayName = msg.author_name || "HR Team";
                                roleBadge = "Staff";
                            }
                        }

                        // Override name to "You" only if IDs strictly match
                        if ((msg.author_id === user.id) || (msg.sender_id === user.id && !msg.is_external)) {
                            displayName = "You";
                        }

                        const content = msg.content;

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                layout
                                key={msg.id}
                                className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        {isMe ? 'You' : name}
                                    </span>
                                    <span className="text-[8px] text-gray-300 font-bold">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className={`group relative p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${isMe
                                    ? (mode === 'internal' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-orange-600 text-white rounded-tr-none')
                                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                                    }`}>
                                    {msg.is_deleted ? (
                                        <span className="italic opacity-50 flex items-center gap-2 text-xs">
                                            <AlertCircle size={12} /> Message deleted
                                        </span>
                                    ) : (
                                        <>
                                            {msg.attachment_url && (
                                                <div className="mb-3 rounded-lg overflow-hidden border border-black/10 bg-black/5">
                                                    {msg.attachment_type?.startsWith('image/') ? (
                                                        <img src={msg.attachment_url} alt="Attachment" className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 hover:bg-black/10 transition-colors">
                                                            <FileText size={16} />
                                                            <span className="text-xs underline font-bold">View Attachment</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">{content}</p>

                                            {/* Meta Info */}
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                {msg.is_edited && <span className="text-[8px] italic">(edited)</span>}
                                                {isMe && <CheckCheck size={10} />}
                                            </div>

                                            {/* Actions */}
                                            {isMe && (
                                                <div className={`absolute -left-16 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-2`}>
                                                    <button
                                                        onClick={() => startEditing(msg)}
                                                        className="p-1.5 bg-white rounded-full text-gray-400 hover:text-blue-500 shadow-sm border border-gray-100"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="p-1.5 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm border border-gray-100"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
                {editingId && (
                    <div className="flex items-center justify-between text-xs bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl mb-2 border border-yellow-200">
                        <span className="font-bold flex items-center gap-2"><Edit2 size={12} /> Editing Message...</span>
                        <button onClick={() => { setEditingId(null); setNewMessage(''); }} className="hover:text-red-500"><XCircle size={14} /></button>
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:bg-gray-50 hover:text-orange-500 rounded-xl transition-all h-12 w-12 flex items-center justify-center"
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

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder={mode === 'internal' ? "Share feedback..." : "Message applicant..."}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 pr-12 text-sm font-bold text-gray-700 outline-none focus:border-indigo-500/30 transition-all placeholder:text-gray-300"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !newMessage.trim()}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 w-10 rounded-xl flex items-center justify-center transition-all ${newMessage.trim()
                                ? (mode === 'internal' ? 'bg-indigo-600 text-white shadow-md' : 'bg-orange-600 text-white shadow-md')
                                : 'bg-gray-200 text-gray-300'
                                }`}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ChatSidebar;
