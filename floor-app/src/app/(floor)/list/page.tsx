import { formatValpnForDisplay } from '@/lib/valpn';
import { createClient } from '@/lib/supabase/server';
import type { OpenMissing } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Today's open list.
 *
 * Server-rendered straight off floor.open_missings. This is also the end-to-end
 * proof that the schema, RLS, the exposed `floor` schema and the auth session all
 * line up -- if this page shows rows, steps 1 and 2 are genuinely working.
 *
 * Step 5 adds the IndexedDB cache that makes this list available with no network;
 * for now it is a live read.
 */
export default async function ListPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_missings')
    .select('*')
    .order('marked_at', { ascending: false })
    .returns<OpenMissing[]>();

  if (error) {
    return (
      <div className="card border-danger/50 bg-danger-deep">
        <h1 className="text-field font-extrabold text-red-200">Could not load the list</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          The open list is unavailable. This is usually a configuration problem rather
          than a data one — check that <code className="font-mono">floor</code> is listed
          under Exposed schemas in the Supabase API settings.
        </p>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-50">Open list</h1>
        <p className="text-base font-bold text-slate-400">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="text-field font-bold text-clear">Nothing open</p>
          <p className="mt-2 text-base text-slate-400">
            No items are currently marked missing.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card">
              <p className="font-mono text-valpn text-slate-50">
                {formatValpnForDisplay(item.valpn)}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="field-label">Last seen</dt>
                  <dd className="field-value font-mono">
                    {item.location_last_seen ?? <span className="text-slate-500">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Price</dt>
                  <dd className="field-value">{formatPrice(item.sold_price)}</dd>
                </div>
                <div>
                  <dt className="field-label">Stacked by</dt>
                  <dd className="field-value">
                    {item.stacked_by ?? <span className="text-slate-500">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Marked</dt>
                  <dd className="field-value">{relativeTime(item.marked_at)}</dd>
                </div>
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

function Tag({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const tones = {
    neutral: 'border-hairline bg-raised text-slate-300',
    ok: 'border-clear/40 bg-clear-deep text-clear',
    warn: 'border-wanted/40 bg-wanted-deep text-wanted',
  } as const;

  return (
    <span
      className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** numeric(12,2) arrives from PostgREST as a string, so parse rather than assume. */
function formatPrice(value: string | null): string {
  if (value === null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * "3h ago" reads faster at arm's length than a timestamp, and how long an item
 * has been missing is the thing that actually matters on the floor.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
