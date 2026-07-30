import React, { useEffect, useState } from 'react';
import { Check, AlertTriangle, HelpCircle, MapPin, CameraOff, Camera, X, Loader2 } from 'lucide-react';

import { formatValpnForDisplay } from '../../lib/missings/valpn';
import { lookupVista, vistaErrorMessage } from '../../lib/missings/vistaApi';
import { resolveItem } from '../../lib/missings/sync';

/**
 * The scan verdict — the entire product in one screen.
 *
 * Two outcomes that must be distinguishable in a quarter of a second, across an
 * aisle, in bad light, by someone who is already walking:
 *
 *   CLEAR  — full green field. Nothing to read. Move on.
 *   WANTED — full amber field, then everything known about the item.
 *
 * They differ in colour, in word, in icon, and in how long they persist, so
 * colour-blindness or a glance at the wrong moment cannot confuse them.
 */

/** Haptics carry the verdict before the eyes do — you feel it while lifting the phone. */
function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported; the visual verdict stands on its own.
  }
}

export default function Verdict({ result, onDismiss, onResolved }) {
  useEffect(() => {
    if (result.kind === 'clear') buzz(35);
    else if (result.kind === 'wanted') buzz([0, 55, 70, 55, 70, 130]);
    else buzz([0, 25, 60, 25]);
  }, [result]);

  if (result.kind === 'clear') return <ClearVerdict result={result} onDismiss={onDismiss} />;
  if (result.kind === 'unreadable') return <UnreadableVerdict result={result} onDismiss={onDismiss} />;
  return <WantedVerdict result={result} onDismiss={onDismiss} onResolved={onResolved} />;
}

/* -------------------------------------------------------------------------- */
/* Clear                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Clear is the overwhelmingly common case, so it costs the least: it announces
 * itself, then gets out of the way on its own. Requiring a tap to dismiss the
 * 95% case would make the whole workflow slower than not using the app.
 */
function ClearVerdict({ result, onDismiss }) {
  const [remaining, setRemaining] = useState(100);

  useEffect(() => {
    const started = Date.now();
    const DURATION = 1800;
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - started) / DURATION) * 100);
      setRemaining(pct);
      if (pct <= 0) onDismiss();
    }, 40);
    return () => clearInterval(id);
  }, [onDismiss]);

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="animate-fl-verdict fixed inset-0 z-50 flex w-full flex-col items-center justify-center bg-floor-clear px-6 text-floor-ink"
    >
      <Check className="h-28 w-28 stroke-[3]" aria-hidden="true" />
      <p className="mt-3 font-fl-display text-7xl font-semibold uppercase tracking-[0.04em]">Clear</p>
      <p className="mt-4 fl-num text-lg font-medium opacity-70">
        {formatValpnForDisplay(result.valpn)}
      </p>
      <p className="mt-10 font-fl-ui text-base font-bold uppercase tracking-[0.2em] opacity-60">
        Not on the list
      </p>

      {/* Countdown doubles as a "tap to skip" affordance without needing words. */}
      <div className="absolute bottom-0 left-0 h-1.5 bg-floor-ink/30" style={{ width: `${remaining}%` }} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Unreadable                                                                 */
/* -------------------------------------------------------------------------- */

function UnreadableVerdict({ result, onDismiss }) {
  return (
    <div className="animate-fl-verdict fixed inset-0 z-50 flex flex-col items-center justify-center bg-floor-raised px-8 text-center">
      <HelpCircle className="h-20 w-20 stroke-[2] text-slate-400" aria-hidden="true" />
      <p className="mt-4 font-fl-display text-4xl font-medium uppercase tracking-[0.04em] text-slate-100">
        Couldn&rsquo;t read that
      </p>
      {result.raw ? (
        <p className="mt-4 max-w-xs break-all fl-num text-sm text-slate-500">
          Got: {result.raw.slice(0, 60)}
        </p>
      ) : null}
      <p className="mt-3 max-w-xs font-fl-ui text-base leading-relaxed text-slate-400">
        The label may be damaged. Try again, or type the number by hand.
      </p>
      {/* Logged as a miss regardless — a run of these is how a bad lens or a
          batch of damaged labels becomes visible. */}
      <button type="button" onClick={onDismiss} className="fl-btn-ghost mt-8 max-w-xs">
        Try again
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Wanted                                                                     */
/* -------------------------------------------------------------------------- */

function WantedVerdict({ result, onDismiss, onResolved }) {
  const { item, valpn } = result;
  const [sheet, setSheet] = useState(null); // null | 'found' | 'not_found'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-floor-ink">
      {/* Banner. Full-bleed amber so it is unmistakable even face-down on a cart. */}
      <div className="animate-fl-verdict sticky top-0 z-10 bg-floor-wanted px-5 pb-5 pt-6 text-floor-ink">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-9 w-9 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <p className="font-fl-display text-5xl font-semibold uppercase leading-none tracking-[0.03em]">
                Wanted
              </p>
            </div>
            <p className="mt-2.5 fl-num text-lg font-medium opacity-80">
              {formatValpnForDisplay(valpn)}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg hover:bg-floor-ink/10"
          >
            <X className="h-7 w-7 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="animate-fl-rise space-y-3 px-4 pb-40 pt-4">
        <LocationBlock item={item} />
        <ItemFacts item={item} />
        <VistaFacts item={item} />
      </div>

      {/* Actions pinned to the thumb, above the home indicator. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-floor-hairline bg-floor-panel/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-md gap-3">
          <button type="button" onClick={() => setSheet('not_found')} className="fl-btn-ghost flex-1">
            Not found
          </button>
          <button type="button" onClick={() => setSheet('found')} className="fl-btn-clear flex-1">
            <Check className="h-6 w-6 stroke-[3]" aria-hidden="true" />
            I have it
          </button>
        </div>
      </div>

      {sheet && (
        <ResolveSheet
          valpn={valpn}
          found={sheet === 'found'}
          onCancel={() => setSheet(null)}
          onDone={(outcome) => {
            setSheet(null);
            onResolved?.(outcome);
            onDismiss();
          }}
        />
      )}
    </div>
  );
}

/**
 * Where it was last seen, at the largest size on the screen.
 *
 * This is the single most actionable fact — it is where the person physically
 * walks — so it outranks price, order and everything else in the hierarchy.
 */
function LocationBlock({ item }) {
  const blind = item.blind_spot;

  return (
    <div className="fl-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex-1 p-5">
          <p className="fl-label">Last seen</p>
          {item.location_last_seen ? (
            <p className="mt-1 fl-num text-5xl font-medium leading-none text-slate-50">
              {item.location_last_seen}
            </p>
          ) : (
            <p className="mt-1 font-fl-display text-3xl uppercase text-slate-600">No location</p>
          )}
          {item.location_label && (
            <p className="mt-2 font-fl-ui text-sm text-slate-400">{item.location_label}</p>
          )}
        </div>

        <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-floor-hairline bg-floor-raised px-2 text-center">
          {blind ? (
            <>
              <CameraOff className="h-7 w-7 text-floor-wanted" aria-hidden="true" />
              <span className="font-fl-ui text-[0.6875rem] font-bold uppercase leading-tight tracking-wider text-floor-wanted">
                Blind spot
              </span>
            </>
          ) : (
            <>
              <Camera className="h-7 w-7 text-slate-400" aria-hidden="true" />
              <span className="font-fl-ui text-[0.6875rem] font-bold uppercase leading-tight tracking-wider text-slate-400">
                {item.media_count > 0 ? `${item.media_count} still${item.media_count === 1 ? '' : 's'}` : 'No stills'}
              </span>
            </>
          )}
        </div>
      </div>

      {blind && (
        <p className="border-t border-floor-hairline bg-floor-wantedDeep px-5 py-2.5 font-fl-ui text-sm leading-snug text-floor-wanted">
          No camera covers this aisle — there will never be footage of this one.
        </p>
      )}
    </div>
  );
}

/** The facts already in our database — instant, no network. */
function ItemFacts({ item }) {
  return (
    <div className="fl-card grid grid-cols-2 divide-x divide-floor-hairline">
      <Cell label="Price" value={formatPrice(item.sold_price)} />
      <Cell label="Marked" value={relativeTime(item.marked_at)} />
      <Cell label="Stacked by" value={item.stacked_by} className="border-t border-floor-hairline" />
      <Cell
        label={item.order_kind === 'prep' ? 'Prep order' : 'Delivery'}
        value={item.order_number}
        className="border-t border-floor-hairline"
      />
    </div>
  );
}

function Cell({ label, value, className = '' }) {
  return (
    <div className={`p-4 ${className}`}>
      <p className="fl-label">{label}</p>
      <p className="fl-value">{value || <span className="text-slate-600">&mdash;</span>}</p>
    </div>
  );
}

/**
 * Live enrichment from Vista, loaded after the verdict is already on screen.
 *
 * Deliberately non-blocking and deliberately optional: the verdict and the
 * location are what someone acts on, and those come from the local cache. If
 * Vista is slow, down, or not configured, this section says so quietly and
 * everything else still works.
 */
function VistaFacts({ item }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    lookupVista({
      valpn: item.valpn,
      orderNumber: item.order_number,
      orderKind: item.order_kind,
      signal: controller.signal,
    })
      .then((facts) => alive && setState({ status: 'ready', facts }))
      .catch((err) => {
        if (!alive || err.name === 'AbortError') return;
        setState({ status: 'error', message: vistaErrorMessage(err.code) });
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [item.valpn, item.order_number, item.order_kind]);

  if (state.status === 'loading') {
    return (
      <div className="fl-card flex items-center gap-3 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />
        <p className="font-fl-ui text-sm text-slate-500">Checking Vista…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="fl-card p-4">
        <p className="fl-label">Vista</p>
        <p className="mt-1 font-fl-ui text-sm leading-relaxed text-slate-400">{state.message}</p>
      </div>
    );
  }

  const { facts } = state;
  if (!facts?.found) {
    return (
      <div className="fl-card p-4">
        <p className="fl-label">Vista</p>
        <p className="mt-1 font-fl-ui text-sm text-slate-400">No matching product in Vista.</p>
      </div>
    );
  }

  return (
    <div className="fl-card">
      <div className="border-b border-floor-hairline px-4 py-3">
        <p className="fl-label">From Vista</p>
        {facts.product.title && (
          <p className="mt-1 font-fl-ui text-base leading-snug text-slate-100">{facts.product.title}</p>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-floor-hairline">
        {/* "In Vista" rather than "Vista location": the longer label wrapped to
            two lines and made the two cells different heights. */}
        <Cell label="In Vista" value={facts.product.location} />
        <Cell label="Condition" value={facts.product.condition} />
      </div>

      {facts.product.everResold && (
        <p className="border-t border-floor-hairline bg-floor-raised px-4 py-2.5 font-fl-ui text-sm font-bold uppercase tracking-wider text-floor-brand">
          Resold before — check the returns lane
        </p>
      )}

      {facts.history?.length > 0 && (
        <div className="border-t border-floor-hairline px-4 py-3">
          <p className="fl-label mb-2">Recent history</p>
          <ul className="space-y-1.5">
            {facts.history.slice(0, 4).map((h, i) => (
              <li key={i} className="flex items-baseline gap-2 font-fl-ui text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-slate-600" aria-hidden="true" />
                <span className="text-slate-300">{h.action || 'Moved'}</span>
                {h.location && <span className="fl-num text-slate-500">{h.location}</span>}
                <span className="ml-auto shrink-0 fl-num text-xs text-slate-600">{shortDate(h.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resolve sheet                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Found / not-found, with an optional note.
 *
 * Confirmation exists because this write is what removes an item from everyone
 * else's list — an accidental "not found" sends the next person on a pointless
 * trip. The note is optional and never blocks the action.
 */
function ResolveSheet({ valpn, found, onCancel, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { queued } = await resolveItem({ valpn, found, note: note.trim() || null });
      buzz(found ? [0, 40, 60, 40] : 30);
      onDone({ valpn, found, queued });
    } catch (err) {
      setBusy(false);
      setError(
        err?.code === 'P0002'
          ? 'That item is no longer on the open list — someone else may have just resolved it.'
          : 'Could not save. It will be retried automatically.',
      );
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-floor-ink/80 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Cancel" onClick={onCancel} />

      <div
        className="animate-fl-rise rounded-t-2xl border-t border-floor-hairline bg-floor-panel px-4 pt-5"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-md">
          <p className="font-fl-display text-3xl font-medium uppercase tracking-[0.03em] text-slate-50">
            {found ? 'Mark as found' : 'Mark not found'}
          </p>
          <p className="mt-1.5 fl-num text-sm text-slate-500">{formatValpnForDisplay(valpn)}</p>

          <label htmlFor="fl-note" className="fl-label mt-5 block">
            Note (optional)
          </label>
          <textarea
            id="fl-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={found ? 'e.g. behind the gaylord in C2' : 'e.g. searched A10 and A11, not there'}
            className="mt-2 w-full resize-none rounded-xl border border-floor-hairline bg-floor-raised px-4 py-3 font-fl-ui text-base text-slate-100 placeholder:text-slate-600 focus:border-floor-brand focus:outline-none"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-floor-dangerDeep px-3 py-2 font-fl-ui text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onCancel} disabled={busy} className="fl-btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className={`${found ? 'fl-btn-clear' : 'fl-btn-primary'} flex-1`}
            >
              {busy ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function formatPrice(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
