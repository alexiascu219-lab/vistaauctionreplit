import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, MapPin } from 'lucide-react';
import { Sheet, SheetHeader, ZoneIcon, FIELD, LABEL } from './cartsUi';
import { ZONES, ZONE_MAP } from '../../config/cartsConfig';

// Register a brand-new cart onto the board.
const AddCartSheet = ({ open, onClose, onAdd, busy }) => {
  const [number, setNumber] = useState('');
  const [zone, setZone] = useState('inside');
  const [spot, setSpot] = useState('');

  useEffect(() => {
    if (open) {
      setNumber('');
      setZone('inside');
      setSpot('');
    }
  }, [open]);

  const submit = () => {
    if (!number.trim()) return;
    onAdd({ cartNumber: number.trim(), zone, spot: spot.trim() || null });
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy="add-cart-title">
      <SheetHeader
        id="add-cart-title"
        icon={<Plus size={22} strokeWidth={1.9} />}
        title="Add a cart"
        subtitle="Put a new cart on the board"
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <label className={LABEL} htmlFor="new-cart-number">
          CART NUMBER <span className="text-orange-600">*</span>
        </label>
        <input
          id="new-cart-number"
          autoFocus
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. 12 or A3"
          className={`${FIELD} text-[17px]`}
        />

        <p className={`${LABEL} mt-6`}>STARTING AREA</p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {ZONES.map((z) => {
            const active = zone === z.key;
            return (
              <button
                key={z.key}
                onClick={() => setZone(z.key)}
                aria-pressed={active}
                className={`pk-press flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lift'
                    : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'
                }`}
              >
                <ZoneIcon zone={z.key} size={24} strokeWidth={1.7} />
                <span className="font-fraunces text-[18px] font-medium leading-none tracking-tight">{z.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <label className={LABEL} htmlFor="new-cart-spot">
            EXACT SPOT <span className="font-normal normal-case tracking-normal text-slate-300">— optional</span>
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              id="new-cart-spot"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              placeholder="e.g. Staging"
              className={`${FIELD} pl-10`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(ZONE_MAP[zone]?.spots || []).map((s) => (
              <button
                key={s}
                onClick={() => setSpot(s)}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-500 transition hover:border-stone-300"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-stone-200 p-5">
        <button
          onClick={submit}
          disabled={busy || !number.trim()}
          className="pk-press flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[14.5px] font-semibold text-white shadow-soft transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Adding…' : (
            <>
              Add cart <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </Sheet>
  );
};

export default AddCartSheet;
