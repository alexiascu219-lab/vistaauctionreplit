import React, { useState } from 'react';

// A clean 12-hour time picker (Hour : Minute · AM/PM) that emits a string like
// "11:45 PM". Avoids the browser's 24-hour native time input.
const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const parse = (v) => {
  const m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { h: '', m: '', ap: '' };
  return { h: String(parseInt(m[1], 10)), m: m[2], ap: m[3].toUpperCase() };
};

const selCls =
  'rounded-xl border border-stone-200 bg-white px-2.5 py-3 text-[15px] font-medium text-slate-900 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/15 transition';

const TimePicker12 = ({ value, onChange }) => {
  // The picker only opens on a freshly-mounted form, so seeding once is safe.
  const init = parse(value);
  const [h, setH] = useState(init.h);
  const [min, setMin] = useState(init.m);
  const [ap, setAp] = useState(init.ap);

  const emit = (nh, nm, nap) => onChange(nh && nap ? `${nh}:${nm || '00'} ${nap}` : '');

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={h}
        onChange={(e) => {
          setH(e.target.value);
          emit(e.target.value, min, ap);
        }}
        className={`${selCls} flex-1`}
        aria-label="Hour"
      >
        <option value="">Hr</option>
        {HOURS.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      <span className="font-bold text-slate-300">:</span>
      <select
        value={min}
        onChange={(e) => {
          setMin(e.target.value);
          emit(h, e.target.value, ap);
        }}
        className={`${selCls} flex-1`}
        aria-label="Minute"
      >
        <option value="">Min</option>
        {MINUTES.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      <select
        value={ap}
        onChange={(e) => {
          setAp(e.target.value);
          emit(h, min, e.target.value);
        }}
        className={`${selCls} w-[4.5rem]`}
        aria-label="AM or PM"
      >
        <option value="">—</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default TimePicker12;
