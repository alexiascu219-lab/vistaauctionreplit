import { withBasePath } from '@/lib/urls';

/**
 * Where an authenticated user with no active floor.staff row lands.
 *
 * This page existing at all is the visible half of the allowlist decision:
 * anyone can get a Supabase account by receiving email, so getting a session is
 * not the same as being authorized. This is what "signed in but not staff"
 * looks like.
 */
export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="card border-wanted/40 bg-wanted-deep">
          <h1 className="text-field font-extrabold text-wanted">Not set up yet</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-200">
            You&rsquo;re signed in, but this account isn&rsquo;t on the floor-app roster
            yet.
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            Ask whoever runs the missing-items process to add you, then open this page
            again.
          </p>
        </div>

        <form action={withBasePath('/auth/signout')} method="post" className="mt-6">
          <button type="submit" className="btn-secondary">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
