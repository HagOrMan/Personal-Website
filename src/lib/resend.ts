import { Resend } from 'resend';

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
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('Missing required env var: RESEND_API_KEY');
    client = new Resend(apiKey);
  }
  return client;
}
