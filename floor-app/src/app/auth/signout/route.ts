import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { withBasePath } from '@/lib/urls';

/**
 * POST only. A GET sign-out can be triggered by any image tag or link prefetch,
 * which means someone else's markup could log a worker out mid-shift.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(withBasePath('/login'), request.nextUrl.origin), {
    // 303 so the browser follows with GET rather than replaying the POST.
    status: 303,
  });
}
