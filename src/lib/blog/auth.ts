import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

const COOKIE_NAME = 'blog_unlock';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export const MASTER_SCOPE = '*';

interface UnlockPayload {
  scopes: string[];
  exp: number; // epoch ms
}

function sessionSecret(): string {
  const secret = process.env.BLOG_SESSION_SECRET;
  if (!secret) throw new Error('Missing required env var: BLOG_SESSION_SECRET');
  return secret;
}

function computeSignature(body: string): Buffer {
  return crypto.createHmac('sha256', sessionSecret()).update(body).digest();
}

function sign(payload: UnlockPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = computeSignature(body).toString('base64url');
  return `${body}.${signature}`;
}

/** Verifies signature + expiry. Any tampering or expiry is treated as locked. */
function verify(token: string): UnlockPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = computeSignature(body);
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as UnlockPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now())
      return null;
    if (
      !Array.isArray(payload.scopes) ||
      !payload.scopes.every((scope) => typeof scope === 'string')
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getUnlockedScopes(): Promise<string[]> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return [];
  return verify(token)?.scopes ?? [];
}

/** Extends the unlock cookie to also cover `scope` (a slug, or '*' for master). */
export async function addUnlockedScope(scope: string): Promise<void> {
  const current = await getUnlockedScopes();
  const scopes = current.includes(scope) ? current : [...current, scope];
  const payload: UnlockPayload = {
    scopes,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };

  const store = await cookies();
  store.set(COOKIE_NAME, sign(payload), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

async function isSupabaseOwner(): Promise<boolean> {
  const ownerIds = (process.env.BLOG_OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (ownerIds.length === 0) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user && ownerIds.includes(user.id));
}

export async function hasAccess(
  slug: string,
  locked: boolean,
): Promise<boolean> {
  if (!locked) return true;
  if (await isSupabaseOwner()) return true;

  const scopes = await getUnlockedScopes();
  return scopes.includes(MASTER_SCOPE) || scopes.includes(slug);
}

/** Hashes both sides with SHA-256 first so timingSafeEqual gets equal-length buffers. */
export function secureCompare(submitted: string, candidate: string): boolean {
  const a = crypto.createHash('sha256').update(submitted).digest();
  const b = crypto.createHash('sha256').update(candidate).digest();
  return crypto.timingSafeEqual(a, b);
}
