import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Pencil,
  Check,
  Plus,
  Rows3,
  SquareDashedBottom,
  Type,
  DoorOpen,
  BrickWall,
  Trash2,
  Move,
  Cloud,
  Loader2,
  MapPin,
  RectangleHorizontal,
  TriangleAlert,
  ArrowUp,
  Minus,
  Copy,
  RotateCw,
  BringToFront,
  SendToBack,
} from 'lucide-react';
import { ZoneIcon } from '../cartsUi';
import {
  ZONES,
  ZONE_MAP,
  ELEMENT_TYPES,
  ELEMENT_COLORS,
  ELEMENT_COLOR_KEYS,
} from '../../../config/cartsConfig';
import { fetchLayout, saveLayout } from '../../../lib/cartsApi';
import PlanElement from './PlanElement';
import PlanCart from './PlanCart';

const TYPE_ICONS = { RectangleHorizontal, Rows3, SquareDashedBottom, Minus, DoorOpen, TriangleAlert, ArrowUp, BrickWall, Type };

const uid = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const defaultsFor = (type) => {
  const t = ELEMENT_TYPES.find((x) => x.type === type);
  const color = { aisle: 'blue', rack: 'slate', area: 'sky', wall: 'slate', label: 'slate', door: 'teal', path: 'slate', caution: 'amber', arrow: 'slate' }[type] || 'slate';
  const label = { aisle: 'Aisle', rack: 'Rack', area: 'Zone', wall: '', label: 'Label', door: 'Door', path: '', caution: 'No entry', arrow: '' }[type] ?? 'Element';
  return { ...t.defaults, color, label, rotation: 0 };
};

const FloorPlanView = ({ carts, operatorName, onOpenCart, onReposition, onToast }) => {
  const [area, setArea] = useState('inside');
  const [elements, setElements] = useState([]);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved

  const canvasRef = useRef(null);
  const elementsRef = useRef([]);
  const areaRef = useRef('inside');
  const saveTimer = useRef(null);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    areaRef.current = area;
  }, [area]);

  const getRect = useCallback(() => canvasRef.current?.getBoundingClientRect(), []);

  // ---- Load layout when switching area -------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoadingLayout(true);
    setSelectedId(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('idle');
    fetchLayout(area)
      .then((els) => !cancelled && setElements(Array.isArray(els) ? els : []))
      .catch(() => !cancelled && setElements([]))
      .finally(() => !cancelled && setLoadingLayout(false));
    return () => {
      cancelled = true;
    };
  }, [area]);

  // ---- Autosave (debounced) ------------------------------------------------
  const queueSave = useCallback(() => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveLayout(areaRef.current, elementsRef.current, operatorName || null);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1600);
      } catch (err) {
        setSaveState('idle');
        onToast?.(err.message || 'Could not save layout', 'error');
      }
    }, 650);
  }, [operatorName, onToast]);

  useEffect(() => () => saveTimer.current && clearTimeout(saveTimer.current), []);

  // ---- Element mutations ---------------------------------------------------
  const liveChange = useCallback((id, patch) => {
    setElements((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const addElement = useCallback(
    (type) => {
      const el = { id: uid(), type, x: 38, y: 40, ...defaultsFor(type) };
      setElements((els) => [...els, el]);
      setSelectedId(el.id);
      queueSave();
    },
    [queueSave],
  );

  const patchElement = useCallback(
    (id, patch) => {
      setElements((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      queueSave();
    },
    [queueSave],
  );

  const deleteElement = useCallback(
    (id) => {
      setElements((els) => els.filter((e) => e.id !== id));
      setSelectedId(null);
      queueSave();
    },
    [queueSave],
  );

  const duplicateElement = useCallback((id) => {
    setElements((els) => {
      const el = els.find((e) => e.id === id);
      if (!el) return els;
      const copy = { ...el, id: uid(), x: Math.min(100 - el.w, el.x + 3), y: Math.min(100 - el.h, el.y + 3) };
      setSelectedId(copy.id);
      return [...els, copy];
    });
    queueSave();
  }, [queueSave]);

  const rotateElement = useCallback((id) => {
    setElements((els) => els.map((e) => (e.id === id ? { ...e, rotation: ((e.rotation || 0) + 90) % 360 } : e)));
    queueSave();
  }, [queueSave]);

  const reorder = useCallback((id, dir) => {
    setElements((els) => {
      const i = els.findIndex((e) => e.id === id);
      if (i === -1) return els;
      const arr = [...els];
      const [el] = arr.splice(i, 1);
      if (dir === 'front') arr.push(el); else arr.unshift(el);
      return arr;
    });
    queueSave();
  }, [queueSave]);

  // ---- Carts ---------------------------------------------------------------
  const areaCarts = useMemo(() => carts.filter((c) => c.zone === area), [carts, area]);
  const placed = useMemo(() => areaCarts.filter((c) => c.pos_x != null && c.pos_y != null), [areaCarts]);
  const unplaced = useMemo(() => areaCarts.filter((c) => c.pos_x == null || c.pos_y == null), [areaCarts]);

  // Which rack/area label sits under a point (topmost wins), if any.
  const spotAt = useCallback((x, y) => {
    const hit = [...elementsRef.current]
      .filter((e) => (e.type === 'rack' || e.type === 'area') && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h)
      .pop();
    return hit ? hit.label : null;
  }, []);

  const dropCart = useCallback(
    (cart, x, y) => onReposition(cart, { x, y, spot: spotAt(x, y) }),
    [onReposition, spotAt],
  );

  const placeFromTray = useCallback(
    (cart) => {
      // Drop near the middle with a small scatter so taps don't stack.
      const jitter = () => 42 + Math.random() * 16;
      const x = jitter();
      const y = jitter();
      onReposition(cart, { x, y, spot: spotAt(x, y) });
    },
    [onReposition, spotAt],
  );

  const selected = elements.find((e) => e.id === selectedId) || null;

  return (
    <div className="pk-rise" style={{ animationDelay: '.08s' }}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Area switcher */}
        <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-soft">
          {ZONES.map((z) => {
            const active = area === z.key;
            return (
              <button
                key={z.key}
                onClick={() => setArea(z.key)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span layoutId="plan-area" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />
                )}
                <span className="relative flex items-center gap-2">
                  <ZoneIcon zone={z.key} size={15} /> {z.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <AnimatePresence>
            {saveState !== 'idle' && (
              <motion.span
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400"
              >
                {saveState === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-emerald-500" />}
                {saveState === 'saving' ? 'Saving…' : 'Saved'}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => {
              setEditMode((v) => !v);
              setSelectedId(null);
            }}
            className={`pk-press inline-flex h-[42px] items-center gap-2 rounded-2xl px-4 text-[13px] font-bold shadow-soft transition ${
              editMode ? 'bg-orange-600 text-white hover:bg-orange-700' : 'border border-stone-200 bg-white text-slate-700 hover:border-stone-300'
            }`}
          >
            {editMode ? <><Check size={16} /> Done</> : <><Pencil size={15} /> Edit layout</>}
          </button>
        </div>
      </div>

      {/* Add-element toolbar (edit mode) */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-soft">
              <span className="ml-1 mr-1 hidden text-[11px] font-semibold tracky text-slate-400 sm:inline">ADD</span>
              {ELEMENT_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t.icon] || Rows3;
                return (
                  <button
                    key={t.type}
                    onClick={() => addElement(t.type)}
                    className="pk-press inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-[#FBFBFA] px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
                  >
                    <Icon size={15} /> {t.label}
                  </button>
                );
              })}
              <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[11.5px] font-medium text-slate-400 md:inline-flex">
                <Move size={13} /> Drag to move · corner to resize
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onPointerDown={() => editMode && setSelectedId(null)}
        className={`relative w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft ${editMode ? 'touch-none' : ''}`}
        style={{ aspectRatio: '16 / 10' }}
      >
        {/* Floor grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)',
            backgroundSize: '6.25% 10%',
          }}
        />

        {loadingLayout ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
          </div>
        ) : (
          <>
            {elements.map((el) => (
              <PlanElement
                key={el.id}
                el={el}
                editMode={editMode}
                selected={selectedId === el.id}
                onSelect={setSelectedId}
                getRect={getRect}
                onLiveChange={liveChange}
                onCommit={queueSave}
              />
            ))}
            {placed.map((cart) => (
              <PlanCart
                key={cart.id}
                cart={cart}
                draggable={!editMode}
                getRect={getRect}
                onDropCommit={dropCart}
                onTap={onOpenCart}
              />
            ))}

            {elements.length === 0 && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <div>
                  <p className="font-fraunces text-[20px] font-medium text-slate-500">This area's plan is empty</p>
                  <p className="mt-1.5 text-[13px] text-slate-400">
                    Tap <span className="font-semibold text-slate-600">Edit layout</span> to add racks, zones, and doors.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inspector (edit mode + selection) */}
      <AnimatePresence>
        {editMode && selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-lift"
          >
            <span className="rounded-lg bg-[#FBFBFA] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
              {selected.type}
            </span>
            <input
              value={selected.label}
              onChange={(e) => patchElement(selected.id, { label: e.target.value })}
              placeholder="Label"
              className="min-w-[140px] flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {ELEMENT_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => patchElement(selected.id, { color: key })}
                  title={ELEMENT_COLORS[key].name}
                  className={`h-6 w-6 rounded-full border-2 transition ${selected.color === key ? 'border-slate-900' : 'border-white'}`}
                  style={{ background: ELEMENT_COLORS[key].accent }}
                />
              ))}
            </div>
            {/* Precise position + size */}
            <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-[#FBFBFA] px-1.5 py-1">
              {[['x', 'X'], ['y', 'Y'], ['w', 'W'], ['h', 'H']].map(([k, lab]) => (
                <label key={k} className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">{lab}</span>
                  <input
                    type="number"
                    value={Math.round(selected[k])}
                    onChange={(e) => patchElement(selected.id, { [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    className="w-12 rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[12px] font-semibold text-slate-800"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => rotateElement(selected.id)} title="Rotate 90°" className="rounded-lg border border-stone-200 bg-white p-2 text-slate-500 hover:text-slate-800"><RotateCw size={15} /></button>
              <button onClick={() => reorder(selected.id, 'front')} title="Bring to front" className="rounded-lg border border-stone-200 bg-white p-2 text-slate-500 hover:text-slate-800"><BringToFront size={15} /></button>
              <button onClick={() => reorder(selected.id, 'back')} title="Send to back" className="rounded-lg border border-stone-200 bg-white p-2 text-slate-500 hover:text-slate-800"><SendToBack size={15} /></button>
              <button onClick={() => duplicateElement(selected.id)} title="Duplicate" className="rounded-lg border border-stone-200 bg-white p-2 text-slate-500 hover:text-slate-800"><Copy size={15} /></button>
            </div>
            <button
              onClick={() => deleteElement(selected.id)}
              className="pk-press inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-bold text-slate-400 hover:border-red-200 hover:text-red-500"
            >
              <Trash2 size={15} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unplaced tray */}
      {!editMode && unplaced.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-[#FBFBFA]/70 p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <MapPin size={14} className="text-slate-400" />
            <p className="text-[12px] font-bold text-slate-500">
              Not placed yet in {ZONE_MAP[area].label} — tap to drop on the plan
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((cart) => (
              <button
                key={cart.id}
                onClick={() => placeFromTray(cart)}
                className="pk-press inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-soft hover:border-orange-200"
              >
                <span className="font-fraunces text-[15px] font-medium text-slate-900 tnum">{cart.cart_number}</span>
                <Plus size={13} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Operate hint */}
      {!editMode && placed.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 px-1 text-[12px] font-medium text-slate-400">
          <Cloud size={13} /> Drag a cart to reposition it · tap a cart to move areas or print its sticker
        </p>
      )}
    </div>
  );
};

export default FloorPlanView;
