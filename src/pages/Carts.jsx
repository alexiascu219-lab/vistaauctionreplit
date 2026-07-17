import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Printer,
  RefreshCw,
  UserRound,
  ArrowRightLeft,
  Undo2,
  X,
  Check,
  Radio,
  PackageSearch,
  List,
  Map as MapIcon,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Toast from '../components/Toast';
import CartToken from '../components/carts/CartToken';
import MoveSheet from '../components/carts/MoveSheet';
import AddCartSheet from '../components/carts/AddCartSheet';
import IdentityChooser from '../components/carts/IdentityChooser';
import PrintQueueDrawer from '../components/carts/PrintQueueDrawer';
import FloorPlanView from '../components/carts/floorplan/FloorPlanView';
import { ZoneIcon } from '../components/carts/cartsUi';
import {
  ZONES,
  ZONE_MAP,
  otherZone,
  CART_IDENTITY_KEY,
  describeEvent,
  formatTimeAgo,
} from '../config/cartsConfig';
import {
  listCarts,
  listEvents,
  fetchRoster,
  addCart,
  moveCart,
  setCartStatus,
  removeCart,
  setCartPosition,
  queuePrint,
  listPrintJobs,
  cancelPrintJob,
  reprintJob,
} from '../lib/cartsApi';

// Minimal Atelier-light header, matching the Pickups lockup but for carts.
const CartsHeader = ({ liveCount }) => (
  <header className="fixed inset-x-0 top-0 z-50">
    <div className="border-b border-stone-200/80 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center px-5 sm:px-8">
        <Link to="/carts" className="group flex items-center gap-3" aria-label="Vista Auction Cart Yard — home">
          <img src="/assets/logo-tag.png" alt="Vista Auction" className="h-12 w-auto transition-transform group-hover:scale-[1.03]" />
          <span className="flex flex-col leading-none">
            <span className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">Cart Yard</span>
            <span className="mt-1 text-[10px] font-semibold tracky text-slate-400">VISTA AUCTION</span>
          </span>
        </Link>
        <span className="ml-auto hidden items-center gap-1.5 text-[11px] font-semibold text-slate-400 sm:inline-flex">
          <Radio size={13} className="text-emerald-500 pk-breathe" />
          {liveCount} carts live
        </span>
      </div>
    </div>
  </header>
);

// Bottom-center confirmation with a one-tap Undo for the quick flip.
const UndoBar = ({ data, onUndo, onClose }) => (
  <AnimatePresence>
    {data && (
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20">
          <Check size={14} className="text-emerald-400" />
        </span>
        <span className="text-[13.5px] font-semibold">{data.label}</span>
        <button
          onClick={onUndo}
          className="pk-press ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12.5px] font-bold hover:bg-white/20"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button onClick={onClose} aria-label="Dismiss" className="rounded-lg p-1 text-white/50 hover:text-white">
          <X size={15} />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);

// One area column (Inside or Outside) with its own atmosphere.
const ZoneColumn = ({ zone, carts, onOpenCart, onQuickMove, onAddHere, searching, delay }) => {
  const cfg = ZONE_MAP[zone];
  return (
    <section
      className="pk-rise relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft"
      style={{ animationDelay: delay }}
    >
      {/* Atmosphere glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: `radial-gradient(120% 100% at 50% 0%, ${cfg.glow}, transparent 70%)` }}
      />
      {/* Header */}
      <div className="relative flex items-center gap-3.5 px-5 pt-5 sm:px-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
          <ZoneIcon zone={zone} size={24} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-fraunces text-[24px] font-medium leading-none tracking-tight text-slate-900">{cfg.label}</h2>
          <p className="mt-1 text-[12.5px] font-medium text-slate-400">{cfg.tagline}</p>
        </div>
        <div className="text-right">
          <p className="font-fraunces text-[34px] font-medium leading-none tracking-tight text-slate-900 tnum">{carts.length}</p>
          <p className="text-[10px] font-semibold tracky text-slate-400">CARTS</p>
        </div>
      </div>
      <div className="relative mx-5 mt-4 h-px sm:mx-6" style={{ background: `linear-gradient(to right, transparent, ${cfg.hairline}, transparent)` }} />

      {/* Tokens */}
      <div className="relative p-3 sm:p-4">
        {carts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-300">
              <ZoneIcon zone={zone} size={22} />
            </span>
            <p className="mt-3 text-[13.5px] font-medium text-slate-400">
              {searching ? 'No matching carts here.' : `No carts ${cfg.tagline.toLowerCase()} right now.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {carts.map((cart) => (
              <CartToken key={cart.id} cart={cart} onOpen={onOpenCart} onQuickMove={onQuickMove} />
            ))}
          </div>
        )}

        {!searching && (
          <button
            onClick={() => onAddHere(zone)}
            className="pk-press mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-[#FBFBFA]/60 py-3 text-[13px] font-semibold text-slate-400 transition hover:border-stone-400 hover:text-slate-600"
          >
            <Plus size={15} /> Add a cart to {cfg.label}
          </button>
        )}
      </div>
    </section>
  );
};

const Carts = () => {
  const [carts, setCarts] = useState([]);
  const [events, setEvents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [operator, setOperator] = useState(() => {
    try {
      return localStorage.getItem(CART_IDENTITY_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('board'); // 'board' | 'map'

  const [activeCart, setActiveCart] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addZone, setAddZone] = useState('inside');
  const [identityOpen, setIdentityOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [printJobs, setPrintJobs] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  const setOperatorPersisted = useCallback((name) => {
    setOperator(name);
    try {
      if (name) localStorage.setItem(CART_IDENTITY_KEY, name);
      else localStorage.removeItem(CART_IDENTITY_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  // ---- Data ----------------------------------------------------------------
  const load = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([listCarts(), listEvents(24)]);
      setCarts(c);
      setEvents(e);
    } catch (err) {
      console.error('Cart load error:', err);
      setToast({ message: 'Could not load carts. Check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchRoster().then(setRoster);
  }, [load]);

  // Live updates via Supabase Realtime, with a polling safety net.
  useEffect(() => {
    let channel;
    try {
      channel = supabase
        .channel('carts-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vista_carts' }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vista_cart_events' }, load)
        .subscribe();
    } catch {
      /* realtime not enabled — the interval below keeps us fresh */
    }
    const interval = setInterval(load, 20000);
    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const loadPrintJobs = useCallback(async () => {
    setQueueLoading(true);
    try {
      setPrintJobs(await listPrintJobs(30));
    } catch {
      /* ignore */
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (queueOpen) loadPrintJobs();
  }, [queueOpen, loadPrintJobs]);

  useEffect(() => () => undoTimer.current && clearTimeout(undoTimer.current), []);

  // ---- Derived -------------------------------------------------------------
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return carts;
    return carts.filter(
      (c) =>
        String(c.cart_number).toLowerCase().includes(q) ||
        (c.spot || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q),
    );
  }, [carts, q]);

  const byZone = useMemo(() => {
    const map = { inside: [], outside: [] };
    filtered.forEach((c) => (map[c.zone] || map.inside).push(c));
    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    const t = { inside: 0, outside: 0, attention: 0 };
    carts.forEach((c) => {
      t[c.zone] = (t[c.zone] || 0) + 1;
      if (c.status !== 'active') t.attention += 1;
    });
    return t;
  }, [carts]);

  const queuedCount = useMemo(() => printJobs.filter((j) => j.status === 'queued' || j.status === 'printing').length, [printJobs]);

  // ---- Actions -------------------------------------------------------------
  const showUndo = useCallback((label, action) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ label, action });
    undoTimer.current = setTimeout(() => setUndo(null), 5500);
  }, []);

  const quickMove = useCallback(
    async (cart) => {
      const target = otherZone(cart.zone);
      // Optimistic update for snappy feel.
      setCarts((prev) => prev.map((c) => (c.id === cart.id ? { ...c, zone: target, spot: null, updated_at: new Date().toISOString() } : c)));
      try {
        await moveCart({ id: cart.id, zone: target, spot: null, by: operator || null });
        showUndo(`Cart ${cart.cart_number} → ${ZONE_MAP[target].label}`, async () => {
          await moveCart({ id: cart.id, zone: cart.zone, spot: cart.spot || null, by: operator || null });
          setUndo(null);
          load();
        });
        load();
      } catch (err) {
        setToast({ message: err.message || 'Could not move cart', type: 'error' });
        load();
      }
    },
    [operator, showUndo, load],
  );

  const saveCart = useCallback(
    async ({ zone, spot, status }) => {
      if (!activeCart) return;
      setBusy(true);
      try {
        if (zone !== activeCart.zone || (spot || '') !== (activeCart.spot || '')) {
          await moveCart({ id: activeCart.id, zone, spot: spot || null, by: operator || null });
        }
        if (status !== activeCart.status) {
          await setCartStatus({ id: activeCart.id, status, by: operator || null });
        }
        setToast({ message: `Cart ${activeCart.cart_number} updated`, type: 'success' });
        setActiveCart(null);
        load();
      } catch (err) {
        setToast({ message: err.message || 'Could not save changes', type: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [activeCart, operator, load],
  );

  const doAdd = useCallback(
    async ({ cartNumber, zone, spot }) => {
      setBusy(true);
      try {
        await addCart({ cartNumber, zone, spot, by: operator || null });
        setToast({ message: `Cart ${cartNumber} added`, type: 'success' });
        setAddOpen(false);
        load();
      } catch (err) {
        setToast({ message: err.message || 'Could not add cart', type: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [operator, load],
  );

  const doRemove = useCallback(
    async (cart) => {
      setBusy(true);
      try {
        await removeCart({ id: cart.id, by: operator || null });
        setToast({ message: `Cart ${cart.cart_number} removed`, type: 'info' });
        setActiveCart(null);
        load();
      } catch (err) {
        setToast({ message: err.message || 'Could not remove cart', type: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [operator, load],
  );

  const doPrint = useCallback(
    async (cart) => {
      try {
        await queuePrint({ template: 'cart_label', cart, by: operator || null, source: 'cart' });
        setToast({ message: `Sticker queued for Cart ${cart.cart_number}`, type: 'success' });
        loadPrintJobs();
      } catch (err) {
        setToast({ message: err.message || 'Could not queue sticker', type: 'error' });
      }
    },
    [operator, loadPrintJobs],
  );

  const openAddHere = useCallback((zone) => {
    setAddZone(zone);
    setAddOpen(true);
  }, []);

  // Place / move a cart on the floor plan. Optimistic so dragging stays smooth;
  // realtime + the poll interval reconcile with the server.
  const reposition = useCallback(
    async (cart, { x, y, spot }) => {
      setCarts((prev) =>
        prev.map((c) =>
          c.id === cart.id ? { ...c, pos_x: x, pos_y: y, spot: spot ?? c.spot, updated_at: new Date().toISOString() } : c,
        ),
      );
      try {
        await setCartPosition({ id: cart.id, x, y, spot: spot ?? null, by: operator || null });
      } catch (err) {
        setToast({ message: err.message || 'Could not place cart', type: 'error' });
        load();
      }
    },
    [operator, load],
  );

  return (
    <div className="pickups-atelier min-h-screen font-sans text-slate-900 antialiased">
      <div className="pickups-grid-veil" />
      <CartsHeader liveCount={carts.length} />

      <main className="relative z-10 mx-auto max-w-[1240px] px-5 pb-28 pt-28 sm:px-8">
        {/* Hero */}
        <section className="pk-rise pt-6 sm:pt-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 py-1.5 pl-2.5 pr-3.5 shadow-soft">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-orange-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
            </span>
            <span className="text-[11.5px] font-semibold tracky text-slate-900/70">CART TRACKING</span>
          </span>

          <h1 className="mt-7 font-fraunces text-[clamp(2.9rem,7vw,5rem)] font-normal leading-[0.96] tracking-[-0.03em] text-slate-900">
            Cart{' '}
            <span className="relative inline-block">
              Yard
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-orange-600/90" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-500">
            Every cart, inside and out. Tap a cart to move it, or hit&nbsp;
            <span className="font-semibold text-slate-700">⇄</span> to flip it to the other area in one tap.
          </p>

          {/* Totals */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {ZONES.map((z) => (
              <span
                key={z.key}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 shadow-soft"
              >
                <span className={`h-2 w-2 rounded-full ${z.dot}`} />
                <span className="text-[13px] font-semibold text-slate-500">{z.label}</span>
                <span className="font-fraunces text-[17px] font-medium leading-none text-slate-900 tnum">{totals[z.key] || 0}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 shadow-soft">
              <PackageSearch size={14} className="text-slate-400" />
              <span className="text-[13px] font-semibold text-slate-500">Total</span>
              <span className="font-fraunces text-[17px] font-medium leading-none text-slate-900 tnum">{carts.length}</span>
            </span>
            {totals.attention > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-[13px] font-semibold text-amber-700 tnum">{totals.attention} need attention</span>
              </span>
            )}
          </div>
        </section>

        {/* Control bar */}
        <section className="pk-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '.06s' }}>
          {/* Board / Map toggle */}
          <div className="inline-flex shrink-0 items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-soft">
            {[
              { key: 'board', label: 'Board', icon: List },
              { key: 'map', label: 'Map', icon: MapIcon },
            ].map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors ${
                    active ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span layoutId="cart-view" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon size={15} /> {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {view === 'board' ? (
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cart number or spot…"
                className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-4 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 shadow-soft focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="hidden flex-1 sm:block" />
          )}

          <div className="flex items-center gap-2.5">
            {/* Operator chip */}
            <button
              onClick={() => setIdentityOpen(true)}
              className="pk-press inline-flex h-[52px] items-center gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 text-left shadow-soft hover:border-stone-300"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 font-fraunces text-[15px] font-medium text-white">
                {operator ? operator.charAt(0).toUpperCase() : <UserRound size={16} className="text-white/80" />}
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="text-[9.5px] font-semibold tracky text-slate-400">ON CARTS</span>
                <span className="mt-1 max-w-[120px] truncate text-[13.5px] font-bold text-slate-900">{operator || 'Set name'}</span>
              </span>
            </button>

            <button
              onClick={() => setQueueOpen(true)}
              title="Print queue"
              className="pk-press relative inline-flex h-[52px] items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-[13.5px] font-bold text-slate-700 shadow-soft hover:border-stone-300"
            >
              <Printer size={17} />
              <span className="hidden md:inline">Print queue</span>
              {queuedCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-orange-600 px-1 text-[10.5px] font-bold text-white tnum">
                  {queuedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => openAddHere('inside')}
              className="pk-press inline-flex h-[52px] items-center gap-2 rounded-2xl bg-slate-900 px-5 text-[13.5px] font-bold text-white shadow-soft hover:bg-slate-800"
            >
              <Plus size={17} /> <span className="hidden sm:inline">Add cart</span>
            </button>
          </div>
        </section>

        {/* Board / Map */}
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
          </div>
        ) : view === 'board' ? (
          <section className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            {ZONES.map((z, i) => (
              <ZoneColumn
                key={z.key}
                zone={z.key}
                carts={byZone[z.key] || []}
                onOpenCart={setActiveCart}
                onQuickMove={quickMove}
                onAddHere={openAddHere}
                searching={!!q}
                delay={`${0.1 + i * 0.06}s`}
              />
            ))}
          </section>
        ) : (
          <section className="mt-8">
            <FloorPlanView
              carts={carts}
              operatorName={operator}
              onOpenCart={setActiveCart}
              onReposition={reposition}
              onToast={(message, type) => setToast({ message, type })}
            />
          </section>
        )}

        {/* Activity feed */}
        <section className="pk-rise mt-10" style={{ animationDelay: '.24s' }}>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-6">
              <h2 className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">Recent activity</h2>
              <button
                onClick={load}
                title="Refresh"
                className="pk-press grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white text-slate-400 hover:border-stone-300 hover:text-slate-700"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            {events.length === 0 ? (
              <p className="px-6 py-10 text-center text-[13.5px] font-medium text-slate-400">No moves logged yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                        ev.action === 'delete' ? 'border-red-100 bg-red-50 text-red-500' : 'border-stone-200 bg-[#FBFBFA] text-slate-500'
                      }`}
                    >
                      {ev.action === 'print' ? <Printer size={14} /> : <ArrowRightLeft size={14} />}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-700">{describeEvent(ev)}</p>
                    <span className="shrink-0 text-[11.5px] text-slate-400 tnum">{formatTimeAgo(ev.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16">
          <div className="pk-hairline" />
          <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-[13px] text-slate-500">Vista Auction · Cart Tracking</p>
            <div className="flex items-center gap-4">
              <Link to="/labels" className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-700">
                Label Studio →
              </Link>
              <Link to="/pickups" className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-700">
                Pickups portal →
              </Link>
              <p className="text-[12px] text-slate-400">Shared board · updates live</p>
            </div>
          </div>
        </footer>
      </main>

      {/* Sheets & drawers */}
      <MoveSheet
        cart={activeCart}
        open={!!activeCart}
        onClose={() => !busy && setActiveCart(null)}
        operatorName={operator}
        onChooseOperator={() => setIdentityOpen(true)}
        onSave={saveCart}
        onPrint={doPrint}
        onRemove={doRemove}
        busy={busy}
      />
      <AddCartSheet
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        onAdd={(payload) => doAdd({ ...payload, zone: payload.zone || addZone })}
        busy={busy}
        key={addZone + String(addOpen)}
      />
      <PrintQueueDrawer
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        jobs={printJobs}
        loading={queueLoading}
        onRefresh={loadPrintJobs}
        onReprint={async (job) => {
          try {
            await reprintJob(job);
            setToast({ message: 'Sent to the printer again', type: 'success' });
            loadPrintJobs();
          } catch (err) {
            setToast({ message: err.message || 'Could not re-print', type: 'error' });
          }
        }}
        onCancel={async (job) => {
          try {
            await cancelPrintJob(job.id);
            loadPrintJobs();
          } catch (err) {
            setToast({ message: err.message || 'Could not cancel', type: 'error' });
          }
        }}
      />
      <IdentityChooser
        open={identityOpen}
        roster={roster}
        onChoose={(name) => {
          setOperatorPersisted(name);
          setIdentityOpen(false);
        }}
        onClose={() => setIdentityOpen(false)}
      />

      <UndoBar data={undo} onUndo={() => undo?.action?.()} onClose={() => setUndo(null)} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Carts;
