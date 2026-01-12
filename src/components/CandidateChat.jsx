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
            let botText = "I'm sorry, I didn't quite catch that. I'm the Vista Careers Concierge—I can help you with application status, job roles, pay, or our location. What can I help you find?";
            const lowerText = text.toLowerCase();

            // Broad intent matching
            const intents = {
                status: lowerText.includes('status') || lowerText.includes('track') || lowerText.includes('check'),
                jobs: lowerText.includes('job') || lowerText.includes('role') || lowerText.includes('work') || lowerText.includes('position') || lowerText.includes('openings'),
                pay: lowerText.includes('pay') || lowerText.includes('salary') || lowerText.includes('earn') || lowerText.includes('wage') || lowerText.includes('money'),
                location: lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('where') || lowerText.includes('place') || lowerText.includes('city'),
                culture: lowerText.includes('culture') || lowerText.includes('environment') || lowerText.includes('like to work') || lowerText.includes('benefits'),
                interview: lowerText.includes('interview') || lowerText.includes('process') || lowerText.includes('hiring') || lowerText.includes('steps')
            };

            if (intents.status) {
                const storedApps = localStorage.getItem('vista_applications');
                if (storedApps) {
                    const apps = JSON.parse(storedApps);
                    if (apps.length > 0) {
                        const lastApp = apps[apps.length - 1];
                        botText = `I've found your recent application, ${lastApp.fullName}! You applied for the ${lastApp.jobType} position (${lastApp.preferredShift}). Your current status is: **${lastApp.status}**. We usually review applications within 48 hours!`;
                    } else {
                        botText = "I couldn't find an application associated with this session. Make sure you've submitted your form! You can also check the 'Check Status' page for a deeper search.";
                    }
                } else {
                    botText = "It looks like you haven't started an application yet. No worries! Just click 'Apply Now' and we can get you into the system in under 5 minutes.";
                }
            }
            else if (intents.jobs) {
                if (lowerText.includes('warehouse') || lowerText.includes('physical')) {
                    botText = "For physical roles, we have Warehouse Associate and Stacking roles. These are great for staying active and being part of the 'heavy lifting' that makes Vista work!";
                } else if (lowerText.includes('customer') || lowerText.includes('service') || lowerText.includes('people')) {
                    botText = "Love talking to people? Our Customer Service and Pickup teams are the face of Vista. You'll be helping bidders and ensuring a great pickup experience.";
                } else if (lowerText.includes('scanning') || lowerText.includes('inventory') || lowerText.includes('tech')) {
                    botText = "If you're tech-savvy or detail-oriented, our Scanning and Quality Control roles are perfect. You'll use our inventory systems to track every item that comes through.";
                } else {
                    botText = "We're currently hiring for: \n• **Warehouse & Stacking** (Physical)\n• **Scanning & Inventory** (Detail-oriented)\n• **Customer Service** (Social)\n• **Conveyor Ops** (Fast-paced)\n\nWhich one sounds like you?";
                }
            }
            else if (intents.pay) {
                botText = "At Vista, we believe in competitive pay. Most of our roles start between **$16 - $19/hr** depending on experience and shift. We also offer shift differentials for evening crews!";
            }
            else if (intents.location) {
                botText = "We have multiple locations! Our primary centers are on **Sardis Rd in Charlotte, NC** and our facility in **Monroe, NC**. Which location are you interested in?";
            }
            else if (intents.culture) {
                botText = "The 'Vista Crew' is all about energy and excellence. It's fast-paced, but we favor a supportive environment. We offer flexible shifts (Morning/Evening) and a path to management for those who show initiative!";
            }
            else if (intents.interview) {
                botText = "Our process is simple: \n1. **Apply Online** (5 min)\n2. **Initial Review** (1-2 days)\n3. **On-site Interview** (30 min)\n4. **Offer & Background Check**\n\nWe move fast—often hiring within the same week!";
            }
            else if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
                botText = "Hey there! I'm the Vista Careers Concierge. I can help you find a role, check your status, or tell you about our culture. What's on your mind?";
            }

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
