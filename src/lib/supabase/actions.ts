'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
