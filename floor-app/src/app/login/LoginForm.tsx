'use client';

import { useActionState } from 'react';

import { sendMagicLink, type LoginState } from './actions';

const INITIAL: LoginState = { status: 'idle' };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, INITIAL);

  if (state.status === 'sent') {
    return (
      <div className="card border-clear/40 bg-clear-deep text-center" role="status">
        <p className="text-field font-bold text-clear">Check your email</p>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          We sent a sign-in link to{' '}
          <span className="font-mono font-semibold break-all">{state.email}</span>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Open it on this phone — the link is tied to this browser.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="field-label">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
          defaultValue={state.email}
          placeholder="you@example.com"
          aria-describedby={state.status === 'error' ? 'login-error' : undefined}
          className="field-input mt-2 !text-field !tracking-normal"
        />
      </div>

      {state.status === 'error' && (
        <p
          id="login-error"
          role="alert"
          className="rounded-xl2 border-2 border-danger/50 bg-danger-deep px-4 py-3 text-base font-semibold text-red-200"
        >
          {state.message}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Sending…' : 'Send sign-in link'}
      </button>

      <p className="pt-2 text-center text-sm leading-relaxed text-slate-400">
        No password. We email you a link that signs you in.
      </p>
    </form>
  );
}
