import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets. The negative lookahead
     * keeps the session refresh off image and icon requests, which would
     * otherwise each cost a token revalidation.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|webmanifest)$).*)',
  ],
};
