import { type NextRequest,NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { supabaseEnv } from '@/lib/supabase/env';

/**
 * Refreshes the Supabase auth cookie on every matched request. Keep the
 * auth.getUser() call - it revalidates the token against the Supabase Auth
 * server, unlike getSession() which just reads the (possibly stale) cookie.
 * Removing it will cause the owner's session to silently expire.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
