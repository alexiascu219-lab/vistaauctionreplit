import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, List, Keyboard, LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { fetchStaffProfile, isSchemaMissingError, sendMagicLink } from '../lib/missings/missingsApi';
import { refreshOpenList, flushQueue, pendingCount, clearLocal } from '../lib/missings/sync';
import { registerFloorPwa, unregisterFloorChrome } from '../lib/missings/pwa';

import StatusStrip from '../components/missings/StatusStrip';
import ScanView from '../components/missings/ScanView';
import ListView from '../components/missings/ListView';
import LookupView from '../components/missings/LookupView';
import Verdict from '../components/missings/Verdict';

/**
 * Missing-items floor app.
 *
 * Staff open this on a phone, scan an item, and immediately learn whether it is
 * wanted. The workflow is inverted on purpose: rather than sending someone to
 * hunt one item, every scan of anything becomes a check against the list.
 *
 * Routed at /missings, /missings/list, /missings/lookup. App.jsx suppresses the
 * global navbar and AI assistant here, the same way it does for the other
 * self-contained floor tools.
 */
export default function Missings({ view = 'scan' }) {
  const { session, user } = useAuth();
  const userId = session?.user?.id ?? user?.id ?? null;

  // Installability and offline support are registered here rather than at app
  // boot, so a careers-site visitor never picks up a service worker scoped to a
  // warehouse tool they will never open.
  useEffect(() => {
    registerFloorPwa();
    return unregisterFloorChrome;
  }, []);

  // Written only from async callbacks; `resolvedFor` is what lets us derive
  // "still checking" rather than setting a flag synchronously in an effect.
  const [access, setAccess] = useState({ resolvedFor: undefined, staff: null, schemaMissing: false });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    fetchStaffProfile(userId).then(({ staff, error }) => {
      if (cancelled) return;
      if (error) console.error('[missings] staff lookup failed:', error.message);
      setAccess({ resolvedFor: userId, staff, schemaMissing: isSchemaMissingError(error) });
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

  return <FloorApp staff={access.staff} view={view} />;
}

/* -------------------------------------------------------------------------- */
/* The app proper                                                             */
/* -------------------------------------------------------------------------- */

function FloorApp({ staff, view }) {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [sync, setSync] = useState({ syncing: true, stale: false, lastSync: null, error: null });
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pending, setPending] = useState(0);
  const [verdict, setVerdict] = useState(null);
  const [toast, setToast] = useState(null);

  const refreshPending = useCallback(() => {
    pendingCount().then(setPending).catch(() => {});
  }, []);

  const doSync = useCallback(async () => {
    setSync((s) => ({ ...s, syncing: true }));
    try {
      // Drain first: a queued "found" should leave the list before we re-read
      // it, otherwise the item reappears for a moment and looks like a bug.
      await flushQueue();
      const { items: rows, stale, lastSync } = await refreshOpenList();
      setItems(rows);
      setSync({ syncing: false, stale: Boolean(stale), lastSync: lastSync ?? Date.now(), error: null });
    } catch (err) {
      setSync((s) => ({ ...s, syncing: false, error: err }));
    } finally {
      refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    doSync();
  }, [doSync]);

  // Flush the moment the connection returns — that is the whole promise of the
  // queue, and waiting for the next manual action would break it.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      doSync();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [doSync]);

  const signOut = useCallback(async () => {
    // Clear the local mirror: these phones are shared, and one person's open
    // list should not survive into the next person's shift.
    await clearLocal();
    await supabase.auth.signOut();
    navigate('/missings', { replace: true });
  }, [navigate]);

  const onResolved = useCallback(
    ({ found, queued }) => {
      setToast(
        queued
          ? 'Saved on this phone — will send when you’re back online'
          : found
            ? 'Marked as found'
            : 'Marked not found',
      );
      refreshPending();
      // Drop it locally straight away; the authoritative list follows.
      doSync();
    },
    [doSync, refreshPending],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="fl-scope min-h-screen pb-fl-nav">
      <Header staff={staff} onSignOut={signOut} />

      <main className="mx-auto max-w-md px-4 py-4">
        <StatusStrip
          online={online}
          pending={pending}
          lastSync={sync.lastSync}
          stale={sync.stale}
          syncing={sync.syncing}
          onSync={doSync}
        />

        {view === 'scan' && <ScanView paused={Boolean(verdict)} onResult={setVerdict} />}
        {view === 'lookup' && <LookupView onResult={setVerdict} />}
        {view === 'list' && (
          <ListView
            items={items}
            onSelect={(item) => setVerdict({ kind: 'wanted', valpn: item.valpn, item })}
          />
        )}
      </main>

      <BottomNav view={view} />

      {verdict && (
        <Verdict result={verdict} onDismiss={() => setVerdict(null)} onResolved={onResolved} />
      )}

      {toast && (
        <div
          role="status"
          className="animate-fl-rise fixed inset-x-4 z-[60] mx-auto max-w-md rounded-xl border border-floor-hairline bg-floor-raised px-4 py-3 text-center font-fl-ui text-sm font-bold text-slate-100"
          style={{ bottom: 'calc(var(--fl-nav-offset, 5.5rem) + env(safe-area-inset-bottom))' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({ staff, onSignOut }) {
  return (
    <header className="sticky top-0 z-30 border-b border-floor-hairline bg-floor-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-fl-display text-sm font-medium uppercase tracking-[0.22em] text-floor-brand">
            {staff.facility} · Missing Items
          </p>
          <p className="truncate font-fl-ui text-sm text-slate-500">{staff.display_name}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-floor-hairline text-slate-500"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

/**
 * Bottom, not top: used one-handed while the other hand holds an item. Three
 * destinations, because on a floor every extra choice is a mis-tap. Scan sits in
 * the middle and reads as the primary because that is where staff are ~90% of
 * the time.
 */
const TABS = [
  { to: '/missings/list', label: 'List', icon: List, match: 'list' },
  { to: '/missings', label: 'Scan', icon: ScanLine, match: 'scan' },
  { to: '/missings/lookup', label: 'Type', icon: Keyboard, match: 'lookup' },
];

function BottomNav({ view }) {
  return (
    <nav
      aria-label="Missing items"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-floor-hairline bg-floor-panel/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = view === tab.match;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-fl-nav flex-col items-center justify-center gap-1 font-fl-ui text-[0.75rem] font-bold uppercase tracking-[0.14em] transition-colors ${
                  active ? 'text-floor-brand' : 'text-slate-600'
                }`}
              >
                {/* Active marker is a top rule as well as colour — never colour alone. */}
                <span
                  className={`absolute inset-x-5 top-0 h-[3px] rounded-b ${active ? 'bg-floor-brand' : 'bg-transparent'}`}
                />
                <tab.icon className="h-6 w-6" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Unauthenticated / unauthorized                                             */
/* -------------------------------------------------------------------------- */

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const submittedRef = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submittedRef.current) return;

    if (!email.includes('@')) {
      setStatus('error');
      setMessage('Enter your work email address.');
      return;
    }

    submittedRef.current = true;
    setStatus('sending');

    const { error } = await sendMagicLink(email);
    submittedRef.current = false;

    if (error) {
      console.error('[missings] magic link failed:', error.message);
      setStatus('error');
      setMessage('Could not send the link. Check the address and try again.');
      return;
    }
    setStatus('sent');
  };

  return (
    <Centered>
      <header className="mb-9">
        <p className="font-fl-display text-xs font-medium uppercase tracking-[0.3em] text-floor-brand">
          Vista Auctions · Sardis
        </p>
        <h1 className="mt-3 font-fl-display text-6xl font-semibold uppercase leading-[0.92] tracking-[0.01em] text-slate-50">
          Missing
          <br />
          Items
        </h1>
        <div className="mt-5 h-px w-full bg-floor-hairline" />
        <p className="mt-5 font-fl-ui text-base leading-relaxed text-slate-400">
          Scan anything on the floor. Find out in one second whether it&rsquo;s wanted.
        </p>
      </header>

      {status === 'sent' ? (
        <div className="fl-card border-floor-clear/40 bg-floor-clearDeep p-5 text-center" role="status">
          <p className="font-fl-display text-2xl uppercase tracking-wide text-floor-clear">
            Check your email
          </p>
          <p className="mt-3 break-all font-fl-ui text-base leading-relaxed text-slate-200">
            Sign-in link sent to <span className="fl-num">{email}</span>
          </p>
          <p className="mt-3 font-fl-ui text-sm text-slate-500">Open it on this phone.</p>
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
              className="fl-input mt-2 !font-fl-ui !text-lg !tracking-normal"
            />
          </div>

          {status === 'error' && (
            <p role="alert" className="rounded-xl border border-floor-danger/50 bg-floor-dangerDeep px-4 py-3 font-fl-ui text-sm font-bold text-red-300">
              {message}
            </p>
          )}

          <button type="submit" className="fl-btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>

          <p className="pt-1 text-center font-fl-ui text-sm text-slate-500">
            No password. We email you a link that signs you in.
          </p>
        </form>
      )}
    </Centered>
  );
}

/**
 * Signed in, but with no active floor.staff row.
 *
 * This screen existing is the visible half of the allowlist decision: anyone can
 * obtain an account by receiving email, so having a session is not the same as
 * being authorized.
 */
function NoAccess() {
  return (
    <Centered>
      <div className="fl-card border-floor-wanted/40 bg-floor-wantedDeep p-5">
        <h1 className="font-fl-display text-3xl uppercase tracking-wide text-floor-wanted">
          Not set up yet
        </h1>
        <p className="mt-3 font-fl-ui text-base leading-relaxed text-slate-200">
          You&rsquo;re signed in, but this account isn&rsquo;t on the floor-app roster yet.
        </p>
        <p className="mt-3 font-fl-ui text-base leading-relaxed text-slate-400">
          Ask whoever runs the missing-items process to add you, then reload.
        </p>
      </div>
      <button type="button" onClick={() => supabase.auth.signOut()} className="fl-btn-ghost mt-5">
        Sign out
      </button>
    </Centered>
  );
}

/** A configuration problem, not a permission one — so it says so, and names the fix. */
function SchemaNotExposed() {
  return (
    <Centered>
      <div className="fl-card border-floor-danger/50 bg-floor-dangerDeep p-5">
        <h1 className="font-fl-display text-3xl uppercase tracking-wide text-red-300">
          Not configured
        </h1>
        <p className="mt-3 font-fl-ui text-base leading-relaxed text-slate-200">
          The <code className="fl-num">floor</code> schema isn&rsquo;t exposed to the Supabase
          API, so none of the missing-items tables are reachable.
        </p>
        <p className="mt-3 font-fl-ui text-base leading-relaxed text-slate-400">
          Supabase → Settings → API → Exposed schemas → add <code className="fl-num">floor</code>.
        </p>
      </div>
    </Centered>
  );
}

function Splash({ message }) {
  return (
    <Centered>
      <p className="text-center font-fl-ui text-base uppercase tracking-[0.2em] text-slate-600">
        {message}
      </p>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="fl-scope flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}
