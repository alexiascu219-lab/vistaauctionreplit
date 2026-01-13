import React from 'react';
import { Calendar as CalendarIcon, Clock, User, ArrowRight, AlertCircle } from 'lucide-react';

const CalendarView = ({ applications, onSelectApp }) => {
    // Filter only those with interviewDate and sort them
    const interviews = applications
        .filter(app => (app.status === 'Interviewing' || app.rescheduleRequested) && app.interviewDate)
        .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));

    if (interviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in group">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 flex items-center justify-center mb-8 border border-gray-100 group-hover:scale-110 transition-all duration-700 group-hover:rotate-6">
                    <CalendarIcon className="text-orange-500/20" size={56} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight font-display">Your Schedule is Clear</h3>
                <p className="text-gray-400 max-w-xs font-bold uppercase tracking-widest text-[10px] leading-loose">No interviews scheduled at the moment. Time to find some talent!</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in pb-10">
            <div className="flex items-center justify-between border-b border-gray-100 pb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                        <CalendarIcon size={24} />
                    </div>
                    Interview Roadmap
                </h2>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {interviews.length} Scheduled
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {interviews.map(app => {
                    const dateObj = new Date(app.interviewDate);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString('default', { month: 'short' });
                    const time = dateObj.toLocaleString('default', { hour: 'numeric', minute: '2-digit' });
                    const weekday = dateObj.toLocaleString('default', { weekday: 'long' });
                    const isReschedule = app.rescheduleRequested;

                    return (
                        <div
                            key={app.id}
                            onClick={() => onSelectApp(app)}
                            className={`relative glass-card p-1 group cursor-pointer transition-all duration-500 rounded-[2rem] border-2 ${isReschedule ? 'border-amber-300 bg-amber-50/30' : 'border-transparent hover:border-orange-500/20'}`}
                        >
                            {isReschedule && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-2">
                                    <AlertCircle size={12} /> Reschedule Requested
                                </div>
                            )}

                            <div className="bg-white p-7 rounded-[1.8rem] shadow-sm group-hover:shadow-xl transition-all h-full flex flex-col">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className={`w-16 h-16 rounded-[1.2rem] flex flex-col items-center justify-center border-2 transition-colors ${isReschedule ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{month}</span>
                                        <span className="text-2xl font-black leading-none">{day}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-xl text-gray-900 group-hover:text-orange-600 transition-colors truncate font-display tracking-tight">{app.fullName}</h4>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{app.jobType} • {app.preferredShift}</p>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isReschedule ? 'bg-white border-amber-100' : 'bg-gray-50/50 border-gray-100 group-hover:bg-orange-50/30 group-hover:border-orange-100'}`}>
                                        <div className={`p-2 rounded-xl border ${isReschedule ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white border-gray-100 text-orange-500 shadow-sm'}`}>
                                            <Clock size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Scheduled For</span>
                                            <span className="text-sm font-bold text-gray-800">{weekday}, {time}</span>
                                        </div>
                                    </div>

                                    {isReschedule && app.suggestedInterviewDate && (
                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner">
                                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block mb-1">CANDIDATE SUGGESTION:</span>
                                            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-tight">
                                                <CalendarIcon size={12} />
                                                {new Date(app.suggestedInterviewDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                        <span className="text-gray-300 hover:text-orange-500 flex items-center gap-2 transition-colors">
                                            Details <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
                                        </span>
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400">V</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
