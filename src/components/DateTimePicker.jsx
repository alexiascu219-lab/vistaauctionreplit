import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';

const DateTimePicker = ({ value, onChange, label }) => {
    const initialDate = (value && !isNaN(new Date(value).getTime())) ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState((value && !isNaN(new Date(value).getTime())) ? new Date(value) : null);
    const [selectedTime, setSelectedTime] = useState((value && !isNaN(new Date(value).getTime())) ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

    const timeSlots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
    ];

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const onDateClick = (day) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        setSelectedDate(newDate);
        updateFinalValue(newDate, selectedTime);
    };

    const onTimeClick = (time) => {
        setSelectedTime(time);
        updateFinalValue(selectedDate, time);
    };

    const updateFinalValue = (date, time) => {
        if (!date || !time) return;
        const [hours, minutes] = time.split(':');
        const finalDate = new Date(date);
        finalDate.setHours(parseInt(hours), parseInt(minutes));
        onChange(finalDate.toISOString());
    };

    const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    const calendarDays = [];

    // Fill leading empty slots
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-fade-in max-w-sm mx-auto">
            {label && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</span>
                </div>
            )}

            <div className="p-6">
                {/* Month Navigator */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-orange-50 rounded-xl text-orange-600 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-orange-50 rounded-xl text-orange-600 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                    {days.map(d => (
                        <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase py-2">{d}</div>
                    ))}
                    {calendarDays.map((day, i) => {
                        const isSelected = selectedDate &&
                            selectedDate.getDate() === day &&
                            selectedDate.getMonth() === currentMonth.getMonth() &&
                            selectedDate.getFullYear() === currentMonth.getFullYear();

                        const isToday = new Date().getDate() === day &&
                            new Date().getMonth() === currentMonth.getMonth() &&
                            new Date().getFullYear() === currentMonth.getFullYear();

                        return (
                            <button
                                key={i}
                                disabled={!day}
                                onClick={() => day && onDateClick(day)}
                                className={`h-9 w-full rounded-xl text-[11px] font-bold transition-all flex items-center justify-center
                                    ${!day ? 'invisible' : 'hover:bg-orange-50 hover:text-orange-600'}
                                    ${isSelected ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-gray-600'}
                                    ${isToday && !isSelected ? 'text-orange-600 font-black relative after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-orange-600 after:rounded-full' : ''}
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* Time Selector */}
                <div className="border-t border-gray-50 pt-6">
                    <div className="flex items-center gap-2 mb-4 text-gray-400">
                        <Clock size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Select Time</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 h-32 overflow-y-auto custom-scrollbar pr-2">
                        {timeSlots.map(time => (
                            <button
                                key={time}
                                onClick={() => onTimeClick(time)}
                                className={`py-2 rounded-lg text-[10px] font-black transition-all border
                                    ${selectedTime === time
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200 hover:text-orange-600'}
                                `}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {selectedDate && selectedTime && (
                <div className="px-6 py-4 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Final Selection</span>
                        <span className="text-[10px] font-black text-orange-700">
                            {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {selectedTime}
                        </span>
                    </div>
                    <CalendarIcon size={16} className="text-orange-400" />
                </div>
            )}
        </div>
    );
};

export default DateTimePicker;
