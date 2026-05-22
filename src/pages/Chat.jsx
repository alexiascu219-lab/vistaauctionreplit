import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Send, MessageSquare, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Simple real‑time chat using a Supabase table "chat_messages"
// Table schema (for reference):
//   id (uuid primary key), user (text), message (text), created_at (timestamp)

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('');
  const [joined, setJoined] = useState(false);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        const newMsg = payload.new;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();
    // Load existing messages once
    supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    await supabase.from('chat_messages').insert({ user: userName || 'Anonymous', message: input.trim() });
    setInput('');
  };

  const joinChat = e => {
    e.preventDefault();
    if (userName.trim()) setJoined(true);
  };

  return (
    <div className="min-h-screen bg-brandBlueDark font-sans text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {!joined ? (
          <form onSubmit={joinChat} className="glass-panel p-6 rounded-2xl">
            <h2 className="text-2xl font-black mb-4">Enter Chat</h2>
            <input
              type="text"
              placeholder="Your name"
              className="w-full bg-[#0c1226]/60 border border-white/20 rounded-xl px-4 py-2 mb-4 text-white focus:outline-none"
              value={userName}
              onChange={e => setUserName(e.target.value)}
            />
            <button type="submit" className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-colors">
              Join Chat
            </button>
          </form>
        ) : (
          <>
            <div className="glass-panel p-4 rounded-2xl h-96 overflow-y-auto space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="flex items-start space-x-3">
                  <MessageSquare size={20} className="text-orange-400 flex-shrink-0" />
                  <div>
                    <span className="font-black text-orange-300">{msg.user}</span>{' '}
                    <span className="text-sm text-gray-300">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <p className="text-white">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex items-center space-x-2 mt-4">
              <input
                type="text"
                placeholder="Type a message…"
                className="flex-1 bg-[#0c1226]/60 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" className="p-2 bg-orange-600 rounded-full hover:bg-orange-700 transition-colors">
                <Send size={20} className="text-white" />
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
