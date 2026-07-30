import { redirect } from 'next/navigation';

import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/types';

/**
 * Authorization boundary for the whole floor app.
 *
 * Middleware has already established that a session exists. This is the second,
 * load-bearing half: a session only means somebody received an email, so the
 * allowlist is checked here before any page under this group renders.
 *
 * The query goes through RLS with the staff_select_self policy, so it can only
 * ever return the caller's own row.
 */
export default async function FloorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, display_name, role, active, facility')
    .eq('user_id', user.id)
    .maybeSingle<{
      id: string;
      display_name: string;
      role: StaffRole;
      active: boolean;
      facility: string;
    }>();

  if (error) {
    // Most likely cause the first time: `floor` is not in Settings -> API ->
    // Exposed schemas, so PostgREST cannot see the table at all.
    console.error('[floor/layout] staff lookup failed:', error.message);
  }

  if (!staff || !staff.active) redirect('/no-access');

  return (
    <div className="min-h-dvh pb-nav">
      <header className="sticky top-0 z-30 border-b border-hairline bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-[0.14em] text-brand">
              {staff.facility} · missing items
            </p>
            <p className="truncate text-base font-semibold text-slate-300">
              {staff.display_name}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-bold text-slate-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">{children}</main>

      <BottomNav />
    </div>
  );
}
