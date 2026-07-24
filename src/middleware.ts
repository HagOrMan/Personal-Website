import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/blog/:path*',
    '/blog-assets/:path*',
    '/login',
    '/auth/:path*',
    // Refreshes the owner's session so /stats (owner-only) doesn't 404 on an
    // otherwise-refreshable but expired access token.
    '/stats',
  ],
};
