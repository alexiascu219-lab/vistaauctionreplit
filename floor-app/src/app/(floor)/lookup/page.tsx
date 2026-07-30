import Link from 'next/link';

/**
 * Manual VALPN entry — build step 3, not built yet.
 *
 * This is the step that proves the Vista proxy: lookup goes to our own route
 * handler, which holds the Vista JWT server-side, and never browser-to-Vista.
 */
export default function LookupPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-50">Type a VALPN</h1>

      <div className="card border-dashed">
        <p className="text-field font-bold text-slate-300">Manual lookup not built yet</p>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          This is build step 3 — the one that wires up the server-side Vista proxy.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          The open list already reads live from the database, so you can confirm sign-in
          and permissions are working there.
        </p>
      </div>

      <Link href="/list" className="btn-secondary">
        View the open list
      </Link>
    </div>
  );
}
