import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { Avatar } from './cartsUi';

// Name picker for "who's moving carts?" — searches the shared employee roster
// and lets you continue with any typed name. Same interaction as the Pickups
// kiosk so staff only learn it once.
const IdentityChooser = ({ open, roster = [], onChoose, onClose }) => {
  const [search, setSearch] = useState('');

  const suggestions = (() => {
    const q = search.trim().toLowerCase();
    return (q ? roster.filter((e) => e.name.toLowerCase().includes(q)) : roster).slice(0, 8);
  })();

  const choose = (name) => {
    const finalName = (name || '').trim();
    if (!finalName) return;
    setSearch('');
    onChoose(finalName);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[65] flex items-start justify-center bg-slate-900/40 p-4 pt-24 backdrop-blur-sm sm:items-center sm:pt-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
          >
            <div className="border-b border-stone-100 p-6 pb-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-fraunces text-[26px] font-medium tracking-tight text-slate-900">Who's on carts?</h2>
                <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search.trim() && choose(search)}
                  placeholder="Type your name…"
                  className="w-full rounded-2xl border border-stone-200 bg-white py-4 pl-12 pr-4 text-[17px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-3">
              {suggestions.length > 0 ? (
                suggestions.map((e) => (
                  <button
                    key={e.id || e.name}
                    onClick={() => choose(e.name)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-[#FBFBFA]"
                  >
                    <Avatar name={e.name} size="sm" />
                    <span className="truncate font-semibold text-slate-800">{e.name}</span>
                    {e.position && <span className="ml-auto truncate text-xs text-slate-400">{e.position}</span>}
                  </button>
                ))
              ) : (
                <p className="py-6 text-center text-[14px] font-medium text-slate-400">
                  {roster.length ? 'No matches.' : 'Type your name to continue.'}
                </p>
              )}
              {search.trim() && (
                <button
                  onClick={() => choose(search)}
                  className="pk-press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-[14px] font-semibold text-white shadow-soft hover:bg-slate-800"
                >
                  Continue as &ldquo;{search.trim()}&rdquo; <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IdentityChooser;
