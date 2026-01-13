import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, ChevronRight } from 'lucide-react';

const MarkdownText = ({ text }) => {
    // Simple bold markdown support: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-black text-orange-600">{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </span>
    );
};

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

            // Intelligence Logic (Smarter Intent Mapping)
            const intents = {
                status: (lowerText.includes('status') || lowerText.includes('check') || lowerText.includes('update') || lowerText.includes('track')) && !lowerText.includes('reschedule'),
                jobs: lowerText.includes('job') || lowerText.includes('position') || lowerText.includes('role') || lowerText.includes('openings') || lowerText.includes('hiring') || lowerText.includes('work'),
                pay: lowerText.includes('pay') || lowerText.includes('salary') || lowerText.includes('earn') || lowerText.includes('wage') || lowerText.includes('money'),
                location: lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('where') || lowerText.includes('place') || lowerText.includes('city') || lowerText.includes('charlotte') || lowerText.includes('monroe'),
                culture: lowerText.includes('culture') || lowerText.includes('environment') || lowerText.includes('like to work') || lowerText.includes('benefits'),
                interview: lowerText.includes('interview') || lowerText.includes('process') || lowerText.includes('hiring') || lowerText.includes('steps'),
                reschedule: lowerText.includes('reschedule') || lowerText.includes('different date') || lowerText.includes('change time') || lowerText.includes('another day') || lowerText.includes('cant make it') || lowerText.includes('change date'),
                greeting: lowerText.split(' ')[0] === 'hi' || lowerText.split(' ')[0] === 'hello' || lowerText.split(' ')[0] === 'hey' || lowerText.includes('morning') || lowerText.includes('afternoon'),
                thanks: lowerText.includes('thank') || lowerText.includes('thx') || lowerText.includes('appreciate')
            };

            const storedApps = localStorage.getItem('vista_applications');
            const apps = storedApps ? JSON.parse(storedApps) : [];
            const userMsgs = messages.filter(m => m.type === 'user');

            // Context Tracking: Find candidate name
            const findCandidateName = () => {
                const combinedMsgs = [...messages.filter(m => m.type === 'user'), newUserMsg];
                for (let i = combinedMsgs.length - 1; i >= 0; i--) {
                    const t = combinedMsgs[i].text.toLowerCase();
                    if (t.includes('my name is ')) return t.split('name is ')[1].split(' ')[0];
                    if (t.includes('check status for ')) return t.split('status for ')[1].trim();
                    if (t.includes('status for ')) return t.split('status for ')[1].trim();
                    if (t.includes('for ')) {
                        const name = t.split('for ')[1].trim();
                        if (name.length > 2 && name.split(' ').length >= 1) return name;
                    }
                }
                return null;
            };

            const currentContextName = findCandidateName();

            if (intents.greeting && userMsgs.length <= 2) {
                botText = "Hello! I'm the **Vista Concierge**, your personal guide to building a career at Vista Auction. I can check your **status**, show you **open positions**, or help you **reschedule**. What can I do for you?";
            } else if (intents.status) {
                const possibleName = currentContextName || lowerText.replace(/.*status for\b/i, '').trim();
                const found = apps.find(app => (app.fullName || '').toLowerCase().includes(possibleName.toLowerCase()) && possibleName.length > 2);

                if (found) {
                    botText = `Great news **${found.fullName.split(' ')[0]}**! I found your application. Your current status for the **${found.jobType}** role is: **${found.status}**.`;
                    if (found.interviewDate) {
                        botText += ` You're currently scheduled for an interview on **${new Date(found.interviewDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}**. Need a different time? Just say **reschedule**.`;
                    }
                } else if (possibleName.length > 2 && possibleName !== 'status') {
                    botText = `I searched my records for "**${possibleName}**" but didn't find an active application. Please make sure you used the correct Full Name, or head to the top of the page to apply!`;
                } else {
                    botText = "I'd love to check that for you! Could you please provide your **Full Name** exactly as it appears on your application?";
                }
            } else if (intents.reschedule) {
                const possibleName = currentContextName || lowerText.replace(/.*reschedule for\b/i, '').trim();
                const foundIndex = apps.findIndex(app => (app.fullName || '').toLowerCase().includes(possibleName.toLowerCase()) && possibleName.length > 2);

                if (foundIndex !== -1) {
                    apps[foundIndex].rescheduleRequested = true;
                    localStorage.setItem('vista_applications', JSON.stringify(apps));
                    botText = `Understood, **${apps[foundIndex].fullName.split(' ')[0]}**. I've marked your interview for a **reschedule**. Our HR team will reach out shortly to confirm the change. You can also pick a specific new time on your **Status Page** right now!`;
                } else if (possibleName.length > 2 && possibleName !== 'reschedule') {
                    botText = `I couldn't find an interview on file for "**${possibleName}**". Have you been invited for an interview yet?`;
                } else {
                    botText = "I can definitely help with that. What is the **Full Name** associated with your application?";
                }
            } else if (intents.pay) {
                botText = "At Vista, we value our team. Entry-level warehouse positions start between **$16 and $19 per hour**. Leadership and specialized roles often start at **$22+**. We also offer shift differentials for our evening crews!";
            } else if (intents.location) {
                botText = "We have two main facilities powering our auctions! One is located on **Sardis Rd in Charlotte, NC**, and our other facility is in **Monroe, NC**. Most candidates choose the one closest to home!";
            } else if (intents.jobs) {
                botText = "We're always looking for talent! Current openings include:\n• **Warehouse Specialists** (Fast-paced, physical)\n• **Quality Control** (Detail-oriented inventory)\n• **Customer Experience** (Social, office-based)\n\nDo any of these catch your interest?";
            } else if (intents.thanks) {
                botText = "Happy to help! Is there anything else you'd like to know about Vista Auction today?";
            } else if (intents.culture) {
                botText = "Our culture is built on **energy and efficiency**. It's a fast-paced environment where we process thousands of items daily, but we're a close-knit crew that supports one another. Plus, there's always something interesting coming through the warehouse!";
            }
            else {
                botText = "I'm still learning, but I can help you with your **status**, **rescheduling**, or info on **jobs and pay**. What else would you like to know?";
            }
            const botMessage = { id: Date.now() + 1, text: botText, type: 'bot' };
            setMessages(prev => [...prev.slice(0, -1), botMessage]);
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
                                <div className={`relative max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.type === 'user'
                                    ? 'bg-orange-600 text-white rounded-tr-none font-medium'
                                    : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                                    }`}>
                                    {/* Bubble Tail */}
                                    <div className={`absolute top-0 w-3 h-3 ${msg.type === 'user'
                                        ? '-right-1.5 bg-orange-600 [clip-path:polygon(0_0,0_100%,100%_0)]'
                                        : '-left-1.5 bg-white border-l border-t border-gray-100 [clip-path:polygon(100%_0,100%_100%,0_0)]'
                                        }`}></div>

                                    <div className="relative z-10">
                                        {msg.type === 'bot' ? <MarkdownText text={msg.text} /> : msg.text}
                                    </div>

                                    <div className={`text-[9px] mt-1.5 opacity-50 font-black uppercase tracking-tight ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
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
