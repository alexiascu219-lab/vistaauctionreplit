import React, { useState } from 'react';
import { ChevronRight, RotateCcw, CheckCircle, Briefcase, Users, Search, Package, ArrowRight } from 'lucide-react';

const JobMatchQuiz = () => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [result, setResult] = useState(null);

    const questions = [
        {
            text: "What kind of environment do you thrive in?",
            options: [
                { label: "Active & Physical", value: "active", icon: <Package size={20} /> },
                { label: "Detail Oriented & Focused", value: "detail", icon: <Search size={20} /> },
                { label: "Social & Interactive", value: "social", icon: <Users size={20} /> }
            ]
        },
        {
            text: "What's your preferred workflow?",
            options: [
                { label: "Independent & Steady", value: "independent", icon: <RotateCcw size={20} /> },
                { label: "Team-based & Fast-paced", value: "team", icon: <Briefcase size={20} /> },
                { label: "Problem Solving", value: "problem", icon: <CheckCircle size={20} /> }
            ]
        },
        {
            text: "Which sounds most interesting?",
            options: [
                { label: "Managing inventory flow", value: "warehouse", icon: <Package size={20} /> },
                { label: "Helping customers find items", value: "customer", icon: <Users size={20} /> },
                { label: "Ensuring item quality", value: "quality", icon: <CheckCircle size={20} /> }
            ]
        }
    ];

    const handleAnswer = (value) => {
        const newAnswers = [...answers, value];
        setAnswers(newAnswers);

        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            calculateResult(newAnswers);
        }
    };

    const calculateResult = (finalAnswers) => {
        // Simple logic for matching
        const counts = finalAnswers.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});

        if (finalAnswers.includes('social') || finalAnswers.includes('customer')) {
            setResult({
                role: "Customer Service or Pickups",
                desc: "You're a people person! Our customers will love your energy at our pickup desk.",
                path: "/apply"
            });
        } else if (finalAnswers.includes('detail') || finalAnswers.includes('quality')) {
            setResult({
                role: "Quality Inspector or Scanning",
                desc: "You have a hawk's eye! You'd be perfect for ensuring our items are described accurately.",
                path: "/apply"
            });
        } else {
            setResult({
                role: "Warehouse Associate or Stacking",
                desc: "You love staying active! You're the heart and soul of our logistics operation.",
                path: "/apply"
            });
        }
    };

    const reset = () => {
        setStep(0);
        setAnswers([]);
        setResult(null);
    };

    return (
        <div className="w-full max-w-2xl mx-auto glass-panel p-8 md:p-12 rounded-[3rem] shadow-2xl border border-white/80 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            {!result ? (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-1 block">Step {step + 1} of {questions.length}</span>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Job Matcher</h3>
                        </div>
                        <div className="flex gap-1.5">
                            {questions.map((_, i) => (
                                <div key={i} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'bg-orange-500 shadow-sm' : 'bg-gray-100'}`}></div>
                            ))}
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-8 font-display leading-tight">{questions[step].text}</h2>

                    <div className="grid grid-cols-1 gap-4">
                        {questions[step].options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleAnswer(opt.value)}
                                className="group flex items-center justify-between p-6 bg-white border border-gray-100 rounded-2xl hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                        {opt.icon}
                                    </div>
                                    <span className="text-lg font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{opt.label}</span>
                                </div>
                                <ArrowRight className="text-gray-200 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" size={24} />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center animate-fade-in-up py-4">
                    <div className="w-24 h-24 bg-orange-100/50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-orange-600 shadow-inner">
                        <CheckCircle size={48} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2 block">Your Perfect Match</span>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 font-display leading-none">{result.role}</h2>
                    <p className="text-gray-500 text-lg mb-10 max-w-sm mx-auto font-medium leading-relaxed">
                        {result.desc}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={reset}
                            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                            <RotateCcw size={16} /> Try Again
                        </button>
                        <a
                            href={result.path}
                            className="glass-button px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20"
                        >
                            Apply for this Role
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobMatchQuiz;
