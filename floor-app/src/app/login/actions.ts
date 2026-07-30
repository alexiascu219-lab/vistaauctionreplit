'use server';

import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/urls';

export interface LoginState {
  status: 'idle' | 'sent' | 'error';
  message?: string;
  email?: string;
}

/**
 * Best-effort origin from the request, used only as the fallback when
 * NEXT_PUBLIC_SITE_URL is unset. That covers localhost and hitting this
 * project's own Vercel URL directly; behind the /missings rewrite the env var
 * is what makes the link correct.
 */
async function originFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = String(formData.get('next') ?? '');

  if (!email || !email.includes('@')) {
    return { status: 'error', message: 'Enter your work email address.', email };
  }

  const supabase = await createClient();
  const origin = await originFromRequest();

  // siteUrl adds the base path and prefers NEXT_PUBLIC_SITE_URL, because behind
  // the /missings rewrite the request host is this project's, not the one the
  // browser sees. A magic link built from the wrong host would 404 on click.
  const callback = new URL(siteUrl('/auth/callback', origin));
  if (next.startsWith('/')) callback.searchParams.set('next', next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    // Log the real reason server-side; show the person something useful without
    // leaking whether the address exists.
    console.error('[login] signInWithOtp failed:', error.message);
    return {
      status: 'error',
      message: 'Could not send the link. Check the address and try again.',
      email,
    };
  }

  /*
   * Deliberately the same response whether or not this address is on the
   * allowlist. Someone not on it will get a link, sign in, and land on
   * /no-access -- which tells them what to do -- rather than this form
   * confirming to anyone who asks which addresses are staff.
   */
  return { status: 'sent', email };
}
