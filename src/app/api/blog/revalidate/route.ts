import crypto from 'crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// Configure this on the private blog content repo:
//   Settings -> Webhooks -> Add webhook
//     Payload URL: https://<your-site>/api/blog/revalidate
//     Content type: application/json
//     Secret: same value as BLOG_REVALIDATE_SECRET
//     Events: "Just the push event"
// A 300s time-based revalidate on the underlying fetches is still in place
// as a fallback in case a webhook delivery is ever missed.

function verifySignature(
  payload: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const secret = process.env.BLOG_REVALIDATE_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  const provided = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifySignature(payload, signature)) {
    return new NextResponse(null, { status: 401 });
  }

  // GitHub sends a "ping" event when the webhook is first created - ack it
  // without revalidating.
  const event = request.headers.get('x-github-event');
  if (event === 'push') {
    revalidateTag('blog');
  }

  return NextResponse.json({ ok: true });
}
