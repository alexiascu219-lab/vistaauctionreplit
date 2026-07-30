import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, List, Grid3x3, LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  fetchOpenMissings,
  fetchStaffProfile,
  isSchemaMissingError,
  sendMagicLink,
} from '../lib/missings/missingsApi';
import { formatValpnForDisplay } from '../lib/missings/valpn';

/**
 * Missing-items floor app.
 *
 * Staff open this on a phone, scan an item, and immediately learn whether it is
 * wanted. The workflow is inverted on purpose: rather than sending someone to
 * hunt one item, every scan of anything becomes a check against the list.
 *
 * Build order: 1 schema/RLS and 2 auth+shell are done. 3 manual lookup (and the
 * server-side Vista proxy behind it), 4 camera scanning, 5 offline cache and
 * write queue, 6 found/not-found writeback are not.
 *
 * Routed at /missings, /missings/list, /missings/lookup — see App.jsx, which
 * also suppresses the global navbar and AI assistant here, the same way the
 * pickups / carts / labels / station pages do.
 */
export default function Missings({ view = 'scan' }) {
  const { session, user } = useAuth();

  const userId = session?.user?.id ?? user?.id ?? null;

  // One piece of state, written only from the async callback. `resolvedFor`
  // records which user the result belongs to, which is what lets us derive
  // "still checking" below instead of setting a flag synchronously in the
  // effect — doing that cascades renders and trips react-hooks lint.
  const [access, setAccess] = useState({ resolvedFor: undefined, staff: null, schemaMissing: false });

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    fetchStaffProfile(userId).then(({ staff: row, error }) => {
      if (cancelled) return;
      if (error) console.error('[missings] staff lookup failed:', error.message);
      setAccess({
        resolvedFor: userId,
        staff: row,
        schemaMissing: isSchemaMissingError(error),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const checking = Boolean(userId) && access.resolvedFor !== userId;

  if (!session) return <LoginScreen />;
  if (checking) return <Splash message="Checking your access…" />;
  if (access.schemaMissing) return <SchemaNotExposed />;
  if (!access.staff) return <NoAccess />;

  const staff = access.staff;

  return (
    <Shell staff={staff} view={view}>
      {view === 'list' ? <OpenList /> : null}
      {view === 'scan' ? <ScanPlaceholder /> : null}
      {view === 'lookup' ? <LookupPlaceholder /> : null}
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

const TABS = [
  { to: '/missings/list', label: 'List', icon: List, match: 'list' },
  { to: '/missings', label: 'Scan', icon: ScanLine, match: 'scan' },
  { to: '/missings/lookup', label: 'Type', icon: Grid3x3, match: 'lookup' },
];

function Shell({ staff, view, children }) {
  const navigate = useNavigate();

  // Signing out here signs out of the whole site — it is one Supabase identity,
  // shared with the HR portal. Authorization stays separate: HR access needs a
  // vista_employees row, floor access needs floor.staff.
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/missings', { replace: true });
  }, [navigate]);

  return (
    <div className="fl-scope min-h-screen bg-floor-ink pb-fl-nav text-slate-100">
      <header className="sticky top-0 z-30 border-b border-floor-hairline bg-floor-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-[0.14em] text-floor-brand">
              {staff.facility} · missing items
            </p>
            <p className="truncate text-base font-semibold text-slate-300">
              {staff.display_name}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-floor-hairline px-3 text-sm font-bold text-slate-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">{children}</main>

      {/* Bottom, not top: this is used one-handed while the other hand holds an
          item. Three destinations, because on a floor every extra choice is a
          mis-tap. */}
      <nav
        aria-label="Missing items"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-floor-hairline bg-floor-panel/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const active = view === tab.match;
            const { to, label } = tab;
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-fl-nav flex-col items-center justify-center gap-1 text-[0.8125rem] font-bold transition-colors ${
                    active ? 'text-floor-brand' : 'text-slate-400'
                  }`}
                >
                  <tab.icon className="h-7 w-7" aria-hidden="true" />
                  {label}
                  {/* Active state is colour plus a bar, never colour alone. */}
                  <span
                    className={`h-0.5 w-8 rounded-full ${active ? 'bg-floor-brand' : 'bg-transparent'}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Open list — the one real view, and the end-to-end proof that schema,        */
/* RLS, the exposed schema and the session all line up                        */
/* -------------------------------------------------------------------------- */

function OpenList() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchOpenMissings()
      .then((rows) => !cancelled && setItems(rows))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="fl-card border-floor-danger/50 bg-floor-dangerDeep">
        <h1 className="text-xl font-extrabold text-red-200">Could not load the list</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          {isSchemaMissingError(error)
            ? 'The floor schema is not exposed to the API yet. Add it under Settings → API → Exposed schemas in Supabase.'
            : 'The open list is unavailable right now. Try again in a moment.'}
        </p>
      </div>
    );
  }

  if (items === null) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-50">Open list</h1>
        <p className="text-base font-bold text-slate-400">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="fl-card text-center">
          <p className="text-xl font-bold text-floor-clear">Nothing open</p>
          <p className="mt-2 text-base text-slate-400">
            No items are currently marked missing.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="fl-card">
              <p className="text-3xl font-bold tracking-wide text-slate-50">
                {formatValpnForDisplay(item.valpn)}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Last seen" value={item.location_last_seen} />
                <Field label="Price" value={formatPrice(item.sold_price)} />
                <Field label="Stacked by" value={item.stacked_by} />
                <Field label="Marked" value={relativeTime(item.marked_at)} />
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.order_kind && (
                  <Tag>
                    {item.order_kind === 'prep' ? 'Prep / gaylord' : 'Delivery'}
                    {item.order_number ? ` · ${item.order_number}` : ''}
                  </Tag>
                )}
                {item.ever_resold && <Tag>Resold before</Tag>}
                {item.blind_spot ? (
                  <Tag tone="warn">No camera — blind spot</Tag>
                ) : (
                  item.media_count > 0 && (
                    <Tag tone="ok">
                      {item.media_count} {item.media_count === 1 ? 'still' : 'stills'}
                    </Tag>
                  )
                )}
                {item.facts_at === null && <Tag tone="warn">Not enriched</Tag>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="fl-label">{label}</dt>
      <dd className="fl-value">{value || <span className="text-slate-500">—</span>}</dd>
    </div>
  );
}

function Tag({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-floor-hairline bg-floor-raised text-slate-300',
    ok: 'border-floor-clear/40 bg-floor-clearDeep text-floor-clear',
    warn: 'border-floor-wanted/40 bg-floor-wantedDeep text-floor-wanted',
  };
  return (
    <span className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Placeholders for steps 3 and 4                                             */
/* -------------------------------------------------------------------------- */

function ScanPlaceholder() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-50">Scan</h1>
      {/* A scanner that half works is worse than one that is visibly absent,
          because someone will trust it. */}
      <div className="fl-card border-dashed">
        <p className="text-xl font-bold text-slate-300">Camera scanning not built yet</p>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          Build step 4. It will use the native BarcodeDetector where available, with
          zxing-js as the fallback for Safari, resolving against a local cache so a
          scan answers with no network.
        </p>
      </div>
      <Link to="/missings/lookup" className="fl-btn-primary">
        Type a VALPN instead
      </Link>
    </div>
  );
}

function LookupPlaceholder() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-50">Type a VALPN</h1>
      <div className="fl-card border-dashed">
        <p className="text-xl font-bold text-slate-300">Manual lookup not built yet</p>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          Build step 3 — the one that wires up the Vista proxy. Vista credentials stay
          server-side in an <code className="text-slate-300">/api</code> function; the
          browser never talks to Vista directly.
        </p>
      </div>
      <Link to="/missings/list" className="fl-btn-secondary">
        View the open list
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Unauthenticated / unauthorized states                                      */
/* -------------------------------------------------------------------------- */

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setStatus('error');
      setMessage('Enter your work email address.');
      return;
    }

    setStatus('sending');
    const { error } = await sendMagicLink(email);

    if (error) {
      // Log the real reason; show something useful without confirming whether
      // the address exists.
      console.error('[missings] magic link failed:', error.message);
      setStatus('error');
      setMessage('Could not send the link. Check the address and try again.');
      return;
    }

    setStatus('sent');
  };

  return (
    <div className="fl-scope flex min-h-screen flex-col justify-center bg-floor-ink px-6 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-floor-brand">
            Vista Auctions · Sardis
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-50">
            Missing Items
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Scan anything on the floor. Find out in one second whether it&rsquo;s wanted.
          </p>
        </header>

        {status === 'sent' ? (
          <div className="fl-card border-floor-clear/40 bg-floor-clearDeep text-center" role="status">
            <p className="text-xl font-bold text-floor-clear">Check your email</p>
            <p className="mt-3 break-all text-base leading-relaxed text-slate-200">
              We sent a sign-in link to <span className="font-semibold">{email}</span>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Open it on this phone.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="fl-email" className="fl-label">
                Work email
              </label>
              <input
                id="fl-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="fl-input mt-2 !text-xl !tracking-normal"
              />
            </div>

            {status === 'error' && (
              <p
                role="alert"
                className="rounded-2xl border-2 border-floor-danger/50 bg-floor-dangerDeep px-4 py-3 text-base font-semibold text-red-200"
              >
                {message}
              </p>
            )}

            <button type="submit" className="fl-btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>

            <p className="pt-2 text-center text-sm leading-relaxed text-slate-400">
              No password. We email you a link that signs you in.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Signed in, but with no active floor.staff row.
 *
 * This screen existing at all is the visible half of the allowlist decision:
 * anyone can obtain a Supabase account by receiving email, so having a session is
 * not the same as being authorized.
 */
function NoAccess() {
  return (
    <Centered>
      <div className="fl-card border-floor-wanted/40 bg-floor-wantedDeep">
        <h1 className="text-xl font-extrabold text-floor-wanted">Not set up yet</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          You&rsquo;re signed in, but this account isn&rsquo;t on the floor-app roster yet.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-300">
          Ask whoever runs the missing-items process to add you, then reload this page.
        </p>
      </div>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="fl-btn-secondary mt-6"
      >
        Sign out
      </button>
    </Centered>
  );
}

/** Distinct from NoAccess: this one is a configuration problem, not a permission one. */
function SchemaNotExposed() {
  return (
    <Centered>
      <div className="fl-card border-floor-danger/50 bg-floor-dangerDeep">
        <h1 className="text-xl font-extrabold text-red-200">Not configured yet</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          The <code>floor</code> schema isn&rsquo;t exposed to the Supabase API, so none of
          the missing-items tables are reachable.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-300">
          Supabase → Settings → API → Exposed schemas → add <code>floor</code>.
        </p>
      </div>
    </Centered>
  );
}

function Splash({ message }) {
  return (
    <Centered>
      <p className="text-center text-base text-slate-400">{message}</p>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="fl-scope flex min-h-screen flex-col justify-center bg-floor-ink px-6 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** numeric(12,2) arrives from PostgREST as a string, so parse rather than assume. */
function formatPrice(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * "3h ago" reads faster at arm's length than a timestamp, and how long something
 * has been missing is what actually matters on the floor.
 */
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
