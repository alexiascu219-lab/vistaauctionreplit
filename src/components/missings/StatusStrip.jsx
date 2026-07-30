import React from 'react';
import { CloudOff, RefreshCw, Check } from 'lucide-react';

/**
 * Connection and sync state, always visible.
 *
 * On a floor where the Wi-Fi genuinely drops, the worst possible design is one
 * that hides it — someone marks ten items found, walks away, and never learns
 * the writes did not land. So the strip is honest and permanent: it states
 * whether we are online, how fresh the cached list is, and exactly how many
 * writes are still waiting.
 *
 * It only occupies a full row when there is something to say. When everything is
 * fine it collapses to a thin line of small text.
 */
export default function StatusStrip({ online, pending, lastSync, stale, syncing, onSync }) {
  const offline = !online;
  const hasPending = pending > 0;
  const notable = offline || hasPending || stale;

  if (!notable) {
    return (
      <div className="flex items-center justify-between px-1 pb-2 pt-1">
        <span className="flex items-center gap-1.5 font-fl-ui text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-neutral-600">
          <Check className="h-3.5 w-3.5 text-floor-clear" aria-hidden="true" />
          Synced {agoLabel(lastSync)}
        </span>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex min-h-8 items-center gap-1.5 rounded px-2 font-fl-ui text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-neutral-500"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`mb-3 flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
        offline
          ? 'border-floor-wanted/40 bg-floor-wantedDeep'
          : 'border-floor-hairline bg-floor-panel'
      }`}
    >
      {offline ? (
        <CloudOff className="h-5 w-5 shrink-0 text-floor-wanted" aria-hidden="true" />
      ) : (
        <RefreshCw
          className={`h-5 w-5 shrink-0 text-neutral-400 ${syncing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className={`font-fl-ui text-[0.8125rem] font-semibold uppercase tracking-[0.14em] ${offline ? 'text-floor-wanted' : 'text-neutral-200'}`}>
          {offline ? 'Offline — scanning still works' : stale ? 'Showing saved list' : 'Syncing'}
        </p>
        <p className="mt-0.5 font-fl-ui text-xs leading-snug text-neutral-400">
          {hasPending
            ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to send`
            : `List saved ${agoLabel(lastSync)}`}
        </p>
      </div>

      {!offline && (
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="shrink-0 rounded-lg border border-floor-hairline px-3 py-2 font-fl-ui text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-neutral-300"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function agoLabel(ts) {
  if (!ts) return 'never';
  const minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
