'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export interface MagicLinkResult {
  success?: boolean;
  message?: string;
}

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  return `${protocol}://${host}`;
}

export async function signInWithMagicLink(
  _prevState: MagicLinkResult | undefined,
  formData: FormData,
): Promise<MagicLinkResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { message: 'Enter a valid email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });

  if (error) return { message: 'Could not send magic link. Please try again.' };
  return { success: true, message: 'Check your email for a sign-in link.' };
}

export async function signInWithGitHub(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  });

  if (error || !data.url) redirect('/login?error=auth');

  // signInWithOAuth() doesn't attach the API key to the authorize URL, and
  // this redirect is a full browser navigation (no custom headers), so
  // Supabase's gateway rejects it with "No API key found" unless it's added
  // here as a query param. The anon key is public (NEXT_PUBLIC_*) - it's
  // already shipped in the client bundle, so this adds no exposure.
  const authorizeUrl = new URL(data.url);
  authorizeUrl.searchParams.set('apikey', supabaseEnv().anonKey);
  redirect(authorizeUrl.toString());
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
