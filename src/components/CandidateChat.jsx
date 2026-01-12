import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, ChevronRight } from 'lucide-react';

const MarkdownText = ({ text }) => {
    // Simple bold markdown support: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-black text-orange-200">{part.slice(2, -2)}</strong>;
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

            // Broad intent matching
            const intents = {
                status: lowerText.includes('status') || lowerText.includes('track') || lowerText.includes('check'),
                jobs: lowerText.includes('job') || lowerText.includes('role') || lowerText.includes('work') || lowerText.includes('position') || lowerText.includes('openings'),
                pay: lowerText.includes('pay') || lowerText.includes('salary') || lowerText.includes('earn') || lowerText.includes('wage') || lowerText.includes('money'),
                location: lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('where') || lowerText.includes('place') || lowerText.includes('city'),
                culture: lowerText.includes('culture') || lowerText.includes('environment') || lowerText.includes('like to work') || lowerText.includes('benefits'),
                interview: lowerText.includes('interview') || lowerText.includes('process') || lowerText.includes('hiring') || lowerText.includes('steps'),
                reschedule: lowerText.includes('reschedule') || lowerText.includes('different date') || lowerText.includes('change time') || lowerText.includes('another day') || lowerText.includes('cant make it')
            };

            if (intents.status) {
                const storedApps = localStorage.getItem('vista_applications');
                if (storedApps) {
                    const apps = JSON.parse(storedApps);
                    // Match by full name from chat history if possible, or just look for recent ones
                    const userMsgs = messages.filter(m => m.type === 'user');
                    const possibleName = userMsgs.length > 1 ? userMsgs[0].text : "";
                    const found = apps.find(app => (app.fullName || '').toLowerCase().includes(possibleName.toLowerCase()) && possibleName.length > 3);

                    if (found) {
                        botText = `Hi **${found.firstName}**! I found your application for **${found.jobType}**. Your current status is: **${found.status}**.`;
                        if (found.interviewDate) botText += ` You're scheduled for **${new Date(found.interviewDate).toLocaleDateString()}** at **${new Date(found.interviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`;
                    } else {
                        botText = "I can definitely check that! What is the **Full Name** you used on your application? (e.g., 'Check status for John Doe')";
                    }
                } else {
                    botText = "I don't see any applications in my system yet. Have you submitted your form at the top of this page?";
                }
            } else if (intents.reschedule) {
                const storedApps = localStorage.getItem('vista_applications');
                if (storedApps) {
                    const apps = JSON.parse(storedApps);
                    const userMsgs = messages.filter(m => m.type === 'user');
                    const possibleName = userMsgs.length > 1 ? userMsgs[0].text.replace(/.*for\b/i, '').trim() : "";
                    const foundIndex = apps.findIndex(app => (app.fullName || '').toLowerCase().includes(possibleName.toLowerCase()) && possibleName.length > 3);

                    if (foundIndex !== -1) {
                        apps[foundIndex].rescheduleRequested = true;
                        localStorage.setItem('vista_applications', JSON.stringify(apps));
                        botText = `No problem, **${apps[foundIndex].firstName}**! I've flagged your interview for a **reschedule**. Our HR team will reach out to coordinate a new time.`;
                    } else {
                        botText = "I can help with that! To find your schedule, please tell me your **Full Name** (e.g., 'Reschedule for John Doe').";
                    }
                } else {
                    botText = "I don't see an application for you yet. Once you're invited to an interview, I can help you change the date!";
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
