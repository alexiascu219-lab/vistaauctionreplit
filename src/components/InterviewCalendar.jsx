import React from 'react';

/**
 * Very lightweight date picker used for interview scheduling.
 * It simply renders an <input type="date"> with dark styling.
 * The parent component handles the actual persistence.
 */
const InterviewCalendar = ({ label, value, onChange }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-xs font-black uppercase tracking-widest text-gray-300">{label}</label>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[#0c1226]/60 text-white px-4 py-2 rounded-xl border border-white/20 focus:outline-none"
    />
  </div>
);

export default InterviewCalendar;
