import React, { useEffect, useRef, useState } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

import { normalizeValpn } from '../../lib/missings/valpn';
import { resolveScan } from '../../lib/missings/sync';

/**
 * Manual VALPN entry — for when the barcode is damaged, which is often.
 *
 * A custom keypad rather than the OS keyboard, for three reasons: VALPNs are
 * digits only, the OS numeric keyboard has tiny keys and no VALPN affordances,
 * and an on-screen pad we control can be sized for gloves. The native input is
 * still there and focusable, so a hardware wedge scanner or a Bluetooth keyboard
 * works too.
 */
export default function LookupView({ onResult }) {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const valpn = normalizeValpn(digits);
  const ready = Boolean(valpn) && !busy;

  // Accept input from a hardware scanner even when the on-screen pad has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') setDigits((d) => (d.length < 14 ? d + e.key : d));
      else if (e.key === 'Backspace') setDigits((d) => d.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = async () => {
    if (!valpn || busy) return;
    setBusy(true);
    try {
      const result = await resolveScan(valpn, { source: 'manual' });
      setDigits('');
      onResult(result);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* The readout: fixed-width, tabular, always showing the canonical form so
          there is never any doubt what is about to be submitted. */}
      <div className="fl-card px-5 py-6 text-center">
        <p className="fl-label">VALPN</p>
        <p className="mt-2 fl-num text-4xl leading-none text-slate-50">
          <span className="text-slate-600">VALPN-</span>
          {digits || <span className="text-slate-700">………</span>}
        </p>
        <p className="mt-3 font-fl-ui text-sm text-slate-500">
          {digits.length === 0
            ? 'Enter at least 5 digits'
            : valpn
              ? 'Ready'
              : `${5 - digits.length} more digit${5 - digits.length === 1 ? '' : 's'}`}
        </p>

        {/* Kept in the DOM for hardware scanners and assistive tech. */}
        <input
          ref={inputRef}
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 14))}
          inputMode="numeric"
          aria-label="VALPN digits"
          className="sr-only"
        />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <Key key={k} onPress={() => setDigits((d) => (d.length < 14 ? d + k : d))}>
            {k}
          </Key>
        ))}

        <Key onPress={() => setDigits('')} muted aria-label="Clear">
          <span className="font-fl-ui text-base font-bold uppercase tracking-wider">Clear</span>
        </Key>

        <Key onPress={() => setDigits((d) => (d.length < 14 ? d + '0' : d))}>0</Key>

        <Key onPress={() => setDigits((d) => d.slice(0, -1))} muted aria-label="Backspace">
          <Delete className="h-6 w-6" aria-hidden="true" />
        </Key>
      </div>

      <button type="button" onClick={submit} disabled={!ready} className="fl-btn-primary">
        <CornerDownLeft className="h-5 w-5" aria-hidden="true" />
        {busy ? 'Checking…' : 'Check this item'}
      </button>
    </div>
  );
}

/** 68px tall — comfortably above the 56px glove minimum, because this pad is
 *  used repeatedly and errors here cost a re-entry. */
function Key({ children, onPress, muted = false, ...rest }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex h-[68px] items-center justify-center rounded-xl border text-3xl transition-all duration-100 active:translate-y-[2px] ${
        muted
          ? 'border-floor-hairline bg-floor-raised text-slate-400 shadow-[0_3px_0_0_theme(colors.floor.ink)] active:shadow-[0_1px_0_0_theme(colors.floor.ink)]'
          : 'fl-num border-floor-hairline bg-floor-panel text-slate-50 shadow-[0_3px_0_0_theme(colors.floor.ink)] active:shadow-[0_1px_0_0_theme(colors.floor.ink)]'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
