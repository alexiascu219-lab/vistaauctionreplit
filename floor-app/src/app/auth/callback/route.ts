import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { withBasePath } from '@/lib/urls';

/**
 * Magic-link landing route.
 *
 * Supabase sends one of two shapes depending on how the email template is
 * configured, and both are handled so this works with the stock template and
 * with a `{{ .TokenHash }}` one:
 *
 *   ?code=...                    PKCE. The verifier cookie was set when the link
 *                                was requested, which is why the link has to be
 *                                opened in the same browser.
 *   ?token_hash=...&type=email   Token hash. No verifier, works cross-device.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const next = searchParams.get('next');
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/scan';

  const supabase = await createClient();

  let failure: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failure = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failure = error?.message ?? null;
  } else {
    failure = 'missing code or token_hash';
  }

  if (failure) {
    // Reasons here are things like an expired or already-used link. Log it,
    // but send the person back to a form rather than an error dump.
    console.error('[auth/callback] verification failed:', failure);
    const loginUrl = new URL(withBasePath('/login'), origin);
    loginUrl.searchParams.set('expired', '1');
    if (next) loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(withBasePath(destination), origin));
}
