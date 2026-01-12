import React from 'react';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';

const CalendarView = ({ applications, onSelectApp }) => {
    // Filter only those with interviewDate and sort them
    const interviews = applications
        .filter(app => app.status === 'Interviewing' && app.interviewDate)
        .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));

    if (interviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in group">
                <div className="w-24 h-24 bg-gray-100/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-500">
                    <CalendarIcon className="text-gray-300" size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">No Interviews Today</h3>
                <p className="text-gray-500 max-w-xs font-medium mx-auto">Your schedule is clear! Move candidates to the interviewing stage to see them here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <CalendarIcon size={24} />
                </div>
                Upcoming Interviews
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interviews.map(app => {
                    const dateObj = new Date(app.interviewDate);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString('default', { month: 'short' });
                    const time = dateObj.toLocaleString('default', { hour: 'numeric', minute: '2-digit' });
                    const weekday = dateObj.toLocaleString('default', { weekday: 'long' });

                    return (
                        <div
                            key={app.id}
                            onClick={() => onSelectApp(app)}
                            className="glass-card hover:bg-white p-6 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent hover:border-blue-200 group shadow-sm hover:shadow-md transform hover:-translate-y-1"
                        >
                            <div className="flex items-start gap-5">
                                <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-2xl min-w-[70px] h-[70px] border border-blue-100 shadow-inner">
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">{month}</span>
                                    <span className="text-2xl font-black leading-none mt-1">{day}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition-colors pointer-events-none truncate">{app.firstName} {app.lastName}</p>
                                    <p className="text-sm text-gray-500 mb-3 truncate font-medium">{app.position}</p>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-full w-fit">
                                        <Clock size={14} className="text-blue-500" />
                                        {weekday}, {time}
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
