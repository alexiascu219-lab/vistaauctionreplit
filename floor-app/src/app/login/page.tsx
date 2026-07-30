import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  // Only ever honour a same-site path, so ?next= cannot be used as an open redirect.
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '';

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">
            Vista Auctions · Sardis
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-50">
            Missing Items
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Scan anything on the floor. Find out in one second whether it&rsquo;s wanted.
          </p>
        </header>

        {expired === '1' && (
          <p
            role="alert"
            className="mb-5 rounded-xl2 border-2 border-wanted/50 bg-wanted-deep px-4 py-3 text-base font-semibold leading-relaxed text-amber-200"
          >
            That sign-in link didn&rsquo;t work — links expire, and each one can only be
            used once. Request a fresh one.
          </p>
        )}

        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
