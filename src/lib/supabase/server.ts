import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import { supabaseEnv } from '@/lib/supabase/env';

import 'server-only';

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Only used here to identify the signed-in user (auth.getUser) - there's no
 * roles table; BLOG_OWNER_USER_IDS is the authorization source.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component render, which can't set
          // cookies - middleware is what actually persists the refreshed
          // session in that case.
        }
      },
    },
  });
}
