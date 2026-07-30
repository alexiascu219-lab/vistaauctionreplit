import React, { useMemo, useState } from 'react';
import { Search, CameraOff, Camera } from 'lucide-react';

import { formatValpnForDisplay } from '../../lib/missings/valpn';

/**
 * Today's open list.
 *
 * Secondary to scanning — the whole premise is that you do not hunt items — but
 * it earns its place for the shift handover, for checking whether something you
 * just saw is on the list, and as proof the cache is current.
 *
 * Sorted oldest-first, deliberately: the longest-missing item is the one most at
 * risk, which inverts the usual "newest first" instinct.
 */
export default function ListView({ items, onSelect }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(a.marked_at).getTime() - new Date(b.marked_at).getTime(),
    );
    const q = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!q) return sorted;
    return sorted.filter(
      (i) =>
        i.valpn.replace(/[^A-Z0-9]/g, '').includes(q) ||
        String(i.location_last_seen || '').replace(/[^A-Z0-9]/g, '').includes(q) ||
        String(i.stacked_by || '').toUpperCase().includes(q),
    );
  }, [items, query]);

  if (!items.length) {
    return (
      <div className="fl-card px-6 py-12 text-center">
        <p className="fl-title text-4xl text-floor-clear">All clear</p>
        <p className="mt-3 font-fl-ui text-[0.9375rem] text-neutral-500">Nothing is marked missing right now.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by VALPN, aisle or name"
          aria-label="Filter the open list"
          className="fl-input !text-[0.9375rem] !font-fl-ui !tracking-normal pl-12"
        />
      </div>

      <p className="mb-3 px-1 font-fl-ui text-xs uppercase tracking-[0.18em] text-neutral-600">
        {filtered.length} open · oldest first
      </p>

      <ul className="space-y-2.5">
        {filtered.map((item) => (
          <li key={item.id ?? item.valpn}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="fl-card flex w-full items-stretch overflow-hidden text-left transition-colors active:border-neutral-600"
            >
              <div className="min-w-0 flex-1 px-5 py-4">
                <p className="fl-num text-[0.9375rem] text-neutral-400">{formatValpnForDisplay(item.valpn)}</p>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="fl-num text-[1.75rem] font-light leading-none text-neutral-50">
                    {item.location_last_seen || '—'}
                  </span>
                  <span className="font-fl-ui text-sm text-neutral-500">
                    {ageLabel(item.marked_at)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 font-fl-ui text-sm text-neutral-500">
                  {item.stacked_by && <span>Stacked {item.stacked_by}</span>}
                  {item.sold_price != null && <span className="fl-num">{formatPrice(item.sold_price)}</span>}
                  {item.order_kind === 'prep' && <span className="uppercase tracking-wider">Prep</span>}
                </div>
              </div>

              <div className="flex w-14 shrink-0 items-center justify-center border-l border-floor-hairline">
                {item.blind_spot ? (
                  <CameraOff className="h-5 w-5 text-floor-wanted" aria-hidden="true" />
                ) : (
                  <Camera
                    className={`h-5 w-5 ${item.media_count > 0 ? 'text-floor-clear' : 'text-neutral-700'}`}
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="py-10 text-center font-fl-ui text-base text-neutral-500">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}

/**
 * Age is the headline for a list row, and it escalates in words rather than
 * only in colour: "3 days" reads as a problem in a way "72h" does not.
 */
function ageLabel(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const hours = (Date.now() - then) / 3600000;
  if (hours < 1) return 'under an hour';
  if (hours < 24) return `${Math.round(hours)}h missing`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} missing`;
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
