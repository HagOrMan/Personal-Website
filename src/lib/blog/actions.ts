'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import crypto from 'crypto';

import { addUnlockedScope, MASTER_SCOPE, secureCompare } from '@/lib/blog/auth';
import { getPostSecret, isValidSlug } from '@/lib/blog/github';
import { checkRateLimit } from '@/lib/blog/rateLimit';

export interface UnlockResult {
  success: boolean;
  message?: string;
}

const GENERIC_FAILURE: UnlockResult = {
  success: false,
  message: 'Incorrect password.',
};

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  return headerList.get('x-real-ip') ?? 'unknown';
}

export async function unlockPost(
  slug: string,
  password: string,
): Promise<UnlockResult> {
  if (!isValidSlug(slug) || !password) return GENERIC_FAILURE;

  const ip = await getClientIp();
  const rate = checkRateLimit(`unlock:${ip}:${slug}`);
  if (!rate.allowed) {
    return {
      success: false,
      message: 'Too many attempts. Please wait a few minutes and try again.',
    };
  }

  const secretInfo = await getPostSecret(slug);
  if (!secretInfo) return GENERIC_FAILURE;

  const masterPassword = process.env.BLOG_MASTER_PASSWORD ?? '';
  // Always compare against a same-shape dummy when a side is absent, so a
  // missing per-post password doesn't make this comparison measurably faster.
  const postPassword = secretInfo.password ?? crypto.randomUUID();
  const master = masterPassword || crypto.randomUUID();

  const matchesMaster = secureCompare(password, master);
  const matchesPost = secureCompare(password, postPassword);

  if (!matchesMaster && !matchesPost) return GENERIC_FAILURE;

  await addUnlockedScope(
    matchesMaster ? MASTER_SCOPE : secretInfo.canonicalSlug,
  );
  revalidatePath(`/blog/${secretInfo.canonicalSlug}`);

  return { success: true };
}
