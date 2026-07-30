import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST only. A GET sign-out can be triggered by any image tag or link prefetch,
 * which means someone else's markup could log a worker out mid-shift.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
}
