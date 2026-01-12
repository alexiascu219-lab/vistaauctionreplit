import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, ChevronRight } from 'lucide-react';

const CandidateChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: "Hi! I'm your Vista Careers Assistant. How can I help you today?", time: new Date() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = (text) => {
        if (!text.trim()) return;

        const newUserMsg = { id: Date.now(), type: 'user', text, time: new Date() };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulated Bot Response
        setTimeout(() => {
            let botText = "I'm sorry, I'm still learning! For real inquiries, please contact our HR team at (980) 220–2564.";
            const lowerText = text.toLowerCase();

            // Status Check Logic
            if (lowerText.includes('status') || lowerText.includes('track')) {
                const storedApps = localStorage.getItem('vista_applications');
                if (storedApps) {
                    const apps = JSON.parse(storedApps);
                    if (apps.length > 0) {
                        const lastApp = apps[apps.length - 1];
                        botText = `I found an application for ${lastApp.firstName} ${lastApp.lastName} for the ${lastApp.position} role. Current Status: ${lastApp.status}.`;
                    } else {
                        botText = "I couldn't find any recent applications. You can use the 'Check Status' page for a more detailed search!";
                    }
                } else {
                    botText = "You haven't submitted any applications from this browser yet. Use the 'Apply' link above to get started!";
                }
            }
            // Job Matching Logic
            else if (lowerText.includes('job') || lowerText.includes('role') || lowerText.includes('work')) {
                if (lowerText.includes('warehouse') || lowerText.includes('physical')) {
                    botText = "Based on your interest in physical work, I'd recommend our Warehouse Associate or Stacking roles. They are the heart of VISTA!";
                } else if (lowerText.includes('customer') || lowerText.includes('people') || lowerText.includes('talk')) {
                    botText = "If you enjoy working with people, our Customer Service or Pickups roles would be a great fit for you!";
                } else if (lowerText.includes('tech') || lowerText.includes('detail')) {
                    botText = "For someone with an eye for detail, the Quality Inspector or Scanning positions are perfect!";
                } else {
                    botText = "We have many roles available: Scanning, Warehouse, Pickups, Customer Service, Stacking, and Conveyor. Which area sounds most interesting to you?";
                }
            }
            else if (lowerText.includes('location')) botText = "We are located in Charlotte, NC. Our main warehouse is near the airport!";
            else if (lowerText.includes('pay') || lowerText.includes('salary')) botText = "Pay varies by position, but we offer competitive rates starting at $18/hr for most roles.";

            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: botText, time: new Date() }]);
            setIsTyping(false);
        }, 1200);
    };

    const quickActions = [
        { label: "Application Status", query: "How do I check my status?" },
        { label: "Pay & Benefits", query: "What is the starting pay?" },
        { label: "Warehouse Location", query: "Where are you located?" }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[60] font-sans">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-gray-900 text-white rotate-90' : 'bg-orange-600 text-white shadow-orange-500/20'
                    }`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[380px] h-[550px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="font-black tracking-tight leading-none text-lg">Vista Concierge</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Always Online</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.type === 'user'
                                        ? 'bg-orange-600 text-white rounded-tr-none font-medium'
                                        : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        {messages.length < 3 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {quickActions.map(action => (
                                    <button
                                        key={action.label}
                                        onClick={() => handleSend(action.query)}
                                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                            className="flex items-center gap-2 bg-gray-100 rounded-2xl p-2 pl-4"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Write a message..."
                                className="bg-transparent border-none outline-none flex-1 text-sm font-medium text-gray-700 placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateChat;
