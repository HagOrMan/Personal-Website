import { Resend } from 'resend';

import { requiredEnv } from '@/lib/env';

import 'server-only';

export const CONTACT_FROM = 'Contact <contact@kylehagerman.dev>';

let client: Resend | null = null;

/**
 * Lazily-created Resend client - avoids throwing at module load time (e.g.
 * during build, when env vars may not be injected yet) and instead only
 * throws when an email actually needs to be sent.
 */
export function getResendClient(): Resend {
  if (!client) {
    client = new Resend(requiredEnv('RESEND_API_KEY'));
  }
  return client;
}
