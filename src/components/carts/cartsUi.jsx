import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warehouse, CloudSun, X } from 'lucide-react';
import { ZONE_MAP } from '../../config/cartsConfig';

// Shared field styles — identical to the Pickups kiosk so the two internal
// tools feel like one product.
export const FIELD =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/15 transition';
export const LABEL = 'block text-[10.5px] font-semibold tracky text-slate-400 mb-1.5';

export const ZONE_ICONS = { Warehouse, CloudSun };

export const ZoneIcon = ({ zone, ...props }) => {
  const Icon = ZONE_ICONS[ZONE_MAP[zone]?.icon] || Warehouse;
  return <Icon {...props} />;
};

// Bottom-sheet on phones, centered card on desktop. Mirrors the Pickups modal.
export const Sheet = ({ open, onClose, children, labelledBy, wide = false }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
            wide ? 'sm:max-w-xl' : 'sm:max-w-lg'
          }`}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const SheetHeader = ({ icon, title, subtitle, onClose, id }) => (
  <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-6 py-5">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <h2 id={id} className="font-fraunces text-[20px] font-medium leading-none tracking-tight text-slate-900">
        {title}
      </h2>
      {subtitle && <p className="mt-1.5 text-[12px] font-medium text-slate-400">{subtitle}</p>}
    </div>
    <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
      <X size={18} />
    </button>
  </div>
);

// The initial-in-a-tile avatar used across the Pickups + Carts kiosks.
export const Avatar = ({ name, size = 'md' }) => {
  const dims = size === 'lg' ? 'h-16 w-16 text-[28px]' : size === 'sm' ? 'h-10 w-10 text-[17px]' : 'h-12 w-12 text-[20px]';
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-slate-900 font-fraunces font-medium text-white ${dims}`}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
};
