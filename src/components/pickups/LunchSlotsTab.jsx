import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Plus, Trash2, Check, GripVertical, Power } from 'lucide-react';
import Toast from '../Toast';
import { listLunchSlots, saveLunchSlot, deleteLunchSlot } from '../../lib/pickupsApi';

const fieldCls =
  'px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400';

const LunchSlotsTab = ({ session }) => {
  const token = session.token;
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [draft, setDraft] = useState({ label: '', capacity: 3 });
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await listLunchSlots(token);
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id, changes) => setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  const saveRow = async (slot) => {
    if (!slot.label.trim()) return setToast({ message: 'Label is required', type: 'error' });
    setSavingId(slot.id);
    try {
      await saveLunchSlot(token, {
        id: slot.id,
        label: slot.label,
        capacity: Number(slot.capacity) || 0,
        sortOrder: Number(slot.sort_order) || 0,
        active: slot.active,
      });
      setToast({ message: 'Slot saved', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (slot) => {
    try {
      await deleteLunchSlot(token, slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const addSlot = async () => {
    if (!draft.label.trim()) return setToast({ message: 'Enter a slot label', type: 'error' });
    try {
      await saveLunchSlot(token, {
        id: null,
        label: draft.label,
        capacity: Number(draft.capacity) || 0,
        sortOrder: (slots.at(-1)?.sort_order || slots.length) + 1,
        active: true,
      });
      setDraft({ label: '', capacity: 3 });
      setToast({ message: 'Slot added', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  return (
    <div className="pickups-card rounded-3xl p-6 sm:p-7">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <UtensilsCrossed size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">Lunch slots</h3>
          <p className="text-sm text-slate-500 font-medium">
            Set the start times and how many people can reserve each one. Staff pick a duration and the end time fills in
            automatically.
          </p>
        </div>
      </div>

      {/* Add new */}
      <div className="mt-5 flex flex-col sm:flex-row gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3">
        <input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && addSlot()}
          placeholder="e.g. 1:00 PM"
          className={`${fieldCls} flex-1`}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={draft.capacity}
            onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
            placeholder="Cap"
            className={`${fieldCls} w-24`}
            title="Capacity"
          />
          <button
            onClick={addSlot}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-slate-400 font-semibold text-sm py-4">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-slate-400 font-semibold text-sm py-4">No slots yet — add one above.</p>
        ) : (
          <AnimatePresence initial={false}>
            {slots.map((slot) => (
              <motion.div
                key={slot.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border p-3 ${
                  slot.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <GripVertical size={16} className="text-slate-300 hidden sm:block shrink-0" />
                <input
                  value={slot.label}
                  onChange={(e) => patch(slot.id, { label: e.target.value })}
                  className={`${fieldCls} flex-1`}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={slot.capacity}
                    onChange={(e) => patch(slot.id, { capacity: e.target.value })}
                    className={`${fieldCls} w-20`}
                    title="Capacity"
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 w-12">slots</span>
                </div>
                <button
                  onClick={() => patch(slot.id, { active: !slot.active })}
                  title={slot.active ? 'Active — click to hide' : 'Hidden — click to show'}
                  className={`p-2 rounded-lg transition-colors ${
                    slot.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Power size={16} />
                </button>
                <button
                  onClick={() => saveRow(slot)}
                  disabled={savingId === slot.id}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => remove(slot)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete slot"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default LunchSlotsTab;
