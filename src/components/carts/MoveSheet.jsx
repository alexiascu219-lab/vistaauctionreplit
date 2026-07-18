import React, { useEffect, useState } from 'react';
import { Printer, Trash2, Check, MapPin, ArrowRight, Pencil } from 'lucide-react';
import { Sheet, SheetHeader, ZoneIcon, FIELD, LABEL } from './cartsUi';
import { ZONES, ZONE_MAP, STATUS_OPTIONS, CART_STATUS } from '../../config/cartsConfig';

// Full-control sheet for one cart: change area, set an exact spot, flag its
// condition, print a sticker, or remove it.
const MoveSheet = ({ cart, open, onClose, operatorName, onChooseOperator, onSave, onPrint, onRemove, busy }) => {
  const [zone, setZone] = useState('inside');
  const [spot, setSpot] = useState('');
  const [status, setStatus] = useState('active');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (cart) {
      setZone(cart.zone);
      setSpot(cart.spot || '');
      setStatus(cart.status || 'active');
      setConfirmRemove(false);
    }
  }, [cart]);

  if (!cart) return null;

  const zoneChanged = zone !== cart.zone;
  const spotChanged = (spot || '') !== (cart.spot || '');
  const statusChanged = status !== cart.status;
  const dirty = zoneChanged || spotChanged || statusChanged;
  const destLabel = ZONE_MAP[zone]?.label;
  const primaryLabel = zoneChanged ? `Move to ${destLabel}` : 'Save changes';

  return (
    <Sheet open={open} onClose={onClose} labelledBy="move-sheet-title">
      <SheetHeader
        id="move-sheet-title"
        icon={<span className="font-fraunces text-[22px] font-medium leading-none text-slate-900 tnum">{cart.cart_number}</span>}
        title={`Cart ${cart.cart_number}`}
        subtitle={
          <span>
            Currently in <span className="font-semibold text-slate-600">{ZONE_MAP[cart.zone]?.label}</span>
            {cart.spot ? ` · ${cart.spot}` : ''}
          </span>
        }
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* Operator */}
        <button
          onClick={onChooseOperator}
          className="mb-6 flex w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-[#FBFBFA] px-3.5 py-2.5 text-left transition hover:border-stone-300"
        >
          <span className="text-[10.5px] font-semibold tracky text-slate-400">MOVED BY</span>
          <span className="ml-auto flex items-center gap-1.5 text-[13.5px] font-bold text-slate-900">
            {operatorName || 'Choose name'} <Pencil size={12} className="text-slate-400" />
          </span>
        </button>

        {/* Area toggle */}
        <p className={LABEL}>MOVE TO AREA</p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {ZONES.map((z) => {
            const active = zone === z.key;
            return (
              <button
                key={z.key}
                onClick={() => setZone(z.key)}
                aria-pressed={active}
                className={`pk-press relative flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lift'
                    : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'
                }`}
              >
                <ZoneIcon zone={z.key} size={26} strokeWidth={1.7} />
                <span className="font-fraunces text-[19px] font-medium leading-none tracking-tight">{z.label}</span>
                <span className={`text-[11px] font-medium ${active ? 'text-white/60' : 'text-slate-400'}`}>{z.tagline}</span>
                {active && (
                  <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-white">
                    <Check size={13} className="text-slate-900" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Exact spot */}
        <div className="mt-6">
          <label className={LABEL} htmlFor="cart-spot">
            EXACT SPOT <span className="font-normal normal-case tracking-normal text-slate-300">— optional</span>
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              id="cart-spot"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              placeholder="e.g. By the ramp"
              className={`${FIELD} pl-10`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(ZONE_MAP[zone]?.spots || []).map((s) => (
              <button
                key={s}
                onClick={() => setSpot(s)}
                className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${
                  spot === s
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div className="mt-6">
          <p className={LABEL}>CONDITION</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = status === s.key;
              const st = CART_STATUS[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition ${
                    active ? st.chip : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary actions */}
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onPrint(cart)}
            className="pk-press inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-soft hover:border-stone-300"
          >
            <Printer size={15} /> Print sticker
          </button>
          <button
            onClick={() => setConfirmRemove((v) => !v)}
            className={`pk-press inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition ${
              confirmRemove
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-stone-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-500'
            }`}
          >
            <Trash2 size={15} /> {confirmRemove ? 'Tap Confirm →' : 'Remove'}
          </button>
          {confirmRemove && (
            <button
              onClick={() => onRemove(cart)}
              disabled={busy}
              className="pk-press inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-soft hover:bg-red-700 disabled:opacity-60"
            >
              <Check size={15} /> Confirm remove
            </button>
          )}
        </div>
      </div>

      {/* Primary action */}
      <div className="shrink-0 border-t border-stone-200 p-5">
        <button
          onClick={() => onSave({ zone, spot, status })}
          disabled={busy || !dirty}
          className="pk-press flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-[14.5px] font-semibold text-white shadow-glow transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Saving…' : (
            <>
              {primaryLabel} <ArrowRight size={16} />
            </>
          )}
        </button>
        {!dirty && !busy && (
          <p className="mt-2 text-center text-[11.5px] font-medium text-slate-400">Pick a different area or spot to move this cart.</p>
        )}
      </div>
    </Sheet>
  );
};

export default MoveSheet;
