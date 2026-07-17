import React from 'react';
import { MapPin, ArrowLeftRight, AlertTriangle, Ban } from 'lucide-react';
import { CART_STATUS, ZONE_MAP, otherZone, formatTimeAgo } from '../../config/cartsConfig';

// A single cart, shown as a tactile "luggage tag". Tap the body to open the
// move sheet; tap the ⇄ chip to instantly flip it to the other area.
const CartToken = ({ cart, onOpen, onQuickMove }) => {
  const status = CART_STATUS[cart.status] || CART_STATUS.active;
  const dest = ZONE_MAP[otherZone(cart.zone)];
  const oos = cart.status === 'out_of_service';

  return (
    <div
      className={`group/token relative flex items-stretch overflow-hidden rounded-2xl border bg-white shadow-soft transition ${
        oos ? 'border-stone-200 opacity-75' : 'border-stone-200 hover:border-stone-300 hover:shadow-lift'
      }`}
    >
      <button
        onClick={() => onOpen(cart)}
        className="flex min-w-0 flex-1 items-center gap-3.5 p-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20 sm:gap-4 sm:p-3.5"
      >
        {/* Number tile */}
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-stone-200 bg-[#FBFBFA] sm:h-[60px] sm:w-[60px]">
          <span className="font-fraunces text-[26px] font-medium leading-none tracking-tight text-slate-900 tnum sm:text-[28px]">
            {cart.cart_number}
          </span>
          <span
            className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${status.dot}`}
            title={status.label}
          />
        </span>

        {/* Meta */}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-slate-900">Cart {cart.cart_number}</span>
            {cart.status === 'attention' && <AlertTriangle size={13} className="shrink-0 text-amber-500" />}
            {oos && <Ban size={13} className="shrink-0 text-red-500" />}
          </span>
          {cart.spot ? (
            <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-slate-500">
              <MapPin size={12} className="shrink-0 text-slate-400" />
              <span className="truncate">{cart.spot}</span>
            </span>
          ) : (
            <span className="mt-0.5 block text-[12.5px] font-medium text-slate-400">{ZONE_MAP[cart.zone]?.tagline}</span>
          )}
          <span className="mt-0.5 block text-[11px] text-slate-400 tnum">{formatTimeAgo(cart.updated_at)}</span>
        </span>
      </button>

      {/* Quick flip to the other area */}
      <button
        onClick={() => onQuickMove(cart)}
        title={`Move to ${dest.label}`}
        aria-label={`Move Cart ${cart.cart_number} to ${dest.label}`}
        className="pk-press flex shrink-0 flex-col items-center justify-center gap-1 border-l border-stone-200 bg-[#FBFBFA] px-3.5 text-slate-500 transition hover:bg-white hover:text-orange-600 sm:px-4"
      >
        <ArrowLeftRight size={17} />
        <span className="text-[9.5px] font-bold uppercase tracking-wide">{dest.label}</span>
      </button>
    </div>
  );
};

export default CartToken;
